import { useEffect, useMemo, useReducer } from 'react'
import Dashboard from './components/Dashboard.jsx'
import {
  financeReducer,
  initFinanceState,
  persistFinanceState,
} from './financeReducer.js'
import {
  buildAccountSummaries,
  buildCashFlow,
  buildKpis,
  buildTransactionRows,
} from './utils/financeSelectors.js'
import { navItems, upcomingBills } from './data/mockData.js'

export default function App() {
  const [state, dispatch] = useReducer(
    financeReducer,
    undefined,
    initFinanceState
  )

  useEffect(() => {
    persistFinanceState(state)
  }, [state])

  const activeCycleId = useMemo(() => getCurrentCycleId(), [])

  const derived = useMemo(() => {
    const activeProfile = (state.budgets || []).find(
      (profile) => profile.cycleId === activeCycleId
    )
    const activeBudgetMap = activeProfile?.budgets || {}
    const plannedTotal = (state.planningCosts || [])
      .filter(
        (cost) => cost.cycleId === activeCycleId && cost.status === 'planned'
      )
      .reduce((sum, cost) => sum + Number(cost.amount || 0), 0)
    const spentTotal = state.transactions
      .filter(
        (transaction) =>
          transaction.type === 'expense' &&
          transaction.cycleId === activeCycleId
      )
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0)
    const budgetTotal = Object.values(activeBudgetMap).reduce(
      (sum, value) => sum + Number(value || 0),
      0
    )
    return {
      accounts: buildAccountSummaries(state.accounts, state.transactions),
      transactions: buildTransactionRows(
        state.transactions,
        state.accounts,
        state.categories
      ),
      cashFlow: buildCashFlow(state.transactions, state.categories),
      activeBudgetMap,
      budgetTotal,
      spentTotal,
      plannedTotal,
      kpis: buildKpis({
        accounts: state.accounts,
        transactions: state.transactions,
        budgetTotal,
        spentTotal,
        plannedTotal,
      }),
    }
  }, [
    state.accounts,
    state.budgets,
    state.categories,
    state.transactions,
    state.planningCosts,
    activeCycleId,
  ])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Dashboard
        navItems={navItems}
        kpis={derived.kpis}
        accounts={derived.accounts}
        categories={state.categories}
        budgets={state.budgets}
        activeCycleId={activeCycleId}
        planningCosts={state.planningCosts}
        cashFlow={derived.cashFlow}
        transactions={derived.transactions}
        upcomingBills={upcomingBills}
        formAccounts={state.accounts}
        rawTransactions={state.transactions}
        dispatch={dispatch}
      />
    </div>
  )
}

function getCurrentCycleId() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}
