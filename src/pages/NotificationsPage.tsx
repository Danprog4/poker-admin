import { useEffect, useMemo, useState } from "react";

import { DataTable } from "../components/DataTable";
import { FormField } from "../components/FormField";
import { StatusBadge } from "../components/StatusBadge";
import { formatDateTime } from "../lib/date";
import { trpc } from "../lib/trpc";
import { useAdminData } from "../providers/useAdminData";

type NotificationCategory = "operational" | "gamification" | "statistics";
type NotificationTriggerType = "event" | "cron" | "manual";

type NotificationFlow = {
  id: number;
  slug: string;
  name: string;
  category: NotificationCategory;
  triggerType: NotificationTriggerType;
  eventName: string | null;
  cronExpression: string | null;
  isEnabled: boolean;
  maxPerDay: number;
  triggerConfig: Record<string, unknown>;
};

type NotificationTemplate = {
  id: number;
  flowId: number;
  version: number;
  isActive: boolean;
  title: string | null;
  body: string;
  parseMode: "MarkdownV2" | "HTML" | null;
  variables: string[];
  createdAt: Date | string | null;
};

type NotificationRun = {
  id: number;
  flowSlug: string;
  sourceType: string;
  sourceId: string | null;
  status: string;
  createdAt: Date | string;
};

type NotificationJob = {
  id: number;
  flowSlug: string;
  userId: number;
  status: string;
  attempts: number;
  maxAttempts: number;
  sentAt: Date | string | null;
};

type CronPreset =
  | "every_5_minutes"
  | "daily"
  | "weekly"
  | "monthly"
  | "custom";

type FlowDraft = {
  name: string;
  category: NotificationCategory;
  triggerType: NotificationTriggerType;
  eventName: string;
  cronPreset: CronPreset;
  cronHour: number;
  cronMinute: number;
  cronWeekday: number;
  cronDayOfMonth: number;
  cronCustom: string;
  isEnabled: boolean;
  maxPerDay: number;
  reminderLeadMinutes: number;
  reminderWindowMinutes: number;
  inactivityDays: number;
  newcomerDays: number;
};

type FlowSettingsFormProps = {
  flow: NotificationFlow;
  pending: boolean;
  onSave: (draft: FlowDraft) => void;
};

type TemplateVersionFormProps = {
  flow: NotificationFlow;
  initialTemplate: NotificationTemplate | null;
  pending: boolean;
  onSubmit: (payload: {
    title: string | null;
    body: string;
    parseMode: "MarkdownV2" | "HTML" | null;
    variables: string[];
    activate: boolean;
  }) => void;
};

const parseInteger = (value: string, fallback: number) => {
  const parsed = Number.parseInt(value, 10);

  return Number.isNaN(parsed) ? fallback : parsed;
};

const toDateLabel = (value: Date | string | null | undefined) => {
  if (!value) {
    return "—";
  }

  if (value instanceof Date) {
    return formatDateTime(value.toISOString());
  }

  return formatDateTime(value);
};

const readConfigNumber = (
  config: Record<string, unknown> | null | undefined,
  key: string,
  fallback: number,
) => {
  const raw = config?.[key];

  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }

  if (typeof raw === "string") {
    const parsed = Number(raw);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
};

type ParsedCronConfig = {
  preset: CronPreset;
  hour: number;
  minute: number;
  weekday: number;
  dayOfMonth: number;
  custom: string;
};

const DEFAULT_CRON_CONFIG: ParsedCronConfig = {
  preset: "weekly",
  hour: 10,
  minute: 0,
  weekday: 1,
  dayOfMonth: 1,
  custom: "",
};

const clampInt = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? Math.trunc(value) : min));

function parseCronExpressionConfig(expression: string | null): ParsedCronConfig {
  const raw = expression?.trim() ?? "";

  if (!raw) {
    return DEFAULT_CRON_CONFIG;
  }

  if (raw === "*/5 * * * *") {
    return {
      preset: "every_5_minutes",
      hour: 0,
      minute: 0,
      weekday: 1,
      dayOfMonth: 1,
      custom: raw,
    };
  }

  const parts = raw.split(/\s+/);

  if (parts.length !== 5) {
    return { ...DEFAULT_CRON_CONFIG, preset: "custom", custom: raw };
  }

  const [minuteRaw, hourRaw, domRaw, monthRaw, dowRaw] = parts;
  const minute = Number.parseInt(minuteRaw, 10);
  const hour = Number.parseInt(hourRaw, 10);

  if (
    !Number.isInteger(minute) ||
    !Number.isInteger(hour) ||
    minute < 0 ||
    minute > 59 ||
    hour < 0 ||
    hour > 23
  ) {
    return { ...DEFAULT_CRON_CONFIG, preset: "custom", custom: raw };
  }

  if (domRaw === "*" && monthRaw === "*" && dowRaw === "*") {
    return {
      preset: "daily",
      hour,
      minute,
      weekday: 1,
      dayOfMonth: 1,
      custom: raw,
    };
  }

  const weekday = Number.parseInt(dowRaw, 10);

  if (
    domRaw === "*" &&
    monthRaw === "*" &&
    Number.isInteger(weekday) &&
    weekday >= 0 &&
    weekday <= 7
  ) {
    return {
      preset: "weekly",
      hour,
      minute,
      weekday: weekday === 7 ? 0 : weekday,
      dayOfMonth: 1,
      custom: raw,
    };
  }

  const dayOfMonth = Number.parseInt(domRaw, 10);

  if (
    monthRaw === "*" &&
    dowRaw === "*" &&
    Number.isInteger(dayOfMonth) &&
    dayOfMonth >= 1 &&
    dayOfMonth <= 31
  ) {
    return {
      preset: "monthly",
      hour,
      minute,
      weekday: 1,
      dayOfMonth,
      custom: raw,
    };
  }

  return { ...DEFAULT_CRON_CONFIG, preset: "custom", custom: raw };
}

function buildCronExpressionFromDraft(draft: FlowDraft): string {
  const hour = clampInt(draft.cronHour, 0, 23);
  const minute = clampInt(draft.cronMinute, 0, 59);

  if (draft.cronPreset === "every_5_minutes") {
    return "*/5 * * * *";
  }

  if (draft.cronPreset === "daily") {
    return `${minute} ${hour} * * *`;
  }

  if (draft.cronPreset === "weekly") {
    const weekday = clampInt(draft.cronWeekday, 0, 6);
    return `${minute} ${hour} * * ${weekday}`;
  }

  if (draft.cronPreset === "monthly") {
    const dayOfMonth = clampInt(draft.cronDayOfMonth, 1, 31);
    return `${minute} ${hour} ${dayOfMonth} * *`;
  }

  return draft.cronCustom.trim();
}

const toFlowDraft = (flow: NotificationFlow): FlowDraft => ({
  ...(function () {
    const parsed = parseCronExpressionConfig(flow.cronExpression);
    return {
      cronPreset: parsed.preset,
      cronHour: parsed.hour,
      cronMinute: parsed.minute,
      cronWeekday: parsed.weekday,
      cronDayOfMonth: parsed.dayOfMonth,
      cronCustom: parsed.custom,
    };
  })(),
  name: flow.name,
  category: flow.category,
  triggerType: flow.triggerType,
  eventName: flow.eventName ?? "",
  isEnabled: flow.isEnabled,
  maxPerDay: flow.maxPerDay,
  reminderLeadMinutes: readConfigNumber(
    flow.triggerConfig,
    "leadMinutes",
    flow.slug === "op_tournament_confirmation_2h30" ? 150 : 60,
  ),
  reminderWindowMinutes: readConfigNumber(flow.triggerConfig, "windowMinutes", 10),
  inactivityDays: readConfigNumber(flow.triggerConfig, "inactivityDays", 30),
  newcomerDays: readConfigNumber(flow.triggerConfig, "newcomerDays", 30),
});

const parseVariables = (raw: string) =>
  raw
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

const categoryLabelMap: Record<NotificationCategory, string> = {
  operational: "Операционные",
  gamification: "Геймификация",
  statistics: "Статистика",
};

const hasTriggerSettings = (flowSlug: string) =>
  flowSlug === "op_tournament_reminder_1h" ||
  flowSlug === "op_tournament_confirmation_2h30" ||
  flowSlug === "op_inactive_30_days" ||
  flowSlug === "op_newcomer_no_games";

const buildTriggerConfigFromDraft = (
  flowSlug: string,
  draft: FlowDraft,
): Record<string, unknown> | undefined => {
  if (
    flowSlug === "op_tournament_reminder_1h" ||
    flowSlug === "op_tournament_confirmation_2h30"
  ) {
    return {
      leadMinutes: Math.max(1, draft.reminderLeadMinutes),
      windowMinutes: Math.max(1, draft.reminderWindowMinutes),
    };
  }

  if (flowSlug === "op_inactive_30_days") {
    return {
      inactivityDays: Math.max(1, draft.inactivityDays),
    };
  }

  if (flowSlug === "op_newcomer_no_games") {
    return {
      newcomerDays: Math.max(1, draft.newcomerDays),
    };
  }

  return undefined;
};

function FlowSettingsForm({ flow, pending, onSave }: FlowSettingsFormProps) {
  const [draft, setDraft] = useState<FlowDraft>(() => toFlowDraft(flow));

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <FormField
          label="Название"
          inputProps={{
            value: draft.name,
            onChange: (event) =>
              setDraft((current) => ({
                ...current,
                name: event.target.value,
              })),
          }}
        />

        <FormField
          as="select"
          label="Категория"
          options={[
            { value: "operational", label: "Операционные" },
            { value: "gamification", label: "Геймификация" },
            { value: "statistics", label: "Статистика" },
          ]}
          selectProps={{
            value: draft.category,
            onChange: (event) =>
              setDraft((current) => ({
                ...current,
                category: event.target.value as NotificationCategory,
              })),
          }}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <FormField
          as="select"
          label="Тип триггера"
          options={[
            { value: "event", label: "Event" },
            { value: "cron", label: "Cron" },
            { value: "manual", label: "Manual" },
          ]}
          selectProps={{
            value: draft.triggerType,
            onChange: (event) =>
              setDraft((current) => ({
                ...current,
                triggerType: event.target.value as NotificationTriggerType,
              })),
          }}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <FormField
          label="Event Name"
          inputProps={{
            value: draft.eventName,
            onChange: (event) =>
              setDraft((current) => ({
                ...current,
                eventName: event.target.value,
              })),
            placeholder: "tournament_created",
          }}
        />
      </div>

      {draft.triggerType === "cron" ? (
        <div className="space-y-3 rounded-lg border border-[var(--line)] bg-gray-50 p-3">
          <FormField
            as="select"
            label="Регулярность"
            options={[
              { value: "every_5_minutes", label: "Каждые 5 минут" },
              { value: "daily", label: "Ежедневно" },
              { value: "weekly", label: "Еженедельно" },
              { value: "monthly", label: "Ежемесячно" },
              { value: "custom", label: "Кастом (для тех.админа)" },
            ]}
            selectProps={{
              value: draft.cronPreset,
              onChange: (event) =>
                setDraft((current) => ({
                  ...current,
                  cronPreset: event.target.value as CronPreset,
                })),
            }}
          />

          {draft.cronPreset === "daily" ||
          draft.cronPreset === "weekly" ||
          draft.cronPreset === "monthly" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <FormField
                label="Час (0-23)"
                inputProps={{
                  type: "number",
                  min: 0,
                  max: 23,
                  value: String(draft.cronHour),
                  onChange: (event) =>
                    setDraft((current) => ({
                      ...current,
                      cronHour: parseInteger(event.target.value, 10),
                    })),
                }}
              />
              <FormField
                label="Минута (0-59)"
                inputProps={{
                  type: "number",
                  min: 0,
                  max: 59,
                  value: String(draft.cronMinute),
                  onChange: (event) =>
                    setDraft((current) => ({
                      ...current,
                      cronMinute: parseInteger(event.target.value, 0),
                    })),
                }}
              />
            </div>
          ) : null}

          {draft.cronPreset === "weekly" ? (
            <FormField
              as="select"
              label="День недели"
              options={[
                { value: "1", label: "Понедельник" },
                { value: "2", label: "Вторник" },
                { value: "3", label: "Среда" },
                { value: "4", label: "Четверг" },
                { value: "5", label: "Пятница" },
                { value: "6", label: "Суббота" },
                { value: "0", label: "Воскресенье" },
              ]}
              selectProps={{
                value: String(draft.cronWeekday),
                onChange: (event) =>
                  setDraft((current) => ({
                    ...current,
                    cronWeekday: parseInteger(event.target.value, 1),
                  })),
              }}
            />
          ) : null}

          {draft.cronPreset === "monthly" ? (
            <FormField
              label="День месяца (1-31)"
              inputProps={{
                type: "number",
                min: 1,
                max: 31,
                value: String(draft.cronDayOfMonth),
                onChange: (event) =>
                  setDraft((current) => ({
                    ...current,
                    cronDayOfMonth: parseInteger(event.target.value, 1),
                  })),
              }}
            />
          ) : null}

          {draft.cronPreset === "custom" ? (
            <FormField
              label="Cron Expression"
              inputProps={{
                value: draft.cronCustom,
                onChange: (event) =>
                  setDraft((current) => ({
                    ...current,
                    cronCustom: event.target.value,
                  })),
                placeholder: "0 10 * * 1",
              }}
            />
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <FormField
          label="Max / день"
          inputProps={{
            type: "number",
            value: String(draft.maxPerDay),
            onChange: (event) =>
              setDraft((current) => ({
                ...current,
                maxPerDay: parseInteger(event.target.value, 0),
              })),
          }}
        />
      </div>

      {hasTriggerSettings(flow.slug) ? (
        <div className="space-y-3 rounded-lg border border-[var(--line)] bg-gray-50 p-3">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            Дополнительные параметры
          </p>

          {flow.slug === "op_tournament_reminder_1h" ||
          flow.slug === "op_tournament_confirmation_2h30" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <FormField
                label="За сколько минут напоминать"
                inputProps={{
                  type: "number",
                  min: 1,
                  value: String(draft.reminderLeadMinutes),
                  onChange: (event) =>
                    setDraft((current) => ({
                      ...current,
                      reminderLeadMinutes: parseInteger(
                        event.target.value,
                        flow.slug === "op_tournament_confirmation_2h30"
                          ? 150
                          : 60,
                      ),
                    })),
                }}
              />
              <FormField
                label="Ширина окна (минут)"
                inputProps={{
                  type: "number",
                  min: 1,
                  value: String(draft.reminderWindowMinutes),
                  onChange: (event) =>
                    setDraft((current) => ({
                      ...current,
                      reminderWindowMinutes: parseInteger(event.target.value, 10),
                    })),
                }}
              />
            </div>
          ) : null}

          {flow.slug === "op_inactive_30_days" ? (
            <FormField
              label="Сколько дней считать неактивностью"
              inputProps={{
                type: "number",
                min: 1,
                value: String(draft.inactivityDays),
                onChange: (event) =>
                  setDraft((current) => ({
                    ...current,
                    inactivityDays: parseInteger(event.target.value, 30),
                  })),
              }}
            />
          ) : null}

          {flow.slug === "op_newcomer_no_games" ? (
            <FormField
              label="Сколько дней считать новичком"
              inputProps={{
                type: "number",
                min: 1,
                value: String(draft.newcomerDays),
                onChange: (event) =>
                  setDraft((current) => ({
                    ...current,
                    newcomerDays: parseInteger(event.target.value, 30),
                  })),
              }}
            />
          ) : null}
        </div>
      ) : null}

      <label className="inline-flex items-center gap-2 text-sm text-[var(--text-primary)]">
        <input
          type="checkbox"
          checked={draft.isEnabled}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              isEnabled: event.target.checked,
            }))
          }
        />
        Включено
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onSave(draft)}
          disabled={pending}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Сохраняем..." : "Сохранить Флоу"}
        </button>
        <button
          type="button"
          onClick={() => setDraft(toFlowDraft(flow))}
          className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium transition hover:bg-gray-50"
        >
          Сбросить
        </button>
      </div>
    </div>
  );
}

function TemplateVersionForm({
  flow,
  initialTemplate,
  pending,
  onSubmit,
}: TemplateVersionFormProps) {
  const [title, setTitle] = useState(initialTemplate?.title ?? "");
  const [body, setBody] = useState(initialTemplate?.body ?? "");
  const [parseMode, setParseMode] = useState<"none" | "MarkdownV2" | "HTML">(
    initialTemplate?.parseMode ?? "none",
  );
  const [variables, setVariables] = useState(
    (initialTemplate?.variables ?? []).join(","),
  );
  const [activate, setActivate] = useState(true);

  return (
    <div className="space-y-3 rounded-lg border border-[var(--line)] bg-gray-50/40 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        Новая Версия Шаблона Для "{flow.name}"
      </p>

      <FormField
        label="Заголовок (опционально)"
        inputProps={{
          value: title,
          onChange: (event) => setTitle(event.target.value),
        }}
      />

      <FormField
        as="textarea"
        label="Тело шаблона"
        textareaProps={{
          rows: 6,
          value: body,
          onChange: (event) => setBody(event.target.value),
          placeholder:
            "Пример: Привет, {user_name}! Вы зарегистрированы на {tournament_name}.",
        }}
      />

      <div className="grid gap-3 md:grid-cols-2">
        <FormField
          as="select"
          label="Parse mode"
          options={[
            { value: "none", label: "Без parse mode" },
            { value: "MarkdownV2", label: "MarkdownV2" },
            { value: "HTML", label: "HTML" },
          ]}
          selectProps={{
            value: parseMode,
            onChange: (event) =>
              setParseMode(
                event.target.value as "none" | "MarkdownV2" | "HTML",
              ),
          }}
        />

        <FormField
          label="Переменные (через запятую)"
          inputProps={{
            value: variables,
            onChange: (event) => setVariables(event.target.value),
            placeholder: "user_name,tournament_name",
          }}
        />
      </div>

      <label className="inline-flex items-center gap-2 text-sm text-[var(--text-primary)]">
        <input
          type="checkbox"
          checked={activate}
          onChange={(event) => setActivate(event.target.checked)}
        />
        Активировать сразу после создания
      </label>

      <button
        type="button"
        onClick={() =>
          onSubmit({
            title: title.trim() || null,
            body: body.trim(),
            parseMode: parseMode === "none" ? null : parseMode,
            variables: parseVariables(variables),
            activate,
          })
        }
        disabled={pending}
        className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Создаем..." : "Создать Версию Шаблона"}
      </button>
    </div>
  );
}

export function NotificationsPage() {
  const utils = trpc.useUtils();
  const { state, countBroadcastRecipients, createBroadcast, sendBroadcast } =
    useAdminData();
  const [selectedFlowId, setSelectedFlowId] = useState<number | null>(null);
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [manualMessage, setManualMessage] = useState("");
  const [manualAudience, setManualAudience] = useState<"all" | "users">("all");
  const [manualUserQuery, setManualUserQuery] = useState("");
  const [manualTargetUserIds, setManualTargetUserIds] = useState<number[]>([]);
  const [isManualSending, setIsManualSending] = useState(false);

  const flowsQuery = trpc.admin.notifications.flows.list.useQuery(undefined, {
    staleTime: 30_000,
  });
  const flows = useMemo(
    () => (flowsQuery.data ?? []) as NotificationFlow[],
    [flowsQuery.data],
  );

  const resolvedSelectedFlowId = useMemo(() => {
    if (
      selectedFlowId !== null &&
      flows.some((flow) => flow.id === selectedFlowId)
    ) {
      return selectedFlowId;
    }

    return flows[0]?.id ?? null;
  }, [flows, selectedFlowId]);

  const selectedFlow = useMemo(
    () => flows.find((flow) => flow.id === resolvedSelectedFlowId) ?? null,
    [flows, resolvedSelectedFlowId],
  );

  const templatesQuery = trpc.admin.notifications.templates.list.useQuery(
    { flowId: resolvedSelectedFlowId ?? 0 },
    { enabled: resolvedSelectedFlowId !== null, staleTime: 30_000 },
  );

  const runsQuery = trpc.admin.notifications.runs.list.useQuery({
    page: 1,
    pageSize: 20,
  });

  const jobsQuery = trpc.admin.notifications.jobs.list.useQuery({
    page: 1,
    pageSize: 20,
  });

  const templates = useMemo(
    () => (templatesQuery.data ?? []) as NotificationTemplate[],
    [templatesQuery.data],
  );
  const activeTemplate = useMemo(
    () => templates.find((template) => template.isActive) ?? null,
    [templates],
  );
  const runs = useMemo(
    () => (runsQuery.data?.rows ?? []) as NotificationRun[],
    [runsQuery.data],
  );
  const jobs = useMemo(
    () => (jobsQuery.data?.rows ?? []) as NotificationJob[],
    [jobsQuery.data],
  );
  const onboardedUsers = useMemo(
    () =>
      [...state.users]
        .filter((user) => user.isOnboarded)
        .sort((a, b) => a.login.localeCompare(b.login, "ru")),
    [state.users],
  );
  const filteredManualUsers = useMemo(() => {
    const normalized = manualUserQuery.trim().toLowerCase();

    if (!normalized) {
      return onboardedUsers;
    }

    return onboardedUsers.filter((user) => {
      return (
        user.login.toLowerCase().includes(normalized) ||
        user.name.toLowerCase().includes(normalized) ||
        (user.telegramUsername ?? "").toLowerCase().includes(normalized) ||
        String(user.id).includes(normalized)
      );
    });
  }, [manualUserQuery, onboardedUsers]);
  const manualRecipientsCount = useMemo(
    () =>
      countBroadcastRecipients(
        manualAudience,
        null,
        null,
        manualTargetUserIds,
      ),
    [countBroadcastRecipients, manualAudience, manualTargetUserIds],
  );

  const updateFlowMutation = trpc.admin.notifications.flows.update.useMutation({
    onSuccess: async () => {
      await Promise.all([
        flowsQuery.refetch(),
        runsQuery.refetch(),
        jobsQuery.refetch(),
      ]);
      setNotice({ type: "success", text: "Настройки флоу сохранены" });
    },
    onError: (error: unknown) => {
      setNotice({
        type: "error",
        text: getErrorMessage(error, "Не удалось обновить флоу"),
      });
    },
  });

  const createTemplateMutation =
    trpc.admin.notifications.templates.createVersion.useMutation({
      onSuccess: async () => {
        await templatesQuery.refetch();
        await utils.admin.notifications.flows.list.invalidate();
        setNotice({ type: "success", text: "Новая версия шаблона создана" });
      },
      onError: (error: unknown) => {
        setNotice({
          type: "error",
          text: getErrorMessage(error, "Не удалось создать шаблон"),
        });
      },
    });

  const activateTemplateMutation =
    trpc.admin.notifications.templates.activate.useMutation({
      onSuccess: async () => {
        await templatesQuery.refetch();
        setNotice({ type: "success", text: "Шаблон активирован" });
      },
      onError: (error: unknown) => {
        setNotice({
          type: "error",
          text: getErrorMessage(error, "Не удалось активировать шаблон"),
        });
      },
    });

  const runCronMutation = trpc.admin.notifications.cron.runNow.useMutation({
    onSuccess: async (result: {
      processedFlows: number;
      sent: number;
      failed: number;
    }) => {
      await Promise.all([runsQuery.refetch(), jobsQuery.refetch()]);
      setNotice({
        type: "success",
        text: `Cron выполнен: флоу ${result.processedFlows}, отправлено ${result.sent}, ошибок ${result.failed}`,
      });
    },
    onError: (error: unknown) => {
      setNotice({
        type: "error",
        text: getErrorMessage(error, "Не удалось запустить cron"),
      });
    },
  });

  useEffect(() => {
    if (notice) {
      const timeout = setTimeout(() => setNotice(null), 4_000);
      return () => clearTimeout(timeout);
    }
  }, [notice]);

  const toggleManualUser = (userId: number) => {
    setManualTargetUserIds((current) =>
      current.includes(userId)
        ? current.filter((value) => value !== userId)
        : [...current, userId],
    );
  };

  const selectAllFilteredUsers = () => {
    setManualTargetUserIds((current) => {
      const next = new Set(current);

      for (const user of filteredManualUsers) {
        next.add(user.id);
      }

      return Array.from(next);
    });
  };

  const clearManualUsers = () => {
    setManualTargetUserIds([]);
  };

  const handleSendManualBroadcast = async () => {
    if (isManualSending) {
      return;
    }

    if (!manualMessage.trim()) {
      setNotice({
        type: "error",
        text: "Введите текст общей рассылки",
      });
      return;
    }

    if (manualAudience === "users" && manualTargetUserIds.length === 0) {
      setNotice({
        type: "error",
        text: "Выберите хотя бы одного пользователя",
      });
      return;
    }

    setIsManualSending(true);

    const broadcastId = await createBroadcast({
      message: manualMessage.trim(),
      targetFilter: manualAudience,
      targetUserIds: manualAudience === "users" ? manualTargetUserIds : null,
      targetSeriesId: null,
      targetTournamentId: null,
    });

    if (!broadcastId) {
      setIsManualSending(false);
      setNotice({
        type: "error",
        text: "Не удалось создать общую рассылку",
      });
      return;
    }

    const sent = await sendBroadcast(broadcastId);
    setIsManualSending(false);

    if (!sent) {
      setNotice({
        type: "error",
        text: "Не удалось отправить общую рассылку",
      });
      return;
    }

    setManualMessage("");
    setManualUserQuery("");
    setManualTargetUserIds([]);
    setNotice({
      type: "success",
      text: "Общая рассылка отправлена",
    });
  };

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-['Space_Grotesk'] text-2xl font-bold">
          Уведомления
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              runCronMutation.mutate({
                force: true,
                flowSlugs: selectedFlow ? [selectedFlow.slug] : undefined,
              });
            }}
            disabled={runCronMutation.isPending}
            className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {runCronMutation.isPending
              ? "Cron выполняется..."
              : selectedFlow
                ? "Прогнать cron для выбранного flow"
                : "Прогнать cron"}
          </button>
          <button
            type="button"
            onClick={() => {
              void Promise.all([
                flowsQuery.refetch(),
                templatesQuery.refetch(),
                runsQuery.refetch(),
                jobsQuery.refetch(),
              ]);
            }}
            className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium transition hover:bg-gray-50"
          >
            Обновить
          </button>
        </div>
      </div>

      {!flowsQuery.isLoading && flows.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          В базе нет настроенных notification flow. Запусти на backend команду{" "}
          <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs">
            bun run db:seed:notifications
          </code>
          , затем нажми "Обновить".
        </div>
      ) : null}

      <div className="grid min-w-0 gap-4 xl:grid-cols-[1fr_1.2fr]">
        <section className="min-w-0 space-y-3 rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Флоу
          </h2>

          <DataTable
            rows={flows}
            getRowKey={(row) => row.id}
            emptyLabel={
              flowsQuery.isLoading ? "Загрузка..." : "Флоу не найдены"
            }
            columns={[
              {
                header: "Название",
                render: (row) => (
                  <button
                    type="button"
                    onClick={() => setSelectedFlowId(row.id)}
                    className={`text-left ${
                      row.id === resolvedSelectedFlowId
                        ? "font-semibold text-[var(--accent)]"
                        : "text-[var(--text-primary)]"
                    }`}
                  >
                    {row.name}
                  </button>
                ),
              },
              {
                header: "Категория",
                render: (row) => categoryLabelMap[row.category],
              },
              { header: "Триггер", render: (row) => row.triggerType },
              {
                header: "Статус",
                render: (row) => (
                  <StatusBadge
                    status={row.isEnabled ? "enabled" : "disabled"}
                  />
                ),
              },
            ]}
          />
        </section>

        <section className="min-w-0 space-y-4 rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Настройки Выбранного Флоу
          </h2>

          {selectedFlow ? (
            <p className="text-xs text-[var(--text-muted)]">
              Slug: <span className="font-mono">{selectedFlow.slug}</span>
            </p>
          ) : null}

          {selectedFlow ? (
            <FlowSettingsForm
              key={selectedFlow.id}
              flow={selectedFlow}
              pending={updateFlowMutation.isPending}
              onSave={(draft) => {
                const nextCronExpression =
                  draft.triggerType === "cron"
                    ? buildCronExpressionFromDraft(draft)
                    : null;
                const cronExpressionText = nextCronExpression?.trim() ?? "";

                if (
                  draft.triggerType === "cron" &&
                  !cronExpressionText
                ) {
                  setNotice({
                    type: "error",
                    text: "Укажи корректную регулярность для cron.",
                  });
                  return;
                }

                updateFlowMutation.mutate({
                  flowId: selectedFlow.id,
                  name: draft.name.trim(),
                  category: draft.category,
                  triggerType: draft.triggerType,
                  eventName:
                    draft.triggerType === "event"
                      ? draft.eventName.trim() || null
                      : null,
                  cronExpression: draft.triggerType === "cron" ? cronExpressionText : null,
                  isEnabled: draft.isEnabled,
                  maxPerDay: draft.maxPerDay,
                  triggerConfig: buildTriggerConfigFromDraft(selectedFlow.slug, draft),
                });
              }}
            />
          ) : (
            <p className="text-sm text-[var(--text-muted)]">
              Выберите флоу из списка слева.
            </p>
          )}
        </section>
      </div>

      {selectedFlow?.slug === "op_manual_broadcast_all" ? (
        <section className="space-y-4 rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Ручная отправка
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              Используй этот блок для общей рассылки. Отправка идёт через выбранный flow.
            </p>
          </div>

          <FormField
            as="textarea"
            label="Текст сообщения"
            textareaProps={{
              rows: 6,
              value: manualMessage,
              onChange: (event) => setManualMessage(event.target.value),
              placeholder: "Введите текст рассылки...",
            }}
          />

          <FormField
            as="select"
            label="Кому отправить"
            options={[
              { value: "all", label: "Всем пользователям" },
              { value: "users", label: "Выбранным пользователям" },
            ]}
            selectProps={{
              value: manualAudience,
              onChange: (event) =>
                setManualAudience(event.target.value as "all" | "users"),
            }}
          />

          {manualAudience === "users" ? (
            <div className="space-y-3 rounded-lg border border-[var(--line)] bg-gray-50/50 p-4">
              <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
                <FormField
                  label="Поиск пользователей"
                  inputProps={{
                    value: manualUserQuery,
                    onChange: (event) => setManualUserQuery(event.target.value),
                    placeholder: "Ник, имя, @username или ID",
                  }}
                />
                <button
                  type="button"
                  onClick={selectAllFilteredUsers}
                  className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium transition hover:bg-gray-50"
                >
                  Выбрать найденных
                </button>
                <button
                  type="button"
                  onClick={clearManualUsers}
                  className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium transition hover:bg-gray-50"
                >
                  Очистить
                </button>
              </div>

              <div className="rounded-lg border border-[var(--line)] bg-white">
                <div className="border-b border-[var(--line)] px-3 py-2 text-sm text-[var(--text-muted)]">
                  Выбрано пользователей: {manualRecipientsCount}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {filteredManualUsers.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-[var(--text-muted)]">
                      Пользователи не найдены
                    </div>
                  ) : (
                    filteredManualUsers.map((user) => {
                      const checked = manualTargetUserIds.includes(user.id);

                      return (
                        <label
                          key={user.id}
                          className="flex cursor-pointer items-start gap-3 border-b border-[var(--line)] px-3 py-3 last:border-b-0 hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleManualUser(user.id)}
                            className="mt-0.5 h-4 w-4 rounded border-[var(--line)] text-[var(--accent)] focus:ring-[var(--accent)]"
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-[var(--text-primary)]">
                              {user.login}
                            </div>
                            <div className="text-xs text-[var(--text-muted)]">
                              {user.name}
                              {user.telegramUsername
                                ? ` · @${user.telegramUsername}`
                                : ""}
                              {` · ID ${user.id}`}
                            </div>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-[var(--line)] bg-gray-50/50 px-4 py-3 text-sm text-[var(--text-muted)]">
              Сообщение будет отправлено всем пользователям, которые уже прошли онбординг.
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[var(--text-muted)]">
              Получателей: {manualRecipientsCount}
            </p>
            <button
              type="button"
              onClick={() => void handleSendManualBroadcast()}
              disabled={
                isManualSending ||
                !manualMessage.trim() ||
                manualRecipientsCount === 0
              }
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isManualSending ? "Отправляем..." : "Отправить сообщение"}
            </button>
          </div>
        </section>
      ) : null}

      <div className="grid min-w-0 gap-4 xl:grid-cols-[1.1fr_1fr]">
        <section className="min-w-0 space-y-3 rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Шаблоны
          </h2>

          <DataTable
            rows={templates}
            getRowKey={(row) => row.id}
            emptyLabel={
              templatesQuery.isLoading ? "Загрузка..." : "Шаблонов пока нет"
            }
            columns={[
              { header: "Версия", render: (row) => `v${row.version}` },
              { header: "Заголовок", render: (row) => row.title ?? "—" },
              {
                header: "Статус",
                render: (row) =>
                  row.isActive ? (
                    <StatusBadge status="active" />
                  ) : (
                    <button
                      type="button"
                      disabled={activateTemplateMutation.isPending}
                      onClick={() =>
                        activateTemplateMutation.mutate({ templateId: row.id })
                      }
                      className="rounded-md border border-[var(--line)] px-2.5 py-1 text-xs font-semibold transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Активировать
                    </button>
                  ),
              },
              { header: "Создан", render: (row) => toDateLabel(row.createdAt) },
            ]}
          />

          {activeTemplate ? (
            <div className="space-y-2 rounded-lg border border-[var(--line)] bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Активный Шаблон (v{activeTemplate.version})
              </p>
              <p className="text-sm text-[var(--text-primary)]">
                {activeTemplate.title ?? "Без заголовка"}
              </p>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-gray-50 p-2 text-xs text-[var(--text-primary)]">
                {activeTemplate.body}
              </pre>
              <p className="text-xs text-[var(--text-muted)]">
                Parse mode: {activeTemplate.parseMode ?? "none"} | Переменные:{" "}
                {activeTemplate.variables.length > 0
                  ? activeTemplate.variables.join(", ")
                  : "нет"}
              </p>
            </div>
          ) : null}

          {selectedFlow ? (
            <TemplateVersionForm
              key={`${selectedFlow.id}:${activeTemplate?.id ?? "none"}`}
              flow={selectedFlow}
              initialTemplate={activeTemplate}
              pending={createTemplateMutation.isPending}
              onSubmit={(payload) => {
                if (!payload.body.trim()) {
                  setNotice({
                    type: "error",
                    text: "Тело шаблона не может быть пустым",
                  });
                  return;
                }

                createTemplateMutation.mutate({
                  flowId: selectedFlow.id,
                  title: payload.title,
                  body: payload.body,
                  parseMode: payload.parseMode,
                  variables: payload.variables,
                  activate: payload.activate,
                });
              }}
            />
          ) : null}
        </section>

        <section className="min-w-0 space-y-3 rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Запуски И Джобы
          </h2>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Последние Runs
            </p>
            <DataTable
              rows={runs}
              getRowKey={(row) => row.id}
              emptyLabel={
                runsQuery.isLoading ? "Загрузка..." : "Запусков пока нет"
              }
              columns={[
                { header: "ID", render: (row) => row.id },
                { header: "Flow", render: (row) => row.flowSlug },
                {
                  header: "Status",
                  render: (row) => <StatusBadge status={row.status} />,
                },
                {
                  header: "Source",
                  render: (row) => row.sourceId ?? row.sourceType,
                },
                {
                  header: "Создан",
                  render: (row) => toDateLabel(row.createdAt),
                },
              ]}
            />
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Последние Jobs
            </p>
            <DataTable
              rows={jobs}
              getRowKey={(row) => row.id}
              emptyLabel={
                jobsQuery.isLoading ? "Загрузка..." : "Джобов пока нет"
              }
              columns={[
                { header: "ID", render: (row) => row.id },
                { header: "Flow", render: (row) => row.flowSlug },
                { header: "User", render: (row) => row.userId },
                {
                  header: "Status",
                  render: (row) => <StatusBadge status={row.status} />,
                },
                {
                  header: "Попытки",
                  render: (row) => `${row.attempts}/${row.maxAttempts}`,
                },
                {
                  header: "Отправлено",
                  render: (row) => toDateLabel(row.sentAt),
                },
              ]}
            />
          </div>
        </section>
      </div>

      {notice ? (
        <div
          className={`rounded-xl border p-3 text-sm ${
            notice.type === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {notice.text}
        </div>
      ) : null}
    </div>
  );
}
