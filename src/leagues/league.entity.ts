import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Sport } from '../sports/sport.entity';

@Entity('leagues')
export class League {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  country: string;

  @Column({ unique: true })
  url: string;

  @Column()
  sportName: string;

  @ManyToOne(() => Sport, { eager: false })
  @JoinColumn({ name: 'sportId' })
  sport: Sport;

  @Column({ nullable: true })
  sportId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
