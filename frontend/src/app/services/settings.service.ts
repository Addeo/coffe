import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AutoDistributionSettings {
  autoDistributionEnabled: boolean;
  maxOrdersPerEngineer: number;
}

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private http = inject(HttpClient);

  getAutoDistributionSettings(): Observable<AutoDistributionSettings> {
    return this.http.get<AutoDistributionSettings>(
      `${environment.apiUrl}/settings/auto-distribution`
    );
  }

  updateAutoDistributionSettings(settings: {
    enabled: boolean;
    maxOrdersPerEngineer?: number;
  }): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${environment.apiUrl}/settings/auto-distribution`,
      settings
    );
  }
}
