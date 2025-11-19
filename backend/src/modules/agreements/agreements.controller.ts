import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
  ParseEnumPipe,
} from '@nestjs/common';
import { AgreementsService } from './agreements.service';
import { JwtAuthGuard } from '../аутентификация/jwt-auth.guard';
import { RolesGuard } from '../аутентификация/roles.guard';
import { Roles } from '../аутентификация/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { AgreementType } from '../../entities/agreement.entity';
export { AgreementType } from '../../entities/agreement.entity';

interface AcceptAgreementsDto {
  agreementIds: number[];
  ipAddress?: string;
  userAgent?: string;
}

@Controller('agreements')
@UseGuards(JwtAuthGuard)
export class AgreementsController {
  constructor(private readonly agreementsService: AgreementsService) {}

  /**
   * Получить все активные соглашения
   */
  @Get()
  async getActiveAgreements() {
    return this.agreementsService.getActiveAgreements();
  }

  /**
   * Получить соглашения определенного типа
   */
  @Get('type/:type')
  async getAgreementsByType(@Param('type', new ParseEnumPipe(AgreementType)) type: AgreementType) {
    return this.agreementsService.getAgreementsByType(type);
  }

  /**
   * Получить последнюю версию соглашения определенного типа
   */
  @Get('latest/:type')
  async getLatestAgreement(@Param('type', new ParseEnumPipe(AgreementType)) type: AgreementType) {
    return this.agreementsService.getLatestAgreement(type);
  }

  /**
   * Получить соглашение по ID
   */
  @Get(':id')
  async getAgreementById(@Param('id', ParseIntPipe) id: number) {
    return this.agreementsService.getAgreementById(id);
  }

  /**
   * Проверить статус принятия соглашений текущим пользователем
   */
  @Get('user/check')
  async checkUserAgreements(@Request() req) {
    return this.agreementsService.checkUserAgreements(req.user.id);
  }

  /**
   * Получить историю принятия соглашений текущим пользователем
   */
  @Get('user/history')
  async getUserAgreementHistory(@Request() req) {
    return this.agreementsService.getUserAgreementHistory(req.user.id);
  }

  /**
   * Принять соглашения
   */
  @Post('accept')
  async acceptAgreements(@Body() dto: AcceptAgreementsDto, @Request() req) {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return this.agreementsService.acceptAgreements(
      req.user.id,
      dto.agreementIds,
      ipAddress,
      userAgent,
    );
  }

  /**
   * Создать новое соглашение (только для админов)
   */
  @Post('create')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async createAgreement(
    @Body()
    dto: {
      type: AgreementType;
      version: string;
      title: string;
      content: string;
      isMandatory: boolean;
    },
    @Request() req,
  ) {
    return this.agreementsService.createAgreement(
      dto.type,
      dto.version,
      dto.title,
      dto.content,
      dto.isMandatory,
      req.user.id,
    );
  }
}

