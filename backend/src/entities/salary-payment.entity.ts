import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Engineer } from './engineer.entity';
import { User } from './user.entity';
import { SalaryCalculation } from './salary-calculation.entity';

export enum PaymentType {
  ADVANCE = 'advance', // Аванс (выплата вперед)
  REGULAR = 'regular', // Обычная выплата по начислению
  BONUS = 'bonus', // Премия
  ADJUSTMENT = 'adjustment', // Корректировка (может быть отрицательной)
}

export enum PaymentMethod {
  CASH = 'cash', // Наличные
  BANK_TRANSFER = 'bank_transfer', // Банковский перевод
  CARD = 'card', // На карту
  OTHER = 'other', // Другое
}

export enum PaymentStatus {
  PENDING = 'pending', // Ожидает выплаты
  COMPLETED = 'completed', // Выплачено
  CANCELLED = 'cancelled', // Отменено
}

@Entity('salary_payments')
@Index(['engineerId', 'paymentDate'])
@Index(['paymentDate'])
@Index(['status'])
export class SalaryPayment {
  @PrimaryGeneratedColumn()
  id: number;

  // Связь с инженером
  @ManyToOne(() => Engineer)
  @JoinColumn({ name: 'engineer_id' })
  engineer: Engineer;

  @Column({ name: 'engineer_id' })
  engineerId: number;

  // Связь с начислением (может быть null для авансов)
  @ManyToOne(() => SalaryCalculation, { nullable: true })
  @JoinColumn({ name: 'salary_calculation_id' })
  salaryCalculation: SalaryCalculation | null;

  @Column({ name: 'salary_calculation_id', nullable: true })
  salaryCalculationId: number | null;

  // Период, за который выплата (для авансов)
  @Column({ nullable: true })
  month: number; // 1-12

  @Column({ nullable: true })
  year: number;

  // Сумма выплаты
  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  // Тип и метод выплаты
  @Column({
    type: 'varchar',
    length: 20,
    default: PaymentType.REGULAR,
  })
  type: PaymentType;

  @Column({
    type: 'varchar',
    length: 20,
    default: PaymentMethod.BANK_TRANSFER,
  })
  method: PaymentMethod;

  // Статус выплаты
  @Column({
    type: 'varchar',
    length: 20,
    default: PaymentStatus.COMPLETED,
  })
  status: PaymentStatus;

  // Дата выплаты (фактическая)
  @Column({ name: 'payment_date', type: 'date' })
  paymentDate: Date;

  // Комментарий
  @Column({ type: 'text', nullable: true })
  notes: string;

  // Кто выплатил
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'paid_by' })
  paidBy: User;

  @Column({ name: 'paid_by', nullable: true })
  paidById: number;

  // Номер документа (для бухгалтерии)
  @Column({ name: 'document_number', nullable: true })
  documentNumber: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
