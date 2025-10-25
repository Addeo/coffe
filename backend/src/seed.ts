import { DataSource } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { Organization } from './entities/organization.entity';
import { Setting, SettingKey } from './entities/settings.entity';

async function seed() {
  const dataSource = new DataSource({
    type: 'sqlite',
    database: './database.sqlite',
    entities: [__dirname + '/entities/*.entity{.ts,.js}'],
    synchronize: true,
  });

  await dataSource.initialize();
  console.log('✓ Database connected');

  const userRepo = dataSource.getRepository(User);
  const orgRepo = dataSource.getRepository(Organization);
  const settingsRepo = dataSource.getRepository(Setting);

  // Create admin user (password: admin123)
  const existingAdmin = await userRepo.findOne({ where: { email: 'admin@coffee.com' } });
  if (!existingAdmin) {
    const admin = userRepo.create({
      email: 'admin@coffee.com',
      password: '$2b$10$sLBzpTHEx6GiLNIYaqJ/.Oh2BvarSaGQSJJasnrAhXuzc/ZqAQ.Yi', // admin123
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      isActive: true,
    });
    await userRepo.save(admin);
    console.log('✓ Admin user created');
  }

  // Create organizations
  const organizations = [
    { name: 'Вистекс', baseRate: 900, overtimeMultiplier: 1.5, hasOvertime: true },
    { name: 'РусХолтс', baseRate: 1100, overtimeMultiplier: null, hasOvertime: false },
    { name: 'ТО Франко', baseRate: 1100, overtimeMultiplier: null, hasOvertime: false },
    { name: 'Холод Вистекс', baseRate: 1200, overtimeMultiplier: 1.5, hasOvertime: true },
    { name: 'Франко', baseRate: 1210, overtimeMultiplier: 1.5, hasOvertime: true },
    { name: 'Локальный Сервис', baseRate: 1200, overtimeMultiplier: 1.5, hasOvertime: true },
  ];

  for (const orgData of organizations) {
    const existing = await orgRepo.findOne({ where: { name: orgData.name } });
    if (!existing) {
      const org = orgRepo.create(orgData);
      await orgRepo.save(org);
      console.log(`✓ Organization created: ${orgData.name}`);
    }
  }

  // Create settings
  const settings = [
    {
      key: SettingKey.AUTO_DISTRIBUTION_ENABLED,
      value: 'false',
      description: 'Enable automatic order distribution',
    },
    {
      key: SettingKey.MAX_ORDERS_PER_ENGINEER,
      value: '10',
      description: 'Maximum orders per engineer',
    },
  ];

  for (const settingData of settings) {
    const existing = await settingsRepo.findOne({ where: { key: settingData.key } });
    if (!existing) {
      const setting = settingsRepo.create(settingData);
      await settingsRepo.save(setting);
      console.log(`✓ Setting created: ${settingData.key}`);
    }
  }

  await dataSource.destroy();
  console.log('✓ Seed completed!');
}

seed().catch(error => {
  console.error('Seed failed:', error);
  process.exit(1);
});
