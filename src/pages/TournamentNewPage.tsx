import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { FormField } from '../components/FormField'
import { fileToDataUrl } from '../lib/imageUpload'
import { useAdminData } from '../providers/useAdminData'

export function TournamentNewPage() {
  const navigate = useNavigate()
  const { state, createTournament, activeSeries } = useAdminData()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [format, setFormat] = useState('NLH')
  const [address, setAddress] = useState('')
  const [locationHint, setLocationHint] = useState('')
  const [date, setDate] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(100)
  const [seriesId, setSeriesId] = useState<string>(
    activeSeries ? String(activeSeries.id) : 'none',
  )
  const [medalId, setMedalId] = useState('none')
  const [imageUrl, setImageUrl] = useState('')
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [isImageLoading, setIsImageLoading] = useState(false)
  const [prizeInfo, setPrizeInfo] = useState('')
  const [isSignificant, setIsSignificant] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const seriesOptions = useMemo(
    () => [
      { value: 'none', label: 'Без серии' },
      ...state.series.map((item) => ({ value: String(item.id), label: item.name })),
    ],
    [state.series],
  )

  const medalOptions = useMemo(
    () => [
      { value: 'none', label: 'Без медали' },
      ...state.achievements
        .filter((item) => item.iconUrl || item.inactiveIconUrl)
        .map((item) => ({
          value: String(item.id),
          label: item.category ? `${item.name} (${item.category})` : item.name,
        })),
    ],
    [state.achievements],
  )

  const handleSubmit = async () => {
    if (isSubmitting) {
      return
    }

    if (!name.trim() || !date) {
      setErrorMessage('Заполни название и дату турнира')
      return
    }

    const finalImageUrl = imageDataUrl ?? (imageUrl.trim() ? imageUrl.trim() : null)
    setErrorMessage('')
    setIsSubmitting(true)

    const created = await createTournament({
      name: name.trim(),
      description: description.trim(),
      format: format.trim(),
      address: address.trim(),
      locationHint: locationHint.trim(),
      date: new Date(date).toISOString(),
      maxPlayers,
      seriesId: seriesId === 'none' ? null : Number(seriesId),
      medalId: medalId === 'none' ? null : Number(medalId),
      imageUrl: finalImageUrl,
      isSignificant,
      prizeInfo: prizeInfo.trim(),
    })

    setIsSubmitting(false)

    if (!created) {
      setErrorMessage('Не удалось создать турнир. Попробуй ещё раз.')
      return
    }

    navigate('/tournaments')
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setErrorMessage('')
    setIsImageLoading(true)

    try {
      const dataUrl = await fileToDataUrl(file)
      setImageDataUrl(dataUrl)
      setImageUrl('')
    } catch {
      setErrorMessage('Не удалось обработать выбранное изображение')
    } finally {
      setIsImageLoading(false)

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleClearImage = () => {
    setImageDataUrl(null)
    setImageUrl('')
  }

  const previewImage = imageDataUrl ?? (imageUrl.trim() ? imageUrl.trim() : null)

  return (
    <div className="space-y-4 rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
      <h1 className="font-['Space_Grotesk'] text-2xl font-bold">Новый турнир</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          label="Название"
          inputProps={{
            value: name,
            onChange: (event) => setName(event.target.value),
            placeholder: 'Sunday Main Event',
          }}
        />

        <FormField
          as="select"
          label="Серия"
          options={seriesOptions}
          selectProps={{
            value: seriesId,
            onChange: (event) => setSeriesId(event.target.value),
          }}
        />

        <FormField
          label="Дата"
          inputProps={{
            type: 'datetime-local',
            value: date,
            onChange: (event) => setDate(event.target.value),
          }}
        />

        <FormField
          label="Адрес"
          inputProps={{
            value: address,
            onChange: (event) => setAddress(event.target.value),
            placeholder: 'Набережная адмиралтейского канала 27',
          }}
        />

        <FormField
          label="Макс. игроков"
          inputProps={{
            type: 'number',
            min: 1,
            value: maxPlayers,
            onChange: (event) => setMaxPlayers(Number(event.target.value || 1)),
          }}
        />

        <FormField
          label="Формат"
          inputProps={{
            value: format,
            onChange: (event) => setFormat(event.target.value),
            placeholder: 'NLH Knockout',
          }}
        />

        <FormField
          label="Подсказка по адресу"
          inputProps={{
            value: locationHint,
            onChange: (event) => setLocationHint(event.target.value),
            placeholder: 'Ориентир, вход со двора, этаж...',
          }}
        />

        <FormField
          as="select"
          label="Медаль победителя"
          options={medalOptions}
          selectProps={{
            value: medalId,
            onChange: (event) => setMedalId(event.target.value),
          }}
        />

        <FormField
          label="Image URL (опционально)"
          inputProps={{
            value: imageUrl,
            onChange: (event) => {
              setImageUrl(event.target.value)
              if (imageDataUrl) {
                setImageDataUrl(null)
              }
            },
            placeholder: 'https://...',
          }}
        />
      </div>

      <label className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-gray-50/70 px-4 py-3 text-sm text-[var(--text-primary)]">
        <input
          type="checkbox"
          checked={isSignificant}
          onChange={(event) => setIsSignificant(event.target.checked)}
          className="h-4 w-4 rounded border-[var(--line)] text-[var(--accent)] focus:ring-[var(--accent)]"
        />
        Значимый турнир для статуса «Легенда»
      </label>

      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Фото турнира
        </span>
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
            disabled={isImageLoading}
            className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isImageLoading ? 'Загрузка...' : 'Выбрать файл'}
          </button>
          {(imageDataUrl || imageUrl.trim()) && (
            <button
              type="button"
              onClick={handleClearImage}
              className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium transition hover:bg-gray-50"
            >
              Очистить
            </button>
          )}
        </div>

        {previewImage && (
          <img
            src={previewImage}
            alt="Превью турнира"
            className="h-36 w-full max-w-sm rounded-lg border border-[var(--line)] object-cover"
          />
        )}
      </div>

      <FormField
        label="Призы"
        inputProps={{
          value: prizeInfo,
          onChange: (event) => setPrizeInfo(event.target.value),
          placeholder: 'Топ 10 получают бонус',
        }}
      />

      <FormField
        as="textarea"
        label="Описание"
        textareaProps={{
          rows: 6,
          value: description,
          onChange: (event) => setDescription(event.target.value),
          placeholder: 'Описание турнира',
        }}
      />

      {errorMessage ? <p className="text-sm text-[var(--danger)]">{errorMessage}</p> : null}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? 'Сохраняем...' : 'Сохранить'}
      </button>
    </div>
  )
}
