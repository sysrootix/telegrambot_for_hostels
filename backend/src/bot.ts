import TelegramBot from 'node-telegram-bot-api';
import type { Message } from 'node-telegram-bot-api';

import { env } from './env';

let botInstance: TelegramBot | null = null;

export function getBot(): TelegramBot {
  if (!botInstance) {
    botInstance = new TelegramBot(env.BOT_TOKEN, {
      polling: true,
      baseApiUrl: env.TELEGRAM_API_BASE_URL
    });

    botInstance.setMyCommands([{ command: 'start', description: 'Запуск веб-приложения' }]);

    botInstance.onText(/\/start/, (msg: Message) => {
      if (!msg.chat || !msg.chat.id) {
        return;
      }

      botInstance!.sendMessage(msg.chat.id, 'Привет! Нажми кнопку, чтобы открыть приложение.', {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Открыть приложение',
                web_app: {
                  url: env.WEBAPP_URL
                }
              }
            ]
          ]
        }
      });
    });
  }

  return botInstance;
}

export async function stopBot() {
  if (!botInstance) {
    return;
  }

  await botInstance.stopPolling();
  botInstance = null;
}
