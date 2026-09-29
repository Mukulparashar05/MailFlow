import axios from 'axios';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

const SLACK_API_URL = 'https://slack.com/api';

export interface SlackMessage {
  text: string;
  blocks?: object[];
}

export async function sendSlackNotification(
  userId: string,
  message: SlackMessage,
): Promise<boolean> {
  try {
    const connection = await prisma.slackConnection.findUnique({
      where: { userId },
    });

    if (!connection) {
      logger.debug('No Slack connection found for user', { userId });
      return false;
    }

    const response = await axios.post(
      `${SLACK_API_URL}/chat.postMessage`,
      {
        channel: connection.channelId || connection.slackUserId,
        text: message.text,
        blocks: message.blocks,
      },
      {
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      },
    );

    if (!response.data.ok) {
      const error = response.data.error;
      logger.warn('Slack API returned error', { userId, error });

      // Handle revoked/invalid tokens gracefully
      if (error === 'token_revoked' || error === 'invalid_auth' || error === 'account_inactive') {
        logger.warn('Slack token revoked or invalid — removing connection', { userId });
        await prisma.slackConnection.delete({ where: { userId } }).catch(() => {});
      }

      return false;
    }

    logger.info('Slack notification sent', { userId, messageText: message.text });
    return true;
  } catch (error) {
    // Network or other errors must not crash the worker
    logger.error('Failed to send Slack notification', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

export async function getSlackUserInfo(accessToken: string): Promise<{
  userId: string;
  teamId: string;
  teamName: string;
}> {
  const response = await axios.get(`${SLACK_API_URL}/auth.test`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.data.ok) {
    throw new Error(`Slack auth.test failed: ${response.data.error}`);
  }

  return {
    userId: response.data.user_id,
    teamId: response.data.team_id,
    teamName: response.data.team,
  };
}

export async function exchangeSlackCode(code: string): Promise<{
  accessToken: string;
  userId: string;
  teamId: string;
  teamName: string;
}> {
  const response = await axios.post(
    `${SLACK_API_URL}/oauth.v2.access`,
    new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID || '',
      client_secret: process.env.SLACK_CLIENT_SECRET || '',
      code,
      redirect_uri: process.env.SLACK_REDIRECT_URI || '',
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
  );

  if (!response.data.ok) {
    throw new Error(`Slack OAuth exchange failed: ${response.data.error}`);
  }

  return {
    accessToken: response.data.access_token,
    userId: response.data.authed_user?.id || response.data.bot_user_id,
    teamId: response.data.team?.id,
    teamName: response.data.team?.name,
  };
}
