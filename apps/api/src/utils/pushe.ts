/**
 * src/utils/pushe.ts — Pushe push notification SDK wrapper.
 * Agent Guide §6.2: Pushe is primary, Socket.io is fallback.
 * If Pushe credentials are missing, all calls gracefully no-op.
 */

import axios from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';

interface PusheSendResult {
  success: boolean;
  reportId?: string;
  error?: string;
}

/** Send a notification to one or more users via Pushe. */
export async function sendViaPushe(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<PusheSendResult> {
  if (!config.pushe.enabled) {
    return { success: false, error: 'Pushe not configured' };
  }
  if (tokens.length === 0) {
    return { success: true };
  }

  try {
    const response = await axios.post(
      `${config.pushe.apiUrl}/notifications/`,
      {
        app_ids: [config.pushe.appId],
        filters: { customId: { values: tokens } },
        data: { title, content: body, additional_data: data || {} },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${config.pushe.apiKey}`,
        },
        timeout: 10_000,
      },
    );
    if (response.data?.success) {
      return { success: true, reportId: response.data.report_id };
    }
    return { success: false, error: JSON.stringify(response.data) };
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : err }, 'Pushe send failed');
    return { success: false, error: err instanceof Error ? err.message : 'unknown' };
  }
}

/** Register a device token for a user. */
export async function registerPusheToken(userId: string, token: string): Promise<boolean> {
  if (!config.pushe.enabled) return false;
  try {
    // In production, store this in DB. For now, Pushe manages device registration client-side.
    logger.info({ userId, tokenLength: token.length }, 'Pushe token registered');
    return true;
  } catch (err) {
    logger.warn({ err }, 'Failed to register Pushe token');
    return false;
  }
}
