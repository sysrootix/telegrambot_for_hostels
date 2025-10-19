import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { updateProfile, type UpdateProfilePayload } from '@/api/profile';
import { useSession } from '@/providers/SessionProvider';

export function ProfilePage() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty, isSubmitting }
  } = useForm<UpdateProfilePayload>({
    defaultValues: {
      firstName: session?.user.firstName ?? undefined,
      lastName: session?.user.lastName ?? undefined,
      username: session?.user.username ?? undefined,
      phone: session?.user.phone ?? undefined,
      bio: session?.user.bio ?? undefined
    }
  });

  useEffect(() => {
    if (session?.user) {
      reset({
        firstName: session.user.firstName ?? undefined,
        lastName: session.user.lastName ?? undefined,
        username: session.user.username ?? undefined,
        phone: session.user.phone ?? undefined,
        bio: session.user.bio ?? undefined
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
    await mutation.mutateAsync(values);
  });

  if (!session) {
    return null;
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-2xl bg-white/5 p-4">
        <h2 className="text-lg font-semibold">Телеграм профиль</h2>
        <p className="mt-2 text-sm text-tgHint">
          @{session.user.username ?? session.telegramUser.username ?? 'не указан'}
        </p>
        <p className="text-sm text-tgHint">ID: {session.user.telegramId}</p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-2xl bg-white/5 p-4">
        <h2 className="text-lg font-semibold">Личная информация</h2>

        <label className="flex flex-col gap-1 text-sm">
          Имя
          <input
            {...register('firstName')}
            placeholder="Введите имя"
            className="rounded-xl border border-white/10 bg-transparent px-3 py-2 text-base text-tgText"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Фамилия
          <input
            {...register('lastName')}
            placeholder="Введите фамилию"
            className="rounded-xl border border-white/10 bg-transparent px-3 py-2 text-base text-tgText"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Username
          <input
            {...register('username')}
            placeholder="@username"
            className="rounded-xl border border-white/10 bg-transparent px-3 py-2 text-base text-tgText"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Телефон
          <input
            {...register('phone')}
            placeholder="+7..."
            className="rounded-xl border border-white/10 bg-transparent px-3 py-2 text-base text-tgText"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          О себе
          <textarea
            {...register('bio')}
            rows={3}
            placeholder="Краткое описание"
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
    </section>
  );
}
