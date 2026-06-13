import { BadRequestError, ConflictError, NotFoundError } from '../../core/errors/AppError';
import { getPagination } from '../../core/http/pagination';
import { Role, UserStatus } from '../../common/types/index';
import { eventBus } from '../../core/events/event-bus';
import { Department } from '../departments/department.model';
import { hashPassword } from '../auth/password';
import { User } from './user.model';
import type { CreateUserInput, ListUsersQuery, UpdateStatusInput } from './user.schemas';

type Serialized = Record<string, unknown>;
const serialize = (doc: { toJSON: () => unknown }): Serialized => doc.toJSON() as Serialized;

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function listUsers(
  query: ListUsersQuery,
): Promise<{ items: Serialized[]; total: number; page: number; limit: number }> {
  const { page, limit, skip } = getPagination(query);

  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.role) filter.role = query.role;
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }

  const [items, total] = await Promise.all([
    User.find(filter)
      .populate('department', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  return { items: items.map(serialize), total, page, limit };
}

export async function createUser(input: CreateUserInput): Promise<Serialized> {
  const email = input.email.toLowerCase().trim();
  if (await User.exists({ email })) {
    throw new ConflictError('An account with this email already exists.');
  }
  if (input.role === Role.Employee) {
    const department = await Department.findOne({ _id: input.department, isActive: true });
    if (!department) throw new BadRequestError('A valid department is required for employees.');
  }

  const passwordHash = await hashPassword(input.password);
  const user = await User.create({
    name: input.name,
    email,
    passwordHash,
    role: input.role,
    status: UserStatus.Active,
    department: input.role === Role.Employee ? input.department : undefined,
    mustResetPassword: true,
  });
  return serialize(user);
}

export async function approveUser(id: string): Promise<Serialized> {
  const user = await User.findById(id);
  if (!user) throw new NotFoundError('User not found.');
  if (user.status !== UserStatus.Pending && user.status !== UserStatus.Rejected) {
    throw new BadRequestError(`Cannot approve a user whose status is '${user.status}'.`);
  }
  user.status = UserStatus.Active;
  await user.save();
  eventBus.emit('user.approved', { userId: String(user._id), email: user.email, name: user.name });
  return serialize(user);
}

export async function rejectUser(id: string): Promise<Serialized> {
  const user = await User.findById(id);
  if (!user) throw new NotFoundError('User not found.');
  if (user.status !== UserStatus.Pending) {
    throw new BadRequestError(`Cannot reject a user whose status is '${user.status}'.`);
  }
  user.status = UserStatus.Rejected;
  await user.save();
  eventBus.emit('user.rejected', { userId: String(user._id), email: user.email, name: user.name });
  return serialize(user);
}

export async function updateUserStatus(id: string, input: UpdateStatusInput): Promise<Serialized> {
  const user = await User.findById(id);
  if (!user) throw new NotFoundError('User not found.');

  if (input.role) user.role = input.role;
  if (input.status) {
    user.status = input.status;
    if (input.status === UserStatus.Disabled) {
      user.refreshTokenVersion += 1; // revoke outstanding sessions
    }
  }
  await user.save();
  return serialize(user);
}
