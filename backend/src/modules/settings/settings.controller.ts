import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { SettingKey } from '../../entities/settings.entity';

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('auto-distribution')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getAutoDistributionSetting() {
    const enabled = await this.settingsService.getBooleanSetting(SettingKey.AUTO_DISTRIBUTION_ENABLED);
    const maxOrders = await this.settingsService.getNumberSetting(SettingKey.MAX_ORDERS_PER_ENGINEER);

    return {
      autoDistributionEnabled: enabled,
      maxOrdersPerEngineer: maxOrders,
    };
  }

  @Post('auto-distribution')
  @Roles(UserRole.MANAGER)
  async setAutoDistributionSetting(@Body() body: { enabled: boolean; maxOrdersPerEngineer?: number }) {
    await this.settingsService.setSetting(
      SettingKey.AUTO_DISTRIBUTION_ENABLED,
      body.enabled.toString()
    );

    if (body.maxOrdersPerEngineer) {
      await this.settingsService.setSetting(
        SettingKey.MAX_ORDERS_PER_ENGINEER,
        body.maxOrdersPerEngineer.toString()
      );
    }

    return { message: 'Auto-distribution settings updated successfully' };
  }
}
