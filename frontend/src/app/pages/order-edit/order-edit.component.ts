import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpEventType } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { OrdersService } from '../../services/orders.service';
import { OrganizationsService } from '../../services/organizations.service';
import { FilesService } from '../../services/files.service';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';
import { WorkSessionListComponent } from '../../components/work-session-list/work-session-list.component';
import { WorkSessionFormComponent } from '../../components/work-session-form/work-session-form.component';
import { CreateOrderDto, UpdateOrderDto, OrderDto } from '@shared/dtos/order.dto';
import { TerritoryType, OrderStatus, OrderSource } from '@shared/interfaces/order.interface';
import { UserRole } from '@shared/interfaces/user.interface';
import { OrganizationDto } from '@shared/dtos/organization.dto';
import { FileResponseDto, FileType } from '@shared/dtos/file.dto';

interface FileUploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  uploadedFileId?: string;
}

@Component({
  selector: 'app-order-edit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatTabsModule,
    MatCardModule,
    WorkSessionListComponent,
    WorkSessionFormComponent,
  ],
  templateUrl: './order-edit.component.html',
  styleUrl: './order-edit.component.scss',
})
export class OrderEditComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ordersService = inject(OrdersService);
  private organizationsService = inject(OrganizationsService);
  private filesService = inject(FilesService);
  private toastService = inject(ToastService);
  authService = inject(AuthService);

  isLoading = signal(false);
  organizations = signal<OrganizationDto[]>([]);
  TerritoryType = TerritoryType;
  OrderStatus = OrderStatus;
  OrderSource = OrderSource;
  UserRole = UserRole;

  orderId: number | null = null;
  isEdit = false;
  order: OrderDto | null = null;

  // File management
  attachedFiles = signal<FileResponseDto[]>([]);
  selectedFiles: File[] = [];
  isUploadingFiles = signal(false);
  isDragOver = signal(false);
  uploadProgress = signal<FileUploadProgress[]>([]);

  // Image Viewer Modal
  imageModalVisible = false;
  currentImageMetadata: any = null;

  // Tabs
  selectedTabIndex = 0;

  // Доступные статусы заказа в зависимости от роли пользователя
  get availableStatuses(): OrderStatus[] {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return [];

    // Админы и менеджеры могут устанавливать любой статус
    if (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER) {
      return Object.values(OrderStatus);
    }

    // Инженеры имеют ограниченный набор статусов в зависимости от текущего статуса заказа
    if (currentUser.role === UserRole.USER && this.order) {
      if (this.order.assignedEngineerId === currentUser.id) {
        switch (this.order.status) {
          case OrderStatus.ASSIGNED:
            return [OrderStatus.ASSIGNED]; // Может только принять через кнопку, не через select
          case OrderStatus.PROCESSING:
            return [OrderStatus.PROCESSING, OrderStatus.WORKING];
          case OrderStatus.WORKING:
            return [OrderStatus.WORKING, OrderStatus.REVIEW];
          case OrderStatus.REVIEW:
            return [OrderStatus.REVIEW]; // Только админы могут завершать
          default:
            return [this.order.status]; // Текущий статус, если нельзя менять
        }
      }
    }

    return [];
  }

  // Проверка, является ли пользователь инженером
  get isEngineer(): boolean {
    const currentUser = this.authService.currentUser();
    return currentUser?.role === UserRole.USER;
  }

  // Проверка, может ли пользователь редактировать заказ
  get canEditOrder(): boolean {
    const currentUser = this.authService.currentUser();
    if (!currentUser || !this.order) return false;

    // Админы и менеджеры могут редактировать любой заказ
    if (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER) {
      return true;
    }

    // Инженеры могут редактировать только свои назначенные заказы
    if (currentUser.role === UserRole.USER) {
      return this.order.assignedEngineerId === currentUser.id;
    }

    return false;
  }

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
    files: [[]], // Array of file IDs
  });

  // Work Report Form (only for engineers)
  workReportForm: FormGroup = this.fb.group({
    regularHours: [null, [Validators.required, Validators.min(0)]],
    overtimeHours: [null, [Validators.min(0)]],
    carPayment: [null, [Validators.min(0)]],
    distanceKm: [null, [Validators.min(0)]],
    territoryType: [null],
    notes: [''],
  });

  // Show work report tab for engineers when order is WORKING or COMPLETED
  showWorkReportTab = computed(() => {
    return (
      this.isEngineer &&
      this.isEdit &&
      this.order &&
      (this.order.status === OrderStatus.WORKING || this.order.status === OrderStatus.COMPLETED)
    );
  });

  ngOnInit() {
    this.loadOrganizations();

    // Get order ID from route params
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.orderId = +id;
        this.isEdit = true;
        this.loadOrder(this.orderId);
      }
    });
  }

  private loadOrder(id: number) {
    this.isLoading.set(true);

    this.ordersService.getOrder(id).subscribe({
      next: order => {
        this.order = order;
        this.populateForm(order);
        this.isLoading.set(false);
      },
      error: error => {
        console.error('Error loading order:', error);
        this.toastService.error('Ошибка загрузки заказа');
        this.isLoading.set(false);
        this.router.navigate(['/orders']);
      },
    });
  }

  private populateForm(order: OrderDto) {
    this.orderForm.patchValue({
      title: order.title,
      description: order.description,
      organizationId: order.organizationId,
      location: order.location,
      distanceKm: order.distanceKm,
      territoryType: order.territoryType,
      plannedStartDate: order.plannedStartDate,
      source: order.source,
      status: order.status,
      actualStartDate: order.actualStartDate,
      completionDate: order.completionDate,
      files: order.files?.map(f => f.id) || [],
    });

    // Populate work report form if data exists
    if (order.regularHours !== undefined || order.overtimeHours !== undefined) {
      console.log('📋 Loading existing work data:', {
        regularHours: order.regularHours,
        overtimeHours: order.overtimeHours,
        carUsageAmount: order.carUsageAmount,
        workNotes: order.workNotes,
      });

      this.workReportForm.patchValue({
        regularHours: order.regularHours || 0,
        overtimeHours: order.overtimeHours || 0,
        carPayment: order.carUsageAmount || 0,
        distanceKm: order.distanceKm || null,
        territoryType: order.territoryType || null,
        notes: order.workNotes || '',
      });

      // Disable form if work data already exists and order is completed
      if (order.status === 'completed') {
        this.workReportForm.disable();
        console.log('ℹ️ Work report form disabled - order already completed');
      }
    }

    // Load attached files
    if (order.files) {
      console.log(
        'Loading existing order files:',
        order.files.map(f => ({ id: f.id, name: f.originalName }))
      );
      this.attachedFiles.set(order.files);
    } else {
      console.log('No existing files found for order');
    }
  }

  private loadOrganizations() {
    this.organizationsService.getOrganizations().subscribe({
      next: response => {
        this.organizations.set(response.data.filter(org => org.isActive));
      },
      error: error => {
        console.error('Ошибка загрузки организаций:', error);
        this.toastService.error('Ошибка загрузки организаций');
      },
    });
  }

  // File handling methods
  onFileSelected(event: any) {
    const files = event.target.files;
    if (files && files.length > 0) {
      this.addFilesAndStartUpload(Array.from(files));
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.addFilesAndStartUpload(Array.from(files));
    }
  }

  private async addFilesAndStartUpload(files: File[]) {
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    const validFiles: File[] = [];

    for (const file of files) {
      if (file.size > maxFileSize) {
        this.toastService.error(`Файл "${file.name}" слишком большой. Максимальный размер: 10MB`);
        continue;
      }

      if (!allowedTypes.includes(file.type)) {
        this.toastService.error(`Файл "${file.name}" имеет неподдерживаемый формат`);
        continue;
      }

      // Check for duplicates in current upload progress
      const isDuplicate = this.uploadProgress().some(
        p => p.file.name === file.name && p.file.size === file.size
      );
      if (isDuplicate) {
        this.toastService.warning(`Файл "${file.name}" уже добавлен`);
        continue;
      }

      validFiles.push(file);
    }

    // Start uploading valid files
    for (const file of validFiles) {
      this.startFileUpload(file);
    }
  }

  private async startFileUpload(file: File) {
    const progressItem: FileUploadProgress = {
      file,
      progress: 0,
      status: 'uploading',
    };

    // Add to progress tracking
    const currentProgress = this.uploadProgress();
    this.uploadProgress.set([...currentProgress, progressItem]);

    try {
      const uploadedFile = await this.filesService
        .uploadFile(file, FileType.ORDER_PHOTO)
        .toPromise();

      if (uploadedFile) {
        progressItem.progress = 100;
        progressItem.status = 'completed';
        progressItem.uploadedFileId = uploadedFile.id;

        this.toastService.success(`Файл "${file.name}" загружен успешно`);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Ошибка загрузки файла:', error);
      progressItem.status = 'error';
      progressItem.error = 'Ошибка загрузки файла';
      this.toastService.error(`Ошибка загрузки файла: ${file.name}`);
    }

    // Update progress
    const updatedProgress = this.uploadProgress();
    const index = updatedProgress.findIndex(p => p.file === file);
    if (index !== -1) {
      updatedProgress[index] = progressItem;
      this.uploadProgress.set([...updatedProgress]);
    }
  }

  removeSelectedFile(index: number) {
    this.selectedFiles.splice(index, 1);
  }

  removeUploadedFile(index: number) {
    const currentProgress = this.uploadProgress();
    const fileToRemove = currentProgress[index];

    // If file was successfully uploaded, we might want to delete it from server
    if (fileToRemove.uploadedFileId && fileToRemove.status === 'completed') {
      // Optional: delete file from server if not attached to order yet
      // this.filesService.deleteFile(fileToRemove.uploadedFileId).subscribe();
    }

    currentProgress.splice(index, 1);
    this.uploadProgress.set([...currentProgress]);
  }

  removeAttachedFile(fileId: string) {
    const currentFiles = this.orderForm.get('files')?.value || [];
    const updatedFiles = currentFiles.filter((id: string) => id !== fileId);
    this.orderForm.patchValue({ files: updatedFiles });

    const currentAttachedFiles = this.attachedFiles();
    this.attachedFiles.set(currentAttachedFiles.filter(f => f.id !== fileId));
  }

  // Enhanced file viewing methods
  async viewFile(fileId: string) {
    try {
      const fileMetadata = await this.filesService.getFileMetadata(fileId).toPromise();
      if (fileMetadata?.isImage) {
        this.openImageModal(fileMetadata);
      } else {
        // For non-image files, trigger download
        this.downloadFile(fileId);
      }
    } catch (error) {
      console.error('Error viewing file:', error);
      this.toastService.error('Ошибка при просмотре файла');
    }
  }

  async downloadFile(fileId: string) {
    try {
      const fileMetadata = await this.filesService.getFileMetadata(fileId).toPromise();
      if (fileMetadata?.downloadUrl) {
        // Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = fileMetadata.downloadUrl;
        link.download = fileMetadata.originalName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      this.toastService.error('Ошибка при скачивании файла');
    }
  }

  // Modal for image viewing
  openImageModal(fileMetadata: any) {
    this.currentImageMetadata = fileMetadata;
    this.imageModalVisible = true;
  }

  closeImageModal() {
    this.imageModalVisible = false;
    this.currentImageMetadata = null;
  }

  downloadCurrentImage() {
    if (this.currentImageMetadata) {
      this.downloadFile(this.currentImageMetadata.id);
    }
  }

  async onSave() {
    if (this.orderForm.invalid) {
      return;
    }

    this.isLoading.set(true);
    this.isUploadingFiles.set(true);

    try {
      if (this.isEdit && this.orderId) {
        await this.updateOrder();
      } else {
        await this.createOrder();
      }
    } catch (error) {
      console.error('Error saving order:', error);
      this.toastService.error('Ошибка сохранения заказа');
      this.isLoading.set(false);
      this.isUploadingFiles.set(false);
    }
  }

  private async createOrder() {
    const formValue = this.orderForm.value;

    // Get IDs of successfully uploaded files
    const completedUploads = this.getCompletedUploads();
    const fileIds = completedUploads
      .filter(upload => upload.uploadedFileId)
      .map(upload => upload.uploadedFileId!);

    console.log('Creating order with file IDs:', fileIds);

    // Create the order with attached files
    const orderData: CreateOrderDto = {
      title: formValue.title,
      description: formValue.description || undefined,
      organizationId: formValue.organizationId,
      location: formValue.location,
      distanceKm: formValue.distanceKm || undefined,
      territoryType: formValue.territoryType || undefined,
      plannedStartDate: formValue.plannedStartDate || undefined,
      source: formValue.source,
      files: fileIds.length > 0 ? fileIds : undefined,
    };

    this.ordersService.createOrder(orderData).subscribe({
      next: order => {
        this.toastService.success('Заказ создан успешно');
        this.clearFileData();
        this.router.navigate(['/orders']);
      },
      error: error => {
        console.error('Ошибка создания заказа:', error);
        this.toastService.error('Ошибка создания заказа. Попробуйте еще раз.');
        this.isLoading.set(false);
        this.isUploadingFiles.set(false);
      },
    });
  }

  private async updateOrder() {
    if (!this.orderId) return;

    const formValue = this.orderForm.value;

    // Get IDs of successfully uploaded files
    const completedUploads = this.getCompletedUploads();
    const newFileIds = completedUploads
      .filter(upload => upload.uploadedFileId)
      .map(upload => upload.uploadedFileId!);

    // Combine existing attached file IDs with new uploaded file IDs
    const existingFileIds = this.attachedFiles().map(file => file.id);
    const allFileIds = [...existingFileIds, ...newFileIds];

    console.log(
      'Updating order with file IDs:',
      allFileIds,
      '(existing:',
      existingFileIds,
      ', new:',
      newFileIds,
      ')'
    );

    // Get work report data if filled
    const workReportValue = this.workReportForm.value;
    const hasWorkData =
      workReportValue.regularHours !== null || workReportValue.overtimeHours !== null;

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
      files: allFileIds.length > 0 ? allFileIds : undefined,
      // Work data from workReportForm
      regularHours: hasWorkData ? workReportValue.regularHours || 0 : undefined,
      overtimeHours: hasWorkData ? workReportValue.overtimeHours || 0 : undefined,
      carUsageAmount: hasWorkData ? workReportValue.carPayment || 0 : undefined,
      workNotes: hasWorkData ? workReportValue.notes || undefined : undefined,
    };

    console.log('📊 Order update data:', {
      ...orderData,
      hasWorkData,
      workReportFormValue: workReportValue,
    });

    this.ordersService.updateOrder(this.orderId, orderData).subscribe({
      next: order => {
        this.toastService.success('Заказ обновлен успешно');
        this.clearFileData();
        // Reload order data to show updated information
        if (this.orderId) {
          this.loadOrder(this.orderId);
        }
        this.isLoading.set(false);
        this.isUploadingFiles.set(false);
      },
      error: error => {
        console.error('Ошибка обновления заказа:', error);
        this.toastService.error('Ошибка обновления заказа. Попробуйте еще раз.');
        this.isLoading.set(false);
        this.isUploadingFiles.set(false);
      },
    });
  }

  getCompletedUploads(): FileUploadProgress[] {
    return this.uploadProgress().filter(p => p.status === 'completed');
  }

  getUploadIndex(progressItem: FileUploadProgress): number {
    return this.uploadProgress().indexOf(progressItem);
  }

  isUploadingInProgress(): boolean {
    return this.uploadProgress().some(p => p.status === 'uploading');
  }

  private clearFileData() {
    this.selectedFiles = [];
    this.uploadProgress.set([]);
    this.isUploadingFiles.set(false);
  }

  onCancel() {
    this.clearFileData();
    this.router.navigate(['/orders']);
  }

  // Проверка, может ли инженер принять заказ
  get canAcceptOrder(): boolean {
    const currentUser = this.authService.currentUser();
    if (!currentUser || !this.order) return false;

    return (
      currentUser.role === UserRole.USER &&
      this.order.status === OrderStatus.ASSIGNED &&
      this.order.assignedEngineerId === currentUser.id
    );
  }

  // Принять заказ (для инженеров)
  async onAcceptOrder() {
    if (!this.orderId || !this.canAcceptOrder) {
      return;
    }

    this.isLoading.set(true);

    try {
      await this.ordersService.acceptOrder(this.orderId).toPromise();
      this.toastService.success('Заказ принят успешно');
      
      // Reload order data
      await this.loadOrder(this.orderId);
      this.selectedTabIndex = 0; // Switch to main tab
    } catch (error: any) {
      console.error('Error accepting order:', error);
      this.toastService.error(error.error?.message || 'Ошибка при принятии заказа');
    } finally {
      this.isLoading.set(false);
    }
  }

  // Work Report Methods
  // onCompleteWork removed - work data is now sent via updateOrder()

  getTotalHours(): number {
    const regular = this.workReportForm.get('regularHours')?.value || 0;
    const overtime = this.workReportForm.get('overtimeHours')?.value || 0;
    return regular + overtime;
  }

  onAutoFillWorkReport() {
    // Auto-fill with suggested values from order details
    this.workReportForm.patchValue({
      regularHours: 8,
      overtimeHours: 0,
      carPayment: 0,
      distanceKm: this.orderForm.get('distanceKm')?.value || null,
      territoryType: this.orderForm.get('territoryType')?.value || null,
    });
  }

  // Methods for work report view tab

  getTerritoryTypeLabel(territoryType: string): string {
    const labels: Record<string, string> = {
      [TerritoryType.URBAN]: 'Городская',
      [TerritoryType.SUBURBAN]: 'Пригородная',
      [TerritoryType.RURAL]: 'Сельская',
      [TerritoryType.HOME]: 'Домашняя (≤60 км)',
      [TerritoryType.ZONE_1]: 'Зона 1 (61-199 км)',
      [TerritoryType.ZONE_2]: 'Зона 2 (200-250 км)',
      [TerritoryType.ZONE_3]: 'Зона 3 (>250 км)',
    };
    return labels[territoryType] || territoryType;
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return 'Не указано';
    const d = new Date(date);
    return d.toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  formatDateTime(date: Date | string | undefined): string {
    if (!date) return 'Не указано';
    const d = new Date(date);
    return d.toLocaleString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatAmount(amount: number): string {
    return `${amount.toFixed(2)} ₽`;
  }

  // Check if current user is admin or manager
  isAdminOrManager(): boolean {
    return this.authService.hasAnyRole([UserRole.ADMIN, UserRole.MANAGER]);
  }

  // Work Sessions handlers
  onWorkSessionCreated(): void {
    this.toastService.showSuccess('Рабочая сессия успешно создана', 'success');
    // Перезагрузка данных заказа не требуется, компоненты сами обновятся
  }

  onWorkSessionUpdated(session: any): void {
    this.toastService.showSuccess('Рабочая сессия обновлена', 'success');
  }

  onWorkSessionDeleted(sessionId: number): void {
    this.toastService.showSuccess('Рабочая сессия удалена', 'success');
  }
}
