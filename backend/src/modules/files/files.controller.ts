import {
  Controller,
  Get,
  Post,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Request,
  Res,
  ParseUUIDPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../аутентификация/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { FileQueryDto, FileType } from '../../shared/dtos/file.dto';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @UploadedFile() file,
    @Body() body: { type?: FileType; description?: string },
    @Request() req
  ) {
    return this.filesService.uploadFile(file, req.user.id, body.type, body.description);
  }

  @Post('upload/test')
  @UseInterceptors(FileInterceptor('file'))
  uploadFileTest(@UploadedFile() file, @Body() body: { type?: FileType; description?: string }) {
    // Temporarily use fixed user ID for testing
    const userId = 1;
    return this.filesService.uploadFile(file, userId, body.type, body.description);
  }

  @Post('upload/avatar')
  @UseInterceptors(FileInterceptor('file'))
  uploadAvatar(@UploadedFile() file, @Request() req) {
    // Validate that it's an image
    if (!file.mimetype.startsWith('image/')) {
      throw new Error('Only image files are allowed for avatars');
    }

    return this.filesService.uploadFile(file, req.user.id, FileType.AVATAR, 'User avatar');
  }

  @Get()
  findAll(@Query() query: FileQueryDto) {
    return this.filesService.findAll(query);
  }

  @Get('all')
  @UseGuards(JwtAuthGuard)
  getAllFiles() {
    return this.filesService.getAllFiles();
  }

  @Get('stats')
  getStats() {
    return this.filesService.getFileStats();
  }

  @Get('my-files')
  getMyFiles(@Query() query: FileQueryDto, @Request() req) {
    return this.filesService.getUserFiles(req.user.id, query);
  }

  @Get('test/files')
  testOrderFiles() {
    return { message: 'Order files endpoint working', timestamp: new Date() };
  }

  @Get('type/:type')
  getFilesByType(@Param('type') type: FileType, @Query() query: FileQueryDto) {
    return this.filesService.getFilesByType(type, query);
  }

  @Get('test-route')
  testRoute() {
    console.log('testRoute called');
    return { message: 'Test route works', timestamp: new Date() };
  }

  @Get('view/:id')
  async viewFile(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const file = await this.filesService.findOne(id);
    const fileData = await this.filesService.getFileData(id);

    // Set cache headers for better performance
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.setHeader('Content-Type', file.mimetype);
    res.setHeader('Content-Length', fileData.length.toString());

    // Add filename for downloads
    if (file.mimetype.startsWith('image/')) {
      res.setHeader('Content-Disposition', `inline; filename="${file.originalName}"`);
    }

    res.send(fileData);
  }

  @Get('get-order-files/:orderId')
  getFilesByOrderId(@Param('orderId') orderId: string) {
    console.log('getFilesByOrderId called with orderId:', orderId);
    return this.filesService.findFilesByOrderId(parseInt(orderId));
  }

  @Get(':id/download')
  @UseGuards(JwtAuthGuard)
  async downloadFile(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const file = await this.filesService.findOne(id);
    const fileData = await this.filesService.getFileData(id);

    // Set appropriate headers for download
    res.setHeader('Content-Type', file.mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.setHeader('Content-Length', fileData.length.toString());
    res.setHeader('Cache-Control', 'private, no-cache');

    // Add additional metadata headers
    res.setHeader('X-File-Name', encodeURIComponent(file.originalName));
    res.setHeader('X-File-Size', file.size.toString());
    res.setHeader('X-File-Type', file.type || 'OTHER');

    res.send(fileData);
  }

  @Get(':id/download/test')
  async downloadFileTest(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const file = await this.filesService.findOne(id);
    const fileData = await this.filesService.getFileData(id);

    res.setHeader('Content-Type', file.mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.setHeader('Content-Length', fileData.length.toString());

    res.send(fileData);
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

  @Post(':id/attach-to-order')
  // @UseGuards(JwtAuthGuard) // Temporarily disabled for testing
  attachToOrder(
    @Param('id', ParseUUIDPipe) fileId: string,
    @Body() body: { orderId: number },
    @Request() req
  ) {
    return this.filesService.attachFileToOrder(fileId, body.orderId);
  }

  @Post(':id/detach-from-order')
  @UseGuards(JwtAuthGuard)
  detachFromOrder(@Param('id', ParseUUIDPipe) fileId: string, @Request() req) {
    return this.filesService.detachFileFromOrder(fileId);
  }

  // Temporary test endpoint
  @Get('test')
  test() {
    return { message: 'Files API is working', timestamp: new Date() };
  }

  @Get('metadata/:id')
  async getFileMetadata(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    const file = await this.filesService.findOne(id);
    const protocol = req.protocol;
    const host = req.get('host');

    // Check if file is an image for modal viewing
    const isImage = file.mimetype.startsWith('image/');

    return {
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
      viewUrl: `${protocol}://${host}/api/files/view/${id}`,
      downloadUrl: `${protocol}://${host}/api/files/${id}/download`,
      thumbnailUrl: isImage ? `${protocol}://${host}/api/files/${id}/thumbnail` : undefined,
      isImage,
      sizeFormatted: this.formatFileSize(file.size),
    };
  }

  @Get(':id/thumbnail')
  async getThumbnail(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const file = await this.filesService.findOne(id);

    // Only generate thumbnails for images
    if (!file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Thumbnails are only available for image files' });
    }

    try {
      const thumbnailBuffer = await this.filesService.generateThumbnail(id);

      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Content-Length', thumbnailBuffer.length.toString());
      res.setHeader('Cache-Control', 'public, max-age=3600');

      res.send(thumbnailBuffer);
    } catch (error) {
      // If thumbnail generation fails, return original image
      const fileData = await this.filesService.getFileData(id);

      res.setHeader('Content-Type', file.mimetype);
      res.setHeader('Content-Length', fileData.length.toString());
      res.send(fileData);
    }
  }

  @Post('batch-download')
  @UseGuards(JwtAuthGuard)
  async batchDownload(@Body() body: { fileIds: string[] }, @Res() res: Response) {
    if (!body.fileIds || body.fileIds.length === 0) {
      return res.status(400).json({ error: 'No file IDs provided' });
    }

    if (body.fileIds.length === 1) {
      // Single file download
      return this.downloadFile(body.fileIds[0], res);
    }

    // For multiple files, we'll create a simple ZIP response
    // In a real implementation, you'd use a ZIP library like 'archiver'
    return res.status(501).json({
      error: 'Batch download not implemented yet',
      message: 'Use individual download endpoints for now',
    });
  }

  @Get('metadata/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.filesService.findOne(id);
  }
}
