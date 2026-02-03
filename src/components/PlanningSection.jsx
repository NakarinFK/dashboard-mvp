import SectionHeader from './SectionHeader.jsx'
import { formatCurrency, formatDate } from '../utils/format.js'

export default function PlanningSection({ subscriptions }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <SectionHeader
        title="Planning Cost"
        subtitle="Upcoming fixed costs and subscriptions"
      />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {subscriptions.map((item) => (
          <div
            key={item.name}
            className="rounded-xl border border-slate-200 p-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {item.name}
                </p>
                <p className="text-xs text-slate-500">{item.billing}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] uppercase tracking-wide text-slate-600">
                {item.status}
              </span>
            </div>
            <p className="mt-3 text-lg font-semibold text-slate-900">
              {formatCurrency(item.cost)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Next renewal: {formatDate(item.nextDate)}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
