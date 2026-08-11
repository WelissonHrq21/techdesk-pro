import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { FormField } from "../../../components/ui/FormField";
import {
  consumePartSchema,
  type ConsumePartFormValues,
} from "../schemas/serviceOrderActionSchemas";
import type { BudgetSummary } from "../types/serviceOrder";

type ConsumePartFormProps = {
  item: BudgetSummary["budgetItems"][number];
  consumed: number;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onSubmit: (data: ConsumePartFormValues) => void;
};

export function ConsumePartForm({
  item,
  consumed,
  isSubmitting,
  errorMessage,
  onCancel,
  onSubmit,
}: ConsumePartFormProps) {
  const remaining = item.quantity - consumed;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ConsumePartFormValues>({
    resolver: zodResolver(consumePartSchema),
    defaultValues: {
      quantity: Math.min(1, Math.max(remaining, 1)),
      observation: "",
    },
  });

  return (
    <form onSubmit={(event) => void handleSubmit(onSubmit)(event)}>
      <div className="rounded-md bg-slate-50 p-4">
        <h4 className="font-semibold text-slate-950">{item.part.name}</h4>
        <p className="mt-1 text-sm text-slate-500">
          Aprovado: {item.quantity} - Ja consumido: {consumed} - Restante:{" "}
          {Math.max(remaining, 0)}
        </p>
        {typeof item.part.stock === "number" && (
          <p className="mt-1 text-sm text-slate-500">
            Estoque atual: {item.part.stock}
          </p>
        )}
      </div>

      <div className="mt-4 space-y-4">
        <FormField label="Quantidade" error={errors.quantity?.message}>
          <input
            type="number"
            min={1}
            max={Math.max(remaining, 1)}
            {...register("quantity", { valueAsNumber: true })}
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
        </FormField>

        <FormField label="Observacao" error={errors.observation?.message}>
          <textarea
            {...register("observation")}
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
          disabled={isSubmitting || remaining <= 0}
          className="h-10 rounded-md bg-sky-600 px-4 text-sm font-semibold text-white hover:bg-sky-700 disabled:bg-slate-300"
        >
          {isSubmitting ? "Consumindo..." : "Confirmar consumo"}
        </button>
      </div>
    </form>
  );
}
