export function LoadingScreen() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-slate-50"
      role="status"
      aria-live="polite"
    >
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-sky-600" />
      <span className="sr-only">Carregando</span>
    </div>
  );
}
