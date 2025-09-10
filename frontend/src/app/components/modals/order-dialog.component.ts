import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { OrdersService } from '../../services/orders.service';
import { OrganizationsService } from '../../services/organizations.service';
import { ToastService } from '../../services/toast.service';
import { CreateOrderDto, UpdateOrderDto, OrderDto } from '../../../../../shared/dtos/order.dto';
import { TerritoryType, OrderStatus, OrderSource } from '../../../../../shared/interfaces/order.interface';
import { OrganizationDto } from '../../../../../shared/dtos/organization.dto';

export interface OrderDialogData {
  order?: OrderDto;
  isEdit?: boolean;
}

@Component({
  selector: 'app-order-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="order-dialog">
      <h2 mat-dialog-title>
        {{ data.isEdit ? 'Edit Order' : 'Create New Order' }}
      </h2>

      <mat-dialog-content>
        <form [formGroup]="orderForm" class="order-form">
          <mat-form-field appearance="outline" class="form-field">
            <mat-label>Title</mat-label>
            <input matInput formControlName="title" placeholder="Enter order title" />
            <mat-error *ngIf="orderForm.get('title')?.hasError('required')">
              Title is required
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="form-field">
            <mat-label>Description</mat-label>
            <textarea
              matInput
              formControlName="description"
              placeholder="Enter order description"
              rows="3"
            ></textarea>
          </mat-form-field>

          <div class="form-row">
            <mat-form-field appearance="outline" class="form-field">
              <mat-label>Organization</mat-label>
              <mat-select formControlName="organizationId">
                <mat-option *ngFor="let org of organizations()" [value]="org.id">
                  {{ org.name }}
                </mat-option>
              </mat-select>
              <mat-error *ngIf="orderForm.get('organizationId')?.hasError('required')">
                Organization is required
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="form-field">
              <mat-label>Location</mat-label>
              <input matInput formControlName="location" placeholder="Enter location" />
              <mat-error *ngIf="orderForm.get('location')?.hasError('required')">
                Location is required
              </mat-error>
            </mat-form-field>
          </div>

          <div class="form-row">
            <mat-form-field appearance="outline" class="form-field">
              <mat-label>Distance (km)</mat-label>
              <input
                matInput
                type="number"
                formControlName="distanceKm"
                placeholder="Distance in km"
                min="0"
                step="0.1"
              />
            </mat-form-field>

            <mat-form-field appearance="outline" class="form-field">
              <mat-label>Territory Type</mat-label>
              <mat-select formControlName="territoryType">
                <mat-option [value]="TerritoryType.URBAN">Urban</mat-option>
                <mat-option [value]="TerritoryType.SUBURBAN">Suburban</mat-option>
                <mat-option [value]="TerritoryType.RURAL">Rural</mat-option>
                <mat-option [value]="TerritoryType.HOME">Home (≤60 km)</mat-option>
                <mat-option [value]="TerritoryType.ZONE_1">Zone 1 (61-199 km)</mat-option>
                <mat-option [value]="TerritoryType.ZONE_2">Zone 2 (200-250 km)</mat-option>
                <mat-option [value]="TerritoryType.ZONE_3">Zone 3 (>250 km)</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="form-field">
            <mat-label>Planned Start Date</mat-label>
            <input matInput [matDatepicker]="picker" formControlName="plannedStartDate" />
            <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
            <mat-datepicker #picker></mat-datepicker>
          </mat-form-field>

          <div class="form-row" *ngIf="data.isEdit">
            <mat-form-field appearance="outline" class="form-field">
              <mat-label>Order Status</mat-label>
              <mat-select formControlName="status">
                <mat-option [value]="OrderStatus.WAITING">Waiting</mat-option>
                <mat-option [value]="OrderStatus.PROCESSING">Processing</mat-option>
                <mat-option [value]="OrderStatus.WORKING">In Progress</mat-option>
                <mat-option [value]="OrderStatus.REVIEW">Under Review</mat-option>
                <mat-option [value]="OrderStatus.COMPLETED">Completed</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="form-field">
              <mat-label>Source</mat-label>
              <mat-select formControlName="source">
                <mat-option [value]="OrderSource.MANUAL">Manual</mat-option>
                <mat-option [value]="OrderSource.AUTOMATIC">Automatic</mat-option>
                <mat-option [value]="OrderSource.EMAIL">Email</mat-option>
                <mat-option [value]="OrderSource.API">API</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <div class="form-row" *ngIf="data.isEdit">
            <mat-form-field appearance="outline" class="form-field">
              <mat-label>Actual Start Date</mat-label>
              <input matInput [matDatepicker]="actualPicker" formControlName="actualStartDate" />
              <mat-datepicker-toggle matSuffix [for]="actualPicker"></mat-datepicker-toggle>
              <mat-datepicker #actualPicker></mat-datepicker>
            </mat-form-field>

            <mat-form-field appearance="outline" class="form-field">
              <mat-label>Completion Date</mat-label>
              <input matInput [matDatepicker]="completionPicker" formControlName="completionDate" />
              <mat-datepicker-toggle matSuffix [for]="completionPicker"></mat-datepicker-toggle>
              <mat-datepicker #completionPicker></mat-datepicker>
            </mat-form-field>
          </div>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">Cancel</button>
        <button
          mat-raised-button
          color="primary"
          (click)="onSave()"
          [disabled]="orderForm.invalid || isLoading()"
        >
          <mat-spinner diameter="20" *ngIf="isLoading()"></mat-spinner>
          <span *ngIf="!isLoading()">{{ data.isEdit ? 'Update' : 'Create' }}</span>
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .order-dialog {
        min-width: 600px;
        max-width: 90vw;
        border-radius: 12px;
        overflow: hidden;
      }

      h2[mat-dialog-title] {
        margin: 0;
        padding: 24px 24px 16px 24px;
        font-size: 24px;
        font-weight: 500;
        color: #1976d2;
        border-bottom: 1px solid #e0e0e0;
      }

      .order-form {
        display: flex;
        flex-direction: column;
        gap: 20px;
        padding: 24px;
        max-height: 70vh;
        overflow-y: auto;
      }

      .form-row {
        display: flex;
        gap: 16px;
        align-items: flex-start;
      }

      .form-field {
        flex: 1;
        min-width: 0;
      }

      mat-form-field {
        width: 100%;
      }

      textarea {
        resize: vertical;
        min-height: 80px;
      }

      mat-dialog-content {
        padding: 0 !important;
      }

      mat-dialog-actions {
        padding: 16px 24px 24px 24px;
        margin: 0;
        border-top: 1px solid #e0e0e0;
        justify-content: flex-end;
        gap: 12px;
      }

      button {
        min-width: 100px;
        border-radius: 8px;
        text-transform: uppercase;
        font-weight: 500;
        letter-spacing: 0.5px;
      }

      button[color='primary'] {
        background-color: #1976d2;
        color: white;
      }

      button[color='primary']:disabled {
        background-color: #ccc;
        color: #666;
      }

      .mat-mdc-form-field {
        margin-bottom: 0;
      }

      .mat-mdc-form-field-outline {
        border-radius: 8px;
      }

      .mdc-text-field--outlined .mdc-notched-outline__leading,
      .mdc-text-field--outlined .mdc-notched-outline__notch,
      .mdc-text-field--outlined .mdc-notched-outline__trailing {
        border-radius: 8px;
      }

      mat-error {
        font-size: 12px;
        margin-top: 4px;
      }

      /* Responsive design */
      @media (max-width: 600px) {
        .order-dialog {
          min-width: 95vw;
          margin: 16px;
        }

        .form-row {
          flex-direction: column;
          gap: 20px;
        }

        .order-form {
          padding: 16px;
          gap: 16px;
        }

        h2[mat-dialog-title] {
          padding: 20px 16px 12px 16px;
          font-size: 20px;
        }

        mat-dialog-actions {
          padding: 12px 16px 20px 16px;
          flex-direction: column;
          gap: 8px;
        }

        button {
          width: 100%;
          min-width: unset;
        }
      }
    `,
  ],
})
export class OrderDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<OrderDialogComponent>);
  private ordersService = inject(OrdersService);
  private organizationsService = inject(OrganizationsService);
  private toastService = inject(ToastService);

  data: OrderDialogData = inject(MAT_DIALOG_DATA);
  isLoading = signal(false);
  organizations = signal<OrganizationDto[]>([]);
  TerritoryType = TerritoryType;
  OrderStatus = OrderStatus;
  OrderSource = OrderSource;

  orderForm: FormGroup = this.fb.group({
    title: ['', [Validators.required]],
    description: [''],
    organizationId: [null, [Validators.required]],
    location: ['', [Validators.required]],
    distanceKm: [null],
    territoryType: [null],
    plannedStartDate: [null],
    source: [OrderSource.MANUAL],
    status: [OrderStatus.WAITING],
    actualStartDate: [null],
    completionDate: [null],
  });

  ngOnInit() {
    this.loadOrganizations();

    if (this.data.isEdit && this.data.order) {
      this.orderForm.patchValue({
        title: this.data.order.title,
        description: this.data.order.description,
        organizationId: this.data.order.organizationId,
        location: this.data.order.location,
        distanceKm: this.data.order.distanceKm,
        territoryType: this.data.order.territoryType,
        plannedStartDate: this.data.order.plannedStartDate,
        source: this.data.order.source,
        status: this.data.order.status,
        actualStartDate: this.data.order.actualStartDate,
        completionDate: this.data.order.completionDate,
      });
    }
  }

  private loadOrganizations() {
    this.organizationsService.getOrganizations().subscribe({
      next: response => {
        this.organizations.set(response.data.filter(org => org.isActive));
      },
      error: error => {
        console.error('Error loading organizations:', error);
        this.toastService.error('Error loading organizations');
      },
    });
  }

  onSave() {
    if (this.orderForm.invalid) {
      return;
    }

    this.isLoading.set(true);

    if (this.data.isEdit && this.data.order) {
      this.updateOrder();
    } else {
      this.createOrder();
    }
  }

  private createOrder() {
    const formValue = this.orderForm.value;
    const orderData: CreateOrderDto = {
      title: formValue.title,
      description: formValue.description || undefined,
      organizationId: formValue.organizationId,
      location: formValue.location,
      distanceKm: formValue.distanceKm || undefined,
      territoryType: formValue.territoryType || undefined,
      plannedStartDate: formValue.plannedStartDate || undefined,
      source: formValue.source,
    };

    this.ordersService.createOrder(orderData).subscribe({
      next: order => {
        this.toastService.success('Order created successfully');
        this.dialogRef.close(order);
      },
      error: error => {
        console.error('Error creating order:', error);
        this.toastService.error('Error creating order. Please try again.');
        this.isLoading.set(false);
      },
    });
  }

  private updateOrder() {
    if (!this.data.order) return;

    const formValue = this.orderForm.value;
    const orderData: UpdateOrderDto = {
      title: formValue.title,
      description: formValue.description || undefined,
      organizationId: formValue.organizationId,
      location: formValue.location,
      distanceKm: formValue.distanceKm || undefined,
      territoryType: formValue.territoryType || undefined,
      plannedStartDate: formValue.plannedStartDate || undefined,
      source: formValue.source,
      status: formValue.status,
      actualStartDate: formValue.actualStartDate || undefined,
      completionDate: formValue.completionDate || undefined,
    };

    this.ordersService.updateOrder(this.data.order.id, orderData).subscribe({
      next: order => {
        this.toastService.success('Order updated successfully');
        this.dialogRef.close(order);
      },
      error: error => {
        console.error('Error updating order:', error);
        this.toastService.error('Error updating order. Please try again.');
        this.isLoading.set(false);
      },
    });
  }

  onCancel() {
    this.dialogRef.close();
  }
}
