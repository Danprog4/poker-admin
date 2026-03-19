import { FormField } from './FormField'
import type { RequirementState } from '../lib/status-editor'
import { REQUIREMENT_FIELDS } from '../lib/status-editor'

export function StatusRequirementsEditor({
  value,
  onChange,
}: {
  value: RequirementState
  onChange: (next: RequirementState) => void
}) {
  return (
    <div className="space-y-3 rounded-xl border border-[var(--line)] bg-gray-50/70 p-4">
      <div>
        <h3 className="font-semibold text-[var(--text-primary)]">Условия получения</h3>
        <p className="text-sm text-[var(--text-muted)]">
          Вместо JSON выбери только те условия, которые реально нужны для этого статуса.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {REQUIREMENT_FIELDS.map((field) =>
          field.type === 'number' ? (
            <FormField
              key={field.key}
              label={field.label}
              inputProps={{
                value: value[field.key],
                inputMode: 'numeric',
                placeholder: field.placeholder,
                onChange: (event) =>
                  onChange({
                    ...value,
                    [field.key]: event.target.value.replace(/[^\d]/g, ''),
                  }),
              }}
            />
          ) : (
            <FormField
              key={field.key}
              as="select"
              label={field.label}
              options={[
                { value: 'false', label: 'Нет' },
                { value: 'true', label: 'Да' },
              ]}
              selectProps={{
                value: value[field.key],
                onChange: (event) =>
                  onChange({
                    ...value,
                    [field.key]: event.target.value,
                  }),
              }}
            />
          ),
        )}
      </div>
    </div>
  )
}
