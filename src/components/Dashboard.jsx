import AccountsSection from './AccountsSection.jsx'
import BudgetSection from './BudgetSection.jsx'
import CashFlowSection from './CashFlowSection.jsx'
import KpiGrid from './KpiGrid.jsx'
import PlanningSection from './PlanningSection.jsx'
import TimelineSection from './TimelineSection.jsx'
import TransactionsTable from './TransactionsTable.jsx'
import TransactionForm from './TransactionForm.jsx'

export default function Dashboard({
  navItems,
  kpis,
  accounts,
  subscriptions,
  budgetCategories,
  cashFlow,
  transactions,
  upcomingBills,
  formAccounts,
  formCategories,
  dispatch,
}) {
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
      </header>

      <KpiGrid items={kpis} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-7">
          <AccountsSection accounts={accounts} />
          <PlanningSection subscriptions={subscriptions} />
          <BudgetSection categories={budgetCategories} />
        </div>
        <div className="space-y-6 xl:col-span-5">
          <CashFlowSection
            inflow={cashFlow.inflow}
            outflow={cashFlow.outflow}
            breakdown={cashFlow.breakdown}
          />
          <TransactionForm
            accounts={formAccounts}
            categories={formCategories}
            dispatch={dispatch}
          />
          <TransactionsTable rows={transactions} />
          <TimelineSection items={upcomingBills} />
        </div>
      </div>
    </div>
  )
}
