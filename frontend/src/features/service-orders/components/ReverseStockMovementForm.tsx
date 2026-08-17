import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { FormField } from "../../../components/ui/FormField";
import {
  createReverseStockMovementSchema,
  type ReverseStockMovementFormValues,
} from "../schemas/serviceOrderActionSchemas";
import type { ConsumptionSummary } from "../utils/serviceOrderDerivedData";

type ReverseStockMovementFormProps = {
  summary: ConsumptionSummary;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onSubmit: (data: ReverseStockMovementFormValues) => void;
};

export function ReverseStockMovementForm({
  summary,
  isSubmitting,
  errorMessage,
  onCancel,
  onSubmit,
}: ReverseStockMovementFormProps) {
  const schema = useMemo(
    () => createReverseStockMovementSchema(summary.reversibleQuantity),
    [summary.reversibleQuantity]
  );
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ReverseStockMovementFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      quantity: Math.min(1, Math.max(summary.reversibleQuantity, 1)),
      reason: "",
    },
  });

  return (
    <form noValidate onSubmit={(event) => void handleSubmit(onSubmit)(event)}>
      <div className="rounded-md bg-slate-50 p-4">
        <h4 className="font-semibold text-slate-950">
          {summary.movement.part.name}
        </h4>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <div>
            <dt className="text-slate-500">Consumido</dt>
            <dd className="font-semibold text-slate-950">
              {summary.consumedQuantity}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Estornado</dt>
            <dd className="font-semibold text-teal-700">
              {summary.reversedQuantity}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Consumo líquido</dt>
            <dd className="font-semibold text-slate-950">
              {summary.netQuantity}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Disponível</dt>
            <dd className="font-semibold text-sky-700">
              {summary.reversibleQuantity}
            </dd>
          </div>
        </dl>
      </div>

      <p className="mt-4 text-sm text-slate-600">
        O consumo original será preservado. O estoque será devolvido e o estorno
        ficará registrado no histórico da peça.
      </p>

      <div className="mt-4 space-y-4">
        <FormField label="Quantidade a estornar" error={errors.quantity?.message}>
          <input
            type="number"
            min={1}
            max={Math.max(summary.reversibleQuantity, 1)}
            {...register("quantity", { valueAsNumber: true })}
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
        </FormField>

        <FormField label="Motivo" error={errors.reason?.message}>
          <textarea
            {...register("reason")}
            rows={3}
            className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
        </FormField>
      </div>

      {errorMessage && (
        <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {errorMessage}
        </p>
      )}

      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-10 rounded-md border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting || summary.reversibleQuantity <= 0}
          className="h-10 rounded-md bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700 disabled:bg-slate-300"
        >
          {isSubmitting ? "Estornando..." : "Confirmar estorno"}
        </button>
      </div>
    </form>
  );
}
