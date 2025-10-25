import { Component, Input, Output, EventEmitter, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { WorkSessionDto, WorkSessionSummaryDto } from '../../../../shared/dtos/work-session.dto';
import { WorkSessionsService } from '../../services/work-sessions.service';

@Component({
  selector: 'app-work-session-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
  ],
  templateUrl: './work-session-list.component.html',
  styleUrls: ['./work-session-list.component.scss'],
})
export class WorkSessionListComponent implements OnInit {
  private readonly workSessionsService = inject(WorkSessionsService);

  @Input() orderId!: number;
  @Input() canEdit = false;
  @Input() canDelete = false;

  @Output() sessionCreated = new EventEmitter<void>();
  @Output() sessionUpdated = new EventEmitter<WorkSessionDto>();
  @Output() sessionDeleted = new EventEmitter<number>();

  sessions: WorkSessionDto[] = [];
  summary: WorkSessionSummaryDto | null = null;
  loading = false;
  error: string | null = null;

  ngOnInit(): void {
    this.loadSessions();
  }

  loadSessions(): void {
    if (!this.orderId) {
      return;
    }

    this.loading = true;
    this.error = null;

    this.workSessionsService.getOrderWorkSessions(this.orderId).subscribe({
      next: sessions => {
        this.sessions = sessions;
        this.summary = this.workSessionsService.calculateSessionsSummary(sessions);
        this.loading = false;
      },
      error: err => {
        this.error = 'Не удалось загрузить рабочие сессии';
        console.error('Error loading work sessions:', err);
        this.loading = false;
      },
    });
  }

  formatDate(date: string | Date): string {
    const d = new Date(date);
    return d.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  formatHours(hours: number): string {
    return hours.toFixed(2);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  onEditSession(session: WorkSessionDto): void {
    // Будет реализовано позже через диалог
    console.log('Edit session:', session);
  }

  onDeleteSession(session: WorkSessionDto): void {
    if (!confirm(`Удалить сессию от ${this.formatDate(session.workDate)}?`)) {
      return;
    }

    this.workSessionsService.deleteWorkSession(session.id).subscribe({
      next: () => {
        this.sessionDeleted.emit(session.id);
        this.loadSessions();
      },
      error: err => {
        alert('Не удалось удалить сессию');
        console.error('Error deleting session:', err);
      },
    });
  }

  getTotalPayment(session: WorkSessionDto): number {
    return session.calculatedAmount + session.carUsageAmount;
  }

  trackBySessionId(index: number, session: WorkSessionDto): number {
    return session.id;
  }
}
