import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../../entities/document.entity';
import { File } from '../../entities/file.entity';
import { User } from '../../entities/user.entity';
import { FilesService } from '../files/files.service';
import { CreateDocumentDto, UpdateDocumentDto, DocumentQueryDto, DocumentCategory } from '../../shared/dtos/document.dto';
import { FileType } from '../../shared/dtos/file.dto';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private documentsRepository: Repository<Document>,
    @InjectRepository(File)
    private filesRepository: Repository<File>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private filesService: FilesService,
  ) {}

  async create(
    file: Express.Multer.File,
    userId: number,
    createDto: CreateDocumentDto,
  ): Promise<Document> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Upload file first
    const uploadedFile = await this.filesService.uploadFile(
      file,
      userId,
      FileType.DOCUMENT,
      createDto.description || `Document: ${createDto.title}`,
    );

    // Create document entity
    const document = this.documentsRepository.create({
      title: createDto.title,
      category: createDto.category,
      description: createDto.description,
      file: uploadedFile,
      fileId: uploadedFile.id,
      createdBy: user,
      createdById: userId,
    });

    return this.documentsRepository.save(document);
  }

  async findAll(query: DocumentQueryDto): Promise<PaginatedResponse<Document>> {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const queryBuilder = this.documentsRepository
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.file', 'file')
      .leftJoinAndSelect('document.createdBy', 'createdBy')
      .orderBy('document.createdAt', 'DESC');

    if (query.category) {
      queryBuilder.andWhere('document.category = :category', { category: query.category });
    }

    if (query.search) {
      queryBuilder.andWhere(
        '(document.title LIKE :search OR document.description LIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const [data, total] = await queryBuilder.skip(skip).take(limit).getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Document> {
    const document = await this.documentsRepository.findOne({
      where: { id },
      relations: ['file', 'createdBy'],
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    return document;
  }

  async findByCategory(category: DocumentCategory): Promise<Document[]> {
    return this.documentsRepository.find({
      where: { category },
      relations: ['file', 'createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async update(id: string, updateDto: UpdateDocumentDto, userId: number): Promise<Document> {
    const document = await this.findOne(id);

    if (updateDto.title) {
      document.title = updateDto.title;
    }
    if (updateDto.category) {
      document.category = updateDto.category;
    }
    if (updateDto.description !== undefined) {
      document.description = updateDto.description;
    }

    return this.documentsRepository.save(document);
  }

  async remove(id: string): Promise<void> {
    const document = await this.findOne(id);

    // Delete associated file
    if (document.fileId) {
      try {
        await this.filesService.remove(document.fileId);
      } catch (error) {
        console.error(`Failed to delete file ${document.fileId}:`, error);
      }
    }

    await this.documentsRepository.remove(document);
  }
}

