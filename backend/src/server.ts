import http from 'http';

import { getBot, stopBot } from './bot';
import { createApp } from './app';
import { env } from './env';
import { disconnectPrisma, prisma } from './prisma';

async function seedInitialAdmins() {
  if (!env.ADMIN_SEED_CHAT_IDS.length) {
    return;
  }

  await Promise.all(
    env.ADMIN_SEED_CHAT_IDS.map(async (chatId) => {
      const telegramId = chatId.trim();
      if (!telegramId) {
        return;
      }

      await prisma.user.upsert({
        where: { telegramId },
        create: {
          telegramId
        },
        update: {}
      });

      await prisma.admin.upsert({
        where: { telegramId },
        update: {},
        create: {
          telegramId,
          displayName: `Admin ${telegramId}`
        }
      });
    })
  );
}

async function bootstrap() {
  await seedInitialAdmins();

  const app = createApp();
  const server = http.createServer(app);

  server.listen(env.PORT, () => {
    console.log(`🚀 Backend listening on port ${env.PORT}`);
  });

  getBot();

  const shutdown = async () => {
    console.log('🛑 Shutting down server...');
    await stopBot();
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    await disconnectPrisma();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start server', error);
  process.exit(1);
});
