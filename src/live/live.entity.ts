import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('live_matches')
@Index(['sport', 'league', 'homeTeam', 'awayTeam'], { unique: true })
export class LiveMatch {
  @PrimaryColumn()
  sport: string;

  @PrimaryColumn()
  country: string;

  @PrimaryColumn()
  league: string;

  @PrimaryColumn()
  homeTeam: string;

  @PrimaryColumn()
  awayTeam: string;

  @Column({ nullable: true })
  countryFlag: string;

  @Column()
  matchTime: string;

  @Column()
  matchStatus: string;

  @Column({ nullable: true })
  homeTeamLogo: string;

  @Column()
  homeScore: string;

  @Column({ nullable: true })
  awayTeamLogo: string;

  @Column()
  awayScore: string;

  @Column({ type: 'simple-json' })
  odds: any;

  @Column({ nullable: true })
  bookmakers: string;

  @Column({ nullable: true })
  url: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
