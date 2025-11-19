import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agreement, AgreementType } from '../../entities/agreement.entity';
import { UserAgreement } from '../../entities/user-agreement.entity';
export { AgreementType } from '../../entities/agreement.entity';
import { User } from '../../entities/user.entity';

@Injectable()
export class AgreementsService {
  constructor(
    @InjectRepository(Agreement)
    private agreementsRepository: Repository<Agreement>,
    @InjectRepository(UserAgreement)
    private userAgreementsRepository: Repository<UserAgreement>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  /**
   * Получить все активные соглашения
   */
  async getActiveAgreements(): Promise<Agreement[]> {
    return this.agreementsRepository.find({
      where: { isActive: true },
      order: { type: 'ASC', createdAt: 'DESC' },
    });
  }

  /**
   * Получить соглашения определенного типа
   */
  async getAgreementsByType(type: AgreementType): Promise<Agreement[]> {
    return this.agreementsRepository.find({
      where: { type, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Получить последнюю версию соглашения определенного типа
   */
  async getLatestAgreement(type: AgreementType): Promise<Agreement | null> {
    return this.agreementsRepository.findOne({
      where: { type, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Получить соглашение по ID
   */
  async getAgreementById(id: number): Promise<Agreement> {
    const agreement = await this.agreementsRepository.findOne({ where: { id } });
    if (!agreement) {
      throw new NotFoundException(`Agreement with id ${id} not found`);
    }
    return agreement;
  }

  /**
   * Проверить, принял ли пользователь все обязательные соглашения
   */
  async checkUserAgreements(userId: number): Promise<{
    hasAcceptedAll: boolean;
    missingAgreements: Agreement[];
    userAgreements: UserAgreement[];
  }> {
    // Получаем все обязательные активные соглашения
    const mandatoryAgreements = await this.agreementsRepository.find({
      where: { isActive: true, isMandatory: true },
      order: { type: 'ASC', createdAt: 'DESC' },
    });

    // Получаем последние версии каждого типа
    const latestAgreements = new Map<AgreementType, Agreement>();
    for (const agreement of mandatoryAgreements) {
      const existing = latestAgreements.get(agreement.type);
      if (!existing || new Date(agreement.createdAt) > new Date(existing.createdAt)) {
        latestAgreements.set(agreement.type, agreement);
      }
    }

    // Получаем все принятия пользователя
    const userAgreements = await this.userAgreementsRepository.find({
      where: { userId },
    });

    // Проверяем каждое обязательное соглашение
    const missingAgreements: Agreement[] = [];
    for (const agreement of latestAgreements.values()) {
      const userAcceptance = userAgreements.find(
        ua => ua.agreementType === agreement.type && 
              ua.version === agreement.version && 
              ua.isAccepted === true
      );

      if (!userAcceptance) {
        missingAgreements.push(agreement);
      }
    }

    return {
      hasAcceptedAll: missingAgreements.length === 0,
      missingAgreements,
      userAgreements,
    };
  }

  /**
   * Принять соглашения пользователем
   */
  async acceptAgreements(
    userId: number,
    agreementIds: number[],
    ipAddress?: string,
    userAgent?: string,
  ): Promise<UserAgreement[]> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    const agreements = await this.agreementsRepository.find({
      where: agreementIds.map(id => ({ id })),
    });

    if (agreements.length !== agreementIds.length) {
      throw new BadRequestException('Some agreements not found');
    }

    const acceptedAgreements: UserAgreement[] = [];
    const now = new Date();

    for (const agreement of agreements) {
      // Проверяем, не принято ли уже
      const existing = await this.userAgreementsRepository.findOne({
        where: {
          userId,
          agreementType: agreement.type,
          version: agreement.version,
        },
      });

      if (existing && existing.isAccepted) {
        // Уже принято, пропускаем
        acceptedAgreements.push(existing);
        continue;
      }

      // Создаем или обновляем запись
      const userAgreement = existing || this.userAgreementsRepository.create({
        userId,
        agreementType: agreement.type,
        version: agreement.version,
      });

      userAgreement.isAccepted = true;
      userAgreement.acceptedAt = now;
      userAgreement.updatedAt = now;
      userAgreement.ipAddress = ipAddress || null;
      userAgreement.userAgent = userAgent || null;

      const saved = await this.userAgreementsRepository.save(userAgreement);
      acceptedAgreements.push(saved);
    }

    // Обновляем статус пользователя
    const checkResult = await this.checkUserAgreements(userId);
    user.hasAcceptedAgreements = checkResult.hasAcceptedAll;
    user.agreementsAcceptedAt = checkResult.hasAcceptedAll ? now : null;
    await this.usersRepository.save(user);

    return acceptedAgreements;
  }

  /**
   * Получить историю принятия соглашений пользователем
   */
  async getUserAgreementHistory(userId: number): Promise<UserAgreement[]> {
    return this.userAgreementsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Создать новое соглашение (только для админов)
   */
  async createAgreement(
    type: AgreementType,
    version: string,
    title: string,
    content: string,
    isMandatory: boolean,
    createdById: number,
  ): Promise<Agreement> {
    // Деактивируем предыдущие версии того же типа
    await this.agreementsRepository.update(
      { type, isActive: true },
      { isActive: false },
    );

    const agreement = this.agreementsRepository.create({
      type,
      version,
      title,
      content,
      isActive: true,
      isMandatory,
      createdById,
      publishedAt: new Date(),
    });

    return this.agreementsRepository.save(agreement);
  }
}

