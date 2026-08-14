import { useParams } from "react-router-dom";
import { ErrorState } from "../../../components/ui/ErrorState";
import { LoadingState } from "../../../components/ui/LoadingState";
import { formatDateTime } from "../../../utils/formatters";
import { useServiceOrder } from "../../service-orders/hooks/useServiceOrders";
import { useCompanySettings } from "../../settings/hooks/useCompanySettings";
import { PrintLayout } from "../components/PrintLayout";
import { PrintSection } from "../components/PrintSection";

export function ServiceOrderReceiptPrintPage() {
  const { id } = useParams<{ id: string }>();
  const serviceOrderQuery = useServiceOrder(id);
  const companySettingsQuery = useCompanySettings();

  if (serviceOrderQuery.isLoading || companySettingsQuery.isLoading) {
    return <LoadingState rows={5} />;
  }

  if (
    serviceOrderQuery.isError ||
    companySettingsQuery.isError ||
    !serviceOrderQuery.data
  ) {
    return (
      <ErrorState
        title="Não foi possível carregar o protocolo."
        onRetry={() => void serviceOrderQuery.refetch()}
        isRetrying={serviceOrderQuery.isFetching}
      />
    );
  }

  const serviceOrder = serviceOrderQuery.data;

  return (
    <PrintLayout
      title={`Protocolo OS #${serviceOrder.number}`}
      companySettings={companySettingsQuery.data}
    >
      <PrintSection title="Identificação">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <p>
            <strong>OS:</strong> #{serviceOrder.number}
          </p>
          <p>
            <strong>Data de entrada:</strong>{" "}
            {formatDateTime(serviceOrder.createdAt)}
          </p>
        </div>
      </PrintSection>

      <PrintSection title="Cliente">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <p>
            <strong>Nome:</strong> {serviceOrder.customer.name}
          </p>
          <p>
            <strong>Telefone:</strong> {serviceOrder.customer.phone}
          </p>
          <p>
            <strong>E-mail:</strong> {serviceOrder.customer.email ?? "-"}
          </p>
          <p>
            <strong>Endereço:</strong> {serviceOrder.customer.address ?? "-"}
          </p>
        </div>
      </PrintSection>

      <PrintSection title="Equipamento">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <p>
            <strong>Tipo:</strong> {serviceOrder.equipment.type}
          </p>
          <p>
            <strong>Marca:</strong> {serviceOrder.equipment.brand}
          </p>
          <p>
            <strong>Modelo:</strong> {serviceOrder.equipment.model}
          </p>
          <p>
            <strong>Serial:</strong>{" "}
            {serviceOrder.equipment.serialNumber ?? "Não informado"}
          </p>
        </div>
      </PrintSection>

      <PrintSection title="Defeito relatado">
        <p className="whitespace-pre-wrap text-sm">{serviceOrder.reportedIssue}</p>
      </PrintSection>

      <PrintSection title="Acessórios">
        {serviceOrder.accessories.length === 0 ? (
          <p className="text-sm">Nenhum acessório registrado.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {serviceOrder.accessories.map((accessory, index) => (
              <li key={accessory.id ?? index}>
                {accessory.quantity}x {accessory.description}
                {accessory.observation ? ` - ${accessory.observation}` : ""}
              </li>
            ))}
          </ul>
        )}
      </PrintSection>

      <PrintSection title="Observações">
        <p className="text-sm">
          Senha do equipamento: cadastrada no sistema, não impressa neste
          protocolo.
        </p>
        <p className="mt-3 text-sm">
          Declaro que as informações acima correspondem ao equipamento entregue
          para análise e autorizo a realização do diagnóstico técnico.
        </p>
      </PrintSection>

      <div className="mt-16 grid grid-cols-2 gap-12 text-center text-sm">
        <div className="border-t border-slate-400 pt-2">Assinatura do cliente</div>
        <div className="border-t border-slate-400 pt-2">
          Assinatura da assistência
        </div>
      </div>
    </PrintLayout>
  );
}
