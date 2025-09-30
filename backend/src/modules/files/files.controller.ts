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
import { FileQueryDto, FileType } from '../../../shared/dtos/file.dto';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

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
  uploadFileTest(
    @UploadedFile() file,
    @Body() body: { type?: FileType; description?: string }
  ) {
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

    res.setHeader('Content-Type', file.mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.setHeader('Content-Length', fileData.length.toString());

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

  @Get(':id/view')
  async viewFile(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const file = await this.filesService.findOne(id);
    const fileData = await this.filesService.getFileData(id);

    res.setHeader('Content-Type', file.mimetype);
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

  @Get('file/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.filesService.findOne(id);
  }
}
