import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "../../../components/ui/PageHeader";
import { useAuth } from "../../../hooks/useAuth";
import { useToast } from "../../../hooks/useToast";
import { changeOwnPasswordRequest } from "../../../services/authService";
import { getFriendlyErrorMessage } from "../../../utils/errorMessages";
import { roleLabels } from "../../../utils/labels";
import { ChangePasswordForm } from "../components/ChangePasswordForm";
import type { ChangePasswordSchemaData } from "../schemas/changePasswordSchema";

export function ProfilePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const changePasswordMutation = useMutation({
    mutationFn: changeOwnPasswordRequest,
  });

  async function handleChangePassword(data: ChangePasswordSchemaData) {
    setFormError(null);

    try {
      await changePasswordMutation.mutateAsync({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      showToast("Senha alterada com sucesso.", "success");
    } catch (error) {
      setFormError(getFriendlyErrorMessage(error));
    }
  }

  return (
    <section>
      <PageHeader
        title="Minha conta"
        description="Dados do usuário autenticado e segurança da conta."
      />

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Perfil</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Nome</dt>
              <dd className="font-medium text-slate-950">{user?.name}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Login</dt>
              <dd className="font-medium text-slate-950">{user?.login}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Perfil</dt>
              <dd className="font-medium text-slate-950">
                {user ? roleLabels[user.role] : ""}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">
            Alterar senha
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            A troca de senha nao encerra automaticamente a sessao atual neste
            MVP.
          </p>
          <div className="mt-5">
            <ChangePasswordForm
              isSubmitting={changePasswordMutation.isPending}
              errorMessage={formError}
              onSubmit={(data) => void handleChangePassword(data)}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
