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
      className="fixed inset-0 z-50 flex flex-col bg-[color:rgba(0,0,0,0.55)] backdrop-blur-md transition-colors"
      onClick={handleBackdropClick}
    >
      <div className="mt-auto flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-[32px] border border-[color:var(--tg-theme-section-separator-color,rgba(255,255,255,0.08))] bg-[color:var(--tg-theme-secondary-bg-color,#17212b)] px-5 pb-6 pt-5 text-tgText shadow-[0_-18px_45px_rgba(0,0,0,0.5)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-tgText">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[color:var(--tg-theme-section-separator-color,rgba(255,255,255,0.12))] bg-[color:var(--tg-theme-section-bg-color,rgba(255,255,255,0.04))] px-3 py-1 text-sm text-tgHint transition-colors hover:border-[color:var(--tg-theme-accent-text-color,#5aa7ff)] hover:text-tgAccent"
          >
            Закрыть
          </button>
        </div>
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="flex flex-col gap-4">{children}</div>
        </div>
        {footer ? <div className="mt-5 flex flex-col gap-3">{footer}</div> : null}
      </div>
    </div>
  );
}
