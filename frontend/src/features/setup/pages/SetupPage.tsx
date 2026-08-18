import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";
import { ErrorState } from "../../../components/ui/ErrorState";
import { FormField } from "../../../components/ui/FormField";
import { LoadingScreen } from "../../../components/ui/LoadingScreen";
import { useAuth } from "../../../hooks/useAuth";
import { getFriendlyErrorMessage } from "../../../utils/errorMessages";
import { roleLabels } from "../../../utils/labels";
import { companySettingsSchema } from "../../settings/schemas/companySettingsSchema";
import type {
  CompanySettings,
  CompanySettingsFormData,
} from "../../settings/types/companySettings";
import {
  useCompleteSetup,
  useCreateSetupUser,
  useSetupStatus,
  useUpdateSetupAdmin,
  useUpdateSetupCompany,
} from "../hooks/useSetup";
import type { SetupAdminFormData, SetupUserFormData } from "../types/setup";

const setupStepKey = "techdesk.setup.step";

const steps = [
  "Bem-vindo",
  "Empresa",
  "Administrador",
  "Usuários",
  "Backup",
  "Revisão",
];

const adminSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome.").max(100),
  login: z.string().trim().min(3, "Login deve ter ao menos 3 caracteres.").max(50),
});

const setupUserSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome.").max(100),
  login: z.string().trim().min(3, "Login deve ter ao menos 3 caracteres.").max(50),
  role: z.enum(["RECEPTION", "TECHNICIAN"]),
  password: z.string().min(6, "Senha deve ter ao menos 6 caracteres.").max(100),
});

const inputClass =
  "h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100";

export function SetupPage() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const setupStatusQuery = useSetupStatus();
  const updateCompanyMutation = useUpdateSetupCompany();
  const updateAdminMutation = useUpdateSetupAdmin();
  const createUserMutation = useCreateSetupUser();
  const completeSetupMutation = useCompleteSetup();
  const [step, setStep] = useState(() => {
    const stored = Number(sessionStorage.getItem(setupStepKey));
    return Number.isInteger(stored) && stored >= 0 && stored < steps.length
      ? stored
      : 0;
  });
  const [backupAcknowledged, setBackupAcknowledged] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const setupStatus = setupStatusQuery.data;
  const createdUsers = setupStatus?.initialUsers ?? [];
  const company = setupStatus?.companySettings;

  useEffect(() => {
    sessionStorage.setItem(setupStepKey, String(step));
  }, [step]);

  useEffect(() => {
    if (setupStatus?.setupCompleted) {
      sessionStorage.removeItem(setupStepKey);
      navigate("/dashboard", { replace: true });
    }
  }, [navigate, setupStatus?.setupCompleted]);

  const canGoNext = useMemo(() => {
    if (step === 1) {
      return Boolean(company?.name?.trim());
    }

    if (step === 4) {
      return backupAcknowledged;
    }

    return true;
  }, [backupAcknowledged, company?.name, step]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== "ADMIN") {
    return <Navigate to="/forbidden" replace />;
  }

  if (user.setupCompleted) {
    return <Navigate to="/dashboard" replace />;
  }

  if (setupStatusQuery.isLoading) {
    return <LoadingScreen />;
  }

  if (setupStatusQuery.isError || !setupStatus) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <ErrorState
          title="Não foi possível carregar a configuração inicial."
          onRetry={() => void setupStatusQuery.refetch()}
          isRetrying={setupStatusQuery.isFetching}
        />
      </main>
    );
  }

  function goToStep(nextStep: number) {
    setErrorMessage(null);
    setStep(Math.max(0, Math.min(nextStep, steps.length - 1)));
  }

  async function handleCompanySubmit(data: CompanySettingsFormData) {
    setErrorMessage(null);

    try {
      await updateCompanyMutation.mutateAsync(data);
      goToStep(2);
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error));
    }
  }

  async function handleAdminSubmit(data: SetupAdminFormData) {
    setErrorMessage(null);

    try {
      await updateAdminMutation.mutateAsync(data);
      await refreshProfile();
      goToStep(3);
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error));
    }
  }

  async function handleUserSubmit(data: SetupUserFormData) {
    setErrorMessage(null);

    try {
      await createUserMutation.mutateAsync(data);
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error));
    }
  }

  async function handleComplete() {
    setErrorMessage(null);

    try {
      await completeSetupMutation.mutateAsync();
      await refreshProfile();
      sessionStorage.removeItem(setupStepKey);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error));
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-sky-700">TechDesk Pro</p>
            <h1 className="mt-1 text-2xl font-semibold">Configuração inicial</h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
            <ShieldCheck size={16} />
            <span>{step + 1} de {steps.length}</span>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <aside className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
            <ol className="space-y-1">
              {steps.map((label, index) => (
                <li key={label}>
                  <button
                    type="button"
                    onClick={() => goToStep(index)}
                    className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium ${
                      index === step
                        ? "bg-sky-50 text-sky-800"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-current text-xs">
                      {index + 1}
                    </span>
                    {label}
                  </button>
                </li>
              ))}
            </ol>
          </aside>

          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            {errorMessage && (
              <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {errorMessage}
              </div>
            )}

            {step === 0 && (
              <WelcomeStep onNext={() => goToStep(1)} />
            )}

            {step === 1 && (
              <CompanyStep
                company={company}
                isSubmitting={updateCompanyMutation.isPending}
                onSubmit={(data) => void handleCompanySubmit(data)}
              />
            )}

            {step === 2 && (
              <AdminStep
                user={user}
                isSubmitting={updateAdminMutation.isPending}
                onSubmit={(data) => void handleAdminSubmit(data)}
              />
            )}

            {step === 3 && (
              <UsersStep
                users={createdUsers}
                isSubmitting={createUserMutation.isPending}
                onSubmit={handleUserSubmit}
              />
            )}

            {step === 4 && (
              <BackupStep
                acknowledged={backupAcknowledged}
                onChange={setBackupAcknowledged}
              />
            )}

            {step === 5 && (
              <ReviewStep
                companyName={company?.name ?? ""}
                adminName={user.name}
                usersCount={createdUsers.length}
                backupAcknowledged={backupAcknowledged}
                isSubmitting={completeSetupMutation.isPending}
                onComplete={() => void handleComplete()}
              />
            )}

            <footer className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() => goToStep(step - 1)}
                disabled={step === 0}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
              >
                <ChevronLeft size={16} />
                Voltar
              </button>

              {step !== 1 && step !== 2 && step !== 5 && (
                <button
                  type="button"
                  onClick={() => goToStep(step + 1)}
                  disabled={!canGoNext}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-sky-600 px-4 text-sm font-semibold text-white hover:bg-sky-700 disabled:bg-slate-300"
                >
                  Continuar
                  <ChevronRight size={16} />
                </button>
              )}
            </footer>
          </section>
        </div>
      </div>
    </main>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div>
      <h2 className="text-xl font-semibold">Bem-vindo ao TechDesk Pro</h2>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">
        Vamos preparar os dados funcionais da assistência antes do primeiro uso.
      </p>
      <button
        type="button"
        onClick={onNext}
        className="mt-6 inline-flex h-10 items-center gap-2 rounded-md bg-sky-600 px-4 text-sm font-semibold text-white hover:bg-sky-700"
      >
        Começar configuração
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

function CompanyStep({
  company,
  isSubmitting,
  onSubmit,
}: {
  company: CompanySettings | null | undefined;
  isSubmitting: boolean;
  onSubmit: (data: CompanySettingsFormData) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompanySettingsFormData>({
    resolver: zodResolver(companySettingsSchema),
    values: {
      name: company?.name ?? "",
      document: company?.document ?? "",
      phone: company?.phone ?? "",
      email: company?.email ?? "",
      address: company?.address ?? "",
      zipCode: company?.zipCode ?? "",
    },
  });

  return (
    <form className="space-y-4" onSubmit={(event) => void handleSubmit(onSubmit)(event)}>
      <StepTitle title="Empresa" />
      <FormField label="Nome da assistência *" error={errors.name?.message}>
        <input className={inputClass} {...register("name")} />
      </FormField>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="CNPJ/CPF" error={errors.document?.message}>
          <input className={inputClass} {...register("document")} />
        </FormField>
        <FormField label="Telefone" error={errors.phone?.message}>
          <input className={inputClass} {...register("phone")} />
        </FormField>
      </div>
      <FormField label="E-mail" error={errors.email?.message}>
        <input className={inputClass} type="email" {...register("email")} />
      </FormField>
      <div className="grid gap-4 md:grid-cols-[160px_1fr]">
        <FormField label="CEP" error={errors.zipCode?.message}>
          <input className={inputClass} {...register("zipCode")} />
        </FormField>
        <FormField label="Endereço" error={errors.address?.message}>
          <input className={inputClass} {...register("address")} />
        </FormField>
      </div>
      <SubmitButton label="Salvar empresa" isSubmitting={isSubmitting} />
    </form>
  );
}

function AdminStep({
  user,
  isSubmitting,
  onSubmit,
}: {
  user: { name: string; login: string };
  isSubmitting: boolean;
  onSubmit: (data: SetupAdminFormData) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SetupAdminFormData>({
    resolver: zodResolver(adminSchema),
    values: {
      name: user.name,
      login: user.login,
    },
  });

  return (
    <form className="space-y-4" onSubmit={(event) => void handleSubmit(onSubmit)(event)}>
      <StepTitle title="Administrador" />
      <FormField label="Nome *" error={errors.name?.message}>
        <input className={inputClass} {...register("name")} />
      </FormField>
      <FormField label="Login *" error={errors.login?.message}>
        <input className={inputClass} {...register("login")} />
      </FormField>
      <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
        A senha pode ser alterada depois em Minha conta.
      </p>
      <SubmitButton label="Salvar administrador" isSubmitting={isSubmitting} />
    </form>
  );
}

function UsersStep({
  users,
  isSubmitting,
  onSubmit,
}: {
  users: { id: string; name: string; login: string; role: "RECEPTION" | "TECHNICIAN" | "ADMIN" }[];
  isSubmitting: boolean;
  onSubmit: (data: SetupUserFormData) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SetupUserFormData>({
    resolver: zodResolver(setupUserSchema),
    defaultValues: {
      name: "",
      login: "",
      role: "RECEPTION",
      password: "",
    },
  });

  async function handleValidSubmit(data: SetupUserFormData) {
    await onSubmit(data);
    reset();
  }

  return (
    <div className="space-y-5">
      <StepTitle title="Usuários iniciais" />
      <form className="space-y-4" onSubmit={(event) => void handleSubmit(handleValidSubmit)(event)}>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Nome" error={errors.name?.message}>
            <input className={inputClass} {...register("name")} />
          </FormField>
          <FormField label="Login" error={errors.login?.message}>
            <input className={inputClass} {...register("login")} />
          </FormField>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Perfil" error={errors.role?.message}>
            <select className={inputClass} {...register("role")}>
              <option value="RECEPTION">{roleLabels.RECEPTION}</option>
              <option value="TECHNICIAN">{roleLabels.TECHNICIAN}</option>
            </select>
          </FormField>
          <FormField label="Senha" error={errors.password?.message}>
            <input
              className={inputClass}
              type="password"
              autoComplete="new-password"
              {...register("password")}
            />
          </FormField>
        </div>
        <SubmitButton label="Adicionar usuário" isSubmitting={isSubmitting} />
      </form>

      <div className="rounded-md border border-slate-200">
        {users.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">Nenhum usuário inicial criado.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {users.map((createdUser) => (
              <li key={createdUser.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <span className="font-medium text-slate-900">{createdUser.name}</span>
                <span className="text-slate-500">{roleLabels[createdUser.role]}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function BackupStep({
  acknowledged,
  onChange,
}: {
  acknowledged: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div>
      <StepTitle title="Backup e operação" />
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Backup automático não configurado. Antes de entrar em produção, defina uma rotina externa e valide restore com o guia README-BACKUP-RESTORE.md.
      </div>
      <label className="mt-4 flex items-start gap-3 rounded-md border border-slate-200 p-3 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={acknowledged}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>Entendi que backups devem ser configurados e testados fora do servidor.</span>
      </label>
    </div>
  );
}

function ReviewStep({
  companyName,
  adminName,
  usersCount,
  backupAcknowledged,
  isSubmitting,
  onComplete,
}: {
  companyName: string;
  adminName: string;
  usersCount: number;
  backupAcknowledged: boolean;
  isSubmitting: boolean;
  onComplete: () => void;
}) {
  return (
    <div>
      <StepTitle title="Revisão" />
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <SummaryItem label="Empresa" value={companyName || "Pendente"} />
        <SummaryItem label="Administrador" value={adminName} />
        <SummaryItem label="Usuários iniciais" value={String(usersCount)} />
        <SummaryItem
          label="Backup"
          value={backupAcknowledged ? "Confirmado" : "Pendente"}
        />
      </dl>
      <button
        type="button"
        onClick={onComplete}
        disabled={!companyName.trim() || !backupAcknowledged || isSubmitting}
        className="mt-6 inline-flex h-10 items-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-slate-300"
      >
        <Check size={16} />
        {isSubmitting ? "Concluindo..." : "Concluir configuração"}
      </button>
    </div>
  );
}

function StepTitle({ title }: { title: string }) {
  return <h2 className="text-xl font-semibold text-slate-950">{title}</h2>;
}

function SubmitButton({
  label,
  isSubmitting,
}: {
  label: string;
  isSubmitting: boolean;
}) {
  return (
    <div className="flex justify-end">
      <button
        type="submit"
        disabled={isSubmitting}
        className="h-10 rounded-md bg-sky-600 px-4 text-sm font-semibold text-white hover:bg-sky-700 disabled:bg-slate-300"
      >
        {isSubmitting ? "Salvando..." : label}
      </button>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 p-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="mt-1 font-medium text-slate-950">{value}</dd>
    </div>
  );
}
