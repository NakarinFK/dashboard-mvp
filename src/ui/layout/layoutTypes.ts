import type { BlockId } from '../blocks/blockCatalog'

export type BlockWidth = 'full' | 'half' | 'third' | 'auto'

export type LayoutBlock = {
  id: BlockId
  hidden?: boolean
  locked?: boolean
  width?: BlockWidth
  visible?: boolean
  collapsed?: boolean
}

export type LayoutColumn = {
  id: string
  blocks: LayoutBlock[]
}

export type LayoutState = {
  columns: LayoutColumn[]
}

export type LayoutAction =
  | {
      type: 'MOVE_BLOCK'
      payload: {
        blockId: BlockId
        fromColumnId: string
        toColumnId: string
        toIndex: number
      }
    }
  | {
      type: 'TOGGLE_BLOCK_VISIBILITY'
      payload: {
        id: BlockId
      }
    }
  | {
      type: 'SET_BLOCK_WIDTH'
      payload: {
        blockId: BlockId
        width: BlockWidth
      }
    }
  | {
      type: 'ADD_COLUMN'
    }
  | {
      type: 'REMOVE_COLUMN'
      payload?: {
        id?: string
        force?: boolean
      }
    }
  | {
      type: 'RESET_LAYOUT'
    }
  | {
      type: 'TOGGLE_COLLAPSE'
      payload: {
        id: BlockId
      }
    }
