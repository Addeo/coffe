import { Controller, Get, Post, Param, Delete, Query, UseGuards, UseInterceptors, UploadedFile, Body, Request, Res, ParseUUIDPipe } from '@nestjs/common';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { FileQueryDto, FileType } from '../../../shared/dtos/file.dto';

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @UploadedFile() file,
    @Body() body: { type?: FileType; description?: string },
    @Request() req
  ) {
    return this.filesService.uploadFile(
      file,
      req.user.id,
      body.type,
      body.description
    );
  }

  @Post('upload/avatar')
  @UseInterceptors(FileInterceptor('file'))
  uploadAvatar(
    @UploadedFile() file,
    @Request() req
  ) {
    // Validate that it's an image
    if (!file.mimetype.startsWith('image/')) {
      throw new Error('Only image files are allowed for avatars');
    }

    return this.filesService.uploadFile(
      file,
      req.user.id,
      FileType.AVATAR,
      'User avatar'
    );
  }

  @Get()
  findAll(@Query() query: FileQueryDto) {
    return this.filesService.findAll(query);
  }

  @Get('stats')
  getStats() {
    return this.filesService.getFileStats();
  }

  @Get('my-files')
  getMyFiles(@Query() query: FileQueryDto, @Request() req) {
    return this.filesService.getUserFiles(req.user.id, query);
  }

  @Get('type/:type')
  getFilesByType(@Param('type') type: FileType, @Query() query: FileQueryDto) {
    return this.filesService.getFilesByType(type, query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.filesService.findOne(id);
  }

  @Get(':id/download')
  async downloadFile(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response
  ) {
    const file = await this.filesService.findOne(id);
    const filePath = await this.filesService.getFilePath(id);

    res.setHeader('Content-Type', file.mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);

    res.sendFile(filePath);
  }

  @Get(':id/view')
  async viewFile(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response
  ) {
    const file = await this.filesService.findOne(id);
    const filePath = await this.filesService.getFilePath(id);

    res.setHeader('Content-Type', file.mimetype);
    res.sendFile(filePath);
  }

  @Post(':id')
  updateFile(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { description?: string; type?: FileType }
  ) {
    return this.filesService.updateFile(id, body.description, body.type);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.filesService.remove(id);
  }
}
