import type { PaginationMeta } from "../../types/pagination";

type PaginationProps = {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
};

export function Pagination({ meta, onPageChange }: PaginationProps) {
  const totalPages = Math.max(meta.totalPages, 1);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
      <span>{meta.total} registros encontrados</span>

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={meta.page <= 1}
          onClick={() => onPageChange(meta.page - 1)}
          className="h-9 rounded-md border border-slate-200 px-3 font-medium text-slate-700 hover:bg-slate-50 disabled:text-slate-300"
        >
          Anterior
        </button>
        <span>
          Pagina {meta.page} de {totalPages}
        </span>
        <button
          type="button"
          disabled={meta.page >= totalPages}
          onClick={() => onPageChange(meta.page + 1)}
          className="h-9 rounded-md border border-slate-200 px-3 font-medium text-slate-700 hover:bg-slate-50 disabled:text-slate-300"
        >
          Proxima
        </button>
      </div>
    </div>
  );
}
