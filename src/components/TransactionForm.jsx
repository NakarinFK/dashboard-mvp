import { useEffect, useReducer } from 'react'
import SectionHeader from './SectionHeader.jsx'

const createFormState = (overrides = {}) => ({
  type: 'expense',
  amount: '',
  fromAccount: '',
  toAccount: '',
  categoryId: '',
  note: '',
  date: new Date().toISOString().slice(0, 10),
  isAddingCategory: false,
  newCategoryName: '',
  ...overrides,
})

function mapTransactionToForm(transaction) {
  if (!transaction) return createFormState()
  return createFormState({
    type: transaction.type || 'expense',
    amount: transaction.amount ? String(transaction.amount) : '',
    fromAccount: transaction.fromAccount || '',
    toAccount: transaction.toAccount || '',
    categoryId: transaction.categoryId || '',
    note: transaction.note || '',
    date: transaction.date || new Date().toISOString().slice(0, 10),
  })
}

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
      return createFormState(action.value)
    case 'SET_ALL':
      return createFormState(action.value)
    default:
      return state
  }
}

export default function TransactionForm({
  accounts,
  categories = [],
  editingTransaction,
  onSubmit,
  onCancel,
  dispatch,
}) {
  const defaultCategoryId = getDefaultCategoryId(categories)
  const [formState, dispatchForm] = useReducer(
    formReducer,
    undefined,
    () => createFormState({ categoryId: defaultCategoryId })
  )

  useEffect(() => {
    if (editingTransaction) {
      dispatchForm({
        type: 'SET_ALL',
        value: mapTransactionToForm(editingTransaction),
      })
      return
    }
    dispatchForm({ type: 'RESET', value: { categoryId: defaultCategoryId } })
  }, [editingTransaction, defaultCategoryId])

  const showFromAccount = formState.type !== 'income'
  const showToAccount = formState.type !== 'expense'
  const requiresCategory = true
  const activeCategories = categories.filter((category) => !category.disabled)
  const categorySelectValue = activeCategories.some(
    (category) => category.id === formState.categoryId
  )
    ? formState.categoryId
    : ''
  const selectedCategory = categories.find(
    (category) => category.id === formState.categoryId
  )
  const validation = validateForm(formState, categories)
  const categoryWarning = getCategoryWarning(
    formState,
    categories,
    editingTransaction
  )

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
    if (!validation.isValid) return
    const amount = Math.abs(Number(formState.amount) || 0)
    if (!amount) return

    const payload = {
      type: formState.type,
      amount,
      categoryId: formState.categoryId,
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
    }

    if (onSubmit) {
      onSubmit(payload)
    }
    if (!editingTransaction) {
      dispatchForm({ type: 'RESET' })
    }
  }

  const handleAddCategory = () => {
    const trimmedName = formState.newCategoryName.trim()
    if (!trimmedName || !dispatch) return
    const newId = `cat-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 6)}`
    dispatch({
      type: 'ADD_CATEGORY',
      payload: { id: newId, name: trimmedName },
    })
    dispatchForm({ type: 'UPDATE', field: 'categoryId', value: newId })
    dispatchForm({ type: 'UPDATE', field: 'newCategoryName', value: '' })
    dispatchForm({ type: 'UPDATE', field: 'isAddingCategory', value: false })
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <SectionHeader
        title={editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
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
          {validation.errors.amount ? (
            <p className="mt-1 text-[11px] text-rose-600">
              {validation.errors.amount}
            </p>
          ) : null}
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
            {validation.errors.fromAccount ? (
              <p className="mt-1 text-[11px] text-rose-600">
                {validation.errors.fromAccount}
              </p>
            ) : null}
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
            {validation.errors.toAccount ? (
              <p className="mt-1 text-[11px] text-rose-600">
                {validation.errors.toAccount}
              </p>
            ) : null}
          </label>
        ) : null}

        <label className="text-xs font-medium text-slate-600">
          Category
          <select
            name="categoryId"
            value={categorySelectValue}
            onChange={handleChange}
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            required={requiresCategory}
            disabled={!requiresCategory}
          >
            <option value="">Select category</option>
            {activeCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {categoryWarning ? (
            <p className="mt-1 text-[11px] text-rose-600">
              {categoryWarning}
            </p>
          ) : null}
          {validation.errors.categoryId ? (
            <p className="mt-1 text-[11px] text-rose-600">
              {validation.errors.categoryId}
            </p>
          ) : null}
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                dispatchForm({
                  type: 'UPDATE',
                  field: 'isAddingCategory',
                  value: !formState.isAddingCategory,
                })
              }
              className="text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              + Add Category
            </button>
          </div>
          {formState.isAddingCategory ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                name="newCategoryName"
                value={formState.newCategoryName}
                onChange={handleChange}
                className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
                placeholder="New category name"
              />
              <button
                type="button"
                onClick={handleAddCategory}
                className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600"
              >
                Add
              </button>
            </div>
          ) : null}
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

        <div className="sm:col-span-2 flex items-center justify-end gap-3">
          {!validation.isValid ? (
            <p className="mr-auto text-[11px] text-rose-600">
              {validation.summary}
            </p>
          ) : null}
          {editingTransaction ? (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
            >
              Cancel
            </button>
          ) : null}
          <button
            type="submit"
            disabled={!validation.isValid}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            {editingTransaction ? 'Update Transaction' : 'Add Transaction'}
          </button>
        </div>
      </form>

    </section>
  )
}

function validateForm(state, categories) {
  const errors = {}
  const amount = Number(state.amount)

  if (!amount || amount <= 0) {
    errors.amount = 'Amount must be greater than 0.'
  }

  if (state.type === 'expense') {
    if (!state.fromAccount) {
      errors.fromAccount = 'Select the account used for payment.'
    }
  }

  if (state.type === 'income') {
    if (!state.toAccount) {
      errors.toAccount = 'Select the account receiving funds.'
    }
  }

  if (state.type === 'transfer') {
    if (!state.fromAccount) {
      errors.fromAccount = 'Select the account sending funds.'
    }
    if (!state.toAccount) {
      errors.toAccount = 'Select the account receiving funds.'
    }
    if (
      state.fromAccount &&
      state.toAccount &&
      state.fromAccount === state.toAccount
    ) {
      errors.toAccount = 'Transfer accounts must be different.'
    }
  }

  if (!state.categoryId) {
    errors.categoryId = 'Select a category.'
  } else {
    const selected = categories.find(
      (category) => category.id === state.categoryId
    )
    if (!selected) {
      errors.categoryId = 'Select a valid category.'
    } else if (selected.disabled) {
      errors.categoryId = 'Selected category is disabled.'
    }
  }

  const isValid = Object.keys(errors).length === 0
  return {
    isValid,
    errors,
    summary: isValid ? '' : 'Fix the highlighted fields before submitting.',
  }
}

function getDefaultCategoryId(categories) {
  const uncategorized = categories.find(
    (category) => category.id === 'cat-uncategorized' && !category.disabled
  )
  if (uncategorized) return uncategorized.id
  const firstActive = categories.find((category) => !category.disabled)
  return firstActive ? firstActive.id : ''
}

function getCategoryWarning(state, categories, editingTransaction) {
  if (!editingTransaction) return ''
  if (!state.categoryId) return 'This transaction needs a category.'
  const category = categories.find((item) => item.id === state.categoryId)
  if (!category) return 'This category no longer exists. Choose another.'
  if (category.disabled) return 'This category is disabled. Choose another.'
  return ''
}
