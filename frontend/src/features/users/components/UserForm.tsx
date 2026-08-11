import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { FormField } from "../../../components/ui/FormField";
import { roleLabels } from "../../../utils/labels";
import { userSchema, type UserSchemaData } from "../schemas/userSchema";
import type { User, UserFormData } from "../types/user";

type UserFormProps = {
  mode: "create" | "edit";
  user?: User;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onSubmit: (data: UserFormData) => void;
};

const inputClass =
  "h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100";

export function UserForm({
  mode,
  user,
  isSubmitting,
  errorMessage,
  onCancel,
  onSubmit,
}: UserFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserSchemaData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      login: "",
      role: "TECHNICIAN",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    reset({
      name: user?.name ?? "",
      login: user?.login ?? "",
      role: user?.role ?? "TECHNICIAN",
      password: "",
      confirmPassword: "",
    });
  }, [reset, user]);

  function handleValidSubmit(data: UserSchemaData) {
    onSubmit({
      name: data.name,
      login: data.login,
      role: data.role,
      password: data.password || undefined,
    });
  }

  return (
    <form className="space-y-4" onSubmit={(event) => void handleSubmit(handleValidSubmit)(event)}>
      <FormField label="Nome *" error={errors.name?.message}>
        <input className={inputClass} {...register("name")} />
      </FormField>

      <FormField label="Login *" error={errors.login?.message}>
        <input className={inputClass} {...register("login")} />
      </FormField>

      <FormField label="Perfil *" error={errors.role?.message}>
        <select className={inputClass} {...register("role")}>
          <option value="ADMIN">{roleLabels.ADMIN}</option>
          <option value="RECEPTION">{roleLabels.RECEPTION}</option>
          <option value="TECHNICIAN">{roleLabels.TECHNICIAN}</option>
        </select>
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label={mode === "create" ? "Senha *" : "Nova senha"}
          error={errors.password?.message}
        >
          <input
            className={inputClass}
            type="password"
            autoComplete="new-password"
            {...register("password", {
              required: mode === "create" ? "Informe a senha." : false,
            })}
          />
        </FormField>
        <FormField label="Confirmar senha" error={errors.confirmPassword?.message}>
          <input
            className={inputClass}
            type="password"
            autoComplete="new-password"
            {...register("confirmPassword", {
              required: mode === "create" ? "Confirme a senha." : false,
            })}
          />
        </FormField>
      </div>

      {mode === "edit" && (
        <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Deixe a senha em branco para manter a senha atual.
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
              ? "Cadastrar usuario"
              : "Salvar alteracoes"}
        </button>
      </div>
    </form>
  );
}
