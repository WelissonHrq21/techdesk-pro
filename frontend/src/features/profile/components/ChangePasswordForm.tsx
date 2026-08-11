import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { FormField } from "../../../components/ui/FormField";
import {
  changePasswordSchema,
  type ChangePasswordSchemaData,
} from "../schemas/changePasswordSchema";

type ChangePasswordFormProps = {
  isSubmitting: boolean;
  errorMessage?: string | null;
  onSubmit: (data: ChangePasswordSchemaData) => void;
};

const inputClass =
  "h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100";

export function ChangePasswordForm({
  isSubmitting,
  errorMessage,
  onSubmit,
}: ChangePasswordFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordSchemaData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  function handleValidSubmit(data: ChangePasswordSchemaData) {
    onSubmit(data);
    reset();
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => void handleSubmit(handleValidSubmit)(event)}
    >
      <FormField label="Senha atual" error={errors.currentPassword?.message}>
        <input
          className={inputClass}
          type="password"
          autoComplete="current-password"
          {...register("currentPassword")}
        />
      </FormField>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Nova senha" error={errors.newPassword?.message}>
          <input
            className={inputClass}
            type="password"
            autoComplete="new-password"
            {...register("newPassword")}
          />
        </FormField>
        <FormField
          label="Confirmar nova senha"
          error={errors.confirmNewPassword?.message}
        >
          <input
            className={inputClass}
            type="password"
            autoComplete="new-password"
            {...register("confirmNewPassword")}
          />
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
          {isSubmitting ? "Alterando..." : "Alterar senha"}
        </button>
      </div>
    </form>
  );
}
