import { ArrowLeft, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";

export function Forbidden() {
  return (
    <section className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md text-center">
        <ShieldAlert className="mx-auto text-amber-500" size={38} />
        <h2 className="mt-4 text-2xl font-semibold text-slate-950">
          Acesso negado
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Voce nao tem permissao para acessar esta area.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800"
        >
          <ArrowLeft size={17} />
          Voltar ao Dashboard
        </Link>
      </div>
    </section>
  );
}
