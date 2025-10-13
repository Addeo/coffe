import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { CreateWorkSessionDto } from '@shared/dtos/work-session.dto';
import { WorkSessionsService } from '../../services/work-sessions.service';

@Component({
  selector: 'app-work-session-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatCardModule,
    MatIconModule,
  ],
  templateUrl: './work-session-form.component.html',
  styleUrls: ['./work-session-form.component.scss'],
})
export class WorkSessionFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly workSessionsService = inject(WorkSessionsService);

  @Input() orderId!: number;
  @Output() sessionCreated = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  sessionForm!: FormGroup;
  loading = false;
  error: string | null = null;

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    this.sessionForm = this.fb.group({
      workDate: [new Date(), Validators.required],
      regularHours: [0, [Validators.required, Validators.min(0), Validators.max(24)]],
      overtimeHours: [0, [Validators.required, Validators.min(0), Validators.max(24)]],
      carPayment: [0, [Validators.required, Validators.min(0)]],
      distanceKm: [null, [Validators.min(0)]],
      territoryType: [''],
      notes: [''],
      photoUrl: [''],
      canBeInvoiced: [true],
    });
  }

  onSubmit(): void {
    if (this.sessionForm.invalid) {
      this.sessionForm.markAllAsTouched();
      return;
    }

    if (!this.orderId) {
      this.error = 'ID заказа не указан';
      return;
    }

    this.loading = true;
    this.error = null;

    const formValue = this.sessionForm.value;
    const workDate = formValue.workDate instanceof Date
      ? this.workSessionsService.formatDateForApi(formValue.workDate)
      : formValue.workDate;

    const data: CreateWorkSessionDto = {
      workDate,
      regularHours: Number(formValue.regularHours),
      overtimeHours: Number(formValue.overtimeHours),
      carPayment: Number(formValue.carPayment),
      distanceKm: formValue.distanceKm ? Number(formValue.distanceKm) : undefined,
      territoryType: formValue.territoryType || undefined,
      notes: formValue.notes || undefined,
      photoUrl: formValue.photoUrl || undefined,
      canBeInvoiced: formValue.canBeInvoiced,
    };

    this.workSessionsService.createWorkSession(this.orderId, data).subscribe({
      next: () => {
        this.loading = false;
        this.sessionCreated.emit();
        this.sessionForm.reset({
          workDate: new Date(),
          regularHours: 0,
          overtimeHours: 0,
          carPayment: 0,
          canBeInvoiced: true,
        });
      },
      error: (err) => {
        this.loading = false;
        this.error = 'Не удалось создать рабочую сессию';
        console.error('Error creating work session:', err);
      },
    });
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  get totalHours(): number {
    const regular = this.sessionForm.get('regularHours')?.value || 0;
    const overtime = this.sessionForm.get('overtimeHours')?.value || 0;
    return Number(regular) + Number(overtime);
  }
}

