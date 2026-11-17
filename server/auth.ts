import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { User, UserRole } from '../src/types/ipp.js';

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const ACCESS_TOKEN_TTL = '2h';
const REFRESH_TOKEN_TTL = '7d';

export interface AuthTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  name: string;
  type: 'access' | 'refresh';
}

export interface AuthenticatedRequest extends Request {
  authUser?: AuthTokenPayload;
}

export function signAccessToken(user: User): string {
  const payload: AuthTokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    type: 'access',
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

export function signRefreshToken(user: User): string {
  const payload: AuthTokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    type: 'refresh',
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_TTL });
}

export function setAuthCookies(res: Response, user: User): void {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  const isProd = process.env.NODE_ENV === 'production';

  res.cookie('ipp_access_token', accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: 2 * 60 * 60 * 1000,
    path: '/',
  });

  res.cookie('ipp_refresh_token', refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie('ipp_access_token', { path: '/' });
  res.clearCookie('ipp_refresh_token', { path: '/' });
}

export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
  } catch {
    return null;
  }
}

export function extractAuthUser(req: AuthenticatedRequest): AuthTokenPayload | null {
  const cookieToken = req.cookies?.ipp_access_token;
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const token = cookieToken || bearerToken;
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || decoded.type !== 'access') return null;
  return decoded;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const user = extractAuthUser(req);
  if (!user) {
    res.status(401).json({ error: 'Authentication required. Please sign in to continue.' });
    return;
  }
  req.authUser = user;
  next();
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const user = req.authUser || extractAuthUser(req);
    if (!user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({
        error: `Insufficient permissions. Role '${user.role}' cannot perform this operation.`,
        requiredRoles: allowedRoles,
      });
      return;
    }
    req.authUser = user;
    next();
  };
}
