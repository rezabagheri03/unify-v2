/**
 * src/controllers/auth.controller.ts — Auth HTTP handlers.
 */

import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { BadRequest } from '../utils/errors';
import { asyncHandler } from '../middleware/error.middleware';

export const authController = {
  login: asyncHandler(async (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username || !password) throw BadRequest('نام کاربری و رمز عبور الزامی است');
    const result = await authService.login(username, password);
    res.json({ success: true, data: result, requestId: req.requestId });
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    if (!refreshToken) throw BadRequest('توکن تازه‌سازی الزامی است');
    const result = await authService.refresh(refreshToken);
    res.json({ success: true, data: result, requestId: req.requestId });
  }),

  changePassword: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw BadRequest('احراز هویت انجام نشده');
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user.userId, currentPassword, newPassword);
    res.json({ success: true, data: { message: 'رمز عبور با موفقیت تغییر کرد' }, requestId: req.requestId });
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw BadRequest('احراز هویت انجام نشده');
    await authService.logout(req.user.userId, req.user.role);
    res.json({ success: true, data: { message: 'خروج موفقیت‌آمیز' }, requestId: req.requestId });
  }),
};
