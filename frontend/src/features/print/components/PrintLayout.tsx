import type { ReactNode } from "react";
import type { CompanySettings } from "../../settings/types/companySettings";

type PrintLayoutProps = {
  title: string;
  companySettings?: CompanySettings;
  children: ReactNode;
};

export function PrintLayout({
  title,
  companySettings,
  children,
}: PrintLayoutProps) {
  const companyName = companySettings?.name || "TechDesk Pro";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 print:bg-white print:p-0">
      <div className="no-print mx-auto mb-4 flex max-w-[820px] justify-end gap-2">
        <button
          type="button"
          onClick={() => window.print()}
          className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800"
        >
          Imprimir
        </button>
      </div>

      <article className="mx-auto min-h-[1120px] max-w-[820px] bg-white p-10 text-slate-950 shadow-sm print:min-h-0 print:max-w-none print:p-0 print:shadow-none">
        <header className="border-b border-slate-300 pb-5">
          <div className="flex items-start justify-between gap-8">
            <div>
              <h1 className="text-2xl font-bold">{companyName}</h1>
              <div className="mt-2 space-y-1 text-sm text-slate-600">
                {companySettings?.document && <p>{companySettings.document}</p>}
                {companySettings?.phone && <p>{companySettings.phone}</p>}
                {companySettings?.email && <p>{companySettings.email}</p>}
                {companySettings?.address && <p>{companySettings.address}</p>}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm uppercase text-slate-500">Documento</p>
              <h2 className="mt-1 text-xl font-semibold">{title}</h2>
            </div>
          </div>
        </header>

        {children}
      </article>
    </main>
  );
}
