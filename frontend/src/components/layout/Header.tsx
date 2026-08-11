import { LogOut, Menu } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { roleLabels } from "../../utils/labels";

type HeaderProps = {
  onOpenSidebar: () => void;
};

export function Header({ onOpenSidebar }: HeaderProps) {
  const { user, signOut } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded-md border border-slate-200 p-2 text-slate-700 hover:bg-slate-50 lg:hidden"
          onClick={onOpenSidebar}
          aria-label="Abrir menu"
          title="Abrir menu"
        >
          <Menu size={20} />
        </button>

        <div>
          <span className="text-xs font-medium uppercase text-slate-500">
            Painel
          </span>
          <h1 className="text-lg font-semibold text-slate-950">Dashboard</h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <strong className="block text-sm font-semibold text-slate-950">
            {user?.name}
          </strong>
          <span className="text-xs text-slate-500">
            {user ? roleLabels[user.role] : ""}
          </span>
        </div>

        <button
          type="button"
          className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          onClick={signOut}
          title="Sair"
        >
          <LogOut size={17} />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>
    </header>
  );
}
