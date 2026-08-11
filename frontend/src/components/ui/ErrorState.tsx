import { AlertTriangle, RefreshCcw } from "lucide-react";

type ErrorStateProps = {
  title: string;
  onRetry?: () => void;
  isRetrying?: boolean;
};

export function ErrorState({ title, onRetry, isRetrying }: ErrorStateProps) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-8 text-center shadow-sm">
      <AlertTriangle className="mx-auto text-amber-500" size={34} />
      <h3 className="mt-4 text-lg font-semibold text-slate-950">{title}</h3>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-slate-300"
        >
          <RefreshCcw size={16} />
          Tentar novamente
        </button>
      )}
    </div>
  );
}
