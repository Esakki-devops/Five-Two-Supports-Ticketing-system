import { config } from '../core/config/index';
import { connectMongo, disconnectMongo } from '../core/db/mongoose';
import { logger } from '../core/logger/index';
import { Role, UserStatus } from '../common/types/index';
import { User } from '../modules/users/user.model';
import { hashPassword } from '../modules/auth/password';
import { Department, normalizeName } from '../modules/departments/department.model';
import { Category } from '../modules/categories/category.model';

/**
 * Idempotent seed. Phase 2 seeds the bootstrap engineer/admin.
 * Phase 3 extends this with the nine departments and starter categories.
 */
async function seedBootstrapAdmin(): Promise<void> {
  const { adminEmail, adminPassword, adminName } = config.bootstrap;
  if (!adminEmail || !adminPassword) {
    logger.warn('BOOTSTRAP_ADMIN_EMAIL/PASSWORD not set — skipping bootstrap admin seed');
    return;
  }

  const email = adminEmail.toLowerCase().trim();
  if (await User.exists({ email })) {
    logger.info({ email }, 'Bootstrap admin already exists — skipping');
    return;
  }

  await User.create({
    name: adminName,
    email,
    passwordHash: await hashPassword(adminPassword),
    role: Role.Engineer,
    status: UserStatus.Active,
    mustResetPassword: true,
  });
  logger.info({ email }, 'Bootstrap admin created (must reset password on first login)');
}

const DEPARTMENTS = [
  'Procurement',
  'Logistics',
  'Engineering',
  'Oil & Gas Services',
  'Industrial Supplies',
  'Operations',
  'Finance',
  'HR',
  'IT / Digital',
];

const CATEGORIES = [
  'Hardware Issue',
  'Software / Application',
  'Network / Access Request',
  'Email & Communication',
  'Procurement Support',
  'Vendor Document Request',
  'Account / Login',
  'Other',
];

async function seedDepartments(): Promise<void> {
  let created = 0;
  for (const name of DEPARTMENTS) {
    if (!(await Department.exists({ normalizedName: normalizeName(name) }))) {
      await Department.create({ name });
      created += 1;
    }
  }
  logger.info({ created, total: DEPARTMENTS.length }, 'Departments seeded');
}

async function seedCategories(): Promise<void> {
  let created = 0;
  for (const name of CATEGORIES) {
    if (!(await Category.exists({ normalizedName: normalizeName(name) }))) {
      await Category.create({ name });
      created += 1;
    }
  }
  logger.info({ created, total: CATEGORIES.length }, 'Categories seeded');
}

async function main(): Promise<void> {
  await connectMongo();
  await seedBootstrapAdmin();
  await seedDepartments();
  await seedCategories();
  await disconnectMongo();
  logger.info('Seed complete');
  process.exit(0);
}

main().catch((err: unknown) => {
  logger.fatal({ err: err instanceof Error ? err.message : err }, 'Seed failed');
  process.exit(1);
});
