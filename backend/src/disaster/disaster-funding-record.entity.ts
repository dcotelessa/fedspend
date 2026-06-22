import { Entity, Column, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity()
@Unique(['defGroup', 'stateCode'])
export class DisasterFundingRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  defGroup: string;

  @Column({ type: 'text' })
  defCodes: string;

  @Column({ type: 'varchar', length: 2 })
  stateCode: string;

  @Column({ type: 'varchar', length: 255 })
  stateName: string;

  @Column({ type: 'integer' })
  obligatedAmount: number;

  @Column()
  awardCount: number;

  @Column({ type: 'integer' })
  perCapita: number;

  @Column()
  population: number;
}