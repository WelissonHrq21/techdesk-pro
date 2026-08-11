import {
  Boxes,
  Gauge,
  Laptop,
  Users,
  Wrench,
  ClipboardList,
  Settings,
  X,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import type { UserRole } from "../../types/auth";

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

type NavItem = {
  label: string;
  to: string;
  icon: typeof Gauge;
  roles: UserRole[];
};

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    to: "/dashboard",
    icon: Gauge,
    roles: ["ADMIN", "RECEPTION", "TECHNICIAN"],
  },
  {
    label: "Clientes",
    to: "/customers",
    icon: Users,
    roles: ["ADMIN", "RECEPTION", "TECHNICIAN"],
  },
  {
    label: "Equipamentos",
    to: "/equipments",
    icon: Laptop,
    roles: ["ADMIN", "RECEPTION", "TECHNICIAN"],
  },
  {
    label: "Ordens de Servico",
    to: "/service-orders",
    icon: ClipboardList,
    roles: ["ADMIN", "RECEPTION", "TECHNICIAN"],
  },
  {
    label: "Pecas / Estoque",
    to: "/parts",
    icon: Boxes,
    roles: ["ADMIN", "RECEPTION", "TECHNICIAN"],
  },
  {
    label: "Usuarios",
    to: "/users",
    icon: Wrench,
    roles: ["ADMIN"],
  },
  {
    label: "Configuracoes",
    to: "/settings",
    icon: Settings,
    roles: ["ADMIN"],
  },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuth();
  const visibleItems = navItems.filter((item) =>
    user ? item.roles.includes(user.role) : false
  );

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-slate-950/40 transition-opacity lg:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-800 bg-slate-950 text-white transition-transform duration-200 lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-5">
          <div>
            <strong className="block text-base font-semibold">TechDesk Pro</strong>
            <span className="text-xs text-slate-400">Operacao</span>
          </div>

          <button
            type="button"
            className="rounded-md p-2 text-slate-300 hover:bg-slate-900 hover:text-white lg:hidden"
            onClick={onClose}
            aria-label="Fechar menu"
            title="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {visibleItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-white text-slate-950"
                      : "text-slate-300 hover:bg-slate-900 hover:text-white"
                  }`
                }
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
