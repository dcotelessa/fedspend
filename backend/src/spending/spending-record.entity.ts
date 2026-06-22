import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, Unique } from 'typeorm';
import { Agency } from '../agencies/agency.entity';

@Entity()
@Unique(['agencyId', 'fiscalYear', 'quarter', 'awardTypeLabel'])
export class SpendingRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  agencyId: number;

  @Column()
  fiscalYear: number;

  @Column()
  quarter: number;

  @Column({ type: 'varchar', length: 255 })
  awardTypeLabel: string;

  @Column({ type: 'text' })
  awardTypeCodes: string;

  @Column({ type: 'integer' })
  obligatedAmount: number;

  @Column({ type: 'integer' })
  outlayAmount: number;

  @Column()
  awardCount: number;

  @ManyToOne(() => Agency, { nullable: false })
  agency: Agency;
}