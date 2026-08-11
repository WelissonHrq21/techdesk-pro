import { ErrorState } from "../../../components/ui/ErrorState";
import { LoadingState } from "../../../components/ui/LoadingState";
import { PageHeader } from "../../../components/ui/PageHeader";
import { useToast } from "../../../hooks/useToast";
import { getFriendlyErrorMessage } from "../../../utils/errorMessages";
import { CompanySettingsForm } from "../components/CompanySettingsForm";
import {
  useCompanySettings,
  useUpdateCompanySettings,
} from "../hooks/useCompanySettings";
import type { CompanySettingsFormData } from "../types/companySettings";
import { useState } from "react";

export function SettingsPage() {
  const { showToast } = useToast();
  const settingsQuery = useCompanySettings();
  const updateSettingsMutation = useUpdateCompanySettings();
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(data: CompanySettingsFormData) {
    setFormError(null);

    try {
      await updateSettingsMutation.mutateAsync(data);
      showToast("Configuracoes da empresa atualizadas.", "success");
    } catch (error) {
      setFormError(getFriendlyErrorMessage(error));
    }
  }

  if (settingsQuery.isLoading) {
    return <LoadingState rows={5} />;
  }

  if (settingsQuery.isError || !settingsQuery.data) {
    return (
      <ErrorState
        title="Nao foi possivel carregar as configuracoes."
        onRetry={() => void settingsQuery.refetch()}
        isRetrying={settingsQuery.isFetching}
      />
    );
  }

  return (
    <section>
      <PageHeader
        title="Configuracoes"
        description="Dados persistentes da assistencia usados em documentos e operacao."
      />

      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">
          Dados da assistencia
        </h2>
        <div className="mt-5">
          <CompanySettingsForm
            settings={settingsQuery.data}
            isSubmitting={updateSettingsMutation.isPending}
            errorMessage={formError}
            onSubmit={(data) => void handleSubmit(data)}
          />
        </div>
      </div>
    </section>
  );
}
