import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';

export enum TicketStatus {
  PENDING = 'pending',
  WON = 'won',
  LOST = 'lost',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum BetType {
  SINGLE = 'single',
  MULTI = 'multi',
  SYSTEM = 'system',
}

@Entity('tickets')
@Index(['userId', 'createdAt'])
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: BetType,
    default: BetType.SINGLE,
  })
  betType: BetType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  stake: number;

  @Column({ type: 'decimal', precision: 10, scale: 4 })
  totalOdds: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  potentialWin: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  actualWin: number;

  @Column({
    type: 'enum',
    enum: TicketStatus,
    default: TicketStatus.PENDING,
  })
  status: TicketStatus;

  @Column({ type: 'jsonb' })
  selections: any; // Array of bet selections with match details, odds, etc.

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
