import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agency } from '../agencies/agency.entity';
import { SpendingRecord } from '../spending/spending-record.entity';
import { GeoSpendingSnapshot } from '../geography/geo-spending-snapshot.entity';
import { DisasterFundingRecord } from '../disaster/disaster-funding-record.entity';
import { DisasterRecoveryRatio } from '../disaster/disaster-recovery-ratio.entity';
import { UsaSpendingService } from './usa-spending.service';
import { OpenFemaService } from './openfema.service';
import { computeRecoveryRatio } from './recovery-ratio';

@Injectable()
export class SyncService {
  private statusMap = new Map<string, { module: string; lastSyncAt: Date; status: string }>();

  constructor(
    @InjectRepository(Agency) private readonly agencyRepo: Repository<Agency>,
    @InjectRepository(SpendingRecord) private readonly spendingRepo: Repository<SpendingRecord>,
    @InjectRepository(GeoSpendingSnapshot) private readonly geoRepo: Repository<GeoSpendingSnapshot>,
    @InjectRepository(DisasterFundingRecord) private readonly disasterRepo: Repository<DisasterFundingRecord>,
    @InjectRepository(DisasterRecoveryRatio) private readonly ratioRepo: Repository<DisasterRecoveryRatio>,
    private readonly usaService: UsaSpendingService,
    private readonly femaService: OpenFemaService,
  ) {}

  getStatus(): Map<string, { module: string; lastSyncAt: Date; status: string }> {
    return this.statusMap;
  }

  private async upsertAgency(agency: Agency): Promise<void> {
    const existing = await this.agencyRepo.findOne({ where: { toptierCode: agency.toptierCode } });
    if (existing) {
      Object.assign(existing, agency);
      await this.agencyRepo.save(existing);
    } else {
      await this.agencyRepo.save(agency);
    }
  }

  private async upsertSpending(record: SpendingRecord): Promise<void> {
    const existing = await this.spendingRepo.findOne({
      where: {
        agencyId: record.agencyId,
        fiscalYear: record.fiscalYear,
        quarter: record.quarter,
        awardTypeLabel: record.awardTypeLabel,
      },
    });
    if (existing) {
      Object.assign(existing, record);
      await this.spendingRepo.save(existing);
    } else {
      await this.spendingRepo.save(record);
    }
  }

  private async upsertGeo(snapshot: GeoSpendingSnapshot): Promise<void> {
    const existing = await this.geoRepo.findOne({
      where: {
        stateCode: snapshot.stateCode,
        fiscalYear: snapshot.fiscalYear,
        agencyId: snapshot.agencyId,
        scope: snapshot.scope,
      },
    });
    if (existing) {
      Object.assign(existing, snapshot);
      await this.geoRepo.save(existing);
    } else {
      await this.geoRepo.save(snapshot);
    }
  }

  private async upsertDisaster(record: DisasterFundingRecord): Promise<void> {
    const existing = await this.disasterRepo.findOne({
      where: { defGroup: record.defGroup, stateCode: record.stateCode },
    });
    if (existing) {
      Object.assign(existing, record);
      await this.disasterRepo.save(existing);
    } else {
      await this.disasterRepo.save(record);
    }
  }

  async syncAgenciesAndSpending(): Promise<void> {
    this.statusMap.set('agencies_and_spending', {
      module: 'agencies_and_spending',
      lastSyncAt: new Date(),
      status: 'running',
    });
    try {
      const agenciesResult = await this.usaService.fetchAgencies();
      if (agenciesResult.status === 'success') {
        for (const agency of agenciesResult.agencies) {
          await this.upsertAgency(agency);
        }
      }

      const spendingResult = await this.usaService.fetchSpendingByAgency({
        agency: '',
        fiscalYear: 2024,
      });
      if (spendingResult.status === 'success') {
        for (const record of spendingResult.rows) {
          await this.upsertSpending(record);
        }
      }

      this.statusMap.set('agencies_and_spending', {
        module: 'agencies_and_spending',
        lastSyncAt: new Date(),
        status: 'success',
      });
    } catch {
      this.statusMap.set('agencies_and_spending', {
        module: 'agencies_and_spending',
        lastSyncAt: new Date(),
        status: 'error',
      });
    }
  }

  async syncGeography(): Promise<void> {
    this.statusMap.set('geography', {
      module: 'geography',
      lastSyncAt: new Date(),
      status: 'running',
    });
    try {
      const geoResult = await this.usaService.fetchGeoSnapshots({
        agency: '',
        fiscalYear: 2024,
        scope: 'recipient',
      });
      if (geoResult.status === 'success') {
        for (const snapshot of geoResult.rows) {
          await this.upsertGeo(snapshot);
        }
      }
      this.statusMap.set('geography', {
        module: 'geography',
        lastSyncAt: new Date(),
        status: 'success',
      });
    } catch {
      this.statusMap.set('geography', {
        module: 'geography',
        lastSyncAt: new Date(),
        status: 'error',
      });
    }
  }

  async syncDisaster(): Promise<void> {
    this.statusMap.set('disaster', {
      module: 'disaster',
      lastSyncAt: new Date(),
      status: 'running',
    });
    try {
      const disasterResult = await this.usaService.fetchDisasterSpending('JF-3038');
      if (disasterResult.status === 'success') {
        for (const record of disasterResult.rows) {
          await this.upsertDisaster(record);
        }
      }

      const femaDeclarations = await this.femaService.fetchDeclarationsByState();

      const usaByState = new Map<string, number>();
      if (disasterResult.status === 'success') {
        for (const record of disasterResult.rows) {
          const existing = usaByState.get(record.stateCode) ?? 0;
          usaByState.set(record.stateCode, existing + record.obligatedAmount);
        }
      }

      for (const decl of femaDeclarations) {
        const fedSpending = usaByState.get(decl.stateCode) ?? 0;
        const ratio = computeRecoveryRatio(decl.femaObligatedCents, fedSpending);
        await this.ratioRepo.save({
          stateCode: decl.stateCode,
          stateName: decl.stateName,
          fiscalYear: decl.fiscalYear,
          femaObligated: decl.femaObligatedCents,
          fedSpendingObligated: fedSpending,
          declarationCount: decl.declarationCount,
          recoveryRatio: ratio,
          dominantIncidentType: decl.dominantIncidentType,
        });
      }

      this.statusMap.set('disaster', {
        module: 'disaster',
        lastSyncAt: new Date(),
        status: 'success',
      });
    } catch {
      this.statusMap.set('disaster', {
        module: 'disaster',
        lastSyncAt: new Date(),
        status: 'error',
      });
    }
  }

  async syncAll(): Promise<void> {
    await this.syncAgenciesAndSpending();
    await this.syncGeography();
    await this.syncDisaster();
  }
}
