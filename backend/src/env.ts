import 'dotenv/config';

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  BOT_TOKEN: z.string().min(1, 'BOT_TOKEN is required'),
  WEBAPP_URL: z.string().url('WEBAPP_URL must be a valid URL'),
  TELEGRAM_API_BASE_URL: z.string().url().default('https://api.telegram.org'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  ADMIN_SEED_CHAT_IDS: z
    .string()
    .optional()
    .transform((value) => value?.split(',').map((id) => id.trim()).filter(Boolean) ?? []),
  DEFAULT_CHAT_ID: z.string().default('-1003141626322')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
