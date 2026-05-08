import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../lib/prisma';
import { AuditEventType } from '@prisma/client';

const JWT_EXPIRES = '8h';
const REFRESH_EXPIRES = '30d';
const REFRESH_EXPIRES_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

interface AuditContext {
  userId?: string;
  ip: string;
  userAgent: string;
}

async function logAudit(eventType: AuditEventType, ctx: AuditContext) {
  await prisma.auditLog.create({
    data: {
      userId: ctx.userId,
      eventType,
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    },
  });
}

function signAccess(userId: string, email: string, role: string, branchId: string | null) {
  return jwt.sign(
    { sub: userId, email, role, branchId },
    process.env.JWT_SECRET!,
    { expiresIn: JWT_EXPIRES }
  );
}

function signRefresh(userId: string) {
  return jwt.sign({ sub: userId }, process.env.JWT_REFRESH_SECRET!, { expiresIn: REFRESH_EXPIRES });
}

export async function login(email: string, password: string, ctx: AuditContext) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.isActive) {
    await logAudit(AuditEventType.failed_attempt, ctx);
    return { error: 'Invalid credentials', status: 401 } as const;
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { error: 'Account temporarily locked', status: 423 } as const;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const newAttempts = user.failedAttempts + 1;
    const lockedUntil =
      newAttempts >= MAX_FAILED_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
        : null;

    await prisma.user.update({
      where: { id: user.id },
      data: { failedAttempts: newAttempts, lockedUntil },
    });

    await logAudit(AuditEventType.failed_attempt, { ...ctx, userId: user.id });
    return { error: 'Invalid credentials', status: 401 } as const;
  }

  // Reset lockout on success
  await prisma.user.update({
    where: { id: user.id },
    data: { failedAttempts: 0, lockedUntil: null },
  });

  const accessToken = signAccess(user.id, user.email, user.role, user.branchId);
  const refreshToken = signRefresh(user.id);

  await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken,
      expiresAt: new Date(Date.now() + REFRESH_EXPIRES_MS),
    },
  });

  await logAudit(AuditEventType.login, { ...ctx, userId: user.id });

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, role: user.role, branchId: user.branchId },
  } as const;
}

export async function refresh(refreshToken: string, ctx: AuditContext) {
  let payload: { sub: string };
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { sub: string };
  } catch {
    return { error: 'Invalid refresh token', status: 401 } as const;
  }

  const session = await prisma.session.findUnique({ where: { refreshToken } });
  if (!session || session.expiresAt < new Date()) {
    return { error: 'Session expired', status: 401 } as const;
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) {
    return { error: 'User not found', status: 401 } as const;
  }

  const newAccessToken = signAccess(user.id, user.email, user.role, user.branchId);
  await logAudit(AuditEventType.token_refresh, { ...ctx, userId: user.id });

  return { accessToken: newAccessToken } as const;
}

export async function logout(refreshToken: string, ctx: AuditContext) {
  const session = await prisma.session.findUnique({ where: { refreshToken } });
  if (session) {
    await prisma.session.delete({ where: { refreshToken } });
    await logAudit(AuditEventType.logout, { ...ctx, userId: session.userId });
  }
}
