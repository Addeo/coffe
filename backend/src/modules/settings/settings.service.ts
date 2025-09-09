import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting, SettingKey } from '../../entities/settings.entity';

@Injectable()
export class SettingsService implements OnModuleInit {
  constructor(
    @InjectRepository(Setting)
    private settingsRepository: Repository<Setting>,
  ) {}

  async onModuleInit() {
    await this.initializeDefaultSettings();
  }

  async getSetting(key: SettingKey): Promise<string | null> {
    const setting = await this.settingsRepository.findOne({ where: { key } });
    return setting?.value || null;
  }

  async setSetting(key: SettingKey, value: string, description?: string): Promise<Setting> {
    let setting = await this.settingsRepository.findOne({ where: { key } });

    if (setting) {
      setting.value = value;
      if (description) {
        setting.description = description;
      }
    } else {
      setting = this.settingsRepository.create({
        key,
        value,
        description,
      });
    }

    return this.settingsRepository.save(setting);
  }

  async getBooleanSetting(key: SettingKey): Promise<boolean> {
    const value = await this.getSetting(key);
    return value === 'true';
  }

  async getNumberSetting(key: SettingKey): Promise<number | null> {
    const value = await this.getSetting(key);
    return value ? parseInt(value, 10) : null;
  }

  async initializeDefaultSettings(): Promise<void> {
    // Initialize auto-distribution as disabled by default
    await this.setSetting(
      SettingKey.AUTO_DISTRIBUTION_ENABLED,
      'false',
      'Enable automatic distribution of orders to engineers'
    );

    // Set default max orders per engineer
    await this.setSetting(
      SettingKey.MAX_ORDERS_PER_ENGINEER,
      '5',
      'Maximum number of orders that can be assigned to one engineer'
    );
  }
}
