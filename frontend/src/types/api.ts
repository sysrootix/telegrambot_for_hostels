export interface ApiUser {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  languageCode: string | null;
  photoUrl: string | null;
  phone: string | null;
  bio: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiAdmin {
  id: string;
  telegramId: string;
  displayName: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TelegramUser {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  allows_write_to_pm?: boolean;
  photo_url?: string;
}

export interface SessionResponse {
  user: ApiUser;
  telegramUser: TelegramUser;
  isAdmin: boolean;
}
