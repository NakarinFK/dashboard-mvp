import SectionHeader from './SectionHeader.jsx'
import { formatCurrency } from '../utils/format.js'

export default function BudgetSection({ categories }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <SectionHeader
        title="Budget Plan"
        subtitle="Tracked by category"
      />
      <div className="mt-4 space-y-4">
        {categories.map((item) => {
          const percent = item.budget
            ? Math.round((item.spent / item.budget) * 100)
            : 0
          const capped = Math.min(percent, 100)
          const remaining = item.budget - item.spent
          return (
            <div key={item.name} className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {item.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    Budget: {formatCurrency(item.budget)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">
                    {formatCurrency(item.spent)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {remaining >= 0
                      ? `${formatCurrency(remaining)} left`
                      : `${formatCurrency(Math.abs(remaining))} over`}
                  </p>
                </div>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-slate-900"
                  style={{ width: `${capped}%` }}
                />
              </div>
              <p className="text-xs text-slate-500">{percent}% used</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
