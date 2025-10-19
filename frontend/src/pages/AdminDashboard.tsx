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
  type UpsertUserPayload
} from '@/api/users';
import { useSession } from '@/providers/SessionProvider';
import type { ApiAdmin, ApiUser } from '@/types/api';

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
  payoutDetails: string;
};

const userDefaultValues: UserFormValues = {
  telegramId: '',
  username: '',
  firstName: '',
  lastName: '',
  phone: '',
  bio: '',
  languageCode: '',
  payoutDetails: ''
};

interface HelpTopic {
  title: string;
  description: string;
  required: boolean;
}

const USER_FIELD_META: Record<
  keyof UserFormValues,
  { label: string; required: boolean; description: string }
> = {
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
  payoutDetails: {
    label: 'Реквизиты',
    required: false,
    description:
      'Информация для выплат: номер карты, криптокошелёк или любой другой удобный способ перечислений.'
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
  payoutDetails: 'Карта **** 1234, USDT TRC20, PayPal...'
};

type UpsertUserField = Extract<keyof UserFormValues, keyof UpsertUserPayload>;

const modalInputClass =
  'w-full rounded-2xl border border-[color:var(--tg-theme-section-separator-color,rgba(255,255,255,0.12))] bg-[color:var(--tg-theme-section-bg-color,rgba(255,255,255,0.04))] px-3 py-2 text-base text-tgText placeholder:text-tgHint focus:border-[color:var(--tg-theme-accent-text-color,#5aa7ff)] focus:outline-none focus:ring-0 transition-colors';

export function AdminDashboard() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'admins' | 'users'>('admins');
  const [adminModal, setAdminModal] = useState<{ mode: 'create' | 'edit'; entity?: ApiAdmin } | null>(
    null
  );
  const [userModal, setUserModal] = useState<{ mode: 'create' | 'edit'; entity?: ApiUser } | null>(
    null
  );
  const [helpTopic, setHelpTopic] = useState<HelpTopic | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    type: 'admin' | 'user';
    id: string;
    name: string;
  } | null>(null);
  const [adminSearch, setAdminSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');

  const adminForm = useForm<AdminFormValues>({
    defaultValues: adminDefaultValues
  });

  const userForm = useForm<UserFormValues>({
    defaultValues: userDefaultValues
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

  const adminList = useMemo(() => adminsQuery.data ?? [], [adminsQuery.data]);
  const userList = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);
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
      const payoutDetails = user.payoutDetails?.toLowerCase() ?? '';

      return (
        user.telegramId.toLowerCase().includes(query) ||
        firstName.includes(query) ||
        lastName.includes(query) ||
        username.includes(query) ||
        payoutDetails.includes(query)
      );
    });
  }, [userList, userSearch]);

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
    apply('payoutDetails');

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
      payoutDetails: user.payoutDetails ?? ''
    });
    setUserModal({ mode: 'edit', entity: user });
  };

  const closeUserModal = () => {
    setUserModal(null);
    userForm.reset(userDefaultValues);
  };

  const openHelp = (field: keyof UserFormValues) => {
    const meta = USER_FIELD_META[field];
    setHelpTopic({
      title: meta.label,
      description: meta.description,
      required: meta.required
    });
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
      compare('payoutDetails', 'payoutDetails', userModal.entity.payoutDetails);

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

  const isBusy =
    createAdminMutation.isPending ||
    updateAdminMutation.isPending ||
    deleteAdminMutation.isPending ||
    createUserMutation.isPending ||
    updateUserMutation.isPending ||
    deleteUserMutation.isPending;

  const handleConfirmDelete = async () => {
    if (!confirmDelete) {
      return;
    }

    try {
      if (confirmDelete.type === 'admin') {
        await deleteAdminMutation.mutateAsync(confirmDelete.id);
      } else {
        await deleteUserMutation.mutateAsync(confirmDelete.id);
      }
      setConfirmDelete(null);
    } catch {
      // Ошибка уже отображена toast-ом, оставляем модалку открытой для повторной попытки
    }
  };

  const renderUserField = (field: keyof UserFormValues, input: React.ReactNode) => {
    const meta = USER_FIELD_META[field];

    return (
      <label key={field as string} className="flex flex-col gap-1 text-sm">
        <span className="flex items-center justify-between gap-2">
          <span className="flex items-baseline gap-2 text-sm font-medium text-tgText">
            {meta.label}
            <span className={`text-xs ${meta.required ? 'text-tgAccent' : 'text-tgHint'}`}>
              {meta.required ? 'обязательно' : 'необязательно'}
            </span>
          </span>
          <button
            type="button"
            onClick={() => openHelp(field)}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-[color:var(--tg-theme-section-separator-color,rgba(255,255,255,0.16))] bg-[color:var(--tg-theme-section-bg-color,rgba(255,255,255,0.06))] text-xs text-tgHint transition-colors hover:border-[color:var(--tg-theme-accent-text-color,#5aa7ff)] hover:text-tgAccent"
          >
            ?
          </button>
        </span>
        {input}
      </label>
    );
  };

  return (
    <section className="flex flex-col gap-6">
      <div className="flex gap-2">
        <button
          className={`flex-1 rounded-xl py-2 text-sm font-medium ${
            activeTab === 'admins' ? 'bg-tgButton text-tgButtonText' : 'bg-white/5'
          }`}
          onClick={() => setActiveTab('admins')}
        >
          Администраторы ({adminList.length})
        </button>
        <button
          className={`flex-1 rounded-xl py-2 text-sm font-medium ${
            activeTab === 'users' ? 'bg-tgButton text-tgButtonText' : 'bg-white/5'
          }`}
          onClick={() => setActiveTab('users')}
        >
          Пользователи ({userList.length})
        </button>
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
                    </div>
                    <div className="flex gap-2">
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
                  {user.payoutDetails && (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-tgHint">
                      <span className="text-tgText">Реквизиты:</span> {user.payoutDetails}
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
          <label className="flex flex-col gap-1 text-sm">
            telegramId <span className="text-xs text-tgHint">обязательно</span>
            <input
              {...adminForm.register('telegramId')}
              placeholder="123456789"
              className={modalInputClass}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Отображаемое имя <span className="text-xs text-tgHint">необязательно</span>
            <input
              {...adminForm.register('displayName')}
              placeholder="Имя администратора"
              className={modalInputClass}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Заметка <span className="text-xs text-tgHint">необязательно</span>
            <textarea
              {...adminForm.register('notes')}
              rows={3}
              className={`${modalInputClass} min-h-[96px]`}
            />
          </label>

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
            'payoutDetails',
            <textarea
              {...userForm.register('payoutDetails')}
              rows={3}
              placeholder={USER_FIELD_PLACEHOLDERS.payoutDetails}
              className={`${modalInputClass} min-h-[112px]`}
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
      </MobileModal>

      <MobileModal
        open={Boolean(helpTopic)}
        title={helpTopic?.title ?? ''}
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
          Действительно удалить «{confirmDelete?.name}»? Это действие нельзя отменить.
        </p>
      </MobileModal>
    </section>
  );
}
