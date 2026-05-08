import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';

const BRANCH_EXEMPT_ROLES: Role[] = [Role.owner, Role.partner, Role.boekhouder];

/**
 * Injects branchId filter into req for routes that scope data per branch.
 * Owner/partner/boekhouder see all branches; others are scoped to their own.
 */
export function requireBranch(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  if (BRANCH_EXEMPT_ROLES.includes(req.user.role as Role)) {
    next();
    return;
  }

  if (!req.user.branchId) {
    res.status(403).json({ success: false, error: 'No branch assigned to this user' });
    return;
  }

  next();
}
