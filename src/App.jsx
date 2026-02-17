import { useEffect, useReducer, useMemo } from 'react'
import Dashboard from './components/Dashboard.jsx'
import { financeReducer, initFinanceState } from './reducers/financeReducer.js'
import { useDerivedData } from './hooks/useDerivedData.js'
import { getCurrentCycleId } from './utils/cycle.js'
import { navItems } from './data/mockData.js'
import { persistenceAdapter } from './persistence/index.js'

export default function App({ initialState, initialLayoutState }) {
  const [state, dispatch] = useReducer(
    financeReducer,
    initialState,
    initFinanceState
  )

  // Debug: Log state to console
  console.log('App state:', state)
  console.log('State accounts:', state.accounts, typeof state.accounts, Array.isArray(state.accounts))

  useEffect(() => {
    void persistenceAdapter.saveState(state)
  }, [state])

  const activeCycleId = useMemo(() => getCurrentCycleId(), [])
  const derived = useDerivedData(state, activeCycleId)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Dashboard
        navItems={navItems}
        kpis={derived.kpis}
        accounts={derived.accounts}
        categories={state.categories || []}
        budgets={state.budgets || []}
        activeCycleId={activeCycleId}
        planningCosts={state.planningCosts || []}
        cashFlow={derived.cashFlow}
        transactions={derived.transactions}
        formAccounts={state.accounts || []}
        rawTransactions={state.transactions || []}
        dispatch={dispatch}
        initialLayoutState={initialLayoutState}
      />
    </div>
  )
}
