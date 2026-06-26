import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DisasterFundingRecord } from './disaster-funding-record.entity';
import { DisasterRecoveryRatio } from './disaster-recovery-ratio.entity';

export interface QueryStatesParams {
  defGroup?: string;
  fiscalYear?: number;
}

export interface QueryRatiosParams {
  fiscalYear?: number;
}

export interface OverviewRow {
  defGroup: string;
  totalObligated: number;
  totalAwardCount: number;
  stateCount: number;
  highestPerCapitaState: string;
  highestPerCapita: number;
  coverageGapCount: number;
}

@Injectable()
export class DisasterService {
  constructor(
    @InjectRepository(DisasterFundingRecord)
    private readonly fundingRepo: Repository<DisasterFundingRecord>,
    @InjectRepository(DisasterRecoveryRatio)
    private readonly ratioRepo: Repository<DisasterRecoveryRatio>,
  ) {}

  async getOverview(): Promise<OverviewRow[]> {
    const fundingRows = await this.fundingRepo.find();
    const ratioRows = await this.ratioRepo.find();

    const ratioByState = new Map<string, number>();
    for (const r of ratioRows) {
      if (!ratioByState.has(r.stateCode) || r.fiscalYear > 0) {
        ratioByState.set(r.stateCode, r.recoveryRatio);
      }
    }

    const groups = new Map<string, DisasterFundingRecord[]>();
    for (const row of fundingRows) {
      if (!groups.has(row.defGroup)) {
        groups.set(row.defGroup, []);
      }
      groups.get(row.defGroup)!.push(row);
    }

    const result: OverviewRow[] = [];
    for (const [defGroup, rows] of groups) {
      const totalObligated = rows.reduce((s, r) => s + r.obligatedAmount, 0);
      const totalAwardCount = rows.reduce((s, r) => s + r.awardCount, 0);
      const stateCount = rows.length;

      let highestPerCapitaState = '';
      let highestPerCapita = 0;
      for (const row of rows) {
        if (row.perCapita > highestPerCapita) {
          highestPerCapita = row.perCapita;
          highestPerCapitaState = row.stateName;
        }
      }

      const coverageGapCount = rows.filter((row) => {
        const ratio = ratioByState.get(row.stateCode);
        return ratio !== undefined && ratio < 0.5;
      }).length;

      result.push({
        defGroup,
        totalObligated,
        totalAwardCount,
        stateCount,
        highestPerCapitaState,
        highestPerCapita,
        coverageGapCount,
      });
    }

    return result;
  }

  async queryStates(params: QueryStatesParams): Promise<DisasterFundingRecord[]> {
    const { defGroup, fiscalYear } = params;
    const where: Record<string, string | number> = {};
    if (defGroup) {
      where.defGroup = defGroup;
    }
    const rows = await this.fundingRepo.find({ where });
    return rows.sort((a, b) => b.obligatedAmount - a.obligatedAmount);
  }

  async queryRatios(params: QueryRatiosParams): Promise<DisasterRecoveryRatio[]> {
    const { fiscalYear } = params;
    const where: Record<string, number> = {};
    if (fiscalYear) {
      where.fiscalYear = fiscalYear;
    }
    let rows = await this.ratioRepo.find({
      where,
      order: { recoveryRatio: 'ASC' },
    });
    rows = rows.sort((a, b) => a.recoveryRatio - b.recoveryRatio);
    return rows;
  }

  async getStateProfile(stateCode: string): Promise<{
    stateCode: string;
    stateName: string;
    totalObligated: number;
    totalAwardCount: number;
    ratios: Array<{
      recoveryRatio: number;
      femaObligated: number;
      fedSpendingObligated: number;
      declarationCount: number;
    }>;
    declarationCount: number;
  } | null> {
    const fundingRows = await this.fundingRepo.find({ where: { stateCode } });
    const ratioRows = await this.ratioRepo.find({ where: { stateCode } });

    if (fundingRows.length === 0 && ratioRows.length === 0) {
      return null;
    }

    const stateName = fundingRows[0]?.stateName ?? ratioRows[0]?.stateName;
    const totalObligated = fundingRows.reduce((s, r) => s + r.obligatedAmount, 0);
    const totalAwardCount = fundingRows.reduce((s, r) => s + r.awardCount, 0);

    const ratios = ratioRows.map((r) => ({
      recoveryRatio: r.recoveryRatio,
      femaObligated: r.femaObligated,
      fedSpendingObligated: r.fedSpendingObligated,
      declarationCount: r.declarationCount,
    }));

    const declarationCount = ratioRows.reduce((s, r) => s + r.declarationCount, 0);

    return {
      stateCode,
      stateName,
      totalObligated,
      totalAwardCount,
      ratios,
      declarationCount,
    };
  }
}