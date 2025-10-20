import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { MobileModal } from '@/components/MobileModal';
import {
  createAdmin,
  deleteAdmin,
  listAdmins,
  updateAdmin,
  type UpsertAdminPayload
} from '@/api/admins';
import {
  createUser,
  deleteUser,
  listUsers,
  updateUser,
  muteUser,
  unmuteUser,
  blockUser,
  unblockUser,
  type UpsertUserPayload
} from '@/api/users';
import {
  createCheck as createCheckApi,
  deleteCheck as deleteCheckApi,
  fetchChecksSummary,
  listChecks,
  updateCheck as updateCheckApi,
  type CheckPeriod,
  type ListChecksParams
} from '@/api/checks';
import { useSession } from '@/providers/SessionProvider';
import type { ApiAdmin, ApiCheck, ApiUser, ChecksSummaryRow } from '@/types/api';

type AdminFormValues = {
  telegramId: string;
  displayName: string;
  notes: string;
};

const adminDefaultValues: AdminFormValues = {
  telegramId: '',
  displayName: '',
  notes: ''
};

type UserFormValues = {
  telegramId: string;
  username: string;
  firstName: string;
  lastName: string;
  phone: string;
  bio: string;
  languageCode: string;
  payoutUsdtTrc20: string;
  payoutUsdtBep20: string;
};

const userDefaultValues: UserFormValues = {
  telegramId: '',
  username: '',
  firstName: '',
  lastName: '',
  phone: '',
  bio: '',
  languageCode: '',
  payoutUsdtTrc20: '',
  payoutUsdtBep20: ''
};

interface FieldMeta {
  label: string;
  required: boolean;
  description: string;
}

type HelpTopic = FieldMeta;

const ADMIN_FIELD_META: Record<keyof AdminFormValues, FieldMeta> = {
  telegramId: {
    label: 'telegramId',
    required: true,
    description:
      'Уникальный идентификатор администратора в Telegram. Узнайте его через бота @getmyid_bot или другими инструментами.'
  },
  displayName: {
    label: 'Отображаемое имя',
    required: false,
    description:
      'Имя, которое будет показываться в панели администрирования. Можно оставить пустым, тогда будет использоваться telegramId.'
  },
  notes: {
    label: 'Заметка',
    required: false,
    description:
      'Любые комментарии об администраторе (например, его роль или смены). Видно только другим администраторам.'
  }
};

const USER_FIELD_META: Record<keyof UserFormValues, FieldMeta> = {
  telegramId: {
    label: 'telegramId',
    required: true,
    description:
      'Уникальный идентификатор пользователя в Telegram. Узнайте его через бота @getmyid_bot или другими инструментами.'
  },
  username: {
    label: 'Username',
    required: false,
    description:
      'Публичный ник пользователя в Telegram. Начинается с @ и помогает быстрее находить аккаунт.'
  },
  firstName: {
    label: 'Имя',
    required: false,
    description:
      'Имя пользователя, отображается в панели и используется для персонализации уведомлений.'
  },
  lastName: {
    label: 'Фамилия',
    required: false,
    description: 'Фамилия пользователя. Поле необязательно, но помогает точнее идентифицировать.'
  },
  phone: {
    label: 'Номер телефона',
    required: false,
    description:
      'Контактный номер пользователя. Можно указать любой международный номер в формате +12345678900.'
  },
  bio: {
    label: 'Описание',
    required: false,
    description:
      'Краткое описание, заметки или комментарии о пользователе. Видно администраторам.'
  },
  languageCode: {
    label: 'Язык',
    required: false,
    description:
      'Код языка Telegram (например, ru, en). Используется для настройки локализации внутри сервиса.'
  },
  payoutUsdtTrc20: {
    label: 'USDT (TRC-20)',
    required: false,
    description: 'Адрес кошелька TRC-20 для выплат пользователю.'
  },
  payoutUsdtBep20: {
    label: 'USDT (BEP-20)',
    required: false,
    description: 'Адрес кошелька BEP-20 для выплат пользователю.'
  }
};

const USER_FIELD_PLACEHOLDERS: Partial<Record<keyof UserFormValues, string>> = {
  telegramId: '123456789',
  username: '@username',
  firstName: 'Иван',
  lastName: 'Иванов',
  phone: '+12345678900',
  bio: 'Короткая заметка о пользователе',
  languageCode: 'ru',
  payoutUsdtTrc20: 'TRC20 адрес',
  payoutUsdtBep20: 'BEP20 адрес'
};

type UpsertUserField = Extract<keyof UserFormValues, keyof UpsertUserPayload>;

const MUTE_OPTIONS = [
  { label: '30 мин', minutes: 30 },
  { label: '1 час', minutes: 60 },
  { label: '12 ч', minutes: 12 * 60 },
  { label: '1 день', minutes: 24 * 60 },
  { label: '7 дней', minutes: 7 * 24 * 60 }
];

type AdminTab = 'users' | 'checks' | 'admins';

const ADMIN_TABS: { id: AdminTab; label: string }[] = [
  { id: 'users', label: 'Пользователи' },
  { id: 'checks', label: 'Чеки' },
  { id: 'admins', label: 'Администраторы' }
];

type CheckFormValues = {
  amount: string;
  note: string;
};

interface CheckFilterState {
  period: CheckPeriod;
  startDate?: string;
  endDate?: string;
}

const checkFormDefaultValues: CheckFormValues = {
  amount: '',
  note: ''
};

const CHECK_PERIOD_OPTIONS: { id: CheckPeriod; label: string }[] = [
  { id: 'day', label: 'Сегодня' },
  { id: 'week', label: 'Неделя' },
  { id: 'month', label: 'Месяц' },
  { id: 'custom', label: 'Период' }
];

const currencyFormatter = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const dateTimeFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});

const shortDateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short'
});

function formatUserDisplay(user: Pick<ApiUser, 'firstName' | 'username' | 'telegramId' | 'lastName'>) {
  if (user.firstName || user.lastName) {
    return [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  }

  if (user.username) {
    return `@${user.username}`;
  }

  return user.telegramId;
}

function formatCheckAmount(amount: number) {
  return `${currencyFormatter.format(amount)} AED`;
}

function formatRange(range?: { start: string; end: string } | null) {
  if (!range) {
    return '';
  }

  const start = new Date(range.start);
  const end = new Date(range.end);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return '';
  }

  if (start.toDateString() === end.toDateString()) {
    return shortDateFormatter.format(start);
  }

  return `${shortDateFormatter.format(start)} — ${shortDateFormatter.format(end)}`;
}

const modalInputClass =
  'w-full rounded-2xl border border-[color:var(--tg-theme-section-separator-color,rgba(255,255,255,0.12))] bg-[color:var(--tg-theme-section-bg-color,rgba(255,255,255,0.04))] px-3 py-2 text-base text-tgText placeholder:text-tgHint focus:border-[color:var(--tg-theme-accent-text-color,#5aa7ff)] focus:outline-none focus:ring-0 transition-colors';

export function AdminDashboard() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [adminModal, setAdminModal] = useState<{ mode: 'create' | 'edit'; entity?: ApiAdmin } | null>(
    null
  );
  const [userModal, setUserModal] = useState<{ mode: 'create' | 'edit'; entity?: ApiUser } | null>(
    null
  );
  const [helpTopic, setHelpTopic] = useState<HelpTopic | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<
    | {
        type: 'admin' | 'user';
        id: string;
        name: string;
      }
    | {
        type: 'check';
        id: string;
        name: string;
      }
    | null
  >(null);
  const [adminSearch, setAdminSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [checksModal, setChecksModal] = useState<{ user: ApiUser } | null>(null);
  const [checkFormModal, setCheckFormModal] = useState<
    | { mode: 'create'; user: ApiUser }
    | { mode: 'edit'; user: ApiUser; check: ApiCheck }
    | null
  >(null);
  const [checkFilters, setCheckFilters] = useState<CheckFilterState>({ period: 'month' });
  const [summaryRange, setSummaryRange] = useState<{ start?: string; end?: string }>({});
  const [summaryRangeDraft, setSummaryRangeDraft] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  });
  const [blockModal, setBlockModal] = useState<{
    mode: 'block' | 'unblock';
    user: ApiUser;
    reason: string;
  } | null>(null);
  const [userSelectModal, setUserSelectModal] = useState(false);
  const [checkCreatedModal, setCheckCreatedModal] = useState(false);
  const [userSearchForCheck, setUserSearchForCheck] = useState('');
  const [isCheckCreationFlow, setIsCheckCreationFlow] = useState(false);

  const adminForm = useForm<AdminFormValues>({
    defaultValues: adminDefaultValues
  });

  const userForm = useForm<UserFormValues>({
    defaultValues: userDefaultValues
  });

  const checkForm = useForm<CheckFormValues>({
    defaultValues: checkFormDefaultValues
  });

  const adminsQuery = useQuery({
    queryKey: ['admins'],
    queryFn: listAdmins,
    enabled: session?.isAdmin ?? false
  });

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: listUsers,
    enabled: session?.isAdmin ?? false
  });

  const checksQuery = useQuery({
    queryKey: [
      'checks',
      checksModal?.user.id ?? null,
      checkFilters.period,
      checkFilters.startDate ?? null,
      checkFilters.endDate ?? null
    ],
    queryFn: async () => {
      if (!checksModal) {
        return [];
      }

      const params: ListChecksParams = {
        userId: checksModal.user.id
      };

      if (checkFilters.period === 'custom') {
        if (checkFilters.startDate) {
          params.startDate = checkFilters.startDate;
        }

        if (checkFilters.endDate) {
          params.endDate = checkFilters.endDate;
        }
      } else {
        params.period = checkFilters.period;
      }

      return listChecks(params);
    },
    enabled: Boolean(checksModal)
  });

  const checksSummaryQuery = useQuery({
    queryKey: ['check-summary', summaryRange.start ?? null, summaryRange.end ?? null],
    queryFn: () => fetchChecksSummary({ startDate: summaryRange.start, endDate: summaryRange.end }),
    enabled: (session?.isAdmin ?? false) && activeTab === 'checks'
  });

  const createAdminMutation = useMutation({
    mutationFn: createAdmin,
    onSuccess: async () => {
      toast.success('Администратор добавлен');
      await queryClient.invalidateQueries({ queryKey: ['admins'] });
    },
    onError: () => toast.error('Не удалось добавить администратора')
  });

  const updateAdminMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<UpsertAdminPayload> }) =>
      updateAdmin(id, payload),
    onSuccess: async () => {
      toast.success('Администратор обновлен');
      await queryClient.invalidateQueries({ queryKey: ['admins'] });
    },
    onError: () => toast.error('Не удалось обновить администратора')
  });

  const deleteAdminMutation = useMutation({
    mutationFn: deleteAdmin,
    onSuccess: async () => {
      toast.success('Администратор удален');
      await queryClient.invalidateQueries({ queryKey: ['admins'] });
    },
    onError: () => toast.error('Не удалось удалить администратора')
  });

  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: async () => {
      toast.success('Пользователь добавлен');
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => toast.error('Не удалось добавить пользователя')
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<UpsertUserPayload> }) =>
      updateUser(id, payload),
    onSuccess: async () => {
      toast.success('Пользователь обновлен');
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => toast.error('Не удалось обновить пользователя')
  });

  const deleteUserMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: async () => {
      toast.success('Пользователь удален');
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => toast.error('Не удалось удалить пользователя')
  });

  const muteUserMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { durationMinutes?: number; until?: string; chatId?: string } }) =>
      muteUser(id, payload),
    onSuccess: async (updated) => {
      toast.success('Пользователь временно ограничен');
      if (userModal?.entity?.id === updated.id) {
        setUserModal({ mode: 'edit', entity: updated });
      }
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => toast.error('Не удалось применить ограничение')
  });

  const unmuteUserMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { chatId?: string } }) => unmuteUser(id, payload),
    onSuccess: async (updated) => {
      toast.success('Ограничение снято');
      if (userModal?.entity?.id === updated.id) {
        setUserModal({ mode: 'edit', entity: updated });
      }
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => toast.error('Не удалось снять ограничение')
  });

  const blockUserMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { chatId?: string; reason?: string } }) =>
      blockUser(id, payload),
    onSuccess: async (updated) => {
      toast.success('Пользователь заблокирован');
      if (userModal?.entity?.id === updated.id) {
        setUserModal({ mode: 'edit', entity: updated });
      }
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => toast.error('Не удалось заблокировать пользователя')
  });

  const unblockUserMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { chatId?: string } }) =>
      unblockUser(id, payload),
    onSuccess: async (updated) => {
      toast.success('Пользователь разблокирован');
      if (userModal?.entity?.id === updated.id) {
        setUserModal({ mode: 'edit', entity: updated });
      }
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => toast.error('Не удалось разблокировать пользователя')
  });

  const createCheckMutation = useMutation({
    mutationFn: createCheckApi,
    onSuccess: async () => {
      toast.success('Чек создан');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['checks'] }),
        queryClient.invalidateQueries({ queryKey: ['check-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['my-checks'] })
      ]);

      // Show confirmation modal if creating from checks tab
      if (isCheckCreationFlow) {
        setCheckCreatedModal(true);
      }
    },
    onError: () => toast.error('Не удалось создать чек')
  });

  const updateCheckMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { amount?: number; note?: string } }) =>
      updateCheckApi(id, payload),
    onSuccess: async () => {
      toast.success('Чек обновлен');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['checks'] }),
        queryClient.invalidateQueries({ queryKey: ['check-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['my-checks'] })
      ]);
    },
    onError: () => toast.error('Не удалось обновить чек')
  });

  const deleteCheckMutation = useMutation({
    mutationFn: deleteCheckApi,
    onSuccess: async () => {
      toast.success('Чек удален');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['checks'] }),
        queryClient.invalidateQueries({ queryKey: ['check-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['my-checks'] })
      ]);
    },
    onError: () => toast.error('Не удалось удалить чек')
  });

  const adminList = useMemo(() => adminsQuery.data ?? [], [adminsQuery.data]);
  const userList = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);
  const selectedUser = userModal?.entity ?? null;
  const filteredAdminList = useMemo(() => {
    const query = adminSearch.trim().toLowerCase();

    if (!query) {
      return adminList;
    }

    return adminList.filter((admin) => {
      const displayName = admin.displayName?.toLowerCase() ?? '';
      const notes = admin.notes?.toLowerCase() ?? '';

      return (
        admin.telegramId.toLowerCase().includes(query) ||
        displayName.includes(query) ||
        notes.includes(query)
      );
    });
  }, [adminList, adminSearch]);
  const filteredUserList = useMemo(() => {
    const query = userSearch.trim().toLowerCase();

    if (!query) {
      return userList;
    }

    return userList.filter((user) => {
      const firstName = user.firstName?.toLowerCase() ?? '';
      const lastName = user.lastName?.toLowerCase() ?? '';
      const username = user.username?.toLowerCase() ?? '';
      const payoutTrc = user.payoutUsdtTrc20?.toLowerCase() ?? '';
      const payoutBep = user.payoutUsdtBep20?.toLowerCase() ?? '';

      return (
        user.telegramId.toLowerCase().includes(query) ||
        firstName.includes(query) ||
        lastName.includes(query) ||
        username.includes(query) ||
        payoutTrc.includes(query) ||
        payoutBep.includes(query)
      );
    });
  }, [userList, userSearch]);

  const filteredUsersForCheckCreation = useMemo(() => {
    const query = userSearchForCheck.trim().toLowerCase();

    if (!query) {
      return userList;
    }

    return userList.filter((user) => {
      const firstName = user.firstName?.toLowerCase() ?? '';
      const lastName = user.lastName?.toLowerCase() ?? '';
      const username = user.username?.toLowerCase() ?? '';

      return (
        user.telegramId.toLowerCase().includes(query) ||
        firstName.includes(query) ||
        lastName.includes(query) ||
        username.includes(query)
      );
    });
  }, [userList, userSearchForCheck]);

  const checkList = useMemo(() => checksQuery.data ?? [], [checksQuery.data]);

  const checkTotals = useMemo(() => {
    const list = checksQuery.data ?? [];
    const total = list.reduce((acc, item) => acc + item.amount, 0);

    return {
      count: list.length,
      total
    };
  }, [checksQuery.data]);

  const summaryRows = useMemo(() => checksSummaryQuery.data?.users ?? [], [checksSummaryQuery.data]);

  const isSummaryRangeActive = Boolean(summaryRange.start || summaryRange.end);

  const summaryRanges = checksSummaryQuery.data?.ranges;

  const todayDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const sanitizeAdminPayload = (values: AdminFormValues): UpsertAdminPayload => ({
    telegramId: values.telegramId.trim(),
    displayName: values.displayName?.trim() ? values.displayName.trim() : undefined,
    notes: values.notes?.trim() ? values.notes.trim() : undefined
  });

  const sanitizeUserPayload = (values: UserFormValues): UpsertUserPayload => {
    const payload: UpsertUserPayload = {
      telegramId: values.telegramId.trim()
    };

    const apply = (key: UpsertUserField) => {
      const value = values[key].trim();

      if (value.length > 0) {
        payload[key] = value;
      }
    };

    apply('username');
    apply('firstName');
    apply('lastName');
    apply('phone');
    apply('bio');
    apply('languageCode');
    apply('payoutUsdtTrc20');
    apply('payoutUsdtBep20');

    return payload;
  };

  const openAdminCreateModal = () => {
    adminForm.reset(adminDefaultValues);
    setAdminModal({ mode: 'create' });
  };

  const openAdminEditModal = (admin: ApiAdmin) => {
    adminForm.reset({
      telegramId: admin.telegramId,
      displayName: admin.displayName ?? '',
      notes: admin.notes ?? ''
    });
    setAdminModal({ mode: 'edit', entity: admin });
  };

  const closeAdminModal = () => {
    setAdminModal(null);
    adminForm.reset(adminDefaultValues);
  };

  const openUserCreateModal = () => {
    userForm.reset(userDefaultValues);
    setUserModal({ mode: 'create' });
  };

  const openUserEditModal = (user: ApiUser) => {
    userForm.reset({
      telegramId: user.telegramId,
      username: user.username ?? '',
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      phone: user.phone ?? '',
      bio: user.bio ?? '',
      languageCode: user.languageCode ?? '',
      payoutUsdtTrc20: user.payoutUsdtTrc20 ?? '',
      payoutUsdtBep20: user.payoutUsdtBep20 ?? ''
    });
    setUserModal({ mode: 'edit', entity: user });
  };

  const closeUserModal = () => {
    setUserModal(null);
    userForm.reset(userDefaultValues);
  };

  const openChecksModal = (user: ApiUser) => {
    setChecksModal({ user });
    setCheckFilters({ period: 'month' });
  };

  const closeChecksModal = () => {
    setChecksModal(null);
    setCheckFormModal(null);
    checkForm.reset(checkFormDefaultValues);
  };

  const openCheckCreateModal = (user: ApiUser) => {
    checkForm.reset(checkFormDefaultValues);
    setCheckFormModal({ mode: 'create', user });
  };

  const openUserSelectModalForCheck = () => {
    setUserSearchForCheck('');
    setUserSelectModal(true);
    setIsCheckCreationFlow(true);
  };

  const handleUserSelectForCheck = (user: ApiUser) => {
    setUserSelectModal(false);
    openCheckCreateModal(user);
  };

  const handleCheckCreatedAddAnother = () => {
    setCheckCreatedModal(false);
    setCheckFormModal(null);
    checkForm.reset(checkFormDefaultValues);
    setUserSearchForCheck('');
    setUserSelectModal(true);
    // Keep isCheckCreationFlow true to continue the flow
  };

  const handleCheckCreatedFinish = () => {
    setCheckCreatedModal(false);
    setCheckFormModal(null);
    setUserSelectModal(false);
    checkForm.reset(checkFormDefaultValues);
    setUserSearchForCheck('');
    setIsCheckCreationFlow(false);
  };

  const openCheckEditModal = (user: ApiUser, check: ApiCheck) => {
    checkForm.reset({
      amount: check.amount.toString(),
      note: check.note ?? ''
    });
    setCheckFormModal({ mode: 'edit', user, check });
  };

  const closeCheckFormModal = () => {
    setCheckFormModal(null);
    checkForm.reset(checkFormDefaultValues);
  };

  const handleCloseCheckFormModal = () => {
    closeCheckFormModal();
    // If user manually closes the check form during creation flow, cancel the flow
    if (isCheckCreationFlow) {
      setIsCheckCreationFlow(false);
      setUserSelectModal(false);
    }
  };

  const openHelp = (meta: FieldMeta) => {
    setHelpTopic(meta);
  };

  const applySummaryRange = () => {
    setSummaryRange({
      start: summaryRangeDraft.start || undefined,
      end: summaryRangeDraft.end || undefined
    });
  };

  const resetSummaryRange = () => {
    setSummaryRange({});
    setSummaryRangeDraft({ start: '', end: '' });
  };

  const handleCheckPeriodChange = (period: CheckPeriod) => {
    setCheckFilters((prev) => {
      if (period === 'custom') {
        const start = prev.startDate ?? todayDate;
        const end = prev.endDate ?? todayDate;
        return { period, startDate: start, endDate: end };
      }

      return { period };
    });
  };

  const handleMuteUser = async (minutes: number) => {
    if (!userModal?.entity) {
      return;
    }

    await muteUserMutation.mutateAsync({
      id: userModal.entity.id,
      payload: {
        durationMinutes: minutes,
        chatId: userModal.entity.chatId ?? undefined
      }
    });
  };

  const handleUnmuteUser = async () => {
    if (!userModal?.entity) {
      return;
    }

    await unmuteUserMutation.mutateAsync({
      id: userModal.entity.id,
      payload: {
        chatId: userModal.entity.chatId ?? undefined
      }
    });
  };


  const handleBlockToggle = (block: boolean) => {
    if (!userModal?.entity) {
      return;
    }

    if (block) {
      setBlockModal({ mode: 'block', user: userModal.entity, reason: '' });
    } else {
      setBlockModal({ mode: 'unblock', user: userModal.entity, reason: '' });
    }
  };

  const handleBlockModalConfirm = async () => {
    if (!blockModal) {
      return;
    }

    const payloadBase = {
      chatId: blockModal.user.chatId ?? undefined
    };

    if (blockModal.mode === 'block') {
      await blockUserMutation.mutateAsync({
        id: blockModal.user.id,
        payload: {
          ...payloadBase,
          reason: blockModal.reason.trim() ? blockModal.reason.trim() : undefined
        }
      });
    } else {
      await unblockUserMutation.mutateAsync({
        id: blockModal.user.id,
        payload: payloadBase
      });
    }

    setBlockModal(null);
  };

  const handleAdminSubmit = adminForm.handleSubmit(async (values) => {
    const payload = sanitizeAdminPayload(values);

    if (!payload.telegramId) {
      toast.error('Укажите telegramId');
      return;
    }

    if (adminModal?.mode === 'edit' && adminModal.entity) {
      const updatePayload: Partial<UpsertAdminPayload> = {};
      const currentDisplayName = adminModal.entity.displayName ?? undefined;
      const currentNotes = adminModal.entity.notes ?? undefined;

      if (payload.telegramId !== adminModal.entity.telegramId) {
        updatePayload.telegramId = payload.telegramId;
      }
      if (payload.displayName !== currentDisplayName) {
        updatePayload.displayName = payload.displayName;
      }
      if (payload.notes !== currentNotes) {
        updatePayload.notes = payload.notes;
      }

      if (Object.keys(updatePayload).length === 0) {
        toast('Изменений нет');
      } else {
        await updateAdminMutation.mutateAsync({
          id: adminModal.entity.id,
          payload: updatePayload
        });
      }
    } else {
      await createAdminMutation.mutateAsync(payload);
    }

    closeAdminModal();
  });

  const handleUserSubmit = userForm.handleSubmit(async (values) => {
    const payload = sanitizeUserPayload(values);

    if (!payload.telegramId) {
      toast.error('Укажите telegramId');
      return;
    }

    if (userModal?.mode === 'edit' && userModal.entity) {
      const updatePayload: Partial<UpsertUserPayload> = {};

      if (payload.telegramId !== userModal.entity.telegramId) {
        updatePayload.telegramId = payload.telegramId;
      }

      const compare = (
        field: keyof UserFormValues,
        key: keyof UpsertUserPayload,
        current: string | null
      ) => {
        const next = values[field].trim();
        const normalizedCurrent = current ?? '';

        if (next !== normalizedCurrent) {
          updatePayload[key] = next;
        }
      };

      compare('username', 'username', userModal.entity.username);
      compare('firstName', 'firstName', userModal.entity.firstName);
      compare('lastName', 'lastName', userModal.entity.lastName);
      compare('phone', 'phone', userModal.entity.phone);
      compare('bio', 'bio', userModal.entity.bio);
      compare('languageCode', 'languageCode', userModal.entity.languageCode);
      compare('payoutUsdtTrc20', 'payoutUsdtTrc20', userModal.entity.payoutUsdtTrc20);
      compare('payoutUsdtBep20', 'payoutUsdtBep20', userModal.entity.payoutUsdtBep20);

      if (Object.keys(updatePayload).length === 0) {
        toast('Изменений нет');
      } else {
        await updateUserMutation.mutateAsync({
          id: userModal.entity.id,
          payload: updatePayload
        });
      }
    } else {
      await createUserMutation.mutateAsync(payload);
    }

    closeUserModal();
  });

  const handleCheckSubmit = checkForm.handleSubmit(async (values) => {
    if (!checkFormModal) {
      return;
    }

    const rawAmount = values.amount.replace(',', '.');
    const parsedAmount = Number(rawAmount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error('Введите корректную сумму');
      return;
    }

    const normalizedAmount = Math.round(parsedAmount * 100) / 100;
    const note = values.note.trim();

    if (checkFormModal.mode === 'create') {
      await createCheckMutation.mutateAsync({
        userId: checkFormModal.user.id,
        amount: normalizedAmount,
        note: note.length > 0 ? note : undefined
      });

      // Close form modal - confirmation modal will be shown by mutation's onSuccess
      closeCheckFormModal();

      // Don't call closeCheckFormModal again for check creation flow
      if (isCheckCreationFlow) {
        return;
      }
    } else {
      const updatePayload: { amount?: number; note?: string } = {};

      if (normalizedAmount !== checkFormModal.check.amount) {
        updatePayload.amount = normalizedAmount;
      }

      const currentNote = checkFormModal.check.note ?? '';

      if (note !== currentNote) {
        updatePayload.note = note;
      }

      if (Object.keys(updatePayload).length === 0) {
        toast('Изменений нет');
      } else {
        await updateCheckMutation.mutateAsync({
          id: checkFormModal.check.id,
          payload: updatePayload
        });
      }

      closeCheckFormModal();
    }
  });

  const isBusy =
    createAdminMutation.isPending ||
    updateAdminMutation.isPending ||
    deleteAdminMutation.isPending ||
    createUserMutation.isPending ||
    updateUserMutation.isPending ||
    deleteUserMutation.isPending ||
    createCheckMutation.isPending ||
    updateCheckMutation.isPending ||
    deleteCheckMutation.isPending ||
    muteUserMutation.isPending ||
    unmuteUserMutation.isPending ||
    blockUserMutation.isPending ||
    unblockUserMutation.isPending;

  const handleConfirmDelete = async () => {
    if (!confirmDelete) {
      return;
    }

    try {
      if (confirmDelete.type === 'admin') {
        await deleteAdminMutation.mutateAsync(confirmDelete.id);
      } else if (confirmDelete.type === 'user') {
        await deleteUserMutation.mutateAsync(confirmDelete.id);
      } else if (confirmDelete.type === 'check') {
        await deleteCheckMutation.mutateAsync(confirmDelete.id);
      }
      setConfirmDelete(null);
    } catch {
      // Ошибка уже отображена toast-ом, оставляем модалку открытой для повторной попытки
    }
  };

  const renderField = (meta: FieldMeta, key: string, input: React.ReactNode) => {
    return (
      <label key={key} className="flex flex-col gap-1 text-sm">
        <span className="flex items-center justify-between gap-2">
          <span className="flex items-baseline gap-2 text-sm font-medium text-tgText">
            {meta.label}
            <span className={`text-xs ${meta.required ? 'text-tgAccent' : 'text-tgHint'}`}>
              {meta.required ? 'обязательно' : 'необязательно'}
            </span>
          </span>
          <button
            type="button"
            onClick={() => openHelp(meta)}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-[color:var(--tg-theme-section-separator-color,rgba(255,255,255,0.16))] bg-[color:var(--tg-theme-section-bg-color,rgba(255,255,255,0.06))] text-xs text-tgHint transition-colors hover:border-[color:var(--tg-theme-accent-text-color,#5aa7ff)] hover:text-tgAccent"
          >
            ?
          </button>
        </span>
        {input}
      </label>
    );
  };

  const renderUserField = (field: keyof UserFormValues, input: React.ReactNode) =>
    renderField(USER_FIELD_META[field], field, input);

  const renderAdminField = (field: keyof AdminFormValues, input: React.ReactNode) =>
    renderField(ADMIN_FIELD_META[field], field, input);

  const renderSummaryStat = (label: string, stats?: { count: number; total: number }) => (
    <div className="flex flex-col gap-1 rounded-2xl border border-[color:var(--tg-theme-section-separator-color,rgba(255,255,255,0.1))] bg-[color:var(--tg-theme-section-bg-color,rgba(255,255,255,0.04))] px-3 py-2">
      <span className="text-xs uppercase tracking-wide text-tgHint">{label}</span>
      <span className="text-lg font-semibold text-tgText">{stats?.count ?? 0}</span>
      <span className="text-xs text-tgHint">
        Сумма: {formatCheckAmount(stats?.total ?? 0)}
      </span>
    </div>
  );

  return (
    <section className="flex flex-col gap-6">
      <div className="flex gap-2 overflow-x-auto rounded-2xl bg-white/5 p-2">
        {ADMIN_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'bg-tgButton text-tgButtonText' : 'text-tgHint'
            }`}
          >
            {tab.label}
            {tab.id === 'users' ? ` (${userList.length})` : null}
            {tab.id === 'admins' ? ` (${adminList.length})` : null}
          </button>
        ))}
      </div>

      {activeTab === 'admins' ? (
        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={openAdminCreateModal}
            className="flex flex-col gap-1 rounded-2xl bg-white/5 p-4 text-left transition-colors hover:bg-white/10"
          >
            <span className="text-base font-semibold text-tgText">Добавить администратора</span>
            <span className="text-sm text-tgHint">Откроется форма создания администратора.</span>
          </button>

          <input
            value={adminSearch}
            onChange={(event) => setAdminSearch(event.target.value)}
            placeholder="Поиск по ID, имени или заметке"
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-tgText placeholder:text-tgHint focus:border-white/30 focus:outline-none"
          />

          <div className="flex flex-col gap-2">
            {adminsQuery.isLoading ? (
              <p className="text-sm text-tgHint">Загрузка администраторов...</p>
            ) : adminsQuery.isError ? (
              <p className="text-sm text-red-400">Не удалось загрузить администраторов.</p>
            ) : filteredAdminList.length === 0 ? (
              <p className="text-sm text-tgHint">
                {adminSearch ? 'По запросу ничего не найдено.' : 'Администраторы не найдены.'}
              </p>
            ) : (
              filteredAdminList.map((admin) => (
                <div key={admin.id} className="flex flex-col gap-2 rounded-2xl bg-white/5 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-base font-semibold">
                        {admin.displayName ?? `Admin ${admin.telegramId}`}
                      </p>
                      <p className="text-sm text-tgHint">ID: {admin.telegramId}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openAdminEditModal(admin)}
                        disabled={isBusy}
                        className="rounded-xl border border-white/20 px-3 py-1 text-sm disabled:opacity-60"
                      >
                        Изменить
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmDelete({
                            type: 'admin',
                            id: admin.id,
                            name: admin.displayName ?? admin.telegramId
                          })
                        }
                        disabled={isBusy}
                        className="rounded-xl bg-red-500/80 px-3 py-1 text-sm text-white disabled:opacity-60"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                  {admin.notes && <p className="text-sm text-tgHint">{admin.notes}</p>}
                </div>
              ))
            )}
          </div>
        </div>
      ) : activeTab === 'checks' ? (
        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={openUserSelectModalForCheck}
            className="flex flex-col gap-1 rounded-2xl bg-white/5 p-4 text-left transition-colors hover:bg-white/10"
          >
            <span className="text-base font-semibold text-tgText">Создать чек</span>
            <span className="text-sm text-tgHint">Выбрать пользователя и добавить чек.</span>
          </button>

          <div className="rounded-2xl bg-white/5 p-4">
            <h2 className="text-lg font-semibold text-tgText">Сводка чеков</h2>
            <p className="mt-1 text-sm text-tgHint">
              Статистика по пользователям за сегодня, текущую неделю, месяц и свой период.
            </p>
            {checksSummaryQuery.data && (
              <p className="mt-2 text-xs text-tgHint">
                Обновлено: {dateTimeFormatter.format(new Date(checksSummaryQuery.data.generatedAt))}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3 rounded-2xl bg-white/5 p-4">
            <span className="text-sm font-medium text-tgText">Период для сравнения</span>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={summaryRangeDraft.start}
                onChange={(event) =>
                  setSummaryRangeDraft((prev) => ({
                    ...prev,
                    start: event.target.value
                  }))
                }
                className={modalInputClass}
              />
              <input
                type="date"
                value={summaryRangeDraft.end}
                onChange={(event) =>
                  setSummaryRangeDraft((prev) => ({
                    ...prev,
                    end: event.target.value
                  }))
                }
                className={modalInputClass}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={applySummaryRange}
                className="flex-1 rounded-xl bg-tgButton px-4 py-2 text-sm font-semibold text-tgButtonText disabled:opacity-60"
              >
                Применить
              </button>
              <button
                type="button"
                onClick={resetSummaryRange}
                disabled={!isSummaryRangeActive}
                className="flex-1 rounded-xl border border-[color:var(--tg-theme-section-separator-color,rgba(255,255,255,0.1))] px-4 py-2 text-sm text-tgText disabled:opacity-40"
              >
                Сбросить
              </button>
            </div>
            <div className="text-xs text-tgHint">
              <p>Сегодня: {formatRange(summaryRanges?.day) || '—'}</p>
              <p>Неделя: {formatRange(summaryRanges?.week) || '—'}</p>
              <p>Месяц: {formatRange(summaryRanges?.month) || '—'}</p>
              {summaryRanges?.custom ? <p>Период: {formatRange(summaryRanges.custom) || '—'}</p> : null}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {checksSummaryQuery.isLoading ? (
              <p className="text-sm text-tgHint">Загрузка сводки...</p>
            ) : checksSummaryQuery.isError ? (
              <p className="text-sm text-red-400">Не удалось загрузить сводку чеков.</p>
            ) : summaryRows.length === 0 ? (
              <p className="text-sm text-tgHint">Пользователи не найдены.</p>
            ) : (
              summaryRows.map((row) => (
                <div key={row.user.id} className="flex flex-col gap-3 rounded-2xl bg-white/5 p-4">
                  <div className="flex flex-col">
                    <span className="text-base font-semibold text-tgText">
                      {formatUserDisplay(row.user)}
                    </span>
                    <span className="text-sm text-tgHint">
                      @{row.user.username ?? 'без username'}
                    </span>
                    <span className="text-xs text-tgHint">ID: {row.user.telegramId}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                    {renderSummaryStat('Сегодня', row.day)}
                    {renderSummaryStat('Неделя', row.week)}
                    {renderSummaryStat('Месяц', row.month)}
                    {summaryRanges?.custom ? renderSummaryStat('Период', row.custom) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={openUserCreateModal}
            className="flex flex-col gap-1 rounded-2xl bg-white/5 p-4 text-left transition-colors hover:bg-white/10"
          >
            <span className="text-base font-semibold text-tgText">Добавить пользователя</span>
            <span className="text-sm text-tgHint">Форма откроется в новом модальном окне.</span>
          </button>

          <input
            value={userSearch}
            onChange={(event) => setUserSearch(event.target.value)}
            placeholder="Поиск по ID, имени, username или реквизитам"
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-tgText placeholder:text-tgHint focus:border-white/30 focus:outline-none"
          />

          <div className="flex flex-col gap-2">
            {usersQuery.isLoading ? (
              <p className="text-sm text-tgHint">Загрузка пользователей...</p>
            ) : usersQuery.isError ? (
              <p className="text-sm text-red-400">Не удалось загрузить пользователей.</p>
            ) : filteredUserList.length === 0 ? (
              <p className="text-sm text-tgHint">
                {userSearch ? 'По запросу ничего не найдено.' : 'Пользователи не найдены.'}
              </p>
            ) : (
              filteredUserList.map((user) => (
                <div key={user.id} className="flex flex-col gap-2 rounded-2xl bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-base font-semibold">
                        {user.firstName ?? user.username ?? user.telegramId}
                      </p>
                      <p className="text-sm text-tgHint">
                        @{user.username ?? 'без username'}
                      </p>
                      <p className="text-sm text-tgHint">ID: {user.telegramId}</p>
                      {user.isBlocked ? (
                        <p className="text-xs text-red-400">Заблокирован</p>
                      ) : user.mutedUntil ? (
                        <p className="text-xs text-yellow-300">
                          Мут до {dateTimeFormatter.format(new Date(user.mutedUntil))}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openChecksModal(user)}
                        disabled={isBusy}
                        className="rounded-xl bg-tgButton px-3 py-1 text-sm font-semibold text-tgButtonText disabled:opacity-60"
                      >
                        Чеки
                      </button>
                      <button
                        type="button"
                        onClick={() => openUserEditModal(user)}
                        disabled={isBusy}
                        className="rounded-xl border border-white/20 px-3 py-1 text-sm disabled:opacity-60"
                      >
                        Изменить
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmDelete({
                            type: 'user',
                            id: user.id,
                            name: user.firstName ?? user.username ?? user.telegramId
                          })
                        }
                        disabled={isBusy}
                        className="rounded-xl bg-red-500/80 px-3 py-1 text-sm text-white disabled:opacity-60"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                  {user.bio && <p className="text-sm text-tgHint">{user.bio}</p>}
                  {(user.payoutUsdtTrc20 || user.payoutUsdtBep20) && (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-tgHint">
                      <div className="flex flex-col gap-1">
                        {user.payoutUsdtTrc20 ? (
                          <span><span className="text-tgText">USDT TRC-20:</span> {user.payoutUsdtTrc20}</span>
                        ) : null}
                        {user.payoutUsdtBep20 ? (
                          <span><span className="text-tgText">USDT BEP-20:</span> {user.payoutUsdtBep20}</span>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <MobileModal
        open={Boolean(adminModal)}
        title={adminModal?.mode === 'edit' ? 'Редактирование администратора' : 'Новый администратор'}
        onClose={closeAdminModal}
      >
        <form onSubmit={handleAdminSubmit} className="flex flex-col gap-3">
          {renderAdminField(
            'telegramId',
            <input
              {...adminForm.register('telegramId')}
              placeholder="123456789"
              className={modalInputClass}
            />
          )}

          {renderAdminField(
            'displayName',
            <input
              {...adminForm.register('displayName')}
              placeholder="Имя администратора"
              className={modalInputClass}
            />
          )}

          {renderAdminField(
            'notes',
            <textarea
              {...adminForm.register('notes')}
              rows={3}
              className={`${modalInputClass} min-h-[96px]`}
            />
          )}

          <button
            type="submit"
            disabled={isBusy}
            className="mt-2 rounded-xl bg-tgButton px-4 py-2 text-sm font-semibold text-tgButtonText disabled:opacity-60"
          >
            {adminModal?.mode === 'edit' ? 'Сохранить' : 'Добавить'}
          </button>
        </form>
      </MobileModal>

      <MobileModal
        open={Boolean(userModal)}
        title={userModal?.mode === 'edit' ? 'Редактирование пользователя' : 'Новый пользователь'}
        onClose={closeUserModal}
      >
        <>
          <form onSubmit={handleUserSubmit} className="flex flex-col gap-3">
            {renderUserField(
              'telegramId',
              <input
                {...userForm.register('telegramId')}
                placeholder={USER_FIELD_PLACEHOLDERS.telegramId}
              className={modalInputClass}
            />
          )}

          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            {renderUserField(
              'firstName',
              <input
                {...userForm.register('firstName')}
                placeholder={USER_FIELD_PLACEHOLDERS.firstName}
                className={modalInputClass}
              />
            )}
            {renderUserField(
              'lastName',
              <input
                {...userForm.register('lastName')}
                placeholder={USER_FIELD_PLACEHOLDERS.lastName}
                className={modalInputClass}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            {renderUserField(
              'username',
              <input
                {...userForm.register('username')}
                placeholder={USER_FIELD_PLACEHOLDERS.username}
                className={modalInputClass}
              />
            )}
            {renderUserField(
              'phone',
              <input
                {...userForm.register('phone')}
                placeholder={USER_FIELD_PLACEHOLDERS.phone}
                className={modalInputClass}
              />
            )}
          </div>

          {renderUserField(
            'bio',
            <textarea
              {...userForm.register('bio')}
              rows={3}
              placeholder={USER_FIELD_PLACEHOLDERS.bio}
              className={`${modalInputClass} min-h-[96px]`}
            />
          )}

          {renderUserField(
            'languageCode',
            <input
              {...userForm.register('languageCode')}
              placeholder={USER_FIELD_PLACEHOLDERS.languageCode}
              className={modalInputClass}
            />
          )}

          {renderUserField(
            'payoutUsdtTrc20',
            <input
              {...userForm.register('payoutUsdtTrc20')}
              placeholder={USER_FIELD_PLACEHOLDERS.payoutUsdtTrc20}
              className={modalInputClass}
            />
          )}

          {renderUserField(
            'payoutUsdtBep20',
            <input
              {...userForm.register('payoutUsdtBep20')}
              placeholder={USER_FIELD_PLACEHOLDERS.payoutUsdtBep20}
              className={modalInputClass}
            />
          )}

          <button
            type="submit"
            disabled={isBusy}
            className="mt-2 rounded-xl bg-tgButton px-4 py-2 text-sm font-semibold text-tgButtonText disabled:opacity-60"
          >
            {userModal?.mode === 'edit' ? 'Сохранить' : 'Добавить'}
          </button>
          </form>

      {userModal?.mode === 'edit' && selectedUser ? (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-[color:var(--tg-theme-section-separator-color,rgba(255,255,255,0.12))] bg-[color:var(--tg-theme-section-bg-color,rgba(255,255,255,0.05))] p-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold text-tgText">Модерация</h3>
            <p className="text-xs text-tgHint">
              {selectedUser.mutedUntil
                ? `Ограничение действует до ${dateTimeFormatter.format(new Date(selectedUser.mutedUntil))}`
                : 'Отправка сообщений разрешена.'}
            </p>
            <p className="text-xs text-tgHint">
              {selectedUser.isBlocked
                ? `Статус: заблокирован${selectedUser.blockReason ? ` (${selectedUser.blockReason})` : ''}.`
                : 'Статус: активен.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {MUTE_OPTIONS.map((option) => (
              <button
                key={option.minutes}
                type="button"
                onClick={() => handleMuteUser(option.minutes)}
                disabled={isBusy}
                className="rounded-xl border border-[color:var(--tg-theme-section-separator-color,rgba(255,255,255,0.12))] px-3 py-1 text-xs text-tgText disabled:opacity-60"
              >
                Мут {option.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleUnmuteUser}
              disabled={isBusy || !selectedUser.mutedUntil}
              className="rounded-xl bg-tgButton px-4 py-2 text-sm font-semibold text-tgButtonText disabled:opacity-60"
            >
              Снять мут
            </button>
            <button
              type="button"
              onClick={() => handleBlockToggle(!selectedUser.isBlocked)}
              disabled={isBusy}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                selectedUser.isBlocked
                  ? 'border border-[color:var(--tg-theme-section-separator-color,rgba(255,255,255,0.12))] text-tgText'
                  : 'bg-red-500 text-white'
              } disabled:opacity-60`}
            >
              {selectedUser.isBlocked ? 'Разблокировать' : 'Заблокировать'}
            </button>
          </div>
        </div>
      ) : null}
        </>
      </MobileModal>

      <MobileModal
        open={Boolean(checksModal)}
        title={checksModal ? `Чеки · ${formatUserDisplay(checksModal.user)}` : ''}
        onClose={closeChecksModal}
        footer={
          checksModal ? (
            <button
              type="button"
              onClick={() => openCheckCreateModal(checksModal.user)}
              className="rounded-xl bg-tgButton px-4 py-2 text-sm font-semibold text-tgButtonText disabled:opacity-60"
              disabled={isBusy}
            >
              Создать чек
            </button>
          ) : undefined
        }
      >
        {checksModal ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {CHECK_PERIOD_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleCheckPeriodChange(option.id)}
                  className={`rounded-xl px-3 py-1 text-sm font-medium transition-colors ${
                    checkFilters.period === option.id
                      ? 'bg-tgButton text-tgButtonText'
                      : 'border border-[color:var(--tg-theme-section-separator-color,rgba(255,255,255,0.12))] bg-[color:var(--tg-theme-section-bg-color,rgba(255,255,255,0.05))] text-tgHint'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {checkFilters.period === 'custom' && (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={checkFilters.startDate ?? ''}
                  onChange={(event) =>
                    setCheckFilters((prev) => ({
                      ...prev,
                      startDate: event.target.value
                    }))
                  }
                  className={modalInputClass}
                />
                <input
                  type="date"
                  value={checkFilters.endDate ?? ''}
                  onChange={(event) =>
                    setCheckFilters((prev) => ({
                      ...prev,
                      endDate: event.target.value
                    }))
                  }
                  className={modalInputClass}
                />
              </div>
            )}

            <div className="text-xs text-tgHint">
              <span>Найдено чеков: {checkTotals.count}</span>
              <span> · Сумма: {formatCheckAmount(checkTotals.total)}</span>
            </div>

            <div className="flex flex-col gap-3">
              {checksQuery.isLoading ? (
                <p className="text-sm text-tgHint">Загрузка чеков...</p>
              ) : checksQuery.isError ? (
                <p className="text-sm text-red-400">Не удалось загрузить чеки.</p>
              ) : checkList.length === 0 ? (
                <p className="text-sm text-tgHint">Чеки не найдены.</p>
              ) : (
                checkList.map((check) => (
                  <div key={check.id} className="flex flex-col gap-2 rounded-2xl border border-[color:var(--tg-theme-section-separator-color,rgba(255,255,255,0.12))] bg-[color:var(--tg-theme-section-bg-color,rgba(255,255,255,0.05))] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-tgText">
                          {formatCheckAmount(check.amount)}
                        </p>
                        <p className="text-xs text-tgHint">
                          {dateTimeFormatter.format(new Date(check.createdAt))}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openCheckEditModal(checksModal.user, check)}
                          disabled={isBusy}
                          className="rounded-xl border border-[color:var(--tg-theme-section-separator-color,rgba(255,255,255,0.12))] px-3 py-1 text-xs text-tgText disabled:opacity-60"
                        >
                          Изменить
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmDelete({
                              type: 'check',
                              id: check.id,
                              name: formatCheckAmount(check.amount)
                            })
                          }
                          disabled={isBusy}
                          className="rounded-xl bg-red-500/80 px-3 py-1 text-xs text-white disabled:opacity-60"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                    {check.note && <p className="text-sm text-tgHint">{check.note}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}
      </MobileModal>

      <MobileModal
        open={Boolean(checkFormModal)}
        title={checkFormModal?.mode === 'edit' ? 'Редактирование чека' : 'Новый чек'}
        onClose={handleCloseCheckFormModal}
      >
        <form onSubmit={handleCheckSubmit} className="flex flex-col gap-3">
          {checkFormModal ? (
            <div className="rounded-2xl border border-[color:var(--tg-theme-section-separator-color,rgba(255,255,255,0.12))] bg-[color:var(--tg-theme-section-bg-color,rgba(255,255,255,0.05))] px-3 py-2 text-xs text-tgHint">
              Пользователь: {formatUserDisplay(checkFormModal.user)}
            </div>
          ) : null}

          <label className="flex flex-col gap-1 text-sm">
            Сумма
            <input
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              {...checkForm.register('amount')}
              placeholder="0.00"
              className={modalInputClass}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Заметка
            <textarea
              rows={3}
              {...checkForm.register('note')}
              placeholder="Комментарий к чеку"
              className={`${modalInputClass} min-h-[96px]`}
            />
          </label>

          <button
            type="submit"
            disabled={isBusy}
            className="mt-2 rounded-xl bg-tgButton px-4 py-2 text-sm font-semibold text-tgButtonText disabled:opacity-60"
          >
            {checkFormModal?.mode === 'edit' ? 'Сохранить' : 'Создать'}
          </button>
        </form>
      </MobileModal>

      <MobileModal
        open={Boolean(helpTopic)}
        title={helpTopic?.label ?? ''}
        onClose={() => setHelpTopic(null)}
      >
        <p className="text-sm text-tgText">{helpTopic?.description}</p>
        <p className="mt-4 text-xs text-tgHint">
          {helpTopic?.required
            ? 'Это поле обязательно для заполнения.'
            : 'Это поле можно оставить пустым.'}
        </p>
      </MobileModal>

      <MobileModal
        open={Boolean(blockModal)}
        title={
          blockModal?.mode === 'block' ? 'Блокировка пользователя' : 'Снять блокировку'
        }
        onClose={() => setBlockModal(null)}
        footer={
          blockModal ? (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleBlockModalConfirm}
                disabled={isBusy}
                className={`rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60 ${
                  blockModal.mode === 'block' ? 'bg-red-500 text-white' : 'bg-tgButton text-tgButtonText'
                }`}
              >
                {blockModal.mode === 'block' ? 'Заблокировать' : 'Разблокировать'}
              </button>
              <button
                type="button"
                onClick={() => setBlockModal(null)}
                className="rounded-xl border border-[color:var(--tg-theme-section-separator-color,rgba(255,255,255,0.12))] px-4 py-2 text-sm text-tgText"
              >
                Отмена
              </button>
            </div>
          ) : undefined
        }
      >
        {blockModal?.mode === 'block' ? (
          <label className="flex flex-col gap-2 text-sm">
            Причина блокировки (необязательно)
            <textarea
              value={blockModal.reason}
              onChange={(event) =>
                setBlockModal((prev) =>
                  prev ? { ...prev, reason: event.target.value } : prev
                )
              }
              rows={3}
              className="rounded-xl border border-[color:var(--tg-theme-section-separator-color,rgba(255,255,255,0.12))] bg-[color:var(--tg-theme-section-bg-color,rgba(255,255,255,0.04))] px-3 py-2 text-base text-tgText"
              placeholder="Причина, которая будет показана пользователю"
            />
          </label>
        ) : (
          <p className="text-sm text-tgHint">
            Подтвердите снятие блокировки пользователя.
          </p>
        )}
      </MobileModal>

      <MobileModal
        open={Boolean(confirmDelete)}
        title="Подтверждение удаления"
        onClose={() => setConfirmDelete(null)}
        footer={
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={isBusy}
              className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Удалить
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(null)}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-tgText"
            >
              Отмена
            </button>
          </div>
        }
      >
        <p className="text-sm text-tgText">
          {confirmDelete?.type === 'check'
            ? `Удалить чек на ${confirmDelete?.name}? Это действие нельзя отменить.`
            : `Действительно удалить «${confirmDelete?.name}»? Это действие нельзя отменить.`}
        </p>
      </MobileModal>

      <MobileModal
        open={userSelectModal && !checkFormModal}
        title="Выбрать пользователя"
        onClose={() => {
          setUserSelectModal(false);
          setUserSearchForCheck('');
          setIsCheckCreationFlow(false);
        }}
      >
        <div className="flex flex-col gap-3">
          <input
            value={userSearchForCheck}
            onChange={(event) => setUserSearchForCheck(event.target.value)}
            placeholder="Поиск по имени, username или ID"
            className={modalInputClass}
          />

          <div className="flex max-h-[400px] flex-col gap-2 overflow-y-auto">
            {filteredUsersForCheckCreation.length === 0 ? (
              <p className="text-sm text-tgHint">
                {userSearchForCheck ? 'По запросу ничего не найдено.' : 'Пользователи не найдены.'}
              </p>
            ) : (
              filteredUsersForCheckCreation.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleUserSelectForCheck(user)}
                  className="flex flex-col gap-1 rounded-2xl border border-[color:var(--tg-theme-section-separator-color,rgba(255,255,255,0.12))] bg-[color:var(--tg-theme-section-bg-color,rgba(255,255,255,0.05))] p-3 text-left transition-colors hover:bg-[color:var(--tg-theme-section-bg-color,rgba(255,255,255,0.1))]"
                >
                  <span className="text-base font-semibold text-tgText">
                    {formatUserDisplay(user)}
                  </span>
                  <span className="text-sm text-tgHint">
                    @{user.username ?? 'без username'} · ID: {user.telegramId}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </MobileModal>

      <MobileModal
        open={checkCreatedModal}
        title="Чек создан"
        onClose={handleCheckCreatedFinish}
        footer={
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleCheckCreatedAddAnother}
              className="rounded-xl bg-tgButton px-4 py-2 text-sm font-semibold text-tgButtonText"
            >
              Добавить еще чек
            </button>
            <button
              type="button"
              onClick={handleCheckCreatedFinish}
              className="rounded-xl border border-[color:var(--tg-theme-section-separator-color,rgba(255,255,255,0.12))] px-4 py-2 text-sm text-tgText"
            >
              Вернуться в админку
            </button>
          </div>
        }
      >
        <p className="text-sm text-tgText">
          Чек успешно создан. Хотите добавить еще один чек или вернуться в админку?
        </p>
      </MobileModal>
    </section>
  );
}
