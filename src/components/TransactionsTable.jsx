import { useMemo, useReducer } from 'react'
import SectionHeader from './SectionHeader.jsx'
import { formatCurrency, formatDate } from '../utils/format.js'

const columns = [
  { key: 'transaction', label: 'Transaction' },
  { key: 'amount', label: 'Amount', numeric: true },
  { key: 'category', label: 'Category' },
  { key: 'method', label: 'Payment Method' },
  { key: 'date', label: 'Date' },
  { key: 'cycleStart', label: 'Billing Cycle Start' },
]

const initialSort = { key: 'date', direction: 'desc' }

function sortReducer(state, action) {
  if (action.type !== 'TOGGLE') return state
  if (state.key === action.key) {
    return {
      key: action.key,
      direction: state.direction === 'asc' ? 'desc' : 'asc',
    }
  }
  return { key: action.key, direction: 'asc' }
}

export default function TransactionsTable({ rows }) {
  const [sort, dispatch] = useReducer(sortReducer, initialSort)

  const sortedRows = useMemo(() => {
    const sorted = [...rows].sort((a, b) => {
      const aValue = getSortValue(a, sort.key)
      const bValue = getSortValue(b, sort.key)
      if (aValue === bValue) return 0
      return aValue > bValue ? 1 : -1
    })
    return sort.direction === 'asc' ? sorted : sorted.reverse()
  }, [rows, sort])

  const handleSort = (key) => dispatch({ type: 'TOGGLE', key })

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <SectionHeader
        title="Recent Expenses"
        subtitle="Sortable table for quick review"
      />
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`py-2 pr-4 font-medium ${
                    column.numeric ? 'text-right' : 'text-left'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSort(column.key)}
                    className={`flex items-center gap-1 ${
                      column.numeric ? 'justify-end w-full' : ''
                    }`}
                  >
                    <span>{column.label}</span>
                    {sort.key === column.key ? (
                      <span className="text-slate-400">
                        {sort.direction === 'asc' ? '^' : 'v'}
                      </span>
                    ) : null}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedRows.map((row) => (
              <tr key={row.id} className="text-slate-700">
                <td className="py-3 pr-4">{row.transaction}</td>
                <td className="py-3 pr-4 text-right">
                  {formatCurrency(row.amount)}
                </td>
                <td className="py-3 pr-4">{row.category}</td>
                <td className="py-3 pr-4">{row.method}</td>
                <td className="py-3 pr-4">{formatDate(row.date)}</td>
                <td className="py-3 pr-4">{formatDate(row.cycleStart)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function getSortValue(row, key) {
  if (key === 'amount') return row.amount
  if (key === 'date' || key === 'cycleStart') {
    return new Date(row[key]).getTime()
  }
  return String(row[key]).toLowerCase()
}
