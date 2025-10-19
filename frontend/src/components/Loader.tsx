export function Loader({ label }: { label?: string }) {
  return (
    <div className="flex h-screen items-center justify-center bg-tgBg text-tgText">
      <div className="flex flex-col items-center gap-3">
        <span className="h-12 w-12 animate-spin rounded-full border-4 border-t-transparent border-tgButton" />
        <p className="text-sm opacity-80">{label ?? 'Загрузка...'}</p>
      </div>
    </div>
  );
}
