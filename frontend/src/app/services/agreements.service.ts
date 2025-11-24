import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export enum AgreementType {
  TERMS_OF_SERVICE = 'terms_of_service',
  PRIVACY_POLICY = 'privacy_policy',
  DATA_PROCESSING = 'data_processing',
}

export interface Agreement {
  id: number;
  type: AgreementType;
  version: string;
  title: string;
  content: string;
  isActive: boolean;
  isMandatory: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserAgreement {
  id: number;
  userId: number;
  agreementType: AgreementType;
  version: string;
  isAccepted: boolean;
  acceptedAt: Date | null;
}

export interface AgreementsStatus {
  hasAcceptedAll: boolean;
  missingAgreements: {
    id: number;
    type: AgreementType;
    version: string;
    title: string;
  }[];
  userAgreements: UserAgreement[];
}

@Injectable({
  providedIn: 'root',
})
export class AgreementsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/agreements`;

  /**
   * Получить все активные соглашения
   */
  getActiveAgreements(): Observable<Agreement[]> {
    return this.http.get<Agreement[]>(this.apiUrl);
  }

  /**
   * Получить соглашения определенного типа
   */
  getAgreementsByType(type: AgreementType): Observable<Agreement[]> {
    return this.http.get<Agreement[]>(`${this.apiUrl}/type/${type}`);
  }

  /**
   * Получить последнюю версию соглашения определенного типа
   */
  getLatestAgreement(type: AgreementType): Observable<Agreement> {
    return this.http.get<Agreement>(`${this.apiUrl}/latest/${type}`);
  }

  /**
   * Получить соглашение по ID
   */
  getAgreementById(id: number): Observable<Agreement> {
    return this.http.get<Agreement>(`${this.apiUrl}/${id}`);
  }

  /**
   * Проверить статус принятия соглашений текущим пользователем
   */
  checkUserAgreements(): Observable<AgreementsStatus> {
    return this.http.get<AgreementsStatus>(`${this.apiUrl}/user/check`);
  }

  /**
   * Получить историю принятия соглашений текущим пользователем
   */
  getUserAgreementHistory(): Observable<UserAgreement[]> {
    return this.http.get<UserAgreement[]>(`${this.apiUrl}/user/history`);
  }

  /**
   * Принять соглашения
   */
  acceptAgreements(agreementIds: number[]): Observable<UserAgreement[]> {
    return this.http.post<UserAgreement[]>(`${this.apiUrl}/accept`, {
      agreementIds,
    });
  }
}
