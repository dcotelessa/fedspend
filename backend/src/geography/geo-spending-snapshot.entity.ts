import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, Unique } from 'typeorm';
import { Agency } from '../agencies/agency.entity';

@Entity()
@Unique(['stateCode', 'fiscalYear', 'agencyId', 'scope'])
export class GeoSpendingSnapshot {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 2 })
  stateCode: string;

  @Column({ type: 'varchar', length: 255 })
  stateName: string;

  @Column()
  fiscalYear: number;

  @Column({ nullable: true })
  agencyId: number;

  @Column({ type: 'varchar', length: 255 })
  scope: string;

  @Column({ type: 'bigint' })
  obligatedAmount: number;

  @Column()
  awardCount: number;

  @Column()
  population: number;

  @Column({ type: 'bigint' })
  perCapita: number;

  @ManyToOne(() => Agency, { nullable: true })
  agency: Agency;
}