import { isValidObjectId } from 'mongoose';
import { z } from 'zod';

const objectId = z.string().refine((v) => isValidObjectId(v), 'Invalid id');
const strongPassword = z.string().min(8, 'Password must be at least 8 characters').max(128);

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email().max(254),
  password: strongPassword,
  department: objectId,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.email().max(254),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(10).max(256),
  password: strongPassword,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
