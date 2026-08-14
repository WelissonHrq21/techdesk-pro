import { zodResolver } from "@hookform/resolvers/zod";
import { LockKeyhole, UserRound } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "../hooks/useAuth";
import { type LoginFormData, loginSchema } from "../schemas/loginSchema";
import { getApiErrorMessage } from "../utils/apiError";

export function Login() {
  const { signIn } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      login: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginFormData) {
    setErrorMessage(null);

    try {
      await signIn(data.login, data.password);
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, "Login ou senha inválidos.")
      );
    }
  }

  return (
    <main className="grid min-h-screen bg-slate-50 lg:grid-cols-[1fr_440px]">
      <section className="hidden bg-slate-950 px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <div className="mb-14 inline-flex h-12 w-12 items-center justify-center rounded-md bg-sky-500 text-lg font-bold">
            TP
          </div>
          <h1 className="max-w-xl text-4xl font-semibold leading-tight">
            TechDesk Pro
          </h1>
        </div>

        <div className="grid max-w-2xl grid-cols-3 gap-3">
          <div className="rounded-md border border-slate-800 bg-slate-900 p-4">
            <span className="text-xs text-slate-400">OS</span>
            <strong className="mt-2 block text-2xl">Fluxo</strong>
          </div>
          <div className="rounded-md border border-slate-800 bg-slate-900 p-4">
            <span className="text-xs text-slate-400">Estoque</span>
            <strong className="mt-2 block text-2xl">Auditável</strong>
          </div>
          <div className="rounded-md border border-slate-800 bg-slate-900 p-4">
            <span className="text-xs text-slate-400">Acesso</span>
            <strong className="mt-2 block text-2xl">RBAC</strong>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-md bg-slate-950 text-sm font-bold text-white">
              TP
            </div>
            <h1 className="text-2xl font-semibold text-slate-950">
              TechDesk Pro
            </h1>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-950">Entrar</h2>
              <p className="mt-1 text-sm text-slate-500">
                Acesse sua área de trabalho.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <label
                  htmlFor="login"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Login
                </label>
                <div className="relative">
                  <UserRound
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <input
                    id="login"
                    type="text"
                    autoComplete="username"
                    className="h-11 w-full rounded-md border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                    {...register("login")}
                  />
                </div>
                {errors.login && (
                  <p className="mt-1 text-sm text-rose-600">
                    {errors.login.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Senha
                </label>
                <div className="relative">
                  <LockKeyhole
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    className="h-11 w-full rounded-md border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                    {...register("password")}
                  />
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-rose-600">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {errorMessage && (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex h-11 w-full items-center justify-center rounded-md bg-sky-600 px-4 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:bg-slate-300"
              >
                {isSubmitting ? "Entrando..." : "Entrar"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
