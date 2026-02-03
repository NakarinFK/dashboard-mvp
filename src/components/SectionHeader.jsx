export default function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {subtitle ? (
          <p className="text-xs text-slate-500">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="text-xs text-slate-500">{action}</div> : null}
    </div>
  )
}
