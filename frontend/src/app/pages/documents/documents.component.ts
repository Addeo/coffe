import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../shared/material/material.module';
import { DocumentsService, DocumentCategory } from '../../services/documents.service';
import { ToastService } from '../../services/toast.service';
import { DocumentResponseDto, CreateDocumentDto } from '@shared/dtos/document.dto';
import {
  ImageViewerDialogComponent,
  ImageViewerData,
} from '../../components/modals/image-viewer-dialog.component';
import { DeleteConfirmationDialogComponent } from '../../components/modals/delete-confirmation-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../services/auth.service';
import { UserRole } from '@shared/interfaces/user.interface';

interface CategoryInfo {
  id: DocumentCategory;
  title: string;
  icon: string;
  description: string;
}

interface FileUploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  categoryId: DocumentCategory;
}

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './documents.component.html',
  styleUrls: ['./documents.component.scss'],
})
export class DocumentsComponent implements OnInit {
  private documentsService = inject(DocumentsService);
  private toastService = inject(ToastService);
  private dialog = inject(MatDialog);
  private authService = inject(AuthService);

  // Document categories
  categories: CategoryInfo[] = [
    {
      id: DocumentCategory.RULES,
      title: 'Общие правила',
      icon: 'rule',
      description: 'Общие правила и положения компании',
    },
    {
      id: DocumentCategory.TERMS,
      title: 'Условия',
      icon: 'gavel',
      description: 'Условия использования и соглашения',
    },
    {
      id: DocumentCategory.REGULATIONS,
      title: 'Регламент',
      icon: 'description',
      description: 'Внутренние регламенты и инструкции',
    },
    {
      id: DocumentCategory.OTHER,
      title: 'Прочие документы',
      icon: 'folder',
      description: 'Другие документы и материалы',
    },
  ];

  // State
  documents = signal<DocumentResponseDto[]>([]);
  isLoading = signal(false);
  uploadProgress = signal<FileUploadProgress[]>([]);
  selectedCategory = signal<DocumentCategory | null>(null);

  // Check if user is admin
  isAdmin = computed(() => {
    return this.authService.hasRole(UserRole.ADMIN);
  });

  // Computed
  filteredDocuments = computed(() => {
    const category = this.selectedCategory();
    if (!category) {
      return this.documents();
    }
    return this.documents().filter(doc => doc.category === category);
  });

  documentsByCategory = computed(() => {
    const result: Record<DocumentCategory, DocumentResponseDto[]> = {
      [DocumentCategory.RULES]: [],
      [DocumentCategory.TERMS]: [],
      [DocumentCategory.REGULATIONS]: [],
      [DocumentCategory.OTHER]: [],
    };
    this.documents().forEach(doc => {
      result[doc.category].push(doc);
    });
    return result;
  });

  ngOnInit(): void {
    this.loadDocuments();
  }

  loadDocuments(): void {
    this.isLoading.set(true);
    this.documentsService.findAll({ page: 1, limit: 1000 }).subscribe({
      next: response => {
        this.documents.set(response.data);
        this.isLoading.set(false);
      },
      error: error => {
        console.error('Failed to load documents:', error);
        this.toastService.showError('Не удалось загрузить документы');
        this.isLoading.set(false);
      },
    });
  }

  onFileSelected(event: Event, categoryId: DocumentCategory): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const files = Array.from(input.files);
    files.forEach(file => {
      this.uploadDocument(file, categoryId);
    });
  }

  uploadDocument(file: File, categoryId: DocumentCategory): void {
    const progress: FileUploadProgress = {
      file,
      progress: 0,
      status: 'pending',
      categoryId,
    };

    this.uploadProgress.update(progresses => [...progresses, progress]);

    // Update status to uploading
    progress.status = 'uploading';

    const category = this.categories.find(c => c.id === categoryId);
    const createDto: CreateDocumentDto = {
      title: file.name,
      category: categoryId,
      description: category ? `${category.title} - ${file.name}` : file.name,
    };

    this.documentsService.create(file, createDto).subscribe({
      next: document => {
        progress.status = 'completed';
        progress.progress = 100;

        // Add to documents list
        this.documents.update(docs => [...docs, document]);

        // Remove from progress after delay
        setTimeout(() => {
          this.uploadProgress.update(progresses => progresses.filter(p => p !== progress));
        }, 2000);

        this.toastService.showSuccess(`Документ "${file.name}" успешно загружен`);
      },
      error: error => {
        console.error('Upload error:', error);
        progress.status = 'error';
        progress.error = error.error?.message || 'Ошибка загрузки документа';
        this.toastService.showError(`Не удалось загрузить документ "${file.name}"`);
      },
    });
  }

  viewDocument(document: DocumentResponseDto): void {
    if (!document.file) return;

    if (document.file.mimetype?.startsWith('image/')) {
      // Open image viewer
      const dialogData: ImageViewerData = {
        imageUrl: this.documentsService.getViewUrl(document.id),
        title: document.title,
        fileName: document.file.originalName || document.file.filename,
      };
      this.dialog.open(ImageViewerDialogComponent, {
        data: dialogData,
        maxWidth: '90vw',
        maxHeight: '90vh',
      });
    } else {
      // Open file in new tab
      window.open(this.documentsService.getViewUrl(document.id), '_blank');
    }
  }

  downloadDocument(document: DocumentResponseDto): void {
    window.open(this.documentsService.getDownloadUrl(document.id), '_blank');
  }

  deleteDocument(document: DocumentResponseDto): void {
    const dialogRef = this.dialog.open(DeleteConfirmationDialogComponent, {
      data: {
        title: 'Удалить документ?',
        message: `Вы уверены, что хотите удалить документ "${document.title}"?`,
      },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.documentsService.delete(document.id).subscribe({
          next: () => {
            this.documents.update(docs => docs.filter(d => d.id !== document.id));
            this.toastService.showSuccess('Документ удален');
          },
          error: error => {
            console.error('Delete error:', error);
            this.toastService.showError('Не удалось удалить документ');
          },
        });
      }
    });
  }

  getFileIcon(mimetype: string): string {
    if (mimetype?.startsWith('image/')) return 'image';
    if (mimetype?.includes('pdf')) return 'picture_as_pdf';
    if (mimetype?.includes('word') || mimetype?.includes('document')) return 'description';
    if (mimetype?.includes('excel') || mimetype?.includes('spreadsheet')) return 'table_chart';
    return 'insert_drive_file';
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  selectCategory(categoryId: DocumentCategory | null): void {
    this.selectedCategory.set(categoryId);
  }
}
