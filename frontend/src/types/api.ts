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
  payoutUsdtTrc20: string | null;
  payoutUsdtBep20: string | null;
  chatId: string | null;
  mutedUntil: string | null;
  isBlocked: boolean;
  blockReason: string | null;
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

export interface ApiCheck {
  id: string;
  userId: string;
  amount: number;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  user?: Pick<ApiUser, 'id' | 'telegramId' | 'firstName' | 'lastName' | 'username'>;
}

export interface CheckStats {
  count: number;
  total: number;
}

export interface ChecksSummaryRow {
  user: Pick<ApiUser, 'id' | 'telegramId' | 'firstName' | 'lastName' | 'username'>;
  day: CheckStats;
  week: CheckStats;
  month: CheckStats;
  custom?: CheckStats;
}

export interface ChecksSummaryResponse {
  generatedAt: string;
  ranges: {
    day: { start: string; end: string };
    week: { start: string; end: string };
    month: { start: string; end: string };
    custom: { start: string; end: string } | null;
  };
  users: ChecksSummaryRow[];
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
