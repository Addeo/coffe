import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  Res,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../аутентификация/jwt-auth.guard';
import { RolesGuard } from '../аутентификация/roles.guard';
import { Roles } from '../аутентификация/roles.decorator';
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  DocumentQueryDto,
  DocumentCategory,
} from '../../shared/dtos/document.dto';
import { FilesService } from '../files/files.service';
import { UserRole } from '../../entities/user.entity';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly filesService: FilesService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() createDto: CreateDocumentDto,
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.documentsService.create(file, req.user.id, createDto);
  }

  @Get()
  async findAll(@Query() query: DocumentQueryDto) {
    return this.documentsService.findAll(query);
  }

  @Get('category/:category')
  async findByCategory(@Param('category') category: DocumentCategory) {
    return this.documentsService.findByCategory(category);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.findOne(id);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateDocumentDto,
    @Request() req,
  ) {
    return this.documentsService.update(id, updateDto, req.user.id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.documentsService.remove(id);
    return { message: 'Document deleted successfully' };
  }

  @Get(':id/view')
  async viewFile(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const document = await this.documentsService.findOne(id);
    return this.filesService.viewFile(document.fileId, res);
  }

  @Get(':id/download')
  async downloadFile(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const document = await this.documentsService.findOne(id);
    return this.filesService.downloadFile(document.fileId, res);
  }
}

