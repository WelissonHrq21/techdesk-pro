import {
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import { ToastContext, type ToastType } from "./toastContextValue";

type Toast = {
  id: number;
  type: ToastType;
  message: string;
};

type ToastProviderProps = {
  children: ReactNode;
};

const toastDurations: Record<ToastType, number> = {
  success: 3500,
  info: 5000,
  error: 8000,
};

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextToastId = useRef(1);
  const timeoutIds = useRef(new Map<number, number>());

  const removeToast = useCallback((id: number) => {
    const timeoutId = timeoutIds.current.get(id);

    if (timeoutId) {
      window.clearTimeout(timeoutId);
      timeoutIds.current.delete(id);
    }

    setToasts((currentToasts) =>
      currentToasts.filter((toast) => toast.id !== id)
    );
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = nextToastId.current;
      nextToastId.current += 1;

      setToasts((currentToasts) => {
        const nextToasts = [...currentToasts, { id, type, message }].slice(-4);
        const visibleIds = new Set(nextToasts.map((toast) => toast.id));

        currentToasts.forEach((toast) => {
          if (!visibleIds.has(toast.id)) {
            const timeoutId = timeoutIds.current.get(toast.id);

            if (timeoutId) {
              window.clearTimeout(timeoutId);
              timeoutIds.current.delete(toast.id);
            }
          }
        });

        return nextToasts;
      });

      const timeoutId = window.setTimeout(
        () => removeToast(id),
        toastDurations[type]
      );
      timeoutIds.current.set(id, timeoutId);
    },
    [removeToast]
  );

  useEffect(() => {
    const activeTimeouts = timeoutIds.current;

    return () => {
      activeTimeouts.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      activeTimeouts.clear();
    };
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-[60] flex max-w-[calc(100vw-2rem)] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`grid w-80 max-w-full grid-cols-[1fr_auto] gap-3 rounded-md border px-4 py-3 text-sm shadow-lg ${
              toast.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : toast.type === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-800"
                  : "border-slate-200 bg-white text-slate-800"
            }`}
            role={toast.type === "error" ? "alert" : "status"}
          >
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-current opacity-70 hover:bg-black/5 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-current/30"
              aria-label="Fechar mensagem"
              title="Fechar mensagem"
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
