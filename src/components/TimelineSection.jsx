import SectionHeader from './SectionHeader.jsx'
import { formatCurrency, formatDate } from '../utils/format.js'

export default function TimelineSection({ items }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <SectionHeader
        title="Upcoming Renewals"
        subtitle="Next scheduled payments"
      />
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex gap-3">
            <div className="mt-2 h-2 w-2 rounded-full bg-slate-400" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">
                  {item.name}
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {formatCurrency(item.amount)}
                </p>
              </div>
              <p className="text-xs text-slate-500">
                Due {formatDate(item.dueDate)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
