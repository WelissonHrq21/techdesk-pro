import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { FormField } from "../../../components/ui/FormField";
import { partSchema, type PartSchemaData } from "../schemas/partSchemas";
import type { Part, PartFormData } from "../types/part";

type PartFormProps = {
  mode: "create" | "edit";
  part?: Part;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onSubmit: (data: PartFormData) => void;
};

const inputClass =
  "h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100";

export function PartForm({
  mode,
  part,
  isSubmitting,
  errorMessage,
  onCancel,
  onSubmit,
}: PartFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PartSchemaData>({
    resolver: zodResolver(partSchema),
    defaultValues: {
      name: "",
      brand: "",
      currentPrice: 0,
      supplier: "",
    },
  });

  useEffect(() => {
    reset({
      name: part?.name ?? "",
      brand: part?.brand ?? "",
      currentPrice: part ? Number(part.currentPrice) : 0,
      supplier: part?.supplier ?? "",
    });
  }, [part, reset]);

  return (
    <form className="space-y-4" onSubmit={(event) => void handleSubmit(onSubmit)(event)}>
      <FormField label="Nome *" error={errors.name?.message}>
        <input className={inputClass} {...register("name")} />
      </FormField>

      <FormField label="Marca *" error={errors.brand?.message}>
        <input className={inputClass} {...register("brand")} />
      </FormField>

      <FormField label="Preço atual *" error={errors.currentPrice?.message}>
        <input
          className={inputClass}
          type="number"
          min={0}
          step="0.01"
          {...register("currentPrice", { valueAsNumber: true })}
        />
      </FormField>

      <FormField label="Fornecedor" error={errors.supplier?.message}>
        <input className={inputClass} {...register("supplier")} />
      </FormField>

      {mode === "create" && (
        <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
          A peça nasce com estoque zero. Registre uma entrada depois do cadastro
          para informar o saldo inicial.
        </p>
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
          {isSubmitting
            ? "Salvando..."
            : mode === "create"
              ? "Cadastrar peça"
              : "Salvar alterações"}
        </button>
      </div>
    </form>
  );
}
