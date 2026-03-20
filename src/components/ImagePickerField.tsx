import { useRef, type ChangeEvent } from 'react'

import { fileToDataUrl } from '../lib/imageUpload'
import { useToast } from '../providers/ToastProvider'
import { FormField } from './FormField'

type ImageOption = {
  value: string
  label: string
}

type ImagePickerFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  options: ImageOption[]
  previewLabel?: string
  previewMode?: 'default' | 'inactive-medal'
  allowUrlInput?: boolean
  allowExistingOptions?: boolean
}

export function ImagePickerField({
  label,
  value,
  onChange,
  options,
  previewLabel = 'Превью',
  previewMode = 'default',
  allowUrlInput = true,
  allowExistingOptions = true,
}: ImagePickerFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { error } = useToast()
  const previewImageClassName =
    previewMode === 'inactive-medal'
      ? 'h-full w-full object-contain grayscale opacity-45'
      : 'h-full w-full object-contain'
  const previewSingleImageClassName =
    previewMode === 'inactive-medal'
      ? 'max-h-28 w-auto object-contain grayscale opacity-45'
      : 'max-h-28 w-auto object-contain'

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    try {
      const dataUrl = await fileToDataUrl(file)
      onChange(dataUrl)
    } catch {
      error('Не удалось обработать выбранное изображение')
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-[var(--line)] bg-gray-50/70 p-4">
      <div className="space-y-1">
        <h3 className="font-semibold text-[var(--text-primary)]">{label}</h3>
        <p className="text-sm text-[var(--text-muted)]">
          {allowUrlInput && allowExistingOptions
            ? 'Можно вставить URL, загрузить новый файл или выбрать уже существующую картинку.'
            : allowUrlInput
              ? 'Можно вставить URL или загрузить новый файл.'
              : allowExistingOptions
                ? 'Можно загрузить новый файл или выбрать уже существующую картинку.'
                : 'Загрузи новый файл, чтобы увидеть его превью.'}
        </p>
      </div>

      {allowUrlInput ? (
        <FormField
          label="URL картинки"
          inputProps={{
            value,
            placeholder: 'https://... или /images/...',
            onChange: (event) => onChange(event.target.value),
          }}
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium transition hover:bg-gray-50"
        >
          Загрузить файл
        </button>
        {value.trim() ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium transition hover:bg-gray-50"
          >
            Очистить
          </button>
        ) : null}
      </div>

      {allowExistingOptions && options.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Выбрать из уже существующих
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {options.map((option) => {
              const isSelected = option.value === value

              return (
                <button
                  key={`${label}-${option.value}`}
                  type="button"
                  onClick={() => onChange(option.value)}
                  className={`overflow-hidden rounded-xl border text-left transition ${
                    isSelected
                      ? 'border-[var(--accent)] bg-indigo-50'
                      : 'border-[var(--line)] bg-white hover:border-[var(--accent)]/40'
                  }`}
                >
                  <div className="flex h-28 items-center justify-center bg-gray-100 p-3">
                    <img
                      src={option.value}
                      alt={option.label}
                      className={previewImageClassName}
                    />
                  </div>
                  <div className="px-3 py-2 text-sm text-[var(--text-primary)]">
                    <span className="line-clamp-2">{option.label}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {value.trim() ? (
        <div className="rounded-xl border border-[var(--line)] bg-white p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            {previewLabel}
          </p>
          <div className="flex min-h-28 items-center justify-center rounded-xl bg-gray-50 p-4">
            <img src={value} alt={previewLabel} className={previewSingleImageClassName} />
          </div>
        </div>
      ) : null}
    </div>
  )
}
