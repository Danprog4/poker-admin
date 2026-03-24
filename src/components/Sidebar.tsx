import { clsx } from "clsx";
import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", label: "Дашборд", icon: "/" },
  { to: "/tournaments", label: "Турниры" },
  { to: "/series", label: "Серии" },
  { to: "/users", label: "Юзеры" },
  { to: "/statuses", label: "Статусы" },
  { to: "/medals", label: "Медали" },
  { to: "/notifications", label: "Уведомления" },
  { to: "/rating-info", label: "О рейтинге" },
  { to: "/faq", label: "FAQ" },
];

type SidebarProps = {
  className?: string;
  onNavigate?: () => void;
};

export function Sidebar({ className, onNavigate }: SidebarProps) {
  return (
    <aside
      className={clsx(
        "flex h-full w-72 flex-shrink-0 flex-col bg-[var(--bg-sidebar)] text-white",
        className,
      )}
    >
      <div className="border-b border-gray-700/60 px-5 py-5">
        <p className="font-['Space_Grotesk'] text-lg font-bold tracking-tight">
          OverBet CRM
        </p>
        <p className="mt-0.5 text-xs text-gray-400">Управление клубом</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            onClick={onNavigate}
            className={({ isActive }) =>
              clsx(
                "block rounded-lg px-3 py-2.5 text-sm transition-colors",
                isActive
                  ? "bg-indigo-500/20 font-semibold text-indigo-300"
                  : "text-gray-400 hover:bg-white/5 hover:text-gray-200",
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
