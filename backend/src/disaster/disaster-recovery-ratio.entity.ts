import { Entity, Column, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity()
@Unique(['stateCode', 'fiscalYear'])
export class DisasterRecoveryRatio {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 2 })
  stateCode: string;

  @Column({ type: 'varchar', length: 255 })
  stateName: string;

  @Column()
  fiscalYear: number;

  @Column({ type: 'bigint' })
  femaObligated: number;

  @Column({ type: 'bigint' })
  fedSpendingObligated: number;

  @Column()
  declarationCount: number;

  @Column({ type: 'float' })
  recoveryRatio: number;

  @Column({ type: 'varchar', length: 255 })
  dominantIncidentType: string;
}