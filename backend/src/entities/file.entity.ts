import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { User } from './user.entity';
import { Order } from './order.entity';
import { FileType } from '../shared/dtos/file.dto';

@Entity('files')
export class File {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  filename: string;

  @Column({ name: 'original_name' })
  originalName: string;

  @Column()
  mimetype: string;

  @Column()
  size: number;

  @Column({ nullable: true })
  path: string;

  @Column('blob', { name: 'file_data', nullable: true, select: false }) // Don't select by default to reduce response size
  @Exclude() // Exclude fileData from serialization by default
  fileData: Buffer;

  @Column({
    type: 'varchar',
    length: 20,
    default: FileType.OTHER,
  })
  type: FileType;

  @Column({ nullable: true })
  description: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'uploaded_by' })
  uploadedBy: User;

  @Column({ name: 'uploaded_by', nullable: true })
  uploadedById: number;

  @ManyToOne(() => Order, { nullable: true })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'order_id', nullable: true })
  orderId: number;

  @CreateDateColumn({ name: 'uploaded_at' })
  uploadedAt: Date;

  // Custom JSON serialization to exclude fileData
  toJSON() {
    const { fileData, ...rest } = this;
    return rest;
  }
}
