import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { FormField } from "../../../components/ui/FormField";
import { formatCurrency } from "../../../utils/formatters";
import type { Part } from "../../parts/types/part";
import {
  budgetFormSchema,
  budgetRevisionFormSchema,
  type BudgetFormValues,
  type BudgetRevisionFormValues,
} from "../schemas/serviceOrderActionSchemas";
import type {
  BudgetItemFormData,
  BudgetRevisionFormData,
} from "../types/serviceOrder";
import { PartSearchField } from "./PartSearchField";

type SelectedPart = Pick<
  Part,
  "id" | "name" | "brand" | "currentPrice" | "stock"
>;

type BudgetFormProps = {
  mode: "create" | "revision";
  defaultItems?: BudgetItemFormData[];
  initialParts?: Record<string, SelectedPart>;
  consumedByPartId?: Record<string, number>;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onSubmit: (data: BudgetFormValues | BudgetRevisionFormData) => void;
};

function createEmptyItem(): BudgetItemFormData {
  return {
    partId: "",
    quantity: 1,
    unitPrice: 0,
  };
}

export function BudgetForm({
  mode,
  defaultItems,
  initialParts = {},
  consumedByPartId = {},
  isSubmitting,
  errorMessage,
  onCancel,
  onSubmit,
}: BudgetFormProps) {
  const [selectedParts, setSelectedParts] =
    useState<Record<string, SelectedPart>>(initialParts);
  const [revisionError, setRevisionError] = useState<string | null>(null);
  const schema = mode === "revision" ? budgetRevisionFormSchema : budgetFormSchema;
  const {
    control,
    register,
    setValue,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<BudgetRevisionFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      items: defaultItems?.length ? defaultItems : [createEmptyItem()],
      observation: "",
    },
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });
  const items = watch("items");
  const total = useMemo(() => {
    return items.reduce((sum, item) => {
      return sum + Number(item.quantity || 0) * Number(item.unitPrice || 0);
    }, 0);
  }, [items]);

  function handleValidSubmit(data: BudgetRevisionFormValues) {
    setRevisionError(null);

    if (mode === "revision") {
      for (const item of data.items) {
        const consumed = consumedByPartId[item.partId] ?? 0;

        if (item.quantity < consumed) {
          setRevisionError(
            "A revisão não pode deixar uma peça abaixo da quantidade já consumida."
          );
          return;
        }
      }
    }

    onSubmit(data);
  }

  return (
    <form onSubmit={(event) => void handleSubmit(handleValidSubmit)(event)}>
      <div className="space-y-4">
        {fields.map((field, index) => {
          const item = items[index];
          const consumed = consumedByPartId[item?.partId] ?? 0;
          const selectedPart = selectedParts[item?.partId];
          const subtotal =
            Number(item?.quantity || 0) * Number(item?.unitPrice || 0);

          return (
            <div
              key={field.id}
              className="rounded-md border border-slate-200 p-4"
            >
              <div className="grid gap-4 lg:grid-cols-[1.4fr_110px_140px_120px_40px]">
                <FormField
                  label="Peça"
                  error={errors.items?.[index]?.partId?.message}
                >
                  <PartSearchField
                    selectedPart={selectedPart}
                    onSelect={(part) => {
                      setSelectedParts((current) => ({
                        ...current,
                        [part.id]: part,
                      }));
                      setValue(`items.${index}.partId`, part.id, {
                        shouldValidate: true,
                      });
                      setValue(
                        `items.${index}.unitPrice`,
                        Number(part.currentPrice),
                        { shouldValidate: true }
                      );
                    }}
                  />
                </FormField>

                <FormField
                  label="Qtd."
                  error={errors.items?.[index]?.quantity?.message}
                >
                  <input
                    type="number"
                    min={Math.max(1, consumed)}
                    {...register(`items.${index}.quantity`, {
                      valueAsNumber: true,
                    })}
                    className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  />
                  {consumed > 0 && (
                    <span className="mt-1 block text-xs text-slate-500">
                      Consumido: {consumed}
                    </span>
                  )}
                </FormField>

                <FormField
                  label="Valor unit."
                  error={errors.items?.[index]?.unitPrice?.message}
                >
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    {...register(`items.${index}.unitPrice`, {
                      valueAsNumber: true,
                    })}
                    className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  />
                </FormField>

                <div>
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Subtotal
                  </span>
                  <div className="flex h-10 items-center rounded-md bg-slate-50 px-3 text-sm font-semibold text-slate-950">
                    {formatCurrency(subtotal)}
                  </div>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1 || consumed > 0}
                    className="flex h-10 w-10 items-center justify-center rounded-md text-slate-500 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                    title={
                      consumed > 0
                        ? "Peça já consumida não pode ser removida"
                        : "Remover item"
                    }
                    aria-label="Remover item"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {errors.items?.root?.message && (
        <p className="mt-3 text-sm text-rose-600">{errors.items.root.message}</p>
      )}

      <button
        type="button"
        onClick={() => append(createEmptyItem())}
        className="mt-4 inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <Plus size={17} />
        Adicionar item
      </button>

      {mode === "revision" && (
        <div className="mt-4">
          <FormField label="Observação da revisão" error={errors.observation?.message}>
            <textarea
              {...register("observation")}
              rows={3}
              className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
          </FormField>
        </div>
      )}

      <div className="mt-5 flex items-center justify-between rounded-md bg-slate-50 px-4 py-3">
        <span className="text-sm font-medium text-slate-600">Total preview</span>
        <strong className="text-lg text-slate-950">
          {formatCurrency(total)}
        </strong>
      </div>

      {(errorMessage || revisionError) && (
        <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {revisionError ?? errorMessage}
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
          disabled={isSubmitting}
          className="h-10 rounded-md bg-sky-600 px-4 text-sm font-semibold text-white hover:bg-sky-700 disabled:bg-slate-300"
        >
          {isSubmitting
            ? "Salvando..."
            : mode === "revision"
              ? "Criar revisao"
              : "Criar orçamento"}
        </button>
      </div>
    </form>
  );
}
