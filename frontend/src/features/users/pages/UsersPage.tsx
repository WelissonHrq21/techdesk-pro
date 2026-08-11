import { Edit, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { EmptyState } from "../../../components/ui/EmptyState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { LoadingState } from "../../../components/ui/LoadingState";
import { Modal } from "../../../components/ui/Modal";
import { PageHeader } from "../../../components/ui/PageHeader";
import { useAuth } from "../../../hooks/useAuth";
import { useToast } from "../../../hooks/useToast";
import { getFriendlyErrorMessage } from "../../../utils/errorMessages";
import { roleLabels } from "../../../utils/labels";
import { UserForm } from "../components/UserForm";
import {
  useCreateUser,
  useDeactivateUser,
  useUpdateUser,
  useUsers,
} from "../hooks/useUsers";
import type { User, UserFormData } from "../types/user";

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const usersQuery = useUsers();
  const [modal, setModal] = useState<"create" | "edit" | "deactivate" | null>(
    null
  );
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser(selectedUser?.id ?? "");
  const deactivateUserMutation = useDeactivateUser(selectedUser?.id ?? "");

  function closeModal() {
    setModal(null);
    setSelectedUser(null);
    setFormError(null);
  }

  async function handleCreate(data: UserFormData) {
    setFormError(null);

    try {
      await createUserMutation.mutateAsync(data);
      closeModal();
      showToast("Usuario cadastrado.", "success");
    } catch (error) {
      setFormError(getFriendlyErrorMessage(error));
    }
  }

  async function handleUpdate(data: UserFormData) {
    setFormError(null);

    try {
      await updateUserMutation.mutateAsync(data);
      closeModal();
      showToast("Usuario atualizado.", "success");
    } catch (error) {
      setFormError(getFriendlyErrorMessage(error));
    }
  }

  async function handleDeactivate() {
    setFormError(null);

    try {
      await deactivateUserMutation.mutateAsync();
      closeModal();
      showToast("Usuario desativado.", "success");
    } catch (error) {
      setFormError(getFriendlyErrorMessage(error));
    }
  }

  return (
    <section>
      <PageHeader
        title="Usuarios"
        description="Gestao de acesso e perfis da equipe."
        actions={
          <button
            type="button"
            onClick={() => setModal("create")}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-sky-600 px-4 text-sm font-semibold text-white hover:bg-sky-700"
          >
            <Plus size={17} />
            Novo usuario
          </button>
        }
      />

      <div className="rounded-md border border-slate-200 bg-white shadow-sm">
        {usersQuery.isLoading ? (
          <div className="p-4">
            <LoadingState />
          </div>
        ) : usersQuery.isError || !usersQuery.data ? (
          <div className="p-4">
            <ErrorState
              title="Nao foi possivel carregar usuarios."
              onRetry={() => void usersQuery.refetch()}
              isRetrying={usersQuery.isFetching}
            />
          </div>
        ) : usersQuery.data.length === 0 ? (
          <div className="p-4">
            <EmptyState title="Nenhum usuario encontrado." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Nome</th>
                  <th className="px-4 py-3 font-semibold">Login</th>
                  <th className="px-4 py-3 font-semibold">Perfil</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersQuery.data.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3 font-medium text-slate-950">
                      {user.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{user.login}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {roleLabels[user.role]}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                        {user.active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUser(user);
                            setModal("edit");
                          }}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50"
                          title="Editar"
                          aria-label="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        {currentUser?.id !== user.id && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUser(user);
                              setModal("deactivate");
                            }}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-rose-200 text-rose-700 hover:bg-rose-50"
                            title="Desativar"
                            aria-label="Desativar"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal title="Novo usuario" isOpen={modal === "create"} onClose={closeModal}>
        <UserForm
          mode="create"
          isSubmitting={createUserMutation.isPending}
          errorMessage={formError}
          onCancel={closeModal}
          onSubmit={(data) => void handleCreate(data)}
        />
      </Modal>

      <Modal title="Editar usuario" isOpen={modal === "edit"} onClose={closeModal}>
        <UserForm
          mode="edit"
          user={selectedUser ?? undefined}
          isSubmitting={updateUserMutation.isPending}
          errorMessage={formError}
          onCancel={closeModal}
          onSubmit={(data) => void handleUpdate(data)}
        />
      </Modal>

      <ConfirmDialog
        isOpen={modal === "deactivate"}
        title={`Desativar ${selectedUser?.name ?? "usuario"}?`}
        description="Ele perdera acesso imediatamente. O historico de acoes sera preservado."
        confirmLabel="Desativar"
        isSubmitting={deactivateUserMutation.isPending}
        onCancel={closeModal}
        onConfirm={() => void handleDeactivate()}
      />
      {formError && modal === "deactivate" && (
        <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {formError}
        </p>
      )}
    </section>
  );
}
