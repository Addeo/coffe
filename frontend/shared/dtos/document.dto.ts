export enum DocumentCategory {
  RULES = 'rules',
  TERMS = 'terms',
  REGULATIONS = 'regulations',
  OTHER = 'other',
}

export interface CreateDocumentDto {
  title: string;
  category: DocumentCategory;
  description?: string;
}

export interface UpdateDocumentDto {
  title?: string;
  category?: DocumentCategory;
  description?: string;
}

export interface DocumentResponseDto {
  id: string;
  title: string;
  category: DocumentCategory;
  description?: string;
  fileId: string;
  file?: {
    id: string;
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
    uploadedAt: Date;
  };
  createdById: number;
  createdBy?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentQueryDto {
  category?: DocumentCategory;
  page?: number;
  limit?: number;
  search?: string;
}
