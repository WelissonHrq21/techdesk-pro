import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { FormField } from "../../../components/ui/FormField";
import {
  diagnosisSchema,
  type DiagnosisFormValues,
} from "../schemas/serviceOrderActionSchemas";

type DiagnosisFormProps = {
  defaultDiagnosis?: string | null;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onSubmit: (data: DiagnosisFormValues) => void;
};

export function DiagnosisForm({
  defaultDiagnosis,
  isSubmitting,
  errorMessage,
  onCancel,
  onSubmit,
}: DiagnosisFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DiagnosisFormValues>({
    resolver: zodResolver(diagnosisSchema),
    defaultValues: {
      diagnosis: defaultDiagnosis ?? "",
    },
  });

  return (
    <form onSubmit={(event) => void handleSubmit(onSubmit)(event)}>
      <FormField label="Diagnostico tecnico" error={errors.diagnosis?.message}>
        <textarea
          {...register("diagnosis")}
          rows={8}
          className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        />
      </FormField>

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
          disabled={isSubmitting}
          className="h-10 rounded-md bg-sky-600 px-4 text-sm font-semibold text-white hover:bg-sky-700 disabled:bg-slate-300"
        >
          {isSubmitting ? "Salvando..." : "Salvar diagnostico"}
        </button>
      </div>
    </form>
  );
}
