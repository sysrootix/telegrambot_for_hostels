import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

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
import type { ApiAdmin, ApiUser } from '@/types/api';
import { useSession } from '@/providers/SessionProvider';

type AdminFormValues = UpsertAdminPayload;
type UserFormValues = UpsertUserPayload;

export function AdminDashboard() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'admins' | 'users'>('admins');
  const [editingAdmin, setEditingAdmin] = useState<ApiAdmin | null>(null);
  const [editingUser, setEditingUser] = useState<ApiUser | null>(null);

  const adminForm = useForm<AdminFormValues>({
    defaultValues: {
      telegramId: '',
      displayName: '',
      notes: ''
    }
  });

  const userForm = useForm<UserFormValues>({
    defaultValues: {
      telegramId: '',
      username: '',
      firstName: '',
      lastName: '',
      phone: '',
      bio: '',
      languageCode: ''
    }
  });

  useEffect(() => {
    if (!editingAdmin) {
      adminForm.reset({
        telegramId: '',
        displayName: '',
        notes: ''
      });
      return;
    }

    adminForm.reset({
      telegramId: editingAdmin.telegramId,
      displayName: editingAdmin.displayName ?? '',
      notes: editingAdmin.notes ?? ''
    });
  }, [adminForm, editingAdmin]);

  useEffect(() => {
    if (!editingUser) {
      userForm.reset({
        telegramId: '',
        username: '',
        firstName: '',
        lastName: '',
        phone: '',
        bio: '',
        languageCode: ''
      });
      return;
    }

    userForm.reset({
      telegramId: editingUser.telegramId,
      username: editingUser.username ?? '',
      firstName: editingUser.firstName ?? '',
      lastName: editingUser.lastName ?? '',
      phone: editingUser.phone ?? '',
      bio: editingUser.bio ?? '',
      languageCode: editingUser.languageCode ?? ''
    });
  }, [editingUser, userForm]);

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

  const sanitizeAdminPayload = (values: AdminFormValues): UpsertAdminPayload => ({
    telegramId: values.telegramId.trim(),
    displayName: values.displayName?.trim() ? values.displayName.trim() : undefined,
    notes: values.notes?.trim() ? values.notes.trim() : undefined
  });

  const sanitizeUserPayload = (values: UserFormValues): UpsertUserPayload => ({
    telegramId: values.telegramId.trim(),
    username: values.username?.trim() || undefined,
    firstName: values.firstName?.trim() || undefined,
    lastName: values.lastName?.trim() || undefined,
    phone: values.phone?.trim() || undefined,
    bio: values.bio?.trim() || undefined,
    languageCode: values.languageCode?.trim() || undefined
  });

  const handleAdminSubmit = adminForm.handleSubmit(async (values) => {
    const payload = sanitizeAdminPayload(values);

    if (!payload.telegramId) {
      toast.error('Укажите telegramId');
      return;
    }

    if (editingAdmin) {
      const updatePayload: Partial<UpsertAdminPayload> = {};
      const currentDisplayName = editingAdmin.displayName ?? undefined;
      const currentNotes = editingAdmin.notes ?? undefined;

      if (payload.telegramId !== editingAdmin.telegramId) {
        updatePayload.telegramId = payload.telegramId;
      }
      if (payload.displayName !== currentDisplayName) {
        updatePayload.displayName = payload.displayName;
      }
      if (payload.notes !== currentNotes) {
        updatePayload.notes = payload.notes;
      }

      await updateAdminMutation.mutateAsync({
        id: editingAdmin.id,
        payload: updatePayload
      });
      setEditingAdmin(null);
    } else {
      await createAdminMutation.mutateAsync(payload);
    }

    adminForm.reset({
      telegramId: '',
      displayName: '',
      notes: ''
    });
  });

  const handleUserSubmit = userForm.handleSubmit(async (values) => {
    const payload = sanitizeUserPayload(values);

    if (!payload.telegramId) {
      toast.error('Укажите telegramId');
      return;
    }

    if (editingUser) {
      const updatePayload: Partial<UpsertUserPayload> = {};

      (Object.entries(payload) as [keyof UpsertUserPayload, string | undefined][]).forEach(
        ([key, value]) => {
          if (key === 'telegramId') {
            if (value && value !== editingUser.telegramId) {
              updatePayload.telegramId = value;
            }
            return;
          }

          const currentValue = editingUser[key as keyof ApiUser];
          const normalizedCurrent = (currentValue as string | null) ?? undefined;

          if (value !== normalizedCurrent) {
            updatePayload[key] = value;
          }
        }
      );

      await updateUserMutation.mutateAsync({
        id: editingUser.id,
        payload: updatePayload
      });
      setEditingUser(null);
    } else {
      await createUserMutation.mutateAsync(payload);
    }

    userForm.reset({
      telegramId: '',
      username: '',
      firstName: '',
      lastName: '',
      phone: '',
      bio: '',
      languageCode: ''
    });
  });

  const isBusy =
    createAdminMutation.isPending ||
    updateAdminMutation.isPending ||
    deleteAdminMutation.isPending ||
    createUserMutation.isPending ||
    updateUserMutation.isPending ||
    deleteUserMutation.isPending;

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
          <form
            onSubmit={handleAdminSubmit}
            className="flex flex-col gap-3 rounded-2xl bg-white/5 p-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingAdmin ? 'Редактирование администратора' : 'Добавить администратора'}
              </h2>
              {editingAdmin && (
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="text-sm text-tgHint"
                >
                  Отмена
                </button>
              )}
            </div>

            <label className="flex flex-col gap-1 text-sm">
              telegramId
              <input
                {...adminForm.register('telegramId')}
                placeholder="123456789"
                className="rounded-xl border border-white/10 bg-transparent px-3 py-2 text-base text-tgText"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Отображаемое имя
              <input
                {...adminForm.register('displayName')}
                placeholder="Имя администратора"
                className="rounded-xl border border-white/10 bg-transparent px-3 py-2 text-base text-tgText"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Заметка
              <textarea
                {...adminForm.register('notes')}
                rows={3}
                className="rounded-xl border border-white/10 bg-transparent px-3 py-2 text-base text-tgText"
              />
            </label>

            <button
              type="submit"
              disabled={isBusy}
              className="mt-2 rounded-xl bg-tgButton px-4 py-2 text-sm font-semibold text-tgButtonText disabled:opacity-60"
            >
              {editingAdmin ? 'Сохранить' : 'Добавить'}
            </button>
          </form>

          <div className="flex flex-col gap-2">
            {adminsQuery.isLoading ? (
              <p className="text-sm text-tgHint">Загрузка администраторов...</p>
            ) : adminsQuery.isError ? (
              <p className="text-sm text-red-400">Не удалось загрузить администраторов.</p>
            ) : adminList.length === 0 ? (
              <p className="text-sm text-tgHint">Администраторы не найдены.</p>
            ) : (
              adminList.map((admin) => (
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
                        onClick={() => setEditingAdmin(admin)}
                        disabled={isBusy}
                        className="rounded-xl border border-white/20 px-3 py-1 text-sm disabled:opacity-60"
                      >
                        Изменить
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteAdminMutation.mutate(admin.id)}
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
          <form
            onSubmit={handleUserSubmit}
            className="flex flex-col gap-3 rounded-2xl bg-white/5 p-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingUser ? 'Редактирование пользователя' : 'Добавить пользователя'}
              </h2>
              {editingUser && (
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="text-sm text-tgHint"
                >
                  Отмена
                </button>
              )}
            </div>

            <label className="flex flex-col gap-1 text-sm">
              telegramId
              <input
                {...userForm.register('telegramId')}
                placeholder="123456789"
                className="rounded-xl border border-white/10 bg-transparent px-3 py-2 text-base text-tgText"
              />
            </label>

            <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
              <label className="flex flex-col gap-1 text-sm">
                Имя
                <input
                  {...userForm.register('firstName')}
                  className="rounded-xl border border-white/10 bg-transparent px-3 py-2 text-base text-tgText"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Фамилия
                <input
                  {...userForm.register('lastName')}
                  className="rounded-xl border border-white/10 bg-transparent px-3 py-2 text-base text-tgText"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
              <label className="flex flex-col gap-1 text-sm">
                Username
                <input
                  {...userForm.register('username')}
                  placeholder="@username"
                  className="rounded-xl border border-white/10 bg-transparent px-3 py-2 text-base text-tgText"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Телефон
                <input
                  {...userForm.register('phone')}
                  placeholder="+7..."
                  className="rounded-xl border border-white/10 bg-transparent px-3 py-2 text-base text-tgText"
                />
              </label>
            </div>

            <label className="flex flex-col gap-1 text-sm">
              BIO
              <textarea
                {...userForm.register('bio')}
                rows={3}
                className="rounded-xl border border-white/10 bg-transparent px-3 py-2 text-base text-tgText"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Язык
              <input
                {...userForm.register('languageCode')}
                placeholder="ru"
                className="rounded-xl border border-white/10 bg-transparent px-3 py-2 text-base text-tgText"
              />
            </label>

            <button
              type="submit"
              disabled={isBusy}
              className="mt-2 rounded-xl bg-tgButton px-4 py-2 text-sm font-semibold text-tgButtonText disabled:opacity-60"
            >
              {editingUser ? 'Сохранить' : 'Добавить'}
            </button>
          </form>

          <div className="flex flex-col gap-2">
            {usersQuery.isLoading ? (
              <p className="text-sm text-tgHint">Загрузка пользователей...</p>
            ) : usersQuery.isError ? (
              <p className="text-sm text-red-400">Не удалось загрузить пользователей.</p>
            ) : userList.length === 0 ? (
              <p className="text-sm text-tgHint">Пользователи не найдены.</p>
            ) : (
              userList.map((user) => (
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
                        onClick={() => setEditingUser(user)}
                        disabled={isBusy}
                        className="rounded-xl border border-white/20 px-3 py-1 text-sm disabled:opacity-60"
                      >
                        Изменить
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteUserMutation.mutate(user.id)}
                        disabled={isBusy}
                        className="rounded-xl bg-red-500/80 px-3 py-1 text-sm text-white disabled:opacity-60"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                  {user.bio && <p className="text-sm text-tgHint">{user.bio}</p>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </section>
  );
}
