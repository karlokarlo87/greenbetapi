import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('leagues')
@Index(['sportName', 'country', 'name'], { unique: true })
export class League {
  @PrimaryColumn()
  sportName: string;

  @PrimaryColumn()
  country: string;

  @PrimaryColumn()
  name: string;

  @Column({ nullable: true })
  sportAlt: string;

  @Column({ nullable: true })
  leagueKey: string;

  @Column({ unique: true })
  url: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
