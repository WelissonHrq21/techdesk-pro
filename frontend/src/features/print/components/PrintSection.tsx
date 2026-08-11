import type { ReactNode } from "react";

type PrintSectionProps = {
  title: string;
  children: ReactNode;
};

export function PrintSection({ title, children }: PrintSectionProps) {
  return (
    <section className="mt-6">
      <h3 className="border-b border-slate-200 pb-2 text-sm font-bold uppercase text-slate-600">
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}
