import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  DndContext,
  closestCenter,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDroppable,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { BLOCK_CATALOG } from '../blocks/blockCatalog'
import type { BlockWidth, LayoutColumn, LayoutState } from './layoutTypes'
import type { BlockContext, BlockDefinition } from '../blocks/blockCatalog'
import { useTheme } from '../theme/useTheme'

type Props = {
  layoutState: LayoutState
  blockContext: BlockContext
  onMoveBlock: (payload: {
    blockId: string
    fromColumnId: string
    toColumnId: string
    toIndex: number
  }) => void
  onToggleVisibility: (id: string) => void
  onResetLayout: () => void
  onAddColumn: () => void
  onRemoveColumn: (payload?: { id?: string; force?: boolean }) => void
  onSetBlockWidth: (id: string, width: BlockWidth) => void
}

type ResizeState = {
  blockId: string
  startX: number
  columnWidth: number
  startWidth: BlockWidth
  previewWidth: BlockWidth
  edge: 'left' | 'right'
}

export default function DashboardLayout({
  layoutState,
  blockContext,
  onMoveBlock,
  onToggleVisibility,
  onResetLayout,
  onAddColumn,
  onRemoveColumn,
  onSetBlockWidth,
}: Props) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [resizeState, setResizeState] = useState<ResizeState | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isLayoutLocked, setIsLayoutLocked] = useState(false)
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null)
  const [pointerX, setPointerX] = useState<number | null>(null)
  const columns = layoutState.columns
  const totalColumns = Math.max(columns.length, 1)
  const gridRef = useRef<HTMLDivElement | null>(null)
  const columnRefs = useRef<Map<string, HTMLDivElement | null>>(new Map())
  const { theme, toggleTheme } = useTheme()
  const hiddenBlocks = useMemo(
    () =>
      columns.flatMap((column) =>
        column.blocks.filter((block) => isBlockHidden(block))
      ),
    [columns]
  )
  const blockIds = useMemo(
    () => new Set(columns.flatMap((column) => column.blocks.map((block) => block.id))),
    [columns]
  )
  const activeBlock = useMemo(
    () =>
      columns
        .flatMap((column) => column.blocks)
        .find((block) => block.id === activeId) || null,
    [columns, activeId]
  )

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const collisionDetection = (args) => {
    const pointer = pointerWithin(args)
    if (pointer?.length) {
      const blockCollision = pointer.find((entry) =>
        blockIds.has(String(entry.id))
      )
      return blockCollision ? [blockCollision] : pointer
    }
    return closestCenter(args)
  }

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id)
    const block = findBlock(columns, id)
    if (block && !isBlockLocked(block)) {
      setActiveId(id)
      setIsDragging(true)
      const column = findColumnByBlockId(columns, id)
      setActiveColumnId(column?.id || null)
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) {
      setActiveColumnId(null)
      return
    }
    const activeIdValue = String(active.id)
    const overIdValue = String(over.id)
    if (activeIdValue === overIdValue) return

    const activeBlockValue = findBlock(columns, activeIdValue)
    if (!activeBlockValue || isBlockLocked(activeBlockValue)) return

    const fromColumn = findColumnByBlockId(columns, activeIdValue)
    const toColumn = resolveColumnForOver(columns, overIdValue)
    if (!fromColumn || !toColumn) return
    if (fromColumn.id === toColumn.id) return

    const visibleBlocks = getVisibleBlocks(toColumn)
    const toIndex = mapVisibleIndexToActualIndex(
      toColumn.blocks,
      visibleBlocks.length
    )

    onMoveBlock({
      blockId: activeIdValue,
      fromColumnId: fromColumn.id,
      toColumnId: toColumn.id,
      toIndex,
    })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) {
      setActiveId(null)
      setIsDragging(false)
      setActiveColumnId(null)
      setPointerX(null)
      return
    }
    const activeIdValue = String(active.id)
    const overIdValue = String(over.id)
    if (activeIdValue !== overIdValue) {
      const movePayload = resolveMovePayload(
        columns,
        activeIdValue,
        overIdValue
      )
      if (movePayload) {
        onMoveBlock(movePayload)
      }
    }
    setActiveId(null)
    setIsDragging(false)
    setActiveColumnId(null)
    setPointerX(null)
  }

  const handleDragCancel = () => {
    setActiveId(null)
    setIsDragging(false)
    setActiveColumnId(null)
    setPointerX(null)
  }

  useEffect(() => {
    if (!isDragging) return
    const handleMove = (event: PointerEvent) => {
      setPointerX(event.clientX)
    }
    window.addEventListener('pointermove', handleMove)
    return () => {
      window.removeEventListener('pointermove', handleMove)
    }
  }, [isDragging])

  useEffect(() => {
    if (!isDragging || pointerX === null) {
      setActiveColumnId(null)
      return
    }
    let nextId: string | null = null
    for (const column of columns) {
      const node = columnRefs.current.get(column.id)
      if (!node) continue
      const rect = node.getBoundingClientRect()
      if (pointerX >= rect.left && pointerX <= rect.right) {
        nextId = column.id
        break
      }
    }
    setActiveColumnId(nextId)
  }, [pointerX, isDragging, columns])

  const registerColumnRef =
    (columnId: string) => (node: HTMLDivElement | null) => {
      if (node) {
        columnRefs.current.set(columnId, node)
      } else {
        columnRefs.current.delete(columnId)
      }
    }

  useEffect(() => {
    if (!resizeState) return

    const handleMove = (event: MouseEvent) => {
      const directionMultiplier = resizeState.edge === 'left' ? -1 : 1
      const deltaX =
        (event.clientX - resizeState.startX) * directionMultiplier
      const columnWidth = Math.max(resizeState.columnWidth, 1)
      const stepSize = columnWidth / 3
      const steps = Math.round(deltaX / stepSize)
      const startIndex = getResizeOrderIndex(resizeState.startWidth)
      const nextIndex = clampIndex(
        startIndex + steps,
        0,
        RESIZE_WIDTH_ORDER.length - 1
      )
      const previewWidth = RESIZE_WIDTH_ORDER[nextIndex]
      setResizeState((prev) =>
        prev ? { ...prev, previewWidth } : prev
      )
    }

    const handleUp = () => {
      const { blockId, previewWidth, startWidth } = resizeState
      if (previewWidth && previewWidth !== startWidth) {
        onSetBlockWidth(blockId, previewWidth)
      }
      setResizeState(null)
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [resizeState, onSetBlockWidth])

  const handleKeyboardMove = (
    blockId: string,
    direction: 'left' | 'right'
  ) => {
    const activeBlockValue = findBlock(columns, blockId)
    if (!activeBlockValue || isBlockLocked(activeBlockValue)) return
    const fromColumn = findColumnByBlockId(columns, blockId)
    if (!fromColumn) return
    const fromIndex = columns.findIndex(
      (column) => column.id === fromColumn.id
    )
    const toColumn =
      direction === 'left'
        ? columns[fromIndex - 1]
        : columns[fromIndex + 1]
    if (!toColumn) return
    const visibleBlocks = getVisibleBlocks(toColumn)
    const toIndex = mapVisibleIndexToActualIndex(
      toColumn.blocks,
      visibleBlocks.length
    )
    onMoveBlock({
      blockId,
      fromColumnId: fromColumn.id,
      toColumnId: toColumn.id,
      toIndex,
    })
  }

  const handleResizeStart = (
    blockId: string,
    startX: number,
    edge: 'left' | 'right'
  ) => {
    if (isLayoutLocked) return
    const block = findBlock(columns, blockId)
    if (!block || isBlockLocked(block)) return
    const gridWidth = gridRef.current?.getBoundingClientRect().width || 0
    const columnWidth = gridWidth / totalColumns
    if (!columnWidth) return
    const startWidth = block.width || 'auto'
    setResizeState({
      blockId,
      startX,
      columnWidth,
      startWidth,
      previewWidth: startWidth,
      edge,
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          {hiddenBlocks.length ? (
            <>
              <span className="font-semibold text-slate-600">
                Hidden blocks:
              </span>
              {hiddenBlocks.map((block) => (
                <button
                  key={block.id}
                  type="button"
                  onClick={() => onToggleVisibility(block.id)}
                  className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text)] motion-safe:transition-colors motion-reduce:transition-none"
                >
                  Show {getBlockLabel(block.id)}
                </button>
              ))}
            </>
          ) : (
            <span>All blocks visible</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onAddColumn}
            className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text)] motion-safe:transition-colors motion-reduce:transition-none"
          >
            Add column
          </button>
          <button
            type="button"
            onClick={() => {
              const lastColumn = columns[columns.length - 1]
              if (!lastColumn) return
              if (columns.length <= 1) return
              if (
                window.confirm(
                  'Remove the last column? (Only empty columns can be removed.)'
                )
              ) {
                onRemoveColumn({ id: lastColumn.id })
              }
            }}
            className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text)] motion-safe:transition-colors motion-reduce:transition-none"
          >
            Remove column
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Reset layout to default?')) {
                onResetLayout()
              }
            }}
            className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text)] motion-safe:transition-colors motion-reduce:transition-none"
          >
            Reset layout
          </button>
          <button
            type="button"
            onClick={() => setIsLayoutLocked((prev) => !prev)}
            className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text)] motion-safe:transition-colors motion-reduce:transition-none"
          >
            {isLayoutLocked ? 'Unlock layout' : 'Lock layout'}{' '}
            <span aria-hidden="true">{isLayoutLocked ? '🔒' : ''}</span>
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text)] motion-safe:transition-colors motion-reduce:transition-none"
          >
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
        </div>
      </div>

      <DndContext
        sensors={isLayoutLocked ? [] : sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div
          ref={gridRef}
          className="relative flex items-stretch gap-6"
        >
          {columns.map((column) => (
            <Column
              key={column.id}
              column={column}
              blockContext={blockContext}
              onToggleVisibility={onToggleVisibility}
              onSetBlockWidth={onSetBlockWidth}
              onKeyboardMove={handleKeyboardMove}
              onCancelDrag={handleDragCancel}
              onResizeStart={handleResizeStart}
              resizeState={resizeState}
              isDragging={isDragging}
              isActive={activeColumnId === column.id}
              registerColumnRef={registerColumnRef}
              isLayoutLocked={isLayoutLocked}
            />
          ))}
        </div>
        <DragOverlay>
          {activeBlock && !isBlockLocked(activeBlock) ? (
            <GhostBlock
              id={activeBlock.id}
              width={activeBlock.width || 'auto'}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

function SortableBlock({
  id,
  blockContext,
  locked,
  onToggleVisibility,
  width,
  onSetBlockWidth,
  onKeyboardMove,
  onCancelDrag,
  onResizeStart,
  resizeState,
  isLayoutLocked,
}: {
  id: keyof typeof BLOCK_CATALOG
  blockContext: BlockContext
  locked: boolean
  onToggleVisibility: (id: string) => void
  width: BlockWidth
  onSetBlockWidth: (id: string, width: BlockWidth) => void
  onKeyboardMove: (blockId: string, direction: 'left' | 'right') => void
  onCancelDrag: () => void
  onResizeStart: (
    blockId: string,
    startX: number,
    edge: 'left' | 'right'
  ) => void
  resizeState: ResizeState | null
  isLayoutLocked: boolean
}) {
  const definition: BlockDefinition | undefined = BLOCK_CATALOG[id]
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: locked || isLayoutLocked })

  if (!definition) return null
  const Component = definition.Component
  const props = definition.getProps(blockContext)
  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    transition,
    opacity: isDragging ? 0.8 : undefined,
  }
  const isResizing = resizeState?.blockId === id
  const effectiveWidth = isResizing ? resizeState.previewWidth : width
  const widthStyle = getWidthStyle(effectiveWidth)
  const handleKeyDown = (event: React.KeyboardEvent) => {
    const target = event.target as HTMLElement | null
    if (
      target?.closest(
        'input, textarea, select, button, a, [contenteditable="true"]'
      )
    ) {
      return
    }
    if (isLayoutLocked || locked) return
    if (event.shiftKey && event.key === 'ArrowLeft') {
      event.preventDefault()
      onSetBlockWidth(id, getAdjacentWidth(width, 'left'))
      return
    }
    if (event.shiftKey && event.key === 'ArrowRight') {
      event.preventDefault()
      onSetBlockWidth(id, getAdjacentWidth(width, 'right'))
      return
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      onKeyboardMove(id, 'left')
      return
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      onKeyboardMove(id, 'right')
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      onCancelDrag()
    }
  }
  const dragListeners =
    !isLayoutLocked && listeners
      ? {
          ...listeners,
          onPointerDown: (event: React.PointerEvent) => {
            const target = event.target as HTMLElement | null
            if (
              target?.closest(
                'input, textarea, select, button, a, [contenteditable="true"]'
              )
            ) {
              event.stopPropagation()
              return
            }
            listeners.onPointerDown?.(event)
          },
          onKeyDown: (event: React.KeyboardEvent) => {
            handleKeyDown(event)
            listeners.onKeyDown?.(event)
          },
        }
      : { onKeyDown: handleKeyDown }

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, ...widthStyle }}
      className={`group relative self-start motion-safe:transition-all motion-reduce:transition-none ${
        isResizing ? 'opacity-90' : ''
      } ${isLayoutLocked ? 'cursor-text' : ''}`}
      {...attributes}
      {...dragListeners}
      tabIndex={locked ? -1 : 0}
    >
      <div
        className={`absolute right-3 top-3 z-10 flex gap-2 opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto ${
          isDragging ? 'opacity-60 pointer-events-auto' : ''
        }`}
      >
        <button
          type="button"
          onClick={() => {
            if (isLayoutLocked) return
            onToggleVisibility(id)
          }}
          onPointerDown={(event) => event.stopPropagation()}
          aria-label="Hide block"
          disabled={isLayoutLocked}
          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-500 hover:border-slate-300 hover:text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-200"
        >
          -
        </button>
      </div>
      <div className="relative">
        {isResizing ? (
          <div className="pointer-events-none absolute inset-0 rounded-2xl border border-[var(--border-strong)] bg-[var(--ghost)] opacity-40" />
        ) : null}
        <button
          type="button"
          aria-label="Resize block"
          onMouseDown={(event) => {
            if (locked || isLayoutLocked) return
            event.preventDefault()
            event.stopPropagation()
            onResizeStart(id, event.clientX, 'right')
          }}
          className={`absolute right-1 top-1/2 h-10 w-2 -translate-y-1/2 rounded-full bg-[var(--border)] opacity-0 shadow-sm motion-safe:transition-opacity motion-reduce:transition-none ${
            locked || isLayoutLocked
              ? 'pointer-events-none'
              : 'pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto'
          }`}
          style={{ cursor: 'col-resize' }}
        />
        <button
          type="button"
          aria-label="Resize block"
          onMouseDown={(event) => {
            if (locked || isLayoutLocked) return
            event.preventDefault()
            event.stopPropagation()
            onResizeStart(id, event.clientX, 'left')
          }}
          className={`absolute left-1 top-1/2 h-10 w-2 -translate-y-1/2 rounded-full bg-[var(--border)] opacity-0 shadow-sm motion-safe:transition-opacity motion-reduce:transition-none ${
            locked || isLayoutLocked
              ? 'pointer-events-none'
              : 'pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto'
          }`}
          style={{ cursor: 'col-resize' }}
        />
        <div className="pt-8">
          <Component {...props} />
        </div>
      </div>
    </div>
  )
}

function isBlockHidden(block: { hidden?: boolean; visible?: boolean }) {
  if (typeof block.hidden === 'boolean') return block.hidden
  if (typeof block.visible === 'boolean') return !block.visible
  return false
}

function isBlockLocked(block: { locked?: boolean }) {
  return Boolean(block?.locked)
}

function getBlockLabel(id: keyof typeof BLOCK_CATALOG) {
  return BLOCK_CATALOG[id]?.label || id
}

function Column({
  column,
  blockContext,
  onToggleVisibility,
  onSetBlockWidth,
  onKeyboardMove,
  onCancelDrag,
  onResizeStart,
  resizeState,
  isDragging,
  isActive,
  registerColumnRef,
  isLayoutLocked,
}: {
  column: LayoutColumn
  blockContext: BlockContext
  onToggleVisibility: (id: string) => void
  onSetBlockWidth: (id: string, width: BlockWidth) => void
  onKeyboardMove: (blockId: string, direction: 'left' | 'right') => void
  onCancelDrag: () => void
  onResizeStart: (
    blockId: string,
    startX: number,
    edge: 'left' | 'right'
  ) => void
  resizeState: ResizeState | null
  isDragging: boolean
  isActive: boolean
  registerColumnRef: (columnId: string) => (node: HTMLDivElement | null) => void
  isLayoutLocked: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })
  const visibleBlocks = column.blocks.filter((block) => !isBlockHidden(block))
  const items = visibleBlocks.map((block) => block.id)
  const showGuides = isDragging
  const highlight = isOver || isActive
  const setCombinedRef = (node: HTMLDivElement | null) => {
    setNodeRef(node)
    registerColumnRef(column.id)(node)
  }

  return (
    <div
      ref={setCombinedRef}
      className="relative min-h-[80px] flex-1 min-w-0 self-stretch"
    >
      {showGuides ? (
        <div
          className={`pointer-events-none absolute inset-0 rounded-2xl border border-dashed motion-safe:transition-colors motion-reduce:transition-none ${
            highlight
              ? 'border-[var(--border-strong)] bg-[var(--column-over)]'
              : 'border-[var(--border)] bg-transparent'
          }`}
        />
      ) : null}
      <div className="relative z-10 flex flex-col gap-6 pt-8">
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          {visibleBlocks.map((block) => (
            <SortableBlock
              key={block.id}
              id={block.id}
              blockContext={blockContext}
              locked={isBlockLocked(block)}
              onToggleVisibility={onToggleVisibility}
              width={block.width || 'auto'}
              onSetBlockWidth={onSetBlockWidth}
              onKeyboardMove={onKeyboardMove}
              onCancelDrag={onCancelDrag}
              onResizeStart={onResizeStart}
              resizeState={resizeState}
              isLayoutLocked={isLayoutLocked}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}

function resolveMovePayload(
  columns: LayoutColumn[],
  activeId: string,
  overId: string
) {
  const fromColumn = findColumnByBlockId(columns, activeId)
  if (!fromColumn) return null

  const toColumn = resolveColumnForOver(columns, overId)
  if (!toColumn) return null

  const visibleBlocks = getVisibleBlocks(toColumn)
  const isColumnTarget = isColumnId(columns, overId)
  const visibleIndex = isColumnTarget
    ? visibleBlocks.length
    : findVisibleIndex(visibleBlocks, overId)
  const toIndex = mapVisibleIndexToActualIndex(
    toColumn.blocks,
    visibleIndex === null ? visibleBlocks.length : visibleIndex
  )

  return {
    blockId: activeId,
    fromColumnId: fromColumn.id,
    toColumnId: toColumn.id,
    toIndex,
  }
}

function findBlock(columns: LayoutColumn[], blockId: string) {
  for (const column of columns) {
    const block = column.blocks.find((item) => item.id === blockId)
    if (block) return block
  }
  return null
}

function findColumnByBlockId(columns: LayoutColumn[], blockId: string) {
  return columns.find((column) =>
    column.blocks.some((block) => block.id === blockId)
  )
}

function findColumn(columns: LayoutColumn[], columnId: string) {
  return columns.find((column) => column.id === columnId) || null
}

function resolveColumnForOver(columns: LayoutColumn[], overId: string) {
  return findColumn(columns, overId) || findColumnByBlockId(columns, overId)
}

function isColumnId(columns: LayoutColumn[], id: string) {
  return Boolean(findColumn(columns, id))
}

function getVisibleBlocks(column: LayoutColumn) {
  return column.blocks.filter((block) => !isBlockHidden(block))
}

function findVisibleIndex(blocks: Array<{ id: string }>, blockId: string) {
  const index = blocks.findIndex((block) => block.id === blockId)
  return index === -1 ? null : index
}

function mapVisibleIndexToActualIndex(
  blocks: Array<{ id: string; hidden?: boolean; visible?: boolean }>,
  visibleIndex: number
) {
  let visibleCounter = 0
  for (let index = 0; index < blocks.length; index += 1) {
    if (isBlockHidden(blocks[index])) continue
    if (visibleCounter === visibleIndex) return index
    visibleCounter += 1
  }
  return blocks.length
}

function getAdjacentWidth(
  width: BlockWidth,
  direction: 'left' | 'right'
) {
  const order: BlockWidth[] = ['auto', 'half', 'third', 'full']
  const index = Math.max(order.indexOf(width), 0)
  const nextIndex =
    direction === 'left'
      ? Math.max(index - 1, 0)
      : Math.min(index + 1, order.length - 1)
  return order[nextIndex]
}

function getWidthStyle(width: BlockWidth) {
  const percent = getWidthPercent(width)
  if (!percent) {
    return { width: 'auto', maxWidth: '100%' }
  }
  return { width: `${percent}%`, maxWidth: '100%' }
}

function getWidthPercent(width: BlockWidth) {
  if (width === 'full') return 100
  if (width === 'half') return 50
  if (width === 'third') return 33.3333
  return null
}

const RESIZE_WIDTH_ORDER: BlockWidth[] = ['auto', 'half', 'third', 'full']

function getResizeOrderIndex(width: BlockWidth) {
  const index = RESIZE_WIDTH_ORDER.indexOf(width)
  return index === -1 ? 0 : index
}

function clampIndex(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function GhostBlock({
  id,
  width,
}: {
  id: keyof typeof BLOCK_CATALOG
  width: BlockWidth
}) {
  const widthStyle = getWidthStyle(width)
  return (
    <div className="pointer-events-none" style={widthStyle}>
      <div className="origin-top-left scale-[0.98] motion-safe:transition-transform motion-reduce:transition-none">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--ghost)] px-4 py-3 text-sm font-semibold text-[var(--text)] opacity-70 shadow-lg">
          {getBlockLabel(id)}
        </div>
      </div>
    </div>
  )
}
