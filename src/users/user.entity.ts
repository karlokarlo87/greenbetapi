import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  lastname: string;

  @Column({ unique: true })
  @Index()
  personalnumber: string;

  @Column({ type: 'date' })
  birthDate: Date;

  @Column()
  mobile: string;

  @Column({ unique: true })
  @Index()
  email: string;

  @Column({ unique: true })
  @Index()
  username: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  refreshToken: string;

  @Column({ nullable: true })
  resetPasswordToken: string;

  @Column({ type: 'timestamp', nullable: true })
  resetPasswordExpires: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
