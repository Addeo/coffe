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
  SetMetadata,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { AgreementsService } from './agreements.service';
import { JwtAuthGuard } from '../аутентификация/jwt-auth.guard';
import { RolesGuard } from '../аутентификация/roles.guard';
import { Roles } from '../аутентификация/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { AgreementType } from '../../entities/agreement.entity';
import { Reflector } from '@nestjs/core';
export { AgreementType } from '../../entities/agreement.entity';

// Декоратор для публичных эндпоинтов
const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

interface AcceptAgreementsDto {
  agreementIds: number[];
  ipAddress?: string;
  userAgent?: string;
}

// Публичный guard, который пропускает запросы с метаданными IS_PUBLIC_KEY
@Injectable()
export class PublicJwtAuthGuard extends JwtAuthGuard {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }
}

@Controller('agreements')
@UseGuards(PublicJwtAuthGuard)
export class AgreementsController {
  constructor(private readonly agreementsService: AgreementsService) {}

  /**
   * Публичный эндпоинт: Получить все активные соглашения
   */
  @Get()
  @Public()
  async getActiveAgreements() {
    return this.agreementsService.getActiveAgreements();
  }

  /**
   * Публичный эндпоинт: Получить соглашения определенного типа
   */
  @Get('type/:type')
  @Public()
  async getAgreementsByType(@Param('type', new ParseEnumPipe(AgreementType)) type: AgreementType) {
    return this.agreementsService.getAgreementsByType(type);
  }

  /**
   * Публичный эндпоинт: Получить последнюю версию соглашения определенного типа
   */
  @Get('latest/:type')
  @Public()
  async getLatestAgreement(@Param('type', new ParseEnumPipe(AgreementType)) type: AgreementType) {
    return this.agreementsService.getLatestAgreement(type);
  }

  /**
   * Публичный эндпоинт: Получить соглашение по ID
   */
  @Get(':id')
  @Public()
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
      userAgent
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
    @Request() req
  ) {
    return this.agreementsService.createAgreement(
      dto.type,
      dto.version,
      dto.title,
      dto.content,
      dto.isMandatory,
      req.user.id
    );
  }
}
