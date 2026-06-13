import jwt from 'jsonwebtoken';
import { config } from '../config/index';
import type { Role } from '../../common/types/index';

export interface AccessTokenClaims {
  sub: string; // userId
  role: Role;
  email: string;
}

export interface RefreshTokenClaims {
  sub: string; // userId
  ver: number; // refreshTokenVersion — bumped to revoke
}

export function signAccessToken(claims: AccessTokenClaims): string {
  return jwt.sign(claims, config.auth.accessSecret, { expiresIn: config.auth.accessTtlSeconds });
}

export function signRefreshToken(claims: RefreshTokenClaims): string {
  return jwt.sign(claims, config.auth.refreshSecret, { expiresIn: config.auth.refreshTtlSeconds });
}

export function verifyAccessToken(token: string): AccessTokenClaims {
  return jwt.verify(token, config.auth.accessSecret) as AccessTokenClaims & jwt.JwtPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenClaims {
  return jwt.verify(token, config.auth.refreshSecret) as RefreshTokenClaims & jwt.JwtPayload;
}
