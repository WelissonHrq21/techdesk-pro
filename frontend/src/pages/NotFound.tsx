import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <section className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md text-center">
        <span className="text-sm font-semibold uppercase text-sky-600">404</span>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">
          Pagina nao encontrada
        </h2>
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
