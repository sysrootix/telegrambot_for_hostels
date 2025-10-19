import { MouseEvent, PropsWithChildren, ReactNode } from 'react';

interface MobileModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  footer?: ReactNode;
}

export function MobileModal({
  open,
  title,
  onClose,
  footer,
  children
}: PropsWithChildren<MobileModalProps>) {
  if (!open) {
    return null;
  }

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="mt-auto flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-3xl bg-tgBgSecondary p-4 shadow-lg">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-tgText">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-3 py-1 text-sm text-tgHint"
          >
            Закрыть
          </button>
        </div>
        <div className="flex-1 overflow-y-auto pr-1">{children}</div>
        {footer ? <div className="mt-4 flex flex-col gap-2">{footer}</div> : null}
      </div>
    </div>
  );
}
