import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('countries')
@Index(['sportName', 'country'], { unique: true })
export class Country {
  @PrimaryColumn()
  sportName: string;

  @PrimaryColumn()
  country: string;

  @Column({ nullable: true })
  sportAlt: string;

  @Column({ nullable: true })
  flag: string;

  @Column({ nullable: true })
  url: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
