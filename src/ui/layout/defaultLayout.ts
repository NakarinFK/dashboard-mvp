import type { LayoutState } from './layoutTypes'

export const DEFAULT_LAYOUT: LayoutState = {
  columns: [
    {
      id: 'column-1',
      blocks: [
        { id: 'accounts', hidden: false, width: 'full' },
        { id: 'add-account', hidden: false, width: 'full' },
        { id: 'planning-costs', hidden: false, width: 'full' },
        { id: 'budget-plan', hidden: false, width: 'full' },
        { id: 'category-manager', hidden: false, width: 'full' },
        { id: 'cash-flow', hidden: false, width: 'full' },
        { id: 'transaction-form', hidden: false, width: 'full' },
        { id: 'account-selection', hidden: false, width: 'full' },
        { id: 'transactions-table', hidden: false, width: 'full' },
      ],
    },
  ],
}
