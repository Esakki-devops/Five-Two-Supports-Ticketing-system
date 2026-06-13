import type { CookieOptions, Request, Response } from 'express';
import { config } from '../../core/config/index';
import { sendSuccess } from '../../core/http/envelope';
import { getBody } from '../../core/middleware/validate';
import * as authService from './auth.service';
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from './auth.schemas';

const REFRESH_PATH = `${config.http.apiPrefix}/auth`;

function refreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: REFRESH_PATH,
    ...(config.cookie.domain ? { domain: config.cookie.domain } : {}),
  };
}

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(config.cookie.refreshName, token, {
    ...refreshCookieOptions(),
    maxAge: config.auth.refreshTtlSeconds * 1000,
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(config.cookie.refreshName, refreshCookieOptions());
}

function getRefreshToken(req: Request): string | undefined {
  const fromCookie = req.cookies?.[config.cookie.refreshName] as string | undefined;
  const fromBody = (req.body as { refreshToken?: string } | undefined)?.refreshToken;
  return fromCookie ?? fromBody;
}

export async function postRegister(req: Request, res: Response): Promise<Response> {
  const user = await authService.register(getBody<RegisterInput>(req));
  return sendSuccess(res, { user }, { status: 201 });
}

export async function postLogin(req: Request, res: Response): Promise<Response> {
  const { user, accessToken, refreshToken, mustResetPassword } = await authService.login(
    getBody<LoginInput>(req),
  );
  setRefreshCookie(res, refreshToken);
  return sendSuccess(res, { user, accessToken, mustResetPassword });
}

export async function postRefresh(req: Request, res: Response): Promise<Response> {
  const { user, accessToken, refreshToken } = await authService.refresh(getRefreshToken(req));
  setRefreshCookie(res, refreshToken);
  return sendSuccess(res, { user, accessToken });
}

export function postLogout(_req: Request, res: Response): Response {
  clearRefreshCookie(res);
  return sendSuccess(res, { message: 'Logged out.' });
}

export async function getMe(req: Request, res: Response): Promise<Response> {
  const user = await authService.getProfile(req.auth!.userId);
  return sendSuccess(res, { user });
}

export async function postForgotPassword(req: Request, res: Response): Promise<Response> {
  const { email } = getBody<ForgotPasswordInput>(req);
  const { token } = await authService.requestPasswordReset(email);
  const data: Record<string, unknown> = {
    message: 'If an account exists for that email, a password reset link has been sent.',
  };
  // Dev/test convenience only — never expose the token in production.
  if (!config.isProduction && token) data.resetToken = token;
  return sendSuccess(res, data);
}

export async function postResetPassword(req: Request, res: Response): Promise<Response> {
  await authService.resetPassword(getBody<ResetPasswordInput>(req));
  return sendSuccess(res, { message: 'Your password has been reset. Please log in.' });
}
