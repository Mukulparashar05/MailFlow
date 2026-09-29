import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { User } from '@prisma/client';

export function configurePassport(): void {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackURL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/auth/google/callback';

  if (!clientID || !clientSecret) {
    logger.warn(
      'Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env',
    );
    return;
  }

  passport.use(
    new GoogleStrategy(
      { clientID, clientSecret, callbackURL },
      async (_accessToken, _refreshToken, profile: Profile, done) => {
        try {
          const googleId = profile.id;
          const email = profile.emails?.[0]?.value;
          const name = profile.displayName || 'Unknown';
          const avatar = profile.photos?.[0]?.value || null;

          if (!email) {
            return done(new Error('No email from Google profile'), undefined);
          }

          // Upsert user
          const user = await prisma.user.upsert({
            where: { googleId },
            create: { googleId, email, name, avatar },
            update: { email, name, avatar },
          });

          logger.info('User authenticated via Google', { userId: user.id, email });
          return done(null, user);
        } catch (err) {
          logger.error('Google OAuth strategy error', {
            error: err instanceof Error ? err.message : 'Unknown',
          });
          return done(err instanceof Error ? err : new Error('OAuth error'), undefined);
        }
      },
    ),
  );

  passport.serializeUser((user, done) => {
    const prismaUser = user as User;
    done(null, prismaUser.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      done(null, user || undefined);
    } catch (err) {
      done(err, undefined);
    }
  });

  logger.info('Passport Google OAuth strategy configured');
}
