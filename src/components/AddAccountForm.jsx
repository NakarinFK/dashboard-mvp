import { useReducer } from 'react'
import SectionHeader from './SectionHeader.jsx'

const createFormState = () => ({
  name: '',
  balance: '',
})

function formReducer(state, action) {
  switch (action.type) {
    case 'UPDATE':
      return { ...state, [action.field]: action.value }
    case 'RESET':
      return createFormState()
    default:
      return state
  }
}

export default function AddAccountForm({ dispatch }) {
  const [formState, dispatchForm] = useReducer(
    formReducer,
    undefined,
    createFormState
  )

  const handleChange = (event) => {
    const { name, value } = event.target
    dispatchForm({ type: 'UPDATE', field: name, value })
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const trimmedName = formState.name.trim()
    if (!trimmedName) return

    dispatch({
      type: 'ADD_ACCOUNT',
      payload: {
        name: trimmedName,
        balance: Number(formState.balance) || 0,
      },
    })
    dispatchForm({ type: 'RESET' })
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <SectionHeader
        title="Add Account"
        subtitle="Create a new account for tracking"
      />
      <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
        <label className="text-xs font-medium text-slate-600">
          Account Name
          <input
            name="name"
            value={formState.name}
            onChange={handleChange}
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            placeholder="e.g. Savings"
            required
          />
        </label>
        <label className="text-xs font-medium text-slate-600">
          Opening Balance
          <input
            name="balance"
            type="number"
            step="0.01"
            value={formState.balance}
            onChange={handleChange}
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            placeholder="Optional"
          />
        </label>
        <div className="sm:col-span-2 flex items-center justify-end">
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Add Account
          </button>
        </div>
      </form>
    </section>
  )
}
