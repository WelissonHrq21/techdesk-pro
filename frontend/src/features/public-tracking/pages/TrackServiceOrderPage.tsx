import { Wrench } from "lucide-react";
import { useParams } from "react-router-dom";
import { LoadingState } from "../../../components/ui/LoadingState";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { formatDateTime } from "../../../utils/formatters";
import { usePublicServiceOrder } from "../hooks/usePublicServiceOrder";

export function TrackServiceOrderPage() {
  const { token } = useParams<{ token: string }>();
  const serviceOrderQuery = usePublicServiceOrder(token);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <section className="mx-auto max-w-xl rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-200 pb-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-md bg-sky-50 text-sky-700">
            <Wrench size={22} />
          </span>
          <div>
            <strong className="block text-lg text-slate-950">TechDesk Pro</strong>
            <span className="text-sm text-slate-500">Consulta da OS</span>
          </div>
        </div>

        {serviceOrderQuery.isLoading ? (
          <div className="mt-6">
            <LoadingState rows={4} />
          </div>
        ) : serviceOrderQuery.isError || !serviceOrderQuery.data ? (
          <div className="py-10 text-center">
            <h1 className="text-xl font-semibold text-slate-950">
              Não foi possível localizar esta ordem de serviço.
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Confira o link informado pela assistência.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <div>
              <span className="text-sm text-slate-500">Ordem de Servico</span>
              <h1 className="mt-1 text-2xl font-semibold text-slate-950">
                OS #{serviceOrderQuery.data.number}
              </h1>
            </div>

            <div className="rounded-md bg-slate-50 p-4">
              <span className="text-sm text-slate-500">Equipamento</span>
              <p className="mt-1 font-semibold text-slate-950">
                {serviceOrderQuery.data.equipment.type}{" "}
                {serviceOrderQuery.data.equipment.brand}{" "}
                {serviceOrderQuery.data.equipment.model}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-md bg-slate-50 p-4">
                <span className="text-sm text-slate-500">Status atual</span>
                <div className="mt-2">
                  <StatusBadge
                    type="service-order"
                    value={serviceOrderQuery.data.status}
                  />
                </div>
              </div>
              <div className="rounded-md bg-slate-50 p-4">
                <span className="text-sm text-slate-500">Recebido em</span>
                <p className="mt-2 font-medium text-slate-950">
                  {formatDateTime(serviceOrderQuery.data.createdAt)}
                </p>
              </div>
            </div>

            <p className="rounded-md bg-sky-50 px-3 py-2 text-sm text-sky-700">
              Esta consulta mostra apenas informações básicas de andamento.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
