import { DEFAULT_LAYOUT } from './defaultLayout'
import type {
  BlockWidth,
  LayoutAction,
  LayoutBlock,
  LayoutColumn,
  LayoutState,
} from './layoutTypes'

export function layoutReducer(
  state: LayoutState,
  action: LayoutAction
): LayoutState {
  switch (action.type) {
    case 'MOVE_BLOCK': {
      const { blockId, fromColumnId, toColumnId, toIndex } =
        action.payload || {}
      if (!blockId || !fromColumnId || !toColumnId) {
        console.warn('MOVE_BLOCK blocked: missing payload')
        return state
      }

      const fromColumn = findColumn(state.columns, fromColumnId)
      const toColumn = findColumn(state.columns, toColumnId)
      if (!fromColumn || !toColumn) {
        console.warn('MOVE_BLOCK blocked: column not found')
        return state
      }

      const fromIndex = fromColumn.blocks.findIndex(
        (block) => block.id === blockId
      )
      if (fromIndex === -1) {
        console.warn('MOVE_BLOCK blocked: block not in source column')
        return state
      }

      const activeBlock = fromColumn.blocks[fromIndex]
      if (isBlockLocked(activeBlock)) {
        console.warn('MOVE_BLOCK blocked: active block locked')
        return state
      }

      if (fromColumnId === toColumnId) {
        if (fromIndex === toIndex) {
          console.warn('MOVE_BLOCK blocked: same index')
          return state
        }
        const targetBlock = fromColumn.blocks[toIndex]
        if (targetBlock && isBlockLocked(targetBlock)) {
          console.warn('MOVE_BLOCK blocked: target locked')
          return state
        }
        if (hasLockedBetween(fromColumn.blocks, fromIndex, toIndex)) {
          console.warn('MOVE_BLOCK blocked: locked between')
          return state
        }
        return updateColumn(state, fromColumnId, (column) => ({
          ...column,
          blocks: arrayMove(column.blocks, fromIndex, toIndex),
        }))
      }

      const firstLockedIndex = toColumn.blocks.findIndex((block) =>
        isBlockLocked(block)
      )
      const maxInsertIndex =
        firstLockedIndex === -1 ? toColumn.blocks.length : firstLockedIndex
      const rawInsertIndex = clampIndex(toIndex, toColumn.blocks.length)
      const insertIndex = Math.min(rawInsertIndex, maxInsertIndex)

      const nextColumns = state.columns.map((column) => {
        if (column.id === fromColumnId) {
          return {
            ...column,
            blocks: column.blocks.filter((block) => block.id !== blockId),
          }
        }
        if (column.id === toColumnId) {
          const nextBlocks = column.blocks.slice()
          nextBlocks.splice(insertIndex, 0, activeBlock)
          return {
            ...column,
            blocks: nextBlocks,
          }
        }
        return column
      })

      return {
        ...state,
        columns: nextColumns,
      }
    }
    case 'TOGGLE_BLOCK_VISIBILITY': {
      const id = action.payload?.id
      if (!id) return state
      return {
        ...state,
        columns: state.columns.map((column) => ({
          ...column,
          blocks: column.blocks.map((block) =>
            block.id === id
              ? { ...block, hidden: !isBlockHidden(block) }
              : block
          ),
        })),
      }
    }
    case 'SET_BLOCK_WIDTH': {
      const payload = action.payload
      const blockId = payload?.blockId
      if (!blockId) return state
      return {
        ...state,
        columns: state.columns.map((column) => ({
          ...column,
          blocks: column.blocks.map((block) =>
            block.id === blockId
              ? { ...block, width: payload.width }
              : block
          ),
        })),
      }
    }
    case 'ADD_COLUMN': {
      const newColumn: LayoutColumn = {
        id: createColumnId(state.columns),
        blocks: [],
      }
      return {
        ...state,
        columns: [...state.columns, newColumn],
      }
    }
    case 'REMOVE_COLUMN': {
      if (state.columns.length <= 1) return state
      const targetId =
        action.payload?.id || state.columns[state.columns.length - 1]?.id
      const target = state.columns.find((column) => column.id === targetId)
      if (!target) return state
      if (target.blocks.length) return state
      return {
        ...state,
        columns: state.columns.filter((column) => column.id !== targetId),
      }
    }
    case 'RESET_LAYOUT':
      return cloneLayout(DEFAULT_LAYOUT)
    default:
      return state
  }
}

export function normalizeLayoutState(input?: LayoutState | { blocks?: LayoutBlock[] }) {
  if (input && Array.isArray(input.columns) && input.columns.length) {
    return {
      columns: input.columns.map((column, index) => ({
        id: column.id || `column-${index + 1}`,
        blocks: (column.blocks || []).map(normalizeBlock),
      })),
    }
  }

  const legacyBlocks = Array.isArray(input?.blocks) ? input.blocks : []
  if (legacyBlocks.length) {
    return {
      columns: [
        {
          id: 'column-1',
          blocks: legacyBlocks.map(normalizeBlock),
        },
      ],
    }
  }

  return cloneLayout(DEFAULT_LAYOUT)
}

function cloneLayout(layout: LayoutState): LayoutState {
  return {
    columns: layout.columns.map((column) => ({
      id: column.id,
      blocks: column.blocks.map((block) => ({ ...block })),
    })),
  }
}

function normalizeBlock(block: LayoutBlock): LayoutBlock {
  return {
    id: block.id,
    hidden: isBlockHidden(block),
    locked: Boolean(block.locked),
    width: normalizeWidth(block.width),
  }
}

function normalizeWidth(width?: BlockWidth) {
  if (
    width === 'half' ||
    width === 'third' ||
    width === 'auto' ||
    width === 'full'
  ) {
    return width
  }
  return 'auto'
}

function findColumn(columns: LayoutColumn[], id: string) {
  return columns.find((column) => column.id === id) || null
}

function updateColumn(
  state: LayoutState,
  columnId: string,
  updater: (column: LayoutColumn) => LayoutColumn
) {
  return {
    ...state,
    columns: state.columns.map((column) =>
      column.id === columnId ? updater(column) : column
    ),
  }
}

function clampIndex(index: number, length: number) {
  if (!Number.isFinite(index)) return length
  if (index < 0) return 0
  if (index > length) return length
  return index
}

function arrayMove<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  const next = items.slice()
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next
}

function isBlockHidden(block: { hidden?: boolean; visible?: boolean }) {
  if (typeof block.hidden === 'boolean') return block.hidden
  if (typeof block.visible === 'boolean') return !block.visible
  return false
}

function isBlockLocked(block: { locked?: boolean }) {
  return Boolean(block?.locked)
}

function hasLockedBetween(
  blocks: Array<{ locked?: boolean }>,
  fromIndex: number,
  toIndex: number
) {
  const start = Math.min(fromIndex, toIndex)
  const end = Math.max(fromIndex, toIndex)
  for (let index = start + 1; index < end; index += 1) {
    if (isBlockLocked(blocks[index])) {
      return true
    }
  }
  return false
}

function hasLockedAfterIndex(
  blocks: Array<{ locked?: boolean }>,
  startIndex: number
) {
  for (let index = startIndex + 1; index < blocks.length; index += 1) {
    if (isBlockLocked(blocks[index])) {
      return true
    }
  }
  return false
}

function createColumnId(columns: LayoutColumn[]) {
  const existing = new Set(columns.map((column) => column.id))
  let index = columns.length + 1
  let candidate = `column-${index}`
  while (existing.has(candidate)) {
    index += 1
    candidate = `column-${index}`
  }
  return candidate
}
