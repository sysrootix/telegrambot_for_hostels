import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { updateProfile, type UpdateProfilePayload } from '@/api/profile';
import { useSession } from '@/providers/SessionProvider';

export function ProfilePage() {
  const { session } = useSession();
  const queryClient = useQueryClient();
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
  } = useForm<UpdateProfilePayload>({
    defaultValues: {
      payoutDetails: session?.user.payoutDetails ?? ''
    }
  });

  useEffect(() => {
    if (session?.user) {
      reset({
        payoutDetails: session.user.payoutDetails ?? ''
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
    await mutation.mutateAsync({
      payoutDetails: values.payoutDetails.trim()
    });
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
            className="h-14 w-14 rounded-full border border-white/10 object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-white/10 bg-white/5 text-lg font-semibold">
            {fallbackInitial}
          </div>
        )}
        <div className="flex flex-col">
          <span className="text-base font-semibold">{displayName}</span>
          <span className="text-sm text-tgHint">
            @{session.user.username ?? session.telegramUser.username ?? 'не указан'}
          </span>
          <span className="text-sm text-tgHint">ID: {session.user.telegramId}</span>
        </div>
      </div>

      <div className="rounded-2xl bg-white/5 p-4 text-sm text-tgHint">
        Данные профиля Telegram обновляются автоматически. Изменить их может только администратор.
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-2xl bg-white/5 p-4">
        <h2 className="text-lg font-semibold">Реквизиты для выплат</h2>

        <label className="flex flex-col gap-1 text-sm">
          Укажите, куда перечислять выплаты
          <textarea
            {...register('payoutDetails')}
            rows={4}
            placeholder="Напишите номер карты, криптокошелек или иные реквизиты"
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
