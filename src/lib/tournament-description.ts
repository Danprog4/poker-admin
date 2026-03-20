export type TournamentDescriptionBlock = {
  id: string
  title: string
  items: string[]
}

const createBlockId = () =>
  `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const normalizeLine = (value: string) => value.trim()

export function createDescriptionBlock(
  title = '',
  items: string[] = [''],
): TournamentDescriptionBlock {
  return {
    id: createBlockId(),
    title,
    items: items.length > 0 ? items : [''],
  }
}

export function parseTournamentDescription(
  description: string | null | undefined,
): TournamentDescriptionBlock[] {
  if (!description?.trim()) {
    return []
  }

  const blocks: TournamentDescriptionBlock[] = []
  let currentTitle = ''
  let currentItems: string[] = []

  const flush = () => {
    if (!currentTitle && currentItems.length === 0) {
      return
    }

    blocks.push(
      createDescriptionBlock(
        currentTitle,
        currentItems.length > 0 ? currentItems : [''],
      ),
    )

    currentTitle = ''
    currentItems = []
  }

  description
    .split('\n')
    .map(normalizeLine)
    .forEach((line) => {
      if (!line) {
        flush()
        return
      }

      const isListItem = /^[·•-]/.test(line)

      if (!currentTitle) {
        currentTitle = line
        return
      }

      if (isListItem) {
        currentItems.push(line.replace(/^[·•-]\s*/, '').trim())
        return
      }

      if (currentItems.length === 0) {
        currentItems.push(line)
        return
      }

      flush()
      currentTitle = line
    })

  flush()
  return blocks
}

export function serializeTournamentDescription(
  blocks: TournamentDescriptionBlock[],
): string {
  return blocks
    .map((block) => ({
      title: block.title.trim(),
      items: block.items
        .flatMap((item) =>
          item
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean),
        ),
    }))
    .filter((block) => block.title || block.items.length > 0)
    .map((block) => {
      const rows = [block.title].filter(Boolean)

      rows.push(...block.items.map((item) => `· ${item}`))
      return rows.join('\n')
    })
    .join('\n\n')
}
