import { useEffect, useMemo, useState } from 'react'

import { ConfirmDialog } from '../components/ConfirmDialog'
import { FormField } from '../components/FormField'
import { trpc } from '../lib/trpc'
import { useToast } from '../providers/ToastProvider'

type FaqDraft = {
  question: string
  answer: string
  isPublished: boolean
}

type FaqItem = {
  id: number
  question: string
  answer: string
  isPublished: boolean
}

export function FaqPage() {
  const { success, error } = useToast()
  const faqQuery = trpc.admin.faq.list.useQuery()
  const createMutation = trpc.admin.faq.create.useMutation()
  const updateMutation = trpc.admin.faq.update.useMutation()
  const deleteMutation = trpc.admin.faq.delete.useMutation()
  const moveMutation = trpc.admin.faq.move.useMutation()

  const [newQuestion, setNewQuestion] = useState('')
  const [newAnswer, setNewAnswer] = useState('')
  const [drafts, setDrafts] = useState<Record<number, FaqDraft>>({})
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const items = useMemo<FaqItem[]>(
    () => faqQuery.data ?? [],
    [faqQuery.data],
  )

  useEffect(() => {
    if (!faqQuery.data) {
      return
    }

    setDrafts((current) => {
      const next = { ...current }

      for (const item of faqQuery.data) {
        next[item.id] ??= {
          question: item.question,
          answer: item.answer,
          isPublished: Boolean(item.isPublished),
        }
      }

      return next
    })
  }, [faqQuery.data])

  const handleCreate = async () => {
    if (!newQuestion.trim() || !newAnswer.trim()) {
      error('Заполни вопрос и ответ')
      return
    }

    try {
      await createMutation.mutateAsync({
        question: newQuestion.trim(),
        answer: newAnswer.trim(),
        isPublished: true,
      })
      await faqQuery.refetch()
      setNewQuestion('')
      setNewAnswer('')
      success('Изменения применены')
    } catch (cause) {
      console.error(cause)
      error('Не удалось создать FAQ пункт')
    }
  }

  const patchDraft = (faqId: number, patch: Partial<FaqDraft>) => {
    setDrafts((current) => ({
      ...current,
      [faqId]: {
        ...(current[faqId] ?? {
          question: '',
          answer: '',
          isPublished: true,
        }),
        ...patch,
      },
    }))
  }

  const handleSave = async (faqId: number) => {
    const draft = drafts[faqId]

    if (!draft || !draft.question.trim() || !draft.answer.trim()) {
      error('У FAQ пункта должны быть заполнены вопрос и ответ')
      return
    }

    try {
      await updateMutation.mutateAsync({
        faqId,
        question: draft.question.trim(),
        answer: draft.answer.trim(),
        isPublished: draft.isPublished,
      })
      await faqQuery.refetch()
      success('Изменения применены')
    } catch (cause) {
      console.error(cause)
      error('Не удалось сохранить FAQ пункт')
    }
  }

  const handleMove = async (faqId: number, direction: 'up' | 'down') => {
    try {
      await moveMutation.mutateAsync({ faqId, direction })
      await faqQuery.refetch()
      success('Изменения применены')
    } catch (cause) {
      console.error(cause)
      error('Не удалось изменить порядок FAQ')
    }
  }

  const handleDelete = async () => {
    if (deleteId === null) {
      return
    }

    try {
      await deleteMutation.mutateAsync({ faqId: deleteId })
      await faqQuery.refetch()
      setDeleteId(null)
      success('FAQ пункт удалён')
    } catch (cause) {
      console.error(cause)
      error('Не удалось удалить FAQ пункт')
    }
  }

  if (faqQuery.isLoading) {
    return (
      <div className="rounded-xl border border-[var(--line)] bg-white p-4 text-sm text-[var(--text-muted)]">
        Загружаем FAQ...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="font-['Space_Grotesk'] text-2xl font-bold">FAQ</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Здесь можно в дружелюбном формате менять вопросы и ответы, которые
          видны пользователю в приложении.
        </p>
      </div>
      <section className="space-y-4 rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Новый пункт
        </h2>

        <FormField
          label="Вопрос"
          inputProps={{
            value: newQuestion,
            onChange: (event) => setNewQuestion(event.target.value),
            placeholder: 'Например: Как работает предоплата?',
          }}
        />

        <FormField
          as="textarea"
          label="Ответ"
          textareaProps={{
            value: newAnswer,
            onChange: (event) => setNewAnswer(event.target.value),
            placeholder: 'Коротко и понятно опиши ответ для игрока',
            rows: 5,
          }}
        />

        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={createMutation.isPending}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {createMutation.isPending ? 'Создаем...' : 'Добавить пункт'}
        </button>
      </section>

      <div className="space-y-4">
        {items.map((item, index) => {
          const draft = drafts[item.id] ?? {
            question: item.question,
            answer: item.answer,
            isPublished: Boolean(item.isPublished),
          }

          return (
            <section
              key={item.id}
              className="space-y-4 rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Пункт #{index + 1}
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {draft.isPublished ? 'Виден в приложении' : 'Скрыт из приложения'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleMove(item.id, 'up')}
                    disabled={moveMutation.isPending || index === 0}
                    className="rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-sm font-medium transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Выше
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleMove(item.id, 'down')}
                    disabled={moveMutation.isPending || index === items.length - 1}
                    className="rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-sm font-medium transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Ниже
                  </button>
                  <button
                    type="button"
                    onClick={() => patchDraft(item.id, { isPublished: !draft.isPublished })}
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                      draft.isPublished
                        ? 'border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                        : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    {draft.isPublished ? 'Скрыть' : 'Показать'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteId(item.id)}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                  >
                    Удалить
                  </button>
                </div>
              </div>

              <FormField
                label="Вопрос"
                inputProps={{
                  value: draft.question,
                  onChange: (event) =>
                    patchDraft(item.id, { question: event.target.value }),
                }}
              />

              <FormField
                as="textarea"
                label="Ответ"
                textareaProps={{
                  value: draft.answer,
                  onChange: (event) =>
                    patchDraft(item.id, { answer: event.target.value }),
                  rows: 6,
                }}
              />

              <button
                type="button"
                onClick={() => void handleSave(item.id)}
                disabled={updateMutation.isPending}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {updateMutation.isPending ? 'Сохраняем...' : 'Сохранить'}
              </button>
            </section>
          )
        })}

        {items.length === 0 ? (
          <div className="rounded-xl border border-[var(--line)] bg-white p-6 text-sm text-[var(--text-muted)] shadow-sm">
            FAQ пока пустой.
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        title="Удалить FAQ пункт?"
        description="Этот вопрос и ответ будут удалены из CRM и из приложения."
        confirmLabel="Удалить"
        confirmPendingLabel="Удаляем..."
        pending={deleteMutation.isPending}
        onClose={() => setDeleteId(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}
