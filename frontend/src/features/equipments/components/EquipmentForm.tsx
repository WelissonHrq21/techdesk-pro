import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { FormField } from "../../../components/ui/FormField";
import {
  equipmentSchema,
  type EquipmentSchemaData,
} from "../schemas/equipmentSchema";
import type { Equipment, EquipmentFormData } from "../types/equipment";

type EquipmentFormProps = {
  mode: "create" | "edit";
  customerId: string;
  equipment?: Equipment;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onSubmit: (data: EquipmentFormData) => void;
  onCancel: () => void;
};

const inputClass =
  "h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100";

export function EquipmentForm({
  mode,
  customerId,
  equipment,
  isSubmitting,
  errorMessage,
  onSubmit,
  onCancel,
}: EquipmentFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EquipmentSchemaData>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: {
      type: "",
      brand: "",
      model: "",
      serialNumber: "",
      customerId,
    },
  });

  useEffect(() => {
    reset({
      type: equipment?.type ?? "",
      brand: equipment?.brand ?? "",
      model: equipment?.model ?? "",
      serialNumber: equipment?.serialNumber ?? "",
      customerId,
    });
  }, [customerId, equipment, reset]);

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <input type="hidden" {...register("customerId")} />

      <FormField label="Tipo *" error={errors.type?.message}>
        <input className={inputClass} placeholder="Notebook" {...register("type")} />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Marca *" error={errors.brand?.message}>
          <input className={inputClass} placeholder="Acer" {...register("brand")} />
        </FormField>
        <FormField label="Modelo *" error={errors.model?.message}>
          <input className={inputClass} placeholder="Nitro 5" {...register("model")} />
        </FormField>
      </div>

      <FormField label="Numero de serie" error={errors.serialNumber?.message}>
        <input
          className={inputClass}
          placeholder="Opcional - deixe em branco se estiver ilegivel"
          {...register("serialNumber")}
        />
      </FormField>

      {errorMessage && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {errorMessage}
        </div>
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
              ? "Cadastrar equipamento"
              : "Salvar alteracoes"}
        </button>
      </div>
    </form>
  );
}
