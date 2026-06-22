import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

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
}