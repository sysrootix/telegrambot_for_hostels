import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { updateProfile, type UpdateProfilePayload } from '@/api/profile';
import { fetchMySalarySummary, listChecks, type CheckPeriod } from '@/api/checks';
import { useSession } from '@/providers/SessionProvider';

const CHECK_PERIOD_OPTIONS: { id: CheckPeriod; label: string }[] = [
  { id: 'day', label: 'Сегодня' },
  { id: 'week', label: 'Неделя' },
  { id: 'month', label: 'Месяц' },
  { id: 'custom', label: 'Период' }
];

const PROFILE_TABS: { id: 'profile' | 'settings' | 'checks'; label: string }[] = [
  { id: 'profile', label: 'Профиль' },
  { id: 'settings', label: 'Настройки' },
  { id: 'checks', label: 'Чеки' }
];

type SettingsFormValues = {
  payoutUsdtTrc20: string;
  payoutUsdtBep20: string;
};

const currencyFormatter = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const checkDateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});

const dateOnlyFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
});

export function ProfilePage() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'profile' | 'settings' | 'checks'>('profile');
  const [checksPeriod, setChecksPeriod] = useState<CheckPeriod>('month');
  const [customRange, setCustomRange] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  });
  const todayDate = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const displayName = useMemo(() => {
    if (!session) {
      return '';
    }

    return (
      session.user.firstName ??
      session.user.username ??
      session.telegramUser.first_name ??
      session.user.telegramId
    );
  }, [session]);
  const avatarUrl = session?.user.photoUrl ?? session?.telegramUser.photo_url ?? null;
  const fallbackInitial = displayName ? displayName.slice(0, 1).toUpperCase() : '#';
  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty, isSubmitting }
  } = useForm<SettingsFormValues>({
    defaultValues: {
      payoutUsdtTrc20: session?.user.payoutUsdtTrc20 ?? '',
      payoutUsdtBep20: session?.user.payoutUsdtBep20 ?? ''
    }
  });

  const checksQuery = useQuery({
    queryKey: ['my-checks', checksPeriod, customRange.start, customRange.end],
    queryFn: async () => {
      if (checksPeriod === 'custom') {
        return listChecks({
          startDate: customRange.start || undefined,
          endDate: customRange.end || undefined
        });
      }

      return listChecks({ period: checksPeriod });
    },
    enabled:
      Boolean(session) &&
      activeTab === 'checks' &&
      (checksPeriod !== 'custom' || Boolean(customRange.start || customRange.end)),
    staleTime: 1000 * 60
  });

  const salaryQuery = useQuery({
    queryKey: ['my-salary', checksPeriod, customRange.start, customRange.end],
    queryFn: async () => {
      if (checksPeriod === 'custom') {
        if (!customRange.start || !customRange.end) {
          return null;
        }

        return fetchMySalarySummary({
          startDate: customRange.start,
          endDate: customRange.end
        });
      }

      return fetchMySalarySummary({ period: checksPeriod });
    },
    enabled:
      Boolean(session) &&
      (checksPeriod !== 'custom' || Boolean(customRange.start && customRange.end)),
    staleTime: 1000 * 60
  });

  const myChecks = useMemo(() => checksQuery.data ?? [], [checksQuery.data]);
  const myChecksTotals = useMemo(() => {
    const total = myChecks.reduce((sum, check) => sum + check.amount, 0);
    return {
      count: myChecks.length,
      total
    };
  }, [myChecks]);

  const formatAmount = (value: number) => `${currencyFormatter.format(value)} AED`;
  const formatCheckDate = (value: string) => checkDateFormatter.format(new Date(value));
  const formatDateOnly = (value: string) => dateOnlyFormatter.format(new Date(value));

  const salaryStats = salaryQuery.data?.stats ?? null;
  const salaryDisplay = salaryQuery.isLoading
    ? 'Загрузка…'
    : salaryQuery.isError || !salaryStats || salaryStats.salary === null
      ? '—'
      : formatAmount(salaryStats.salary);
  const salaryPercent = !salaryQuery.isLoading && !salaryQuery.isError && salaryStats?.percent !== null
    ? `${salaryStats.percent}%`
    : null;
  const salaryPartnerBreakdown = !salaryQuery.isLoading && !salaryQuery.isError && salaryStats?.partnerFromOthers !== null
    ? `Из других: ${formatAmount(salaryStats.partnerFromOthers ?? 0)} · Со своих: ${formatAmount(
        salaryStats.partnerFromOwn ?? 0
      )}`
    : null;
  const salaryPercentMissing = !salaryQuery.isLoading && !salaryQuery.isError && salaryStats !== null && salaryStats.percent === null;
  const salaryRangeLabel = salaryQuery.data
    ? salaryQuery.data.period === 'custom'
      ? `${formatDateOnly(salaryQuery.data.range.start)} — ${formatDateOnly(salaryQuery.data.range.end)}`
      : CHECK_PERIOD_OPTIONS.find((option) => option.id === salaryQuery.data?.period)?.label ?? null
    : null;

  const handlePeriodChange = (period: CheckPeriod) => {
    setChecksPeriod(period);

    if (period === 'custom') {
      setCustomRange((prev) => ({
        start: prev.start || todayDate,
        end: prev.end || todayDate
      }));
    }
  };

  const handleCustomRangeChange = (key: 'start' | 'end', value: string) => {
    setCustomRange((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  useEffect(() => {
    if (session?.user) {
      reset({
        payoutUsdtTrc20: session.user.payoutUsdtTrc20 ?? '',
        payoutUsdtBep20: session.user.payoutUsdtBep20 ?? ''
      });
    }
  }, [reset, session?.user]);

  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: async () => {
      toast.success('Профиль обновлен');
      await queryClient.invalidateQueries({ queryKey: ['session'] });
    },
    onError: () => {
      toast.error('Не удалось сохранить профиль');
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    const payload: UpdateProfilePayload = {};

    const trc = values.payoutUsdtTrc20.trim();
    const bep = values.payoutUsdtBep20.trim();

    payload.payoutUsdtTrc20 = trc.length > 0 ? trc : '';
    payload.payoutUsdtBep20 = bep.length > 0 ? bep : '';

    await mutation.mutateAsync(payload);
  });

  if (!session) {
    return null;
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-4">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="h-16 w-16 rounded-full border border-white/10 object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-white/10 bg-white/5 text-xl font-semibold">
            {fallbackInitial}
          </div>
        )}
        <div className="flex flex-col">
          <span className="text-base font-semibold">{displayName}</span>
          <span className="text-sm text-tgHint">
            @{session.user.username ?? session.telegramUser.username ?? 'не указан'}
          </span>
          <span className="text-xs text-tgHint">ID: {session.user.telegramId}</span>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto rounded-2xl bg-white/5 p-2">
        {PROFILE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-[120px] rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'bg-tgButton text-tgButtonText' : 'text-tgHint'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 rounded-2xl bg-white/5 p-4 text-sm text-tgHint">
            <div>
              <span className="text-xs uppercase tracking-wide text-tgHint">Telegram</span>
              <p className="text-base text-tgText">
                @{session.user.username ?? session.telegramUser.username ?? 'не указан'}
              </p>
            </div>
            {session.user.isBlocked ? (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
                Аккаунт заблокирован.
                {session.user.blockReason ? ` Причина: ${session.user.blockReason}.` : ''}
              </div>
            ) : null}
            {session.user.mutedUntil ? (
              <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-200">
                Ограничение на отправку сообщений действует до{' '}
                {formatCheckDate(session.user.mutedUntil)}.
              </div>
            ) : (
              <p className="text-xs text-tgHint">Сообщений в чате без ограничений.</p>
            )}
          </div>

          <div className="flex flex-col gap-2 rounded-2xl bg-white/5 p-4">
            <span className="text-xs uppercase tracking-wide text-tgHint">Зарплата ({salaryRangeLabel ?? 'текущий период'})</span>
            <span className="text-2xl font-semibold text-tgText">{salaryDisplay}</span>
            {salaryPercent ? <span className="text-xs text-tgHint">Процент: {salaryPercent}</span> : null}
            {salaryPartnerBreakdown ? (
              <span className="text-[11px] text-tgHint">{salaryPartnerBreakdown}</span>
            ) : null}
            {salaryPercentMissing ? (
              <span className="text-[11px] text-tgHint">
                Процент не задан — обратитесь к администратору.
              </span>
            ) : null}
            {salaryQuery.isError ? (
              <span className="text-[11px] text-red-400">Не удалось загрузить данные.</span>
            ) : null}
          </div>
        </div>
      ) : null}

      {activeTab === 'settings' ? (
        <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-2xl bg-white/5 p-4">
          <h2 className="text-lg font-semibold">Настройки выплат</h2>

          <label className="flex flex-col gap-1 text-sm">
            USDT (TRC-20)
            <input
              {...register('payoutUsdtTrc20')}
              placeholder="Введите адрес кошелька TRC-20"
              className="rounded-xl border border-white/10 bg-transparent px-3 py-2 text-base text-tgText"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            USDT (BEP-20)
            <input
              {...register('payoutUsdtBep20')}
              placeholder="Введите адрес кошелька BEP-20"
              className="rounded-xl border border-white/10 bg-transparent px-3 py-2 text-base text-tgText"
            />
          </label>

          <button
            type="submit"
            disabled={!isDirty || isSubmitting}
            className="mt-2 rounded-xl bg-tgButton px-4 py-2 text-sm font-semibold text-tgButtonText disabled:opacity-60"
          >
            Сохранить
          </button>
        </form>
      ) : null}

      {activeTab === 'checks' ? (
        <section className="flex flex-col gap-3 rounded-2xl bg-white/5 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold">Мои чеки</h2>
              <span className="text-xs text-tgHint">
                {myChecksTotals.count} шт · {formatAmount(myChecksTotals.total)}
              </span>
            </div>
            <div className="flex flex-col items-end gap-0.5 text-right">
              <span className="text-xs text-tgHint">З/п за период</span>
              <span className="text-sm font-semibold text-tgText">
                {salaryDisplay}
                {salaryPercent ? <span className="ml-2 text-xs text-tgHint">{salaryPercent}</span> : null}
              </span>
              {salaryPartnerBreakdown ? (
                <span className="text-[11px] text-tgHint">{salaryPartnerBreakdown}</span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {CHECK_PERIOD_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => handlePeriodChange(option.id)}
                className={`rounded-xl px-3 py-1 text-sm font-medium transition-colors ${
                  checksPeriod === option.id
                    ? 'bg-tgButton text-tgButtonText'
                    : 'border border-[color:var(--tg-theme-section-separator-color,rgba(255,255,255,0.12))] bg-[color:var(--tg-theme-section-bg-color,rgba(255,255,255,0.05))] text-tgHint'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {checksPeriod === 'custom' && (
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={customRange.start}
                onChange={(event) => handleCustomRangeChange('start', event.target.value)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-tgText focus:border-white/30 focus:outline-none"
              />
              <input
                type="date"
                value={customRange.end}
                onChange={(event) => handleCustomRangeChange('end', event.target.value)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-tgText focus:border-white/30 focus:outline-none"
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            {checksQuery.isLoading ? (
              <p className="text-sm text-tgHint">Загрузка чеков...</p>
            ) : checksQuery.isError ? (
              <p className="text-sm text-red-400">Не удалось загрузить чеки.</p>
            ) : myChecks.length === 0 ? (
              <p className="text-sm text-tgHint">Чеки не найдены.</p>
            ) : (
              myChecks.map((check) => (
                <div
                  key={check.id}
                  className="flex flex-col gap-1 rounded-2xl border border-[color:var(--tg-theme-section-separator-color,rgba(255,255,255,0.12))] bg-[color:var(--tg-theme-section-bg-color,rgba(255,255,255,0.05))] p-3"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-base font-semibold text-tgText">{formatAmount(check.amount)}</span>
                    <span className="text-xs text-tgHint">{formatCheckDate(check.createdAt)}</span>
                  </div>
                  {check.note && <p className="text-xs text-tgHint">{check.note}</p>}
                </div>
              ))
            )}
          </div>
        </section>
      ) : null}
    </section>
  );
}
