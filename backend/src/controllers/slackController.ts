import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { exchangeSlackCode, getSlackUserInfo } from '../services/slackService';
import { logger } from '../config/logger';

export async function connectSlack(req: Request, res: Response): Promise<void> {
  const clientId = process.env.SLACK_CLIENT_ID;
  const redirectUri = process.env.SLACK_REDIRECT_URI;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (!clientId || !redirectUri) {
    res.status(503).json({
      success: false,
      error: 'Slack integration not configured. Set SLACK_CLIENT_ID and SLACK_REDIRECT_URI in .env',
    });
    return;
  }

  const scopes = [
    'chat:write',
    'im:write',
    'channels:read',
    'users:read',
  ].join(',');

  const state = req.user!.id; // Use userId as state for security

  const slackOAuthUrl =
    `https://slack.com/oauth/v2/authorize` +
    `?client_id=${clientId}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${state}` +
    `&user_scope=chat%3Awrite%2Cim%3Awrite`;

  res.redirect(slackOAuthUrl);
}

export async function slackCallback(req: Request, res: Response): Promise<void> {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const { code, state, error } = req.query as Record<string, string>;

  if (error) {
    logger.warn('Slack OAuth error', { error });
    res.redirect(`${frontendUrl}/dashboard?slack=error&reason=${encodeURIComponent(error)}`);
    return;
  }

  if (!code) {
    res.redirect(`${frontendUrl}/dashboard?slack=error&reason=no_code`);
    return;
  }

  // state = userId (set during initiation)
  const userId = state;

  try {
    const tokenData = await exchangeSlackCode(code);

    // Verify Slack identity
    const userInfo = await getSlackUserInfo(tokenData.accessToken);

    // Upsert Slack connection
    await prisma.slackConnection.upsert({
      where: { userId },
      create: {
        userId,
        slackUserId: userInfo.userId,
        accessToken: tokenData.accessToken,
        teamId: userInfo.teamId,
        teamName: userInfo.teamName,
      },
      update: {
        slackUserId: userInfo.userId,
        accessToken: tokenData.accessToken,
        teamId: userInfo.teamId,
        teamName: userInfo.teamName,
      },
    });

    logger.info('Slack connected', { userId, teamId: userInfo.teamId });
    res.redirect(`${frontendUrl}/dashboard?slack=connected`);
  } catch (err) {
    logger.error('Slack OAuth callback failed', {
      error: err instanceof Error ? err.message : 'Unknown',
    });
    res.redirect(`${frontendUrl}/dashboard?slack=error&reason=oauth_failed`);
  }
}

export async function disconnectSlack(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;

  await prisma.slackConnection.deleteMany({ where: { userId } });
  logger.info('Slack disconnected', { userId });

  res.json({ success: true, message: 'Slack disconnected' });
}

export async function getSlackStatus(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;

  const connection = await prisma.slackConnection.findUnique({
    where: { userId },
    select: { teamName: true, slackUserId: true, createdAt: true },
  });

  res.json({
    success: true,
    data: {
      connected: !!connection,
      teamName: connection?.teamName || null,
      slackUserId: connection?.slackUserId || null,
      connectedAt: connection?.createdAt || null,
    },
  });
}
