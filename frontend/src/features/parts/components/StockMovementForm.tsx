import { zodResolver } from "@hookform/resolvers/zod";
import { Search } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FormField } from "../../../components/ui/FormField";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { useServiceOrders } from "../../service-orders/hooks/useServiceOrders";
import {
  stockMovementFormSchema,
  type StockMovementFormData,
} from "../schemas/partSchemas";

type StockMovementFormProps = {
  type: "entry" | "exit";
  isSubmitting: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onSubmit: (data: StockMovementFormData) => void;
};

const inputClass =
  "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100";

export function StockMovementForm({
  type,
  isSubmitting,
  errorMessage,
  onCancel,
  onSubmit,
}: StockMovementFormProps) {
  const [serviceOrderSearch, setServiceOrderSearch] = useState("");
  const debouncedSearch = useDebouncedValue(serviceOrderSearch, 300);
  const [selectedServiceOrderLabel, setSelectedServiceOrderLabel] = useState("");
  const serviceOrdersQuery = useServiceOrders({
    page: 1,
    limit: 8,
    search: debouncedSearch || undefined,
    sortBy: "number",
    sortOrder: "desc",
  });
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<StockMovementFormData>({
    resolver: zodResolver(stockMovementFormSchema),
    defaultValues: {
      quantity: 1,
      reason: "",
      serviceOrderId: "",
    },
  });

  return (
    <form className="space-y-4" onSubmit={(event) => void handleSubmit(onSubmit)(event)}>
      {type === "exit" && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Use esta operacao para perdas, uso interno ou ajustes operacionais. Para
          pecas usadas em reparo, utilize o consumo dentro da OS.
        </p>
      )}

      <FormField label="Quantidade *" error={errors.quantity?.message}>
        <input
          className={inputClass}
          type="number"
          min={1}
          {...register("quantity", { valueAsNumber: true })}
        />
      </FormField>

      <FormField label="Motivo" error={errors.reason?.message}>
        <textarea
          rows={3}
          {...register("reason")}
          className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        />
      </FormField>

      {type === "exit" && (
        <div>
          <FormField label="OS relacionada opcional" error={errors.serviceOrderId?.message}>
            <input type="hidden" {...register("serviceOrderId")} />
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                type="search"
                value={serviceOrderSearch}
                onChange={(event) => setServiceOrderSearch(event.target.value)}
                placeholder={selectedServiceOrderLabel || "Buscar OS..."}
                className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-950 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
            </div>
          </FormField>
          {debouncedSearch && (
            <div className="mt-2 max-h-52 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-sm">
              {serviceOrdersQuery.isFetching ? (
                <p className="px-3 py-2 text-sm text-slate-500">Buscando...</p>
              ) : serviceOrdersQuery.data?.data.length ? (
                serviceOrdersQuery.data.data.map((serviceOrder) => (
                  <button
                    key={serviceOrder.id}
                    type="button"
                    onClick={() => {
                      setValue("serviceOrderId", serviceOrder.id);
                      setSelectedServiceOrderLabel(
                        `OS #${serviceOrder.number} - ${serviceOrder.customer.name}`
                      );
                      setServiceOrderSearch("");
                    }}
                    className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <span className="font-medium text-slate-950">
                      OS #{serviceOrder.number} - {serviceOrder.customer.name}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {serviceOrder.equipment.brand} {serviceOrder.equipment.model}
                    </span>
                  </button>
                ))
              ) : (
                <p className="px-3 py-2 text-sm text-slate-500">
                  Nenhuma OS encontrada.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {errorMessage && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {errorMessage}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-10 rounded-md border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="h-10 rounded-md bg-sky-600 px-4 text-sm font-semibold text-white hover:bg-sky-700 disabled:bg-slate-300"
        >
          {isSubmitting ? "Registrando..." : "Registrar"}
        </button>
      </div>
    </form>
  );
}
