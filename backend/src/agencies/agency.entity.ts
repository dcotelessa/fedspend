import { Entity, PrimaryGeneratedColumn, Column, Unique, OneToMany } from 'typeorm';
import { SpendingRecord } from '../spending/spending-record.entity';

@Entity()
@Unique(['toptierCode'])
export class Agency {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  abbreviation: string;

  @Column({ type: 'varchar', length: 10 })
  toptierCode: string;

  @OneToMany(() => SpendingRecord, sr => sr.agency)
  spendingRecords?: SpendingRecord[];
}