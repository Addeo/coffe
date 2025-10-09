import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { File } from '../../entities/file.entity';
import { User } from '../../entities/user.entity';
import { Order } from '../../entities/order.entity';
import { FileQueryDto, FileType } from '../../shared/dtos/file.dto';
import * as fs from 'fs';
import * as path from 'path';

export interface FilesResponse {
  data: File[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(File)
    private readonly filesRepository: Repository<File>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>
  ) {}

  async uploadFile(
    file: any,
    userId: number,
    type: FileType = FileType.OTHER,
    description?: string
  ): Promise<File> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // File content is already in buffer from memory storage
    const fileBuffer: Buffer = file.buffer;

    const fileEntity = this.filesRepository.create({
      filename: file.filename || file.originalname,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: null, // No longer storing on disk
      fileData: fileBuffer,
      type,
      description,
      uploadedBy: user,
      uploadedById: userId,
    });

    return this.filesRepository.save(fileEntity);
  }

  async findFilesByOrderId(orderId: number): Promise<File[]> {
    return this.filesRepository.find({
      where: { orderId },
      relations: ['uploadedBy'],
      order: { uploadedAt: 'DESC' },
    });
  }

  async findAll(query: FileQueryDto = {}): Promise<FilesResponse> {
    const {
      page = 1,
      limit = 10,
      mimetype,
      uploadedBy,
      sortBy = 'uploadedAt',
      sortOrder = 'DESC',
    } = query;

    const queryBuilder = this.filesRepository
      .createQueryBuilder('file')
      .leftJoinAndSelect('file.uploadedBy', 'uploadedBy');

    if (mimetype) {
      queryBuilder.andWhere('file.mimetype = :mimetype', { mimetype });
    }

    if (uploadedBy) {
      queryBuilder.andWhere('file.uploadedById = :uploadedBy', { uploadedBy });
    }

    queryBuilder
      .orderBy(`file.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAllFiles(): Promise<any[]> {
    const files = await this.filesRepository.find({
      relations: ['uploadedBy', 'order'],
      order: {
        uploadedAt: 'DESC',
      },
    });

    // Transform response to return only necessary fields
    return files.map(file => ({
      id: file.id,
      filename: file.filename,
      originalName: file.originalName,
      mimetype: file.mimetype,
      size: file.size,
      type: file.type,
      description: file.description,
      uploadedById: file.uploadedById,
      orderId: file.orderId,
      uploadedAt: file.uploadedAt,
      uploadedBy: file.uploadedBy
        ? {
            id: file.uploadedBy.id,
            name: `${file.uploadedBy.firstName} ${file.uploadedBy.lastName}`,
            email: file.uploadedBy.email,
          }
        : undefined,
      order: file.order
        ? {
            id: file.order.id,
            title: file.order.title,
          }
        : null,
    }));
  }

  async findOne(id: string): Promise<File> {
    const file = await this.filesRepository.findOne({
      where: { id },
      relations: ['uploadedBy'],
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return file;
  }

  async getFileData(id: string): Promise<Buffer> {
    const file = await this.findOne(id);

    if (!file.fileData) {
      throw new NotFoundException('File data not found');
    }

    return file.fileData;
  }

  // Legacy method for backward compatibility
  async getFilePath(id: string): Promise<string> {
    throw new Error('File storage has been moved to database. Use getFileData instead.');
  }

  async updateFile(id: string, description?: string, type?: FileType): Promise<File> {
    const file = await this.findOne(id);

    if (description !== undefined) {
      file.description = description;
    }

    if (type !== undefined) {
      file.type = type;
    }

    return this.filesRepository.save(file);
  }

  async remove(id: string): Promise<void> {
    const file = await this.findOne(id);

    // Delete file from disk
    try {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (error) {
      console.error('Error deleting file from disk:', error);
    }

    // Delete from database
    await this.filesRepository.remove(file);
  }

  async getUserFiles(userId: number, query: FileQueryDto = {}): Promise<FilesResponse> {
    return this.findAll({ ...query, uploadedBy: userId });
  }

  async getFilesByType(type: FileType, query: FileQueryDto = {}): Promise<FilesResponse> {
    const queryBuilder = this.filesRepository
      .createQueryBuilder('file')
      .leftJoinAndSelect('file.uploadedBy', 'uploadedBy')
      .where('file.type = :type', { type });

    const { page = 1, limit = 10, sortBy = 'uploadedAt', sortOrder = 'DESC' } = query;

    queryBuilder
      .orderBy(`file.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getFileStats(): Promise<{
    total: number;
    totalSize: number;
    byType: { [key in FileType]: number };
    byMimeType: { [mimetype: string]: number };
  }> {
    const stats = await this.filesRepository
      .createQueryBuilder('file')
      .select(['COUNT(*) as total', 'SUM(file.size) as totalSize', 'file.type', 'file.mimetype'])
      .groupBy('file.type')
      .addGroupBy('file.mimetype')
      .getRawMany();

    const result = {
      total: 0,
      totalSize: 0,
      byType: {} as { [key in FileType]: number },
      byMimeType: {} as { [mimetype: string]: number },
    };

    stats.forEach(stat => {
      result.total += parseInt(stat.total);
      result.totalSize += parseInt(stat.totalSize) || 0;

      // Count by type
      const type = stat.type as FileType;
      if (!result.byType[type]) {
        result.byType[type] = 0;
      }
      result.byType[type] += parseInt(stat.total);

      // Count by mimetype
      const mimetype = stat.mimetype;
      if (!result.byMimeType[mimetype]) {
        result.byMimeType[mimetype] = 0;
      }
      result.byMimeType[mimetype] += parseInt(stat.total);
    });

    return result;
  }

  // Utility method to create upload directory if it doesn't exist
  ensureUploadDirectory(): void {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  }

  // Attach file to order
  async attachFileToOrder(fileId: string, orderId: number): Promise<File> {
    const file = await this.filesRepository.findOne({
      where: { id: fileId },
      relations: ['order'],
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    const order = await this.ordersRepository.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    file.order = order;
    file.orderId = orderId;
    return this.filesRepository.save(file);
  }

  // Detach file from order
  async detachFileFromOrder(fileId: string): Promise<File> {
    const file = await this.filesRepository.findOne({
      where: { id: fileId },
      relations: ['order'],
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    file.order = null;
    file.orderId = null;
    return this.filesRepository.save(file);
  }

  // Validate file type based on FileType enum
  validateFileType(file: any, allowedTypes: FileType[]): boolean {
    const mimeToType: { [key: string]: FileType } = {
      'image/jpeg': FileType.IMAGE,
      'image/png': FileType.IMAGE,
      'image/gif': FileType.IMAGE,
      'application/pdf': FileType.DOCUMENT,
      'application/msword': FileType.DOCUMENT,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': FileType.DOCUMENT,
    };

    const detectedType = mimeToType[file.mimetype] || FileType.OTHER;
    return allowedTypes.includes(detectedType);
  }

  async generateThumbnail(id: string): Promise<Buffer> {
    const file = await this.findOne(id);

    if (!file.mimetype.startsWith('image/')) {
      throw new Error('Thumbnails can only be generated for image files');
    }

    const fileData = await this.getFileData(id);

    // For now, return original image
    // In production, you would use a library like 'sharp' to generate thumbnails
    // Example implementation:
    /*
    try {
      const sharp = require('sharp');
      return await sharp(fileData)
        .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
    } catch (error) {
      throw new Error('Failed to generate thumbnail');
    }
    */

    return fileData; // Return original for now
  }
}
