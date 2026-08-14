import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { FormField } from "../../../components/ui/FormField";
import {
  customerSchema,
  type CustomerSchemaData,
} from "../schemas/customerSchema";
import type { Customer, CustomerFormData } from "../types/customer";

type CustomerFormProps = {
  mode: "create" | "edit";
  customer?: Customer;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onSubmit: (data: CustomerFormData) => void;
  onCancel: () => void;
};

const inputClass =
  "h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100";

export function CustomerForm({
  mode,
  customer,
  isSubmitting,
  errorMessage,
  onSubmit,
  onCancel,
}: CustomerFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerSchemaData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      zipCode: "",
      address: "",
    },
  });

  useEffect(() => {
    reset({
      name: customer?.name ?? "",
      phone: customer?.phone ?? "",
      email: customer?.email ?? "",
      zipCode: customer?.zipCode ?? "",
      address: customer?.address ?? "",
    });
  }, [customer, reset]);

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <FormField label="Nome *" error={errors.name?.message}>
        <input className={inputClass} {...register("name")} />
      </FormField>

      <FormField label="Telefone *" error={errors.phone?.message}>
        <input className={inputClass} {...register("phone")} />
      </FormField>

      <FormField label="E-mail" error={errors.email?.message}>
        <input className={inputClass} type="email" {...register("email")} />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
        <FormField label="CEP" error={errors.zipCode?.message}>
          <input className={inputClass} {...register("zipCode")} />
        </FormField>
        <FormField label="Endereço" error={errors.address?.message}>
          <input className={inputClass} {...register("address")} />
        </FormField>
      </div>

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
              ? "Cadastrar cliente"
              : "Salvar alterações"}
        </button>
      </div>
    </form>
  );
}
