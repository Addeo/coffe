import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { FormsModule } from '@angular/forms';
import { AgreementsService, Agreement } from '../../services/agreements.service';

export interface AgreementAcceptanceDialogData {
  agreements: Agreement[];
  missingAgreements: Agreement[];
  canClose?: boolean; // Можно ли закрыть без принятия
}

@Component({
  selector: 'app-agreement-acceptance-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    FormsModule,
  ],
  templateUrl: './agreement-acceptance-dialog.component.html',
  styleUrls: ['./agreement-acceptance-dialog.component.scss'],
})
export class AgreementAcceptanceDialogComponent implements OnInit {
  private agreementsService = inject(AgreementsService);
  private dialogRef = inject(MatDialogRef<AgreementAcceptanceDialogComponent>);
  data = inject<AgreementAcceptanceDialogData>(MAT_DIALOG_DATA);

  acceptedAgreements = signal<Set<number>>(new Set());
  loading = signal(false);
  error = signal<string | null>(null);
  
  // Для отображения соглашений по типам
  agreementsByType: Map<string, Agreement[]> = new Map();
  agreementsByTypeArray: Array<[string, Agreement[]]> = []; // Для итерации в шаблоне
  selectedTab = signal(0);

  ngOnInit(): void {
    // Группируем соглашения по типам
    const allAgreements = this.data.missingAgreements.length > 0 
      ? this.data.missingAgreements 
      : this.data.agreements;

    allAgreements.forEach(agreement => {
      if (!this.agreementsByType.has(agreement.type)) {
        this.agreementsByType.set(agreement.type, []);
      }
      this.agreementsByType.get(agreement.type)!.push(agreement);
    });

    // Преобразуем Map в массив для итерации в шаблоне
    this.agreementsByTypeArray = Array.from(this.agreementsByType.entries());

    // Если есть обязательные соглашения, они должны быть приняты
    const mandatoryAgreements = allAgreements.filter(a => a.isMandatory);
    if (mandatoryAgreements.length > 0) {
      // Автоматически отмечаем их как требующие принятия
      // (чекбоксы будут обязательными для принятия)
    }
  }

  /**
   * Получить название типа соглашения
   */
  getAgreementTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      terms_of_service: 'Пользовательское соглашение',
      privacy_policy: 'Политика конфиденциальности',
      data_processing: 'Согласие на обработку персональных данных',
    };
    return labels[type] || type;
  }

  /**
   * Переключить принятие соглашения
   */
  toggleAgreement(agreementId: number, event: any): void {
    const accepted = this.acceptedAgreements();
    if (event.checked) {
      accepted.add(agreementId);
    } else {
      accepted.delete(agreementId);
    }
    this.acceptedAgreements.set(new Set(accepted));
  }

  /**
   * Проверить, принято ли соглашение
   */
  isAgreementAccepted(agreementId: number): boolean {
    return this.acceptedAgreements().has(agreementId);
  }

  /**
   * Проверить, все ли обязательные соглашения приняты
   */
  canAccept(): boolean {
    const allAgreements = this.data.missingAgreements.length > 0 
      ? this.data.missingAgreements 
      : this.data.agreements;
    
    const mandatoryAgreements = allAgreements.filter(a => a.isMandatory);
    const accepted = this.acceptedAgreements();
    
    // Все обязательные соглашения должны быть приняты
    return mandatoryAgreements.every(a => accepted.has(a.id));
  }

  /**
   * Принять соглашения
   */
  async accept(): Promise<void> {
    const accepted = Array.from(this.acceptedAgreements());
    
    if (accepted.length === 0) {
      this.error.set('Пожалуйста, примите хотя бы одно соглашение');
      return;
    }

    if (!this.canAccept()) {
      this.error.set('Пожалуйста, примите все обязательные соглашения');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      await this.agreementsService.acceptAgreements(accepted).toPromise();
      this.dialogRef.close({ accepted: true, agreementIds: accepted });
    } catch (err: any) {
      this.error.set(err.error?.message || 'Не удалось принять соглашения');
      this.loading.set(false);
    }
  }

  /**
   * Закрыть диалог
   */
  close(): void {
    if (this.data.canClose) {
      this.dialogRef.close({ accepted: false });
    }
  }

  /**
   * Рендерить HTML контент соглашения
   */
  renderContent(content: string): string {
    // Простой рендеринг Markdown в HTML (базовый)
    let html = content
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/\n/gim, '<br>');

    return html;
  }
}

