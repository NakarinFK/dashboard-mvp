import { useMemo, useReducer, useRef } from 'react'
import AccountsSection from './AccountsSection.jsx'
import AddAccountForm from './AddAccountForm.jsx'
import BudgetSection from './BudgetSection.jsx'
import CashFlowSection from './CashFlowSection.jsx'
import CategoryManager from './CategoryManager.jsx'
import KpiGrid from './KpiGrid.jsx'
import PlanningCostSection from './PlanningCostSection.jsx'
import TransactionsTable from './TransactionsTable.jsx'
import TransactionForm from './TransactionForm.jsx'
import { buildTransactionRows } from '../utils/financeSelectors.js'
import { persistenceAdapter } from '../persistence/index.js'

export default function Dashboard({
  navItems,
  kpis,
  accounts,
  categories,
  budgets,
  activeCycleId,
  planningCosts,
  cashFlow,
  transactions,
  formAccounts,
  rawTransactions,
  dispatch,
}) {
  const [editingTransaction, dispatchEdit] = useReducer(editReducer, null)
  const [selectedAccountId, dispatchSelection] = useReducer(
    selectionReducer,
    null
  )
  const fileInputRef = useRef(null)

  const handleEdit = (id) => {
    const transaction = rawTransactions.find((item) => item.id === id)
    if (!transaction || transaction.type === 'opening') return
    dispatchEdit({ type: 'START', transaction })
  }

  const handleCancelEdit = () => dispatchEdit({ type: 'CLEAR' })

  const handleDelete = (id) => {
    dispatch({ type: 'DELETE_TRANSACTION', payload: { id } })
    if (editingTransaction?.id === id) {
      dispatchEdit({ type: 'CLEAR' })
    }
  }

  const handleSelectAccount = (accountId) =>
    dispatchSelection({ type: 'SELECT', accountId })

  const handleClearSelection = () => dispatchSelection({ type: 'CLEAR' })

  const selectedAccount = formAccounts.find(
    (account) => account.id === selectedAccountId
  )

  const filteredRows = useMemo(() => {
    if (!selectedAccountId) return []
    const filtered = rawTransactions.filter((transaction) => {
      if (transaction.type === 'expense') {
        return transaction.fromAccount === selectedAccountId
      }
      if (transaction.type === 'income') {
        return transaction.toAccount === selectedAccountId
      }
      if (transaction.type === 'opening') {
        return transaction.toAccount === selectedAccountId
      }
      if (transaction.type === 'transfer') {
        return (
          transaction.fromAccount === selectedAccountId ||
          transaction.toAccount === selectedAccountId
        )
      }
      return false
    })
    return buildTransactionRows(filtered, formAccounts, categories)
  }, [rawTransactions, formAccounts, categories, selectedAccountId])

  const visibleTransactions = selectedAccountId ? filteredRows : transactions

  const handleSubmit = (payload) => {
    if (editingTransaction) {
      dispatch({
        type: 'UPDATE_TRANSACTION',
        payload: { ...payload, id: editingTransaction.id },
      })
      dispatchEdit({ type: 'CLEAR' })
      return
    }
    dispatch({ type: 'ADD_TRANSACTION', payload })
  }

  const handleExport = async () => {
    try {
      const payload = await persistenceAdapter.exportData()
      const json = JSON.stringify(payload, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'finance-dashboard-export.json'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed', error)
      window.alert('Export failed. Please try again.')
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    event.target.value = ''
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      if (
        !parsed ||
        typeof parsed.version !== 'number' ||
        parsed.app !== 'finance-dashboard' ||
        !('state' in parsed)
      ) {
        window.alert('Invalid import file. Please select a valid export.')
        return
      }
      await persistenceAdapter.backup()
      await persistenceAdapter.importData(parsed)
      window.location.reload()
    } catch (error) {
      console.error('Import failed', error)
      window.alert('Import failed. Please try again.')
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-8">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
          Overview
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          Money Trackers 12/2025
        </h1>
        <nav className="flex flex-wrap gap-3 text-sm text-slate-600">
          {navItems.map((item) => (
            <span
              key={item}
              className="rounded-full bg-slate-100 px-3 py-1"
            >
              {item}
            </span>
          ))}
        </nav>
        <div className="flex justify-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={handleImportClick}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:text-slate-900"
          >
            Import Data
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:text-slate-900"
          >
            Export Data
          </button>
        </div>
      </header>

      <KpiGrid items={kpis} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-7">
          <AccountsSection
            accounts={accounts}
            onSelect={handleSelectAccount}
            selectedAccountId={selectedAccountId}
            dispatch={dispatch}
            transactions={rawTransactions}
            activeCycleId={activeCycleId}
          />
          <AddAccountForm dispatch={dispatch} />
          <PlanningCostSection
            planningCosts={planningCosts}
            categories={categories}
            accounts={formAccounts}
            activeCycleId={activeCycleId}
            dispatch={dispatch}
          />
          <BudgetSection
            categories={categories}
            budgets={budgets}
            activeCycleId={activeCycleId}
            transactions={rawTransactions}
            dispatch={dispatch}
          />
          <CategoryManager
            categories={categories}
            transactions={rawTransactions}
            budgets={budgets}
            planningCosts={planningCosts}
            dispatch={dispatch}
          />
        </div>
        <div className="space-y-6 xl:col-span-5">
          <CashFlowSection
            inflow={cashFlow.inflow}
            outflow={cashFlow.outflow}
            breakdown={cashFlow.breakdown}
          />
          <TransactionForm
            accounts={formAccounts}
            categories={categories}
            editingTransaction={editingTransaction}
            onSubmit={handleSubmit}
            onCancel={handleCancelEdit}
            dispatch={dispatch}
          />
          {selectedAccountId ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span>
                  Viewing transactions for{' '}
                  <span className="font-semibold text-slate-900">
                    {selectedAccount?.name || 'Selected Account'}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Clear
                </button>
              </div>
            </div>
          ) : null}
          <TransactionsTable
            rows={visibleTransactions}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  )
}

function editReducer(state, action) {
  switch (action.type) {
    case 'START':
      return action.transaction || null
    case 'CLEAR':
      return null
    default:
      return state
  }
}

function selectionReducer(state, action) {
  switch (action.type) {
    case 'SELECT':
      return action.accountId
    case 'CLEAR':
      return null
    default:
      return state
  }
}
