import {
  createDescriptionBlock,
  type TournamentDescriptionBlock,
} from '../lib/tournament-description'

type TournamentDescriptionEditorProps = {
  blocks: TournamentDescriptionBlock[]
  onChange: (blocks: TournamentDescriptionBlock[]) => void
  label?: string
}

export function TournamentDescriptionEditor({
  blocks,
  onChange,
  label = 'Описание турнира',
}: TournamentDescriptionEditorProps) {
  const patchBlock = (
    blockId: string,
    patch: Partial<TournamentDescriptionBlock>,
  ) => {
    onChange(
      blocks.map((block) =>
        block.id === blockId ? { ...block, ...patch } : block,
      ),
    )
  }

  const removeBlock = (blockId: string) => {
    onChange(blocks.filter((block) => block.id !== blockId))
  }

  const addBlock = () => {
    onChange([...blocks, createDescriptionBlock()])
  }

  const addItem = (blockId: string) => {
    onChange(
      blocks.map((block) =>
        block.id === blockId
          ? { ...block, items: [...block.items, ''] }
          : block,
      ),
    )
  }

  const removeItem = (blockId: string, itemIndex: number) => {
    onChange(
      blocks.map((block) => {
        if (block.id !== blockId) {
          return block
        }

        const nextItems = block.items.filter((_, index) => index !== itemIndex)

        return {
          ...block,
          items: nextItems.length > 0 ? nextItems : [''],
        }
      }),
    )
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          {label}
        </h2>
        <p className="text-sm text-[var(--text-muted)]">
          Каждый блок состоит из заголовка и списка пунктов. В приложении он
          отрисуется в таком же формате.
        </p>
      </div>

      {blocks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--line)] bg-[var(--bg-surface-muted)] px-4 py-5 text-sm text-[var(--text-muted)]">
          Пока нет блоков описания.
        </div>
      ) : null}

      {blocks.map((block, blockIndex) => (
        <section
          key={block.id}
          className="space-y-3 rounded-lg border border-[var(--line)] bg-[var(--bg-surface-muted)] p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Блок {blockIndex + 1}
            </p>
            <button
              type="button"
              onClick={() => removeBlock(block.id)}
              className="rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50"
            >
              Удалить блок
            </button>
          </div>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-[var(--text-secondary)]">
              Заголовок
            </span>
            <input
              value={block.title}
              onChange={(event) =>
                patchBlock(block.id, { title: event.target.value })
              }
              placeholder="Например: Что будет"
              className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
            />
          </label>

          <div className="space-y-2">
            <span className="text-sm font-medium text-[var(--text-secondary)]">
              Пункты
            </span>
            {block.items.map((item, itemIndex) => (
              <div key={`${block.id}-${itemIndex}`} className="flex gap-2">
                <input
                  value={item}
                  onChange={(event) => {
                    const nextItems = [...block.items]
                    nextItems[itemIndex] = event.target.value
                    patchBlock(block.id, { items: nextItems })
                  }}
                  placeholder="Текст пункта"
                  className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
                />
                <button
                  type="button"
                  onClick={() => removeItem(block.id, itemIndex)}
                  className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-gray-50"
                >
                  −
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => addItem(block.id)}
              className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-gray-50"
            >
              Добавить пункт
            </button>
          </div>
        </section>
      ))}

      <button
        type="button"
        onClick={addBlock}
        className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-gray-50"
      >
        Добавить блок
      </button>
    </div>
  )
}
