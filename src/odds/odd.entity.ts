import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('odds')
@Index(['leagueUrl', 'matchUrl'], { unique: true })
export class Odd {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  sport: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  league: string;

  @Column()
  leagueUrl: string;

  @Column({ nullable: true })
  date: string;

  @Column({ nullable: true })
  time: string;

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  startTime: Date;

  @Column()
  homeTeam: string;

  @Column({ nullable: true })
  homeTeamLogo: string;

  @Column()
  awayTeam: string;

  @Column({ nullable: true })
  awayTeamLogo: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  oddsHome: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  oddsDraw: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  oddsAway: number;

  @Column({ nullable: true })
  bookmakers: string;

  @Column({ nullable: true })
  matchUrl: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
