declare module 'node-telegram-bot-api' {
  export interface TelegramUser {
    id: number;
    is_bot?: boolean;
    first_name?: string;
    last_name?: string;
    username?: string;
    language_code?: string;
  }

  export interface Chat {
    id: number | string;
    type?: string;
    title?: string;
  }

  export interface Message {
    message_id?: number;
    chat?: Chat;
    from?: TelegramUser;
    date?: number;
    text?: string;
  }

  export interface RestrictChatMemberOptions {
    permissions: {
      can_send_messages?: boolean;
      can_send_media_messages?: boolean;
      can_send_other_messages?: boolean;
      can_add_web_page_previews?: boolean;
    };
    until_date?: number;
  }

  export interface BanChatMemberOptions {
    until_date?: number;
    revoke_messages?: boolean;
  }

  export interface UnbanChatMemberOptions {
    only_if_banned?: boolean;
  }

  export interface TelegramBotOptions {
    polling?: boolean;
    baseApiUrl?: string;
  }

  export default class TelegramBot {
    constructor(token: string, options?: TelegramBotOptions);
    setMyCommands(commands: Array<{ command: string; description: string }>): Promise<boolean>;
    onText(regexp: RegExp, callback: (msg: Message, match: RegExpExecArray | null) => void): void;
    sendMessage(chatId: number | string, text: string, options?: unknown): Promise<Message>;
    restrictChatMember(
      chatId: number | string,
      userId: number,
      options: RestrictChatMemberOptions
    ): Promise<boolean>;
    banChatMember(
      chatId: number | string,
      userId: number,
      options?: BanChatMemberOptions
    ): Promise<boolean>;
    unbanChatMember(
      chatId: number | string,
      userId: number,
      options?: UnbanChatMemberOptions
    ): Promise<boolean>;
    stopPolling(): Promise<void>;
  }
}
