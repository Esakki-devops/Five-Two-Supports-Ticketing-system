import bcrypt from 'bcryptjs';
import { config } from '../../core/config/index';

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, config.auth.bcryptCost);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
