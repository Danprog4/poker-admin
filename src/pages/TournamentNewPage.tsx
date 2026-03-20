import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { FormField } from '../components/FormField'
import { TournamentDescriptionEditor } from '../components/TournamentDescriptionEditor'
import {
  TournamentCardPreview,
  TournamentDetailPreview,
} from '../components/TournamentPreview'
import { fileToDataUrl } from '../lib/imageUpload'
import {
  createDescriptionBlock,
  serializeTournamentDescription,
  type TournamentDescriptionBlock,
} from '../lib/tournament-description'
import { useToast } from '../providers/ToastProvider'
import { useAdminData } from '../providers/useAdminData'

const DEFAULT_TOURNAMENT_ADDRESS = 'Набережная адмиралтейского канала 27'

export function TournamentNewPage() {
  const navigate = useNavigate()
  const { state, createTournament, activeSeries } = useAdminData()
  const { error, success } = useToast()

  const [name, setName] = useState('')
  const [descriptionBlocks, setDescriptionBlocks] = useState<TournamentDescriptionBlock[]>([])
  const [bonusItems, setBonusItems] = useState<string[]>([''])
  const [date, setDate] = useState('')
  const [maxPlayersInput, setMaxPlayersInput] = useState('60')
  const [seriesId, setSeriesId] = useState<string>(
    activeSeries ? String(activeSeries.id) : 'none',
  )
  const [medalId, setMedalId] = useState('none')
  const [imageUrl, setImageUrl] = useState('')
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [isImageLoading, setIsImageLoading] = useState(false)
  const [isSignificant, setIsSignificant] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lastGeneratedPrizeRef = useRef<string | null>(null)

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

  const selectedMedalLabel = useMemo(
    () => medalOptions.find((item) => item.value === medalId)?.label ?? '',
    [medalId, medalOptions],
  )

  const existingCoverOptions = useMemo(() => {
    const seen = new Set<string>()

    return [...state.tournaments]
      .sort(
        (left, right) =>
          new Date(right.createdAt).valueOf() - new Date(left.createdAt).valueOf(),
      )
      .flatMap((tournament) => {
        const value = tournament.imageUrl?.trim()

        if (!value || seen.has(value)) {
          return []
        }

        seen.add(value)

        return [
          {
            imageUrl: value,
            label: tournament.name,
          },
        ]
      })
  }, [state.tournaments])

  useEffect(() => {
    const nextAutoValue =
      medalId === 'none' || !selectedMedalLabel
        ? null
        : `Медаль победителя: ${selectedMedalLabel}`

    setDescriptionBlocks((currentBlocks) => {
      const prizeIndex = currentBlocks.findIndex(
        (block) => block.title.trim() === 'Призы',
      )
      const autoValue = lastGeneratedPrizeRef.current

      if (!nextAutoValue) {
        if (
          prizeIndex >= 0 &&
          autoValue !== null &&
          currentBlocks[prizeIndex]?.items.length === 1 &&
          currentBlocks[prizeIndex]?.items[0]?.trim() === autoValue
        ) {
          lastGeneratedPrizeRef.current = null
          return currentBlocks.filter((_, index) => index !== prizeIndex)
        }

        lastGeneratedPrizeRef.current = null
        return currentBlocks
      }

      if (prizeIndex < 0) {
        lastGeneratedPrizeRef.current = nextAutoValue
        return [...currentBlocks, createDescriptionBlock('Призы', [nextAutoValue])]
      }

      const prizeBlock = currentBlocks[prizeIndex]
      const shouldAutofill =
        prizeBlock.items.every((item) => !item.trim()) ||
        (autoValue !== null &&
          prizeBlock.items.length === 1 &&
          prizeBlock.items[0]?.trim() === autoValue)

      if (!shouldAutofill) {
        return currentBlocks
      }

      const nextBlocks = [...currentBlocks]
      nextBlocks[prizeIndex] = {
        ...prizeBlock,
        title: 'Призы',
        items: [nextAutoValue],
      }
      lastGeneratedPrizeRef.current = nextAutoValue
      return nextBlocks
    })
  }, [medalId, selectedMedalLabel])

  const handleSubmit = async () => {
    if (isSubmitting) {
      return
    }

    const parsedMaxPlayers = Number.parseInt(maxPlayersInput, 10)

    if (!name.trim() || !date || !Number.isFinite(parsedMaxPlayers) || parsedMaxPlayers < 1) {
      error('Заполни название, дату и корректное число участников')
      return
    }

    const finalImageUrl = imageDataUrl ?? (imageUrl.trim() ? imageUrl.trim() : null)
    setIsSubmitting(true)

    const description = serializeTournamentDescription(descriptionBlocks)
    const firstBonusLine = bonusItems.map((item) => item.trim()).find(Boolean) ?? ''

    const created = await createTournament({
      name: name.trim(),
      description,
      format: '',
      address: DEFAULT_TOURNAMENT_ADDRESS,
      locationHint: '',
      date,
      maxPlayers: parsedMaxPlayers,
      seriesId: seriesId === 'none' ? null : Number(seriesId),
      medalId: medalId === 'none' ? null : Number(medalId),
      imageUrl: finalImageUrl,
      isSignificant,
      prizeInfo: firstBonusLine,
    })

    setIsSubmitting(false)

    if (!created) {
      error('Не удалось создать турнир. Попробуй ещё раз.')
      return
    }

    success('Турнир создан')
    navigate('/tournaments')
  }

  const handleMaxPlayersChange = (value: string) => {
    const normalized = value.replace(/\D+/g, '')
    setMaxPlayersInput(normalized)
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setIsImageLoading(true)

    try {
      const dataUrl = await fileToDataUrl(file)
      setImageDataUrl(dataUrl)
      setImageUrl('')
    } catch {
      error('Не удалось обработать выбранное изображение')
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
  const previewDateLabel = date
    ? new Intl.DateTimeFormat('ru-RU', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(date))
    : new Intl.DateTimeFormat('ru-RU', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date())
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
          label="Макс. игроков"
          inputProps={{
            type: 'text',
            inputMode: 'numeric',
            pattern: '[0-9]*',
            value: maxPlayersInput,
            onChange: (event) => handleMaxPlayersChange(event.target.value),
            placeholder: '60',
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
          label="URL картинки (необязательно)"
          inputProps={{
            value: imageUrl,
            onChange: (event) => {
              setImageUrl(event.target.value)
              if (imageDataUrl) {
                setImageDataUrl(null)
              }
            },
            placeholder: 'https://... или /images/...',
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
        <p className="text-sm text-[var(--text-muted)]">
          Лучше использовать квадратное изображение 1:1. Ниже сразу показываем,
          как оно ляжет в карточку и на экран турнира в приложении. Поле можно
          оставить пустым, тогда в приложении будет стандартный placeholder.
        </p>
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
          <button
            type="button"
            onClick={handleClearImage}
            className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium transition hover:bg-gray-50"
          >
            Использовать placeholder
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

        {!previewImage ? (
          <p className="text-sm text-[var(--text-muted)]">
            Сейчас выбрана стандартная обложка по умолчанию.
          </p>
        ) : null}

        {existingCoverOptions.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-[var(--text-muted)]">
              Или выбрать из уже загруженных обложек:
            </p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {existingCoverOptions.map((cover) => {
                const isSelected = previewImage === cover.imageUrl

                return (
                  <button
                    key={cover.imageUrl}
                    type="button"
                    onClick={() => {
                      setImageUrl(cover.imageUrl)
                      setImageDataUrl(null)
                    }}
                    className={`overflow-hidden rounded-lg border text-left transition ${
                      isSelected
                        ? 'border-[var(--accent)] ring-2 ring-[var(--accent-soft)]'
                        : 'border-[var(--line)] hover:border-[var(--accent)]'
                    }`}
                  >
                    <img
                      src={cover.imageUrl}
                      alt={cover.label}
                      className="h-28 w-full object-cover"
                    />
                    <div className="border-t border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--text-primary)]">
                      <span className="line-clamp-2">{cover.label}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>

      <TournamentDescriptionEditor
        blocks={descriptionBlocks}
        onChange={setDescriptionBlocks}
      />

      <section className="space-y-3 rounded-lg border border-[var(--line)] bg-[var(--bg-surface-muted)] p-4">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Бонусы
          </h2>
          <p className="text-sm text-[var(--text-muted)]">
            Этот текст показывается в карточке турнира и в hero-блоке
            экрана турнира. Призы от медали добавляются в описание выше.
          </p>
        </div>

        {bonusItems.map((item, index) => (
          <div key={`bonus-${index}`} className="flex gap-2">
            <input
              value={item}
              onChange={(event) => {
                const next = [...bonusItems]
                next[index] = event.target.value
                setBonusItems(next)
              }}
              placeholder="Например: Топ 10 получают бонус"
              className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
            />
            <button
              type="button"
              onClick={() =>
                setBonusItems((current) =>
                  current.length > 1
                    ? current.filter((_, itemIndex) => itemIndex !== index)
                    : [''],
                )
              }
              className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-gray-50"
            >
              −
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => setBonusItems((current) => [...current, ''])}
          className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-gray-50"
        >
          Добавить пункт
        </button>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <TournamentCardPreview
          name={name}
          dateLabel={previewDateLabel}
          seatsLabel={`0/${maxPlayersInput || 0}`}
          imageUrl={previewImage}
        />
        <TournamentDetailPreview
          name={name}
          dateLabel={previewDateLabel}
          seatsLabel={`${maxPlayersInput || 0} мест`}
          bonusLabel={bonusItems.map((item) => item.trim()).find(Boolean) ?? ''}
          imageUrl={previewImage}
          sections={descriptionBlocks}
        />
      </div>

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
