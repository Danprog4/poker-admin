import type {
  FocusEvent,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

import { replaceLeadingZeroOnFocus } from '../lib/number-input'

type Option = {
  label: string
  value: string
}

type BaseProps = {
  label: string
  error?: string
}

type InputProps = BaseProps & {
  as?: 'input'
  inputProps?: InputHTMLAttributes<HTMLInputElement>
}

type TextareaProps = BaseProps & {
  as: 'textarea'
  textareaProps?: TextareaHTMLAttributes<HTMLTextAreaElement>
}

type SelectProps = BaseProps & {
  as: 'select'
  selectProps?: SelectHTMLAttributes<HTMLSelectElement>
  options: Option[]
}

type FormFieldProps = InputProps | TextareaProps | SelectProps

export function FormField(props: FormFieldProps) {
  const sharedClassName =
    'w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-indigo-100 read-only:bg-gray-50 read-only:text-[var(--text-muted)]'

  const normalizedInputProps =
    props.as !== 'textarea' && props.as !== 'select'
      ? {
          ...props.inputProps,
          onFocus: (event: FocusEvent<HTMLInputElement>) => {
            if (props.inputProps?.type === 'number') {
              replaceLeadingZeroOnFocus(event)
            }

            props.inputProps?.onFocus?.(event)
          },
        }
      : undefined

  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{props.label}</span>

      {props.as === 'textarea' ? (
        <textarea className={sharedClassName} {...props.textareaProps} />
      ) : null}

      {props.as === 'select' ? (
        <select className={sharedClassName} {...props.selectProps}>
          {props.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : null}

      {props.as !== 'textarea' && props.as !== 'select' ? (
        <input className={sharedClassName} {...normalizedInputProps} />
      ) : null}

      {props.error ? <p className="text-sm text-[var(--danger)]">{props.error}</p> : null}
    </label>
  )
}
