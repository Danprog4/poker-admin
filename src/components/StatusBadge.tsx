import { clsx } from "clsx";

type StatusBadgeProps = {
  status: string;
};

const statusClassMap: Record<string, string> = {
  upcoming: "bg-blue-50 text-blue-700 ring-blue-600/20",
  ongoing: "bg-amber-50 text-amber-700 ring-amber-600/20",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  cancelled: "bg-red-50 text-red-700 ring-red-600/20",
  registered: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  waitlist: "bg-amber-50 text-amber-700 ring-amber-600/20",
  legend: "bg-violet-50 text-violet-700 ring-violet-600/20",
  resident: "bg-cyan-50 text-cyan-700 ring-cyan-600/20",
  newbie: "bg-gray-50 text-gray-600 ring-gray-500/20",
  draft: "bg-gray-50 text-gray-600 ring-gray-500/20",
  created: "bg-gray-50 text-gray-600 ring-gray-500/20",
  processing: "bg-blue-50 text-blue-700 ring-blue-600/20",
  queued: "bg-blue-50 text-blue-700 ring-blue-600/20",
  sent: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  failed: "bg-red-50 text-red-700 ring-red-600/20",
  sending: "bg-blue-50 text-blue-700 ring-blue-600/20",
  skipped: "bg-amber-50 text-amber-700 ring-amber-600/20",
  active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  enabled: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  disabled: "bg-red-50 text-red-700 ring-red-600/20",
};

const statusLabelMap: Record<string, string> = {
  upcoming: "Предстоит",
  ongoing: "Идёт",
  completed: "Завершён",
  cancelled: "Отменён",
  registered: "Записан",
  waitlist: "Лист ожидания",
  draft: "Черновик",
  created: "Создан",
  processing: "Обработка",
  queued: "В очереди",
  sent: "Отправлено",
  failed: "Ошибка",
  sending: "Отправка",
  skipped: "Пропущен",
  active: "Активный",
  enabled: "Включен",
  disabled: "Выключен",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status.toLowerCase();
  const label = statusLabelMap[normalized] ?? status;

  return (
    <span
      className={clsx(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        statusClassMap[normalized] ??
          "bg-gray-50 text-gray-600 ring-gray-500/20",
      )}
    >
      {label}
    </span>
  );
}
