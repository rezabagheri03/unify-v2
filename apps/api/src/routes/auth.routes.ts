/**
 * src/routes/auth.routes.ts — Public auth routes (Agent Guide §10.3).
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from '../controllers/auth.controller';
import { loginRateLimiter } from '../middleware/rate-limit.middleware';
import { authenticateToken } from '../middleware/auth.middleware';
import { config } from '../config';

export const authRouter = Router();

authRouter.post('/login', loginRateLimiter, authController.login);
authRouter.post('/refresh', authController.refresh);
authRouter.post('/logout', authenticateToken, authController.logout);
authRouter.post('/change-password', authenticateToken, authController.changePassword);
authRouter.get('/me', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: {
      userId: req.user!.userId,
      username: req.user!.username,
      role: req.user!.role,
      departmentId: req.user!.departmentId,
    },
    requestId: req.requestId,
  });
});

// AGENT_DECISION: Refresh route is rate-limited separately to prevent abuse.
const refreshLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || 'unknown',
});
authRouter.use('/refresh', refreshLimiter);
