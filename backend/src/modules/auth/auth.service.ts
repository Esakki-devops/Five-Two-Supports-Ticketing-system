import { createHash, randomBytes } from 'node:crypto';
import { config } from '../../core/config/index';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
  type AppError,
} from '../../core/errors/AppError';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../core/auth/tokens';
import { eventBus } from '../../core/events/event-bus';
import { renderPasswordResetEmail } from '../../integrations/mail/templates';
import { enqueueEmail } from '../../jobs/queues';
import { Role, UserStatus } from '../../common/types/index';
import { Department } from '../departments/department.model';
import { User, type UserDocument } from '../users/user.model';
import { hashPassword, verifyPassword } from './password';
import type { LoginInput, RegisterInput, ResetPasswordInput } from './auth.schemas';

type Serialized = Record<string, unknown>;
const serialize = (doc: { toJSON: () => unknown }): Serialized => doc.toJSON() as Serialized;

function issueTokens(user: UserDocument): { accessToken: string; refreshToken: string } {
  const id = String(user._id);
  return {
    accessToken: signAccessToken({ sub: id, role: user.role, email: user.email }),
    refreshToken: signRefreshToken({ sub: id, ver: user.refreshTokenVersion }),
  };
}

function statusError(status: string): AppError {
  switch (status) {
    case UserStatus.Pending:
      return new ForbiddenError('Your account is awaiting approval by IT.');
    case UserStatus.Rejected:
      return new ForbiddenError('Your registration was not approved. Please contact IT support.');
    case UserStatus.Disabled:
      return new ForbiddenError('Your account has been disabled. Please contact IT support.');
    default:
      return new ForbiddenError('Your account is not active.');
  }
}

export async function register(input: RegisterInput): Promise<Serialized> {
  const email = input.email.toLowerCase().trim();
  if (await User.exists({ email })) {
    throw new ConflictError('An account with this email already exists.');
  }
  const department = await Department.findOne({ _id: input.department, isActive: true });
  if (!department) {
    throw new BadRequestError('The selected department does not exist.');
  }
  const passwordHash = await hashPassword(input.password);
  const user = await User.create({
    name: input.name,
    email,
    passwordHash,
    role: Role.Employee,
    status: UserStatus.Pending,
    department: department._id,
  });
  eventBus.emit('user.registered', {
    userId: String(user._id),
    email: user.email,
    name: user.name,
  });
  return serialize(user);
}

export async function login(input: LoginInput): Promise<{
  user: Serialized;
  accessToken: string;
  refreshToken: string;
  mustResetPassword: boolean;
}> {
  const email = input.email.toLowerCase().trim();
  const user = await User.findOne({ email }).select(
    '+passwordHash +failedLoginAttempts +lockUntil',
  );
  if (!user) throw new UnauthorizedError('Invalid email or password.');

  // Brute-force lockout (only active accounts ever accumulate failures).
  if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
    const minutes = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60_000);
    throw new TooManyRequestsError(
      `Account temporarily locked after repeated failed logins. Try again in ${minutes} minute(s).`,
    );
  }

  if (user.status !== UserStatus.Active) throw statusError(user.status);

  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= config.security.loginMaxAttempts) {
      user.lockUntil = new Date(Date.now() + config.security.lockoutMinutes * 60_000);
      user.failedLoginAttempts = 0;
    }
    await user.save();
    throw new UnauthorizedError('Invalid email or password.');
  }

  // Success — clear any failure state.
  if (user.failedLoginAttempts !== 0 || user.lockUntil) {
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
  }
  user.lastLoginAt = new Date();
  await user.save();

  return { user: serialize(user), ...issueTokens(user), mustResetPassword: user.mustResetPassword };
}

export async function refresh(
  refreshToken: string | undefined,
): Promise<{ user: Serialized; accessToken: string; refreshToken: string }> {
  if (!refreshToken) throw new UnauthorizedError('Missing refresh token.');

  let claims;
  try {
    claims = verifyRefreshToken(refreshToken);
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token.');
  }

  const user = await User.findById(claims.sub);
  if (!user || user.status !== UserStatus.Active) {
    throw new UnauthorizedError('Your session is no longer valid.');
  }
  if (user.refreshTokenVersion !== claims.ver) {
    throw new UnauthorizedError('Your session has been revoked. Please log in again.');
  }

  return { user: serialize(user), ...issueTokens(user) };
}

export async function getProfile(userId: string): Promise<Serialized> {
  const user = await User.findById(userId).populate('department', 'name');
  if (!user) throw new NotFoundError('User not found.');
  return serialize(user);
}

export async function requestPasswordReset(emailInput: string): Promise<{ token: string | null }> {
  const email = emailInput.toLowerCase().trim();
  const user = await User.findOne({ email });
  // Never reveal whether an account exists.
  if (!user) return { token: null };

  const rawToken = randomBytes(32).toString('hex');
  user.passwordResetTokenHash = createHash('sha256').update(rawToken).digest('hex');
  user.passwordResetExpiresAt = new Date(Date.now() + config.auth.passwordResetTtlMinutes * 60_000);
  await user.save();

  const resetEmail = renderPasswordResetEmail({ resetToken: rawToken });
  enqueueEmail({
    to: user.email,
    subject: resetEmail.subject,
    html: resetEmail.html,
    text: resetEmail.text,
  });
  return { token: rawToken };
}

export async function resetPassword(input: ResetPasswordInput): Promise<Serialized> {
  const tokenHash = createHash('sha256').update(input.token).digest('hex');
  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpiresAt: { $gt: new Date() },
  }).select('+passwordResetTokenHash +passwordResetExpiresAt');

  if (!user) throw new BadRequestError('Invalid or expired reset token.');

  user.passwordHash = await hashPassword(input.password);
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpiresAt = undefined;
  user.mustResetPassword = false;
  user.refreshTokenVersion += 1; // revoke any outstanding sessions
  await user.save();

  return serialize(user);
}
