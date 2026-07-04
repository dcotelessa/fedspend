import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Agency } from '../agencies/agency.entity';
import { SpendingRecord } from '../spending/spending-record.entity';
import { GeoSpendingSnapshot } from '../geography/geo-spending-snapshot.entity';
import { DisasterFundingRecord } from '../disaster/disaster-funding-record.entity';
import { DisasterRecoveryRatio } from '../disaster/disaster-recovery-ratio.entity';
import { UsaSpendingService } from './usa-spending.service';
import { OpenFemaService } from './openfema.service';
import { computeRecoveryRatio } from './recovery-ratio';
import { Cron } from '@nestjs/schedule';

const SYNC_FISCAL_YEAR = 2024;
const SYNC_DEF_GROUP = 'L';

const AGENCIES_AND_SPENDING = 'agencies_and_spending';
const GEOGRAPHY = 'geography';
const DISASTER = 'disaster';

type SyncStatus = 'running' | 'success' | 'error';
type SyncStatusEntry = { module: string; lastSyncAt: Date; status: SyncStatus };

@Injectable()
export class SyncService {
  private readonly statusMap = new Map<string, SyncStatusEntry>();

  constructor(
    @InjectRepository(Agency) private readonly agencyRepo: Repository<Agency>,
    @InjectRepository(SpendingRecord) private readonly spendingRepo: Repository<SpendingRecord>,
    @InjectRepository(GeoSpendingSnapshot) private readonly geoRepo: Repository<GeoSpendingSnapshot>,
    @InjectRepository(DisasterFundingRecord) private readonly disasterRepo: Repository<DisasterFundingRecord>,
    @InjectRepository(DisasterRecoveryRatio) private readonly ratioRepo: Repository<DisasterRecoveryRatio>,
    private readonly usaService: UsaSpendingService,
    private readonly femaService: OpenFemaService,
  ) {}

  getStatus(): { [module: string]: SyncStatusEntry } {
    return Object.fromEntries(this.statusMap);
  }

  private markStatus(module: string, status: SyncStatus): void {
    this.statusMap.set(module, { module, lastSyncAt: new Date(), status });
  }

  private async runWithStatus(
    module: string,
    work: () => Promise<void>,
  ): Promise<void> {
    this.markStatus(module, 'running');
    try {
      await work();
      this.markStatus(module, 'success');
    } catch (e) {
      console.error(`[Sync] ${module} failed:`, e instanceof Error ? e.message : e);
      this.markStatus(module, 'error');
    }
  }

  async syncAgenciesAndSpending(): Promise<void> {
    await this.runWithStatus(AGENCIES_AND_SPENDING, async () => {
      const agenciesResult = await this.usaService.fetchAgencies();
      if (agenciesResult.status === 'success') {
        for (const agency of agenciesResult.agencies) {
          await this.agencyRepo.upsert(agency, ['toptierCode']);
        }
      }

      const agenciesList = agenciesResult.status === 'success'
        ? agenciesResult.agencies.slice(0, 20)
        : [];

      await Promise.all(agenciesList.map(async (agency) => {
        const spendingResult = await this.usaService.fetchSpendingByAgency({
          toptierCode: agency.toptierCode || '',
          fiscalYear: SYNC_FISCAL_YEAR,
        });
        if (spendingResult.status === 'success') {
          for (const record of spendingResult.rows) {
            await this.spendingRepo.upsert({ ...record, agencyId: agency.id }, [
              'agencyId',
              'fiscalYear',
              'quarter',
              'awardTypeLabel',
            ]);
          }
        }
      }));
    });
  }

  async syncGeography(): Promise<void> {
    await this.runWithStatus(GEOGRAPHY, async () => {
      const geoResult = await this.usaService.fetchGeoSnapshots({
        agency: '',
        fiscalYear: SYNC_FISCAL_YEAR,
        scope: 'recipient',
      });
      if (geoResult.status === 'success') {
        await this.geoRepo.delete({
          fiscalYear: SYNC_FISCAL_YEAR,
          scope: 'recipient',
          agencyId: IsNull(),
        });
        await this.geoRepo.save(geoResult.rows);
      }
    });
  }

  async syncDisaster(): Promise<void> {
    await this.runWithStatus(DISASTER, async () => {
      const disasterResult = await this.usaService.fetchDisasterSpending(SYNC_DEF_GROUP);
      const fedSpendingByState = new Map<string, number>();
      if (disasterResult.status === 'success') {
        for (const record of disasterResult.rows) {
          await this.disasterRepo.upsert(record, ['defGroup', 'stateCode']);
          fedSpendingByState.set(
            record.stateCode,
            (fedSpendingByState.get(record.stateCode) ?? 0) + record.obligatedAmount,
          );
        }
      }

      const femaDeclarations = await this.femaService.fetchDeclarationsByState();
      for (const decl of femaDeclarations) {
        const fedSpending = fedSpendingByState.get(decl.stateCode) ?? 0;
        const ratio = computeRecoveryRatio(decl.femaObligatedCents, fedSpending);
        await this.ratioRepo.upsert(
          {
            stateCode: decl.stateCode,
            stateName: decl.stateName,
            fiscalYear: decl.fiscalYear,
            femaObligated: decl.femaObligatedCents,
            fedSpendingObligated: fedSpending,
            declarationCount: decl.declarationCount,
            recoveryRatio: ratio,
            dominantIncidentType: decl.dominantIncidentType,
          },
          ['stateCode', 'fiscalYear'],
        );
      }
    });
  }

  @Cron('0 2 * * *')
  async syncAll(): Promise<void> {
    await this.syncAgenciesAndSpending();
    await this.syncGeography();
    await this.syncDisaster();
  }
}
