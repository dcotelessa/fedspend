import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agency } from './agency.entity';
import { SpendingRecord } from '../spending/spending-record.entity';
import { ApiResponse, AgencySummary } from '@shared/interfaces';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AgenciesService {
  constructor(
    @InjectRepository(Agency)
    private readonly agencyRepo: Repository<Agency>,
    @InjectRepository(SpendingRecord)
    private readonly spendingRepo: Repository<SpendingRecord>,
    private readonly configService: ConfigService,
  ) {}

  async findAllWithTotals(fiscalYear?: number): Promise<ApiResponse<{ id: number; name: string; totalCents: number }[]>> {
    const currentFy = fiscalYear ?? this.currentFiscalYear();
    const rows = await this.agencyRepo
      .createQueryBuilder('agency')
      .leftJoin('agency.spendingRecords', 'sr', 'sr.fiscalYear = :fy', { fy: currentFy })
      .select(['agency.id', 'agency.name'])
      .addSelect('COALESCE(SUM(sr.obligatedAmount), 0)', 'totalCents')
      .groupBy('agency.id')
      .getRawMany();
    const data = rows.map(row => ({
      id: row.agency_id,
      name: row.agency_name,
      totalCents: parseInt(row.totalCents, 10),
    }));
    return {
      data,
      meta: { total: data.length, page: 1, pageSize: data.length },
    };
  }

  async findSummary(agencyId: number): Promise<AgencySummary | null> {
    const agency = await this.agencyRepo.findOne({ where: { id: agencyId } });
    if (!agency) return null;
    const currentFy = this.currentFiscalYear();
    const priorFy = currentFy - 1;
    const currentRecords = await this.spendingRepo.find({ where: { agencyId, fiscalYear: currentFy } });
    const priorRecords = await this.spendingRepo.find({ where: { agencyId, fiscalYear: priorFy } });
    const currentTotal = currentRecords.reduce((s, r) => s + r.obligatedAmount, 0);
    const priorTotal = priorRecords.reduce((s, r) => s + r.obligatedAmount, 0);
    const yoyChange = priorTotal === 0 ? 0 : (currentTotal - priorTotal) / priorTotal * 100;
    return {
      agency: { id: agency.id, name: agency.name, abbreviation: agency.abbreviation, toptierCode: agency.toptierCode },
      currentFyTotal: currentTotal,
      priorFyTotal: priorTotal,
      yoyChange,
    };
  }

  async findSpotlight(agencyId: number): Promise<SpendingRecord[] | null> {
    const agency = await this.agencyRepo.findOne({ where: { id: agencyId } });
    if (!agency) return null;
    const records = await this.spendingRepo.find({ where: { agencyId } });
    const groups = new Map<string, SpendingRecord>();
    for (const r of records) {
      const key = `${r.fiscalYear}-${r.awardTypeLabel}`;
      const existing = groups.get(key);
      if (existing) {
        existing.obligatedAmount += r.obligatedAmount;
        existing.outlayAmount += r.outlayAmount;
        existing.awardCount += r.awardCount;
      } else {
        groups.set(key, { ...r } as SpendingRecord);
      }
    }
    return Array.from(groups.values());
  }

  private currentFiscalYear(): number {
    return this.configService.get<number>('currentFy') ?? 2024;
  }
}