import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private dialog = inject(MatDialog);

  openDialog<T, D = any, R = any>(
    component: any,
    data?: D,
    config?: any
  ): Observable<R | undefined> {
    const dialogRef = this.dialog.open(component, {
      data,
      width: '600px',
      maxWidth: '90vw',
      disableClose: false,
      hasBackdrop: true,
      backdropClass: 'modal-backdrop',
      panelClass: 'modal-panel',
      ...config
    });

    return dialogRef.afterClosed();
  }

  closeAll(): void {
    this.dialog.closeAll();
  }
}
