import { useEffect, useMemo, useReducer } from 'react'
import Dashboard from './components/Dashboard.jsx'
import {
  financeReducer,
  initFinanceState,
  persistFinanceState,
} from './financeReducer.js'
import {
  buildAccountSummaries,
  buildBudgetCategories,
  buildCashFlow,
  buildKpis,
  buildTransactionRows,
} from './utils/financeSelectors.js'
import {
  budgetCategories,
  navItems,
  subscriptions,
  upcomingBills,
} from './data/mockData.js'

export default function App() {
  const [state, dispatch] = useReducer(
    financeReducer,
    undefined,
    initFinanceState
  )

  useEffect(() => {
    persistFinanceState(state)
  }, [state])

  const derived = useMemo(() => {
    const budget = buildBudgetCategories(budgetCategories, state.transactions)
    return {
      accounts: buildAccountSummaries(state.accounts, state.transactions),
      transactions: buildTransactionRows(state.transactions, state.accounts),
      cashFlow: buildCashFlow(state.transactions),
      budget,
      kpis: buildKpis({
        accounts: state.accounts,
        transactions: state.transactions,
        subscriptions,
        budget,
      }),
    }
  }, [state.accounts, state.transactions])

  const formCategories = useMemo(
    () => budgetCategories.map((category) => category.name),
    []
  )

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Dashboard
        navItems={navItems}
        kpis={derived.kpis}
        accounts={derived.accounts}
        subscriptions={subscriptions}
        budgetCategories={derived.budget}
        cashFlow={derived.cashFlow}
        transactions={derived.transactions}
        upcomingBills={upcomingBills}
        formAccounts={state.accounts}
        formCategories={formCategories}
        dispatch={dispatch}
      />
    </div>
  )
}
