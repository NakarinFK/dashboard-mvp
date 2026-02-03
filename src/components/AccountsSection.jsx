import SectionHeader from './SectionHeader.jsx'
import { formatCurrency } from '../utils/format.js'

export default function AccountsSection({ accounts }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <SectionHeader
        title="Accounts"
        subtitle="Current balances and recent movement"
      />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((account) => (
          <div
            key={account.name}
            className="rounded-xl border border-slate-200 p-4"
          >
            <p className="text-sm font-semibold text-slate-900">
              {account.name}
            </p>
            <p className="mt-3 text-lg font-semibold text-slate-900">
              {formatCurrency(account.balance)}
            </p>
            <div className="mt-3 space-y-1 text-xs text-slate-500">
              <div className="flex items-center justify-between">
                <span>Income</span>
                <span>{formatCurrency(account.income)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Expenses</span>
                <span>{formatCurrency(account.expenses)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
