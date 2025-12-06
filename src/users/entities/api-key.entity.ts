import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity()
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Store the HASH, not the real key
  @Column()
  key_hash: string;

  // Show the prefix (e.g. "sk_live_123...") to the user
  @Column()
  prefix: string;

  @Column({ default: true })
  is_active: boolean;

  @ManyToOne(() => User, (user) => user.apiKeys, { onDelete: 'CASCADE' })
  user: User;

  @CreateDateColumn()
  created_at: Date;
}
