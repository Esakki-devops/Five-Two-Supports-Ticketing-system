import type { Types } from 'mongoose';
import { Role, UserStatus } from '../../src/common/types/index';
import {
  Department,
  type DepartmentDocument,
} from '../../src/modules/departments/department.model';
import { Category, type CategoryDocument } from '../../src/modules/categories/category.model';
import { User, type UserDocument } from '../../src/modules/users/user.model';
import { hashPassword } from '../../src/modules/auth/password';

let counter = 0;
const uniqueEmail = (): string => `user_${Date.now()}_${counter++}@example.com`;

export function createDepartment(name = 'IT / Digital'): Promise<DepartmentDocument> {
  return Department.create({ name, isActive: true });
}

export function createCategory(name = 'Hardware Issue'): Promise<CategoryDocument> {
  return Category.create({ name });
}

export interface UserFactoryOptions {
  name?: string;
  email?: string;
  password?: string;
  role?: Role;
  status?: UserStatus;
  department?: Types.ObjectId;
  mustResetPassword?: boolean;
}

export async function createUser(opts: UserFactoryOptions = {}): Promise<UserDocument> {
  const passwordHash = await hashPassword(opts.password ?? 'Password123');
  return User.create({
    name: opts.name ?? 'Test User',
    email: (opts.email ?? uniqueEmail()).toLowerCase(),
    passwordHash,
    role: opts.role ?? Role.Engineer,
    status: opts.status ?? UserStatus.Active,
    department: opts.department,
    mustResetPassword: opts.mustResetPassword ?? false,
  });
}
