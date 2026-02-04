import { useReducer } from 'react'
import SectionHeader from './SectionHeader.jsx'

const createFormState = () => ({
  type: 'expense',
  amount: '',
  fromAccount: '',
  toAccount: '',
  category: '',
  note: '',
  date: new Date().toISOString().slice(0, 10),
})

function formReducer(state, action) {
  switch (action.type) {
    case 'UPDATE':
      return { ...state, [action.field]: action.value }
    case 'SET_TYPE':
      return {
        ...state,
        type: action.value,
        fromAccount: '',
        toAccount: '',
      }
    case 'RESET':
      return createFormState()
    default:
      return state
  }
}

export default function TransactionForm({ accounts, categories, dispatch }) {
  const [formState, dispatchForm] = useReducer(
    formReducer,
    undefined,
    createFormState
  )

  const showFromAccount = formState.type !== 'income'
  const showToAccount = formState.type !== 'expense'
  const requiresCategory = formState.type !== 'transfer'

  const handleChange = (event) => {
    const { name, value } = event.target
    if (name === 'type') {
      dispatchForm({ type: 'SET_TYPE', value })
      return
    }
    dispatchForm({ type: 'UPDATE', field: name, value })
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const amount = Math.abs(Number(formState.amount) || 0)
    if (!amount) return

    const payload = {
      type: formState.type,
      amount,
      category: formState.category || 'Uncategorized',
      note: formState.note,
      date: formState.date,
    }

    if (formState.type === 'income') {
      payload.toAccount = formState.toAccount || null
    }

    if (formState.type === 'expense') {
      payload.fromAccount = formState.fromAccount || null
    }

    if (formState.type === 'transfer') {
      payload.fromAccount = formState.fromAccount || null
      payload.toAccount = formState.toAccount || null
      payload.category = 'Transfer'
    }

    dispatch({ type: 'ADD_TRANSACTION', payload })
    dispatchForm({ type: 'RESET' })
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <SectionHeader
        title="Add Transaction"
        subtitle="Log income, expense, or transfers"
      />
      <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
        <label className="text-xs font-medium text-slate-600">
          Type
          <select
            name="type"
            value={formState.type}
            onChange={handleChange}
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
            <option value="transfer">Transfer</option>
          </select>
        </label>

        <label className="text-xs font-medium text-slate-600">
          Amount
          <input
            name="amount"
            type="number"
            min="0"
            step="0.01"
            value={formState.amount}
            onChange={handleChange}
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            required
          />
        </label>

        {showFromAccount ? (
          <label className="text-xs font-medium text-slate-600">
            From Account
            <select
              name="fromAccount"
              value={formState.fromAccount}
              onChange={handleChange}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              required={formState.type !== 'income'}
            >
              <option value="">Select account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {showToAccount ? (
          <label className="text-xs font-medium text-slate-600">
            To Account
            <select
              name="toAccount"
              value={formState.toAccount}
              onChange={handleChange}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              required={formState.type !== 'expense'}
            >
              <option value="">Select account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="text-xs font-medium text-slate-600">
          Category
          <input
            name="category"
            list="category-options"
            value={formState.category}
            onChange={handleChange}
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            required={requiresCategory}
            disabled={!requiresCategory}
          />
        </label>

        <label className="text-xs font-medium text-slate-600">
          Date
          <input
            name="date"
            type="date"
            value={formState.date}
            onChange={handleChange}
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            required
          />
        </label>

        <label className="text-xs font-medium text-slate-600 sm:col-span-2">
          Note
          <input
            name="note"
            value={formState.note}
            onChange={handleChange}
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            placeholder="Optional details"
          />
        </label>

        <div className="sm:col-span-2 flex items-center justify-end">
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Add Transaction
          </button>
        </div>
      </form>

      <datalist id="category-options">
        {categories.map((category) => (
          <option key={category} value={category} />
        ))}
      </datalist>
    </section>
  )
}
