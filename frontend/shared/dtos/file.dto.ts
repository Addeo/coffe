export interface FileUploadDto {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Uint8Array;
  size: number;
}

export interface FileResponseDto {
  id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  type: FileType;
  description?: string;
  uploadedById: number;
  orderId?: number;
  uploadedAt: Date;
  url?: string;
  uploadedBy?: {
    id: number;
    name?: string;
    email: string;
  };
  order?: {
    id: number;
    title: string;
  };
}

export interface FileQueryDto {
  page?: number;
  limit?: number;
  mimetype?: string;
  uploadedBy?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export enum FileType {
  AVATAR = 'avatar',
  DOCUMENT = 'document',
  IMAGE = 'image',
  ORDER_PHOTO = 'order_photo', // Фото выполненной работы по заказу
  ORDER_BEFORE = 'order_before', // Фото до выполнения работы
  ORDER_AFTER = 'order_after', // Фото после выполнения работы
  WORK_REPORT = 'work_report', // Отчет о работе
  OTHER = 'other',
}

export interface UploadFileDto {
  file: File;
  type?: FileType;
  description?: string;
}

export interface FileMetadataResponse {
  id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  type: FileType;
  description?: string;
  uploadedById: number;
  orderId?: number;
  uploadedAt: Date;
  viewUrl: string;
  downloadUrl: string;
  isImage: boolean;
  sizeFormatted: string;
  thumbnailUrl?: string;
}
