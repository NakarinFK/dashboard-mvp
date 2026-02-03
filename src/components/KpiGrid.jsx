export default function KpiGrid({ items }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {item.label}
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {item.value}
          </p>
          <p className="mt-1 text-xs text-slate-500">{item.note}</p>
        </div>
      ))}
    </section>
  )
}
