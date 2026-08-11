type ModulePlaceholderProps = {
  title: string;
};

export function ModulePlaceholder({ title }: ModulePlaceholderProps) {
  return (
    <section>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-slate-950">{title}</h2>
      </div>

      <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500">
        Em breve
      </div>
    </section>
  );
}
