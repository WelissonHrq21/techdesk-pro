import { Search } from "lucide-react";
import { useState } from "react";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { formatCurrency } from "../../../utils/formatters";
import { useParts } from "../../parts/hooks/useParts";
import type { Part } from "../../parts/types/part";

type PartSearchFieldProps = {
  selectedPart?: Pick<Part, "id" | "name" | "brand" | "currentPrice" | "stock">;
  onSelect: (part: Part) => void;
  error?: string;
};

export function PartSearchField({
  selectedPart,
  onSelect,
  error,
}: PartSearchFieldProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const partsQuery = useParts({
    limit: 10,
    search: debouncedSearch || undefined,
    enabled: debouncedSearch.length >= 2,
  });

  return (
    <div>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          size={16}
        />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={
            selectedPart
              ? `${selectedPart.name} - ${selectedPart.brand}`
              : "Buscar peca..."
          }
          className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        />
      </div>

      {selectedPart && (
        <div className="mt-2 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <span className="font-medium text-slate-950">
            {selectedPart.name}
          </span>{" "}
          - {selectedPart.brand} - Estoque: {selectedPart.stock} -{" "}
          {formatCurrency(selectedPart.currentPrice)}
        </div>
      )}

      {error && <span className="mt-1 block text-sm text-rose-600">{error}</span>}

      {debouncedSearch.length >= 2 && (
        <div className="mt-2 max-h-52 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-sm">
          {partsQuery.isFetching ? (
            <p className="px-3 py-2 text-sm text-slate-500">Buscando...</p>
          ) : partsQuery.data?.data.length ? (
            partsQuery.data.data.map((part) => (
              <button
                key={part.id}
                type="button"
                onClick={() => {
                  onSelect(part);
                  setSearch("");
                }}
                className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <span className="font-medium text-slate-950">
                  {part.name} - {part.brand}
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                  Estoque: {part.stock} - {formatCurrency(part.currentPrice)}
                  {!part.active ? " - Inativa" : part.stock === 0 ? " - Sem estoque" : ""}
                </span>
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-sm text-slate-500">
              Nenhuma peca encontrada.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
