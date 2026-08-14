import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { FormField } from "../../../components/ui/FormField";
import {
  companySettingsSchema,
  type CompanySettingsSchemaData,
} from "../schemas/companySettingsSchema";
import type {
  CompanySettings,
  CompanySettingsFormData,
} from "../types/companySettings";

type CompanySettingsFormProps = {
  settings?: CompanySettings;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onSubmit: (data: CompanySettingsFormData) => void;
};

const inputClass =
  "h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100";

export function CompanySettingsForm({
  settings,
  isSubmitting,
  errorMessage,
  onSubmit,
}: CompanySettingsFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CompanySettingsSchemaData>({
    resolver: zodResolver(companySettingsSchema),
    defaultValues: {
      name: "",
      document: "",
      phone: "",
      email: "",
      zipCode: "",
      address: "",
    },
  });

  useEffect(() => {
    reset({
      name: settings?.name ?? "",
      document: settings?.document ?? "",
      phone: settings?.phone ?? "",
      email: settings?.email ?? "",
      zipCode: settings?.zipCode ?? "",
      address: settings?.address ?? "",
    });
  }, [reset, settings]);

  return (
    <form className="space-y-4" onSubmit={(event) => void handleSubmit(onSubmit)(event)}>
      <FormField label="Nome da assistência *" error={errors.name?.message}>
        <input className={inputClass} {...register("name")} />
      </FormField>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="CNPJ/CPF" error={errors.document?.message}>
          <input className={inputClass} {...register("document")} />
        </FormField>
        <FormField label="Telefone" error={errors.phone?.message}>
          <input className={inputClass} {...register("phone")} />
        </FormField>
      </div>

      <FormField label="E-mail" error={errors.email?.message}>
        <input className={inputClass} type="email" {...register("email")} />
      </FormField>

      <div className="grid gap-4 md:grid-cols-[160px_1fr]">
        <FormField label="CEP" error={errors.zipCode?.message}>
          <input className={inputClass} {...register("zipCode")} />
        </FormField>
        <FormField label="Endereço" error={errors.address?.message}>
          <input className={inputClass} {...register("address")} />
        </FormField>
      </div>

      {errorMessage && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {errorMessage}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="h-10 rounded-md bg-sky-600 px-4 text-sm font-semibold text-white hover:bg-sky-700 disabled:bg-slate-300"
        >
          {isSubmitting ? "Salvando..." : "Salvar configurações"}
        </button>
      </div>
    </form>
  );
}
