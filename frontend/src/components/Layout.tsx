import type { ReactNode } from 'react';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-tgBg text-tgText">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 px-4 py-6">
        {children}
      </div>
    </div>
  );
}
