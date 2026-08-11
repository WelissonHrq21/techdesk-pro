import { Edit, Plus, Power, Wrench } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { EmptyState } from "../../../components/ui/EmptyState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { LoadingState } from "../../../components/ui/LoadingState";
import { Modal } from "../../../components/ui/Modal";
import { PageHeader } from "../../../components/ui/PageHeader";
import { useAuth } from "../../../hooks/useAuth";
import { useToast } from "../../../hooks/useToast";
import { getFriendlyErrorMessage } from "../../../utils/errorMessages";
import { EquipmentForm } from "../../equipments/components/EquipmentForm";
import {
  useCreateEquipment,
  useDeactivateEquipment,
  useEquipments,
  useUpdateEquipment,
} from "../../equipments/hooks/useEquipments";
import type {
  Equipment,
  EquipmentFormData,
} from "../../equipments/types/equipment";
import { CustomerForm } from "../components/CustomerForm";
import {
  useCustomer,
  useDeactivateCustomer,
  useUpdateCustomer,
} from "../hooks/useCustomers";
import type { CustomerFormData } from "../types/customer";

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const customerQuery = useCustomer(id);
  const equipmentsQuery = useEquipments(1, 100, "", id);
  const updateCustomerMutation = useUpdateCustomer(id ?? "");
  const deactivateCustomerMutation = useDeactivateCustomer(id ?? "");
  const createEquipmentMutation = useCreateEquipment();
  const [isCustomerEditOpen, setIsCustomerEditOpen] = useState(false);
  const [isDeactivateCustomerOpen, setIsDeactivateCustomerOpen] =
    useState(false);
  const [isEquipmentCreateOpen, setIsEquipmentCreateOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(
    null
  );
  const [deactivatingEquipment, setDeactivatingEquipment] =
    useState<Equipment | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const canEdit = user?.role === "ADMIN" || user?.role === "RECEPTION";
  const canDeactivate = user?.role === "ADMIN";

  async function handleUpdateCustomer(data: CustomerFormData) {
    setFormError(null);

    try {
      await updateCustomerMutation.mutateAsync(data);
      setIsCustomerEditOpen(false);
      showToast("Cliente atualizado com sucesso.", "success");
    } catch (error) {
      setFormError(getFriendlyErrorMessage(error));
    }
  }

  async function handleDeactivateCustomer() {
    if (!id) {
      return;
    }

    await deactivateCustomerMutation.mutateAsync();
    setIsDeactivateCustomerOpen(false);
    showToast("Cliente desativado com sucesso.", "success");
    navigate("/customers");
  }

  async function handleCreateEquipment(data: EquipmentFormData) {
    setFormError(null);

    try {
      await createEquipmentMutation.mutateAsync(data);
      setIsEquipmentCreateOpen(false);
      showToast("Equipamento cadastrado com sucesso.", "success");
    } catch (error) {
      setFormError(getFriendlyErrorMessage(error));
    }
  }

  if (customerQuery.isLoading) {
    return <LoadingState rows={4} />;
  }

  if (customerQuery.isError || !customerQuery.data || !id) {
    return (
      <ErrorState
        title="Nao foi possivel carregar o cliente."
        onRetry={() => void customerQuery.refetch()}
        isRetrying={customerQuery.isFetching}
      />
    );
  }

  const customer = customerQuery.data;

  return (
    <section>
      <PageHeader
        title={customer.name}
        description={customer.active ? "Cliente ativo" : "Cliente desativado"}
        actions={
          <>
            {canEdit && (
              <button
                type="button"
                onClick={() => setIsCustomerEditOpen(true)}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Edit size={17} />
                Editar
              </button>
            )}
            {canDeactivate && (
              <button
                type="button"
                onClick={() => setIsDeactivateCustomerOpen(true)}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-rose-200 px-4 text-sm font-medium text-rose-700 hover:bg-rose-50"
              >
                <Power size={17} />
                Desativar cliente
              </button>
            )}
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-950">Contato</h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Telefone</dt>
              <dd className="font-medium text-slate-950">{customer.phone}</dd>
            </div>
            <div>
              <dt className="text-slate-500">E-mail</dt>
              <dd className="font-medium text-slate-950">
                {customer.email ?? "-"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">CEP</dt>
              <dd className="font-medium text-slate-950">
                {customer.zipCode ?? "-"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Endereco</dt>
              <dd className="font-medium text-slate-950">
                {customer.address ?? "-"}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h3 className="text-base font-semibold text-slate-950">
              Equipamentos do cliente
            </h3>
            {canEdit && (
              <button
                type="button"
                onClick={() => setIsEquipmentCreateOpen(true)}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-sky-600 px-3 text-sm font-semibold text-white hover:bg-sky-700"
              >
                <Plus size={16} />
                Novo equipamento
              </button>
            )}
          </div>

          <div className="p-5">
            {equipmentsQuery.isLoading ? (
              <LoadingState rows={3} />
            ) : equipmentsQuery.isError || !equipmentsQuery.data ? (
              <ErrorState
                title="Nao foi possivel carregar equipamentos."
                onRetry={() => void equipmentsQuery.refetch()}
                isRetrying={equipmentsQuery.isFetching}
              />
            ) : equipmentsQuery.data.data.length === 0 ? (
              <EmptyState title="Nenhum equipamento cadastrado." />
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {equipmentsQuery.data.data.map((equipment) => (
                  <EquipmentCard
                    key={equipment.id}
                    equipment={equipment}
                    canEdit={canEdit}
                    canDeactivate={canDeactivate}
                    onEdit={() => setEditingEquipment(equipment)}
                    onDeactivate={() => setDeactivatingEquipment(equipment)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        title="Editar cliente"
        isOpen={isCustomerEditOpen}
        onClose={() => setIsCustomerEditOpen(false)}
      >
        <CustomerForm
          mode="edit"
          customer={customer}
          isSubmitting={updateCustomerMutation.isPending}
          errorMessage={formError}
          onCancel={() => setIsCustomerEditOpen(false)}
          onSubmit={handleUpdateCustomer}
        />
      </Modal>

      <Modal
        title="Novo equipamento"
        isOpen={isEquipmentCreateOpen}
        onClose={() => setIsEquipmentCreateOpen(false)}
      >
        <EquipmentForm
          mode="create"
          customerId={customer.id}
          isSubmitting={createEquipmentMutation.isPending}
          errorMessage={formError}
          onCancel={() => setIsEquipmentCreateOpen(false)}
          onSubmit={handleCreateEquipment}
        />
      </Modal>

      <EditEquipmentModal
        equipment={editingEquipment}
        customerId={customer.id}
        onClose={() => setEditingEquipment(null)}
      />

      <DeactivateEquipmentDialog
        equipment={deactivatingEquipment}
        onClose={() => setDeactivatingEquipment(null)}
      />

      <ConfirmDialog
        isOpen={isDeactivateCustomerOpen}
        title={`Desativar ${customer.name}?`}
        description="O historico de atendimentos sera preservado."
        confirmLabel="Desativar"
        isSubmitting={deactivateCustomerMutation.isPending}
        onCancel={() => setIsDeactivateCustomerOpen(false)}
        onConfirm={() => void handleDeactivateCustomer()}
      />
    </section>
  );
}

type EquipmentCardProps = {
  equipment: Equipment;
  canEdit: boolean;
  canDeactivate: boolean;
  onEdit: () => void;
  onDeactivate: () => void;
};

function EquipmentCard({
  equipment,
  canEdit,
  canDeactivate,
  onEdit,
  onDeactivate,
}: EquipmentCardProps) {
  return (
    <div className="rounded-md border border-slate-200 p-4">
      <div>
        <p className="text-sm text-slate-500">{equipment.type}</p>
        <h4 className="mt-1 text-base font-semibold text-slate-950">
          {equipment.brand} {equipment.model}
        </h4>
        <p className="mt-1 text-sm text-slate-500">
          Serial: {equipment.serialNumber ?? "Nao informado"}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          to={`/service-orders/new?customerId=${equipment.customer?.id ?? equipment.customerId ?? ""}&equipmentId=${equipment.id}`}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-medium text-white hover:bg-slate-800"
        >
          <Wrench size={16} />
          Abrir OS
        </Link>
        {canEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="h-9 rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Editar
          </button>
        )}
        {canDeactivate && (
          <button
            type="button"
            onClick={onDeactivate}
            className="h-9 rounded-md border border-rose-200 px-3 text-sm font-medium text-rose-700 hover:bg-rose-50"
          >
            Desativar
          </button>
        )}
      </div>
    </div>
  );
}

type EditEquipmentModalProps = {
  equipment: Equipment | null;
  customerId: string;
  onClose: () => void;
};

function EditEquipmentModal({
  equipment,
  customerId,
  onClose,
}: EditEquipmentModalProps) {
  const mutation = useUpdateEquipment(equipment?.id ?? "");
  const { showToast } = useToast();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(data: EquipmentFormData) {
    if (!equipment) {
      return;
    }

    setErrorMessage(null);

    try {
      await mutation.mutateAsync(data);
      showToast("Equipamento atualizado com sucesso.", "success");
      onClose();
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error));
    }
  }

  return (
    <Modal title="Editar equipamento" isOpen={Boolean(equipment)} onClose={onClose}>
      <EquipmentForm
        mode="edit"
        customerId={customerId}
        equipment={equipment ?? undefined}
        isSubmitting={mutation.isPending}
        errorMessage={errorMessage}
        onCancel={onClose}
        onSubmit={handleSubmit}
      />
    </Modal>
  );
}

type DeactivateEquipmentDialogProps = {
  equipment: Equipment | null;
  onClose: () => void;
};

function DeactivateEquipmentDialog({
  equipment,
  onClose,
}: DeactivateEquipmentDialogProps) {
  const mutation = useDeactivateEquipment(equipment?.id ?? "");
  const { showToast } = useToast();

  async function handleConfirm() {
    if (!equipment) {
      return;
    }

    await mutation.mutateAsync();
    showToast("Equipamento desativado com sucesso.", "success");
    onClose();
  }

  return (
    <ConfirmDialog
      isOpen={Boolean(equipment)}
      title={`Desativar ${equipment?.brand ?? ""} ${equipment?.model ?? ""}?`}
      description="O historico desse equipamento sera preservado."
      confirmLabel="Desativar"
      isSubmitting={mutation.isPending}
      onCancel={onClose}
      onConfirm={() => void handleConfirm()}
    />
  );
}
