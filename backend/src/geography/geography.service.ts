import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, IsNull, Repository } from 'typeorm';
import { GeoSpendingSnapshot } from './geo-spending-snapshot.entity';

export interface QueryStatesInput {
  fiscalYear?: number;
  agencyId?: number;
  scope?: string;
}

@Injectable()
export class GeographyService {
  constructor(
    @InjectRepository(GeoSpendingSnapshot)
    private readonly repo: Repository<GeoSpendingSnapshot>,
  ) {}

  async queryStates(input: QueryStatesInput): Promise<GeoSpendingSnapshot[]> {
    const where: FindOptionsWhere<GeoSpendingSnapshot> = {};

    if (input.fiscalYear !== undefined) {
      where.fiscalYear = input.fiscalYear;
    }

    if (input.agencyId === undefined || input.agencyId === null) {
      where.agencyId = IsNull();
    } else {
      where.agencyId = input.agencyId;
    }

    if (input.scope !== undefined && input.scope !== '') {
      where.scope = input.scope;
    }

    return this.repo.find({
      where,
      order: { obligatedAmount: 'DESC' },
    });
  }

  async getStateDetail(stateCode: string): Promise<GeoSpendingSnapshot[]> {
    return this.repo.find({
      where: { stateCode },
      order: { fiscalYear: 'DESC' },
    });
  }
}
