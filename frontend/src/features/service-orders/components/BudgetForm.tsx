import { zodResolver } from "@hookform/resolvers/zod";
import { Package, Plus, Trash2, Wrench } from "lucide-react";
import { useState } from "react";
import {
  useFieldArray,
  useForm,
  useWatch,
  type FieldErrors,
} from "react-hook-form";
import { FormField } from "../../../components/ui/FormField";
import { formatCurrency } from "../../../utils/formatters";
import type { Part } from "../../parts/types/part";
import {
  budgetFormSchema,
  budgetRevisionFormSchema,
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
  onSubmit: (data: BudgetRevisionFormData) => void;
};

type BudgetItemFieldError = {
  partId?: { message?: string };
  description?: { message?: string };
  quantity?: { message?: string };
  unitPrice?: { message?: string };
};

function createEmptyPartItem(): BudgetItemFormData {
  return {
    type: "PART",
    partId: "",
    quantity: 1,
    unitPrice: 0,
  };
}

function createEmptyServiceItem(): BudgetItemFormData {
  return {
    type: "SERVICE",
    description: "",
    quantity: 1,
    unitPrice: 0,
  };
}

function getItemsError(errors: FieldErrors<BudgetRevisionFormValues>) {
  const itemsError = errors.items as
    | { message?: string; root?: { message?: string } }
    | undefined;

  return itemsError?.message ?? itemsError?.root?.message;
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
    handleSubmit,
    formState: { errors },
  } = useForm<BudgetRevisionFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      items: defaultItems?.length ? defaultItems : [createEmptyPartItem()],
      observation: "",
    },
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });
  const items = useWatch({ control, name: "items" }) ?? [];
  const total = items.reduce((sum, item) => {
    return sum + Number(item.quantity || 0) * Number(item.unitPrice || 0);
  }, 0);

  function handleValidSubmit(data: BudgetRevisionFormValues) {
    setRevisionError(null);

    if (mode === "revision") {
      for (const item of data.items) {
        if (item.type !== "PART") {
          continue;
        }

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

  const itemsError = getItemsError(errors);

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(handleValidSubmit)(event)}
    >
      <div className="space-y-4">
        {fields.length === 0 && (
          <div className="rounded-md border border-dashed border-slate-300 px-4 py-6 text-center">
            <p className="text-sm font-medium text-slate-700">
              Nenhum item no orçamento.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Adicione uma peça ou um serviço para continuar.
            </p>
          </div>
        )}

        {fields.map((field, index) => {
          const item = items[index] ?? field;
          const isPart = item.type === "PART";
          const partId = isPart ? item.partId : "";
          const consumed = isPart ? consumedByPartId[partId] ?? 0 : 0;
          const selectedPart = isPart ? selectedParts[partId] : undefined;
          const subtotal =
            Number(item.quantity || 0) * Number(item.unitPrice || 0);
          const itemErrors = errors.items?.[
            index
          ] as BudgetItemFieldError | undefined;

          return (
            <div
              key={field.id}
              className="rounded-md border border-slate-200 bg-white p-4"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${
                      isPart
                        ? "bg-sky-50 text-sky-700"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                    aria-hidden="true"
                  >
                    {isPart ? <Package size={16} /> : <Wrench size={16} />}
                  </span>
                  <span className="text-sm font-semibold text-slate-950">
                    {isPart ? "Peça" : "Serviço"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => remove(index)}
                  disabled={isSubmitting || consumed > 0}
                  className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                  title={
                    consumed > 0
                      ? "Peça já consumida não pode ser removida"
                      : `Remover ${isPart ? "peça" : "serviço"}`
                  }
                  aria-label={`Remover ${isPart ? "peça" : "serviço"} ${index + 1}`}
                >
                  <Trash2 size={17} />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(260px,1.4fr)_110px_150px_150px]">
                <div className="md:col-span-2 xl:col-span-1">
                  {isPart ? (
                    <FormField
                      label="Peça"
                      error={itemErrors?.partId?.message}
                    >
                      <PartSearchField
                        selectedPart={selectedPart}
                        disabled={isSubmitting}
                        onSelect={(part) => {
                          if (!part.active) {
                            return;
                          }

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
                  ) : (
                    <FormField
                      label="Descrição do serviço"
                      error={itemErrors?.description?.message}
                    >
                      <input
                        type="text"
                        maxLength={200}
                        disabled={isSubmitting}
                        {...register(`items.${index}.description`)}
                        placeholder="Ex.: Formatação e instalação do sistema"
                        className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50"
                      />
                    </FormField>
                  )}
                </div>

                <FormField
                  label="Qtd."
                  error={itemErrors?.quantity?.message}
                >
                  <input
                    type="number"
                    min={Math.max(1, consumed)}
                    disabled={isSubmitting}
                    {...register(`items.${index}.quantity`, {
                      valueAsNumber: true,
                    })}
                    className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50"
                  />
                  {consumed > 0 && (
                    <span className="mt-1 block text-xs text-slate-500">
                      Consumido: {consumed}
                    </span>
                  )}
                </FormField>

                <FormField
                  label="Valor unit."
                  error={itemErrors?.unitPrice?.message}
                >
                  <input
                    type="number"
                    min={0.01}
                    step="0.01"
                    disabled={isSubmitting}
                    {...register(`items.${index}.unitPrice`, {
                      valueAsNumber: true,
                    })}
                    className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50"
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
              </div>
            </div>
          );
        })}
      </div>

      {itemsError && (
        <p className="mt-3 text-sm text-rose-600">{itemsError}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => append(createEmptyPartItem())}
          disabled={isSubmitting}
          className="inline-flex h-10 items-center gap-2 rounded-md border border-sky-200 px-4 text-sm font-medium text-sky-700 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={17} />
          Adicionar peça
        </button>
        <button
          type="button"
          onClick={() => append(createEmptyServiceItem())}
          disabled={isSubmitting}
          className="inline-flex h-10 items-center gap-2 rounded-md border border-emerald-200 px-4 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={17} />
          Adicionar serviço
        </button>
      </div>

      {mode === "revision" && (
        <div className="mt-4">
          <FormField
            label="Observação da revisão"
            error={errors.observation?.message}
          >
            <textarea
              {...register("observation")}
              rows={3}
              disabled={isSubmitting}
              className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50"
            />
          </FormField>
        </div>
      )}

      <div className="mt-5 flex items-center justify-between rounded-md bg-slate-50 px-4 py-3">
        <span className="text-sm font-medium text-slate-600">Total previsto</span>
        <strong className="text-lg text-slate-950">
          {formatCurrency(total)}
        </strong>
      </div>

      {(errorMessage || revisionError) && (
        <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {revisionError ?? errorMessage}
        </p>
      )}

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="h-10 rounded-md border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="h-10 rounded-md bg-sky-600 px-4 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isSubmitting
            ? "Salvando..."
            : mode === "revision"
              ? "Criar revisão"
              : "Criar orçamento"}
        </button>
      </div>
    </form>
  );
}
