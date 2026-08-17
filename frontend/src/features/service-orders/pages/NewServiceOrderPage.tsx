import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FormField } from "../../../components/ui/FormField";
import { LoadingState } from "../../../components/ui/LoadingState";
import { Modal } from "../../../components/ui/Modal";
import { PageHeader } from "../../../components/ui/PageHeader";
import { SearchInput } from "../../../components/ui/SearchInput";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { useToast } from "../../../hooks/useToast";
import { getFriendlyErrorMessage } from "../../../utils/errorMessages";
import { formatCustomerDocument } from "../../../utils/customerDocument";
import { useCustomer, useCustomers } from "../../customers/hooks/useCustomers";
import { EquipmentForm } from "../../equipments/components/EquipmentForm";
import {
  useCreateEquipment,
  useEquipments,
} from "../../equipments/hooks/useEquipments";
import type { EquipmentFormData } from "../../equipments/types/equipment";
import {
  serviceOrderSchema,
  type ServiceOrderSchemaData,
} from "../schemas/serviceOrderSchema";
import { useCreateServiceOrder } from "../hooks/useServiceOrders";

const inputClass =
  "h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100";
const textareaClass =
  "min-h-28 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100";

export function NewServiceOrderPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const initialCustomerId = searchParams.get("customerId") ?? "";
  const initialEquipmentId = searchParams.get("equipmentId") ?? "";
  const invalidCustomerToastRef = useRef("");
  const [customerSearch, setCustomerSearch] = useState("");
  const debouncedCustomerSearch = useDebouncedValue(customerSearch);
  const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const customersQuery = useCustomers(1, 10, debouncedCustomerSearch);
  const selectedCustomerQuery = useCustomer(initialCustomerId || undefined);
  const createEquipmentMutation = useCreateEquipment();
  const createServiceOrderMutation = useCreateServiceOrder();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<ServiceOrderSchemaData>({
    resolver: zodResolver(serviceOrderSchema),
    defaultValues: {
      customerId: initialCustomerId,
      equipmentId: initialEquipmentId,
      reportedIssue: "",
      password: "",
      accessories: [],
    },
  });

  const selectedCustomerId = watch("customerId");
  const equipmentsQuery = useEquipments(1, 100, "", selectedCustomerId);
  const { fields, append, remove } = useFieldArray({
    control,
    name: "accessories",
  });

  useEffect(() => {
    if (initialCustomerId) {
      setValue("customerId", initialCustomerId);
    }
    if (initialEquipmentId) {
      setValue("equipmentId", initialEquipmentId);
    }
  }, [initialCustomerId, initialEquipmentId, setValue]);

  useEffect(() => {
    if (
      initialCustomerId &&
      selectedCustomerQuery.isError &&
      invalidCustomerToastRef.current !== initialCustomerId
    ) {
      invalidCustomerToastRef.current = initialCustomerId;
      setValue("customerId", "", { shouldValidate: true });
      setValue("equipmentId", "");
      showToast("Cliente informado não foi encontrado.", "error");
    }
  }, [
    initialCustomerId,
    selectedCustomerQuery.isError,
    setValue,
    showToast,
  ]);

  function handleSelectCustomer(customerId: string) {
    setValue("customerId", customerId, { shouldValidate: true });
    setValue("equipmentId", "");
  }

  async function handleCreateEquipment(data: EquipmentFormData) {
    setFormError(null);

    try {
      const equipment = await createEquipmentMutation.mutateAsync(data);
      setIsEquipmentModalOpen(false);
      setValue("equipmentId", equipment.id, { shouldValidate: true });
      showToast("Equipamento cadastrado com sucesso.", "success");
    } catch (error) {
      setFormError(getFriendlyErrorMessage(error));
    }
  }

  async function onSubmit(data: ServiceOrderSchemaData) {
    setFormError(null);

    try {
      const serviceOrder = await createServiceOrderMutation.mutateAsync(data);
      showToast(`OS #${serviceOrder.number} criada com sucesso.`, "success");
      navigate(`/service-orders/${serviceOrder.id}`, {
        state: { message: `OS #${serviceOrder.number} criada com sucesso.` },
      });
    } catch (error) {
      setFormError(getFriendlyErrorMessage(error));
    }
  }

  const selectedCustomer =
    selectedCustomerQuery.data ??
    customersQuery.data?.data.find((customer) => customer.id === selectedCustomerId);

  return (
    <section>
      <PageHeader
        title="Nova OS"
        description="Abra uma ordem de serviço para atendimento no balcão."
      />

      <form
        className="grid gap-6 xl:grid-cols-[1fr_360px]"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="space-y-6">
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-950">
              Cliente e equipamento
            </h3>

            <div className="mt-4 space-y-4">
              <input type="hidden" {...register("customerId")} />
              <input type="hidden" {...register("equipmentId")} />

              <div>
                <SearchInput
                  value={customerSearch}
                  onChange={setCustomerSearch}
                  placeholder="Buscar cliente por nome, telefone, e-mail ou CPF/CNPJ..."
                />
                {errors.customerId && (
                  <p className="mt-1 text-sm text-rose-600">
                    {errors.customerId.message}
                  </p>
                )}
              </div>

              {selectedCustomer && (
                <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
                  Cliente selecionado:{" "}
                  <strong>{selectedCustomer.name}</strong> -{" "}
                  {selectedCustomer.phone}
                  {"document" in selectedCustomer &&
                    selectedCustomer.document && (
                      <> - {formatCustomerDocument(selectedCustomer.document)}</>
                    )}
                </div>
              )}

              {customerSearch && customersQuery.data && (
                <div className="max-h-56 overflow-y-auto rounded-md border border-slate-200">
                  {customersQuery.data.data.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => handleSelectCustomer(customer.id)}
                      className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-50"
                    >
                      <span className="font-medium text-slate-950">
                        {customer.name}
                      </span>
                      <span className="ml-2 text-slate-500">
                        {customer.phone}
                      </span>
                      {"document" in customer && customer.document && (
                        <span className="ml-2 text-slate-500">
                          {formatCustomerDocument(customer.document)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {selectedCustomerId && (
                <FormField
                  label="Equipamento *"
                  error={errors.equipmentId?.message}
                >
                  {equipmentsQuery.isLoading ? (
                    <LoadingState rows={2} />
                  ) : (
                    <div className="space-y-3">
                      <select className={inputClass} {...register("equipmentId")}>
                        <option value="">Selecione o equipamento</option>
                        {equipmentsQuery.data?.data.map((equipment) => (
                          <option key={equipment.id} value={equipment.id}>
                            {equipment.type} - {equipment.brand}{" "}
                            {equipment.model}
                            {equipment.serialNumber
                              ? ` (${equipment.serialNumber})`
                              : ""}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setIsEquipmentModalOpen(true)}
                        className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Plus size={16} />
                        Cadastrar novo equipamento
                      </button>
                    </div>
                  )}
                </FormField>
              )}
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-950">
              Atendimento
            </h3>
            <div className="mt-4 space-y-4">
              <FormField
                label="Defeito relatado *"
                error={errors.reportedIssue?.message}
              >
                <textarea className={textareaClass} {...register("reportedIssue")} />
              </FormField>

              <FormField
                label="Senha do equipamento"
                error={errors.password?.message}
              >
                <input className={inputClass} {...register("password")} />
              </FormField>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-950">
                Acessórios
              </h3>
              <button
                type="button"
                onClick={() =>
                  append({ description: "", quantity: 1, observation: "" })
                }
                className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Plus size={16} />
                Adicionar acessório
              </button>
            </div>

            {fields.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                Nenhum acessório registrado.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="grid gap-3 rounded-md border border-slate-200 p-3 lg:grid-cols-[1fr_110px_1fr_auto]"
                  >
                    <FormField
                      label="Descrição"
                      error={errors.accessories?.[index]?.description?.message}
                    >
                      <input
                        className={inputClass}
                        {...register(`accessories.${index}.description`)}
                      />
                    </FormField>
                    <FormField
                      label="Qtd."
                      error={errors.accessories?.[index]?.quantity?.message}
                    >
                      <input
                        className={inputClass}
                        type="number"
                        min={1}
                        {...register(`accessories.${index}.quantity`, {
                          valueAsNumber: true,
                        })}
                      />
                    </FormField>
                    <FormField
                      label="Observação"
                      error={errors.accessories?.[index]?.observation?.message}
                    >
                      <input
                        className={inputClass}
                        {...register(`accessories.${index}.observation`)}
                      />
                    </FormField>
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="mt-6 inline-flex h-10 items-center justify-center rounded-md border border-rose-200 px-3 text-rose-700 hover:bg-rose-50"
                      aria-label="Remover acessório"
                      title="Remover acessório"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="h-fit rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-950">Finalizar</h3>
          <p className="mt-2 text-sm text-slate-500">
            A OS será criada como recebida e vinculada ao usuário autenticado.
          </p>

          {formError && (
            <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {formError}
            </div>
          )}

          <button
            type="submit"
            disabled={createServiceOrderMutation.isPending}
            className="mt-5 h-11 w-full rounded-md bg-sky-600 px-4 text-sm font-semibold text-white hover:bg-sky-700 disabled:bg-slate-300"
          >
            {createServiceOrderMutation.isPending ? "Criando..." : "Criar OS"}
          </button>
        </aside>
      </form>

      <Modal
        title="Cadastrar equipamento"
        isOpen={isEquipmentModalOpen}
        onClose={() => setIsEquipmentModalOpen(false)}
      >
        <EquipmentForm
          mode="create"
          customerId={selectedCustomerId}
          isSubmitting={createEquipmentMutation.isPending}
          errorMessage={formError}
          onCancel={() => setIsEquipmentModalOpen(false)}
          onSubmit={handleCreateEquipment}
        />
      </Modal>
    </section>
  );
}
