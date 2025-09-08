export interface FileUploadDto {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export interface FileResponseDto {
  id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  url: string;
  uploadedAt: Date;
  uploadedBy: number;
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
  OTHER = 'other'
}

export interface UploadFileDto {
  file: File;
  type?: FileType;
  description?: string;
}
