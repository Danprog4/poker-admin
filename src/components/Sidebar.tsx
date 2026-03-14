import { NavLink } from "react-router-dom";
import { clsx } from "clsx";

const navItems = [
  { to: "/", label: "Дашборд", icon: "/" },
  { to: "/tournaments", label: "Турниры" },
  { to: "/series", label: "Серии" },
  { to: "/users", label: "Юзеры" },
  { to: "/statuses", label: "Статусы" },
  { to: "/medals", label: "Медали" },
  { to: "/adjustments", label: "Корректировки" },
  { to: "/notifications", label: "Уведомления" },
];

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 flex-shrink-0 flex-col border-r border-gray-800 bg-[var(--bg-sidebar)] text-white md:flex">
      <div className="border-b border-gray-700/60 px-5 py-5">
        <p className="font-['Space_Grotesk'] text-lg font-bold tracking-tight">
          OverBet CRM
        </p>
        <p className="mt-0.5 text-xs text-gray-400">Управление клубом</p>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              clsx(
                "block rounded-lg px-3 py-2 text-sm transition-colors",
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
