import { useMemo, useReducer } from 'react'
import SectionHeader from './SectionHeader.jsx'

const initialState = {
  editingId: null,
  draftName: '',
}

function reducer(state, action) {
  switch (action.type) {
    case 'START_EDIT':
      return { editingId: action.id, draftName: action.name || '' }
    case 'UPDATE_DRAFT':
      return { ...state, draftName: action.value }
    case 'CANCEL':
      return initialState
    default:
      return state
  }
}

export default function CategoryManager({
  categories = [],
  transactions = [],
  dispatch,
}) {
  const [state, dispatchLocal] = useReducer(reducer, initialState)

  const counts = useMemo(() => {
    const map = new Map()
    transactions.forEach((transaction) => {
      if (!transaction.categoryId) return
      map.set(
        transaction.categoryId,
        (map.get(transaction.categoryId) || 0) + 1
      )
    })
    return map
  }, [transactions])

  const handleSave = () => {
    const trimmed = state.draftName.trim()
    if (!trimmed) return
    dispatch({
      type: 'RENAME_CATEGORY',
      payload: { id: state.editingId, name: trimmed },
    })
    dispatchLocal({ type: 'CANCEL' })
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <SectionHeader
        title="Categories"
        subtitle="Manage categories and usage"
      />
      <div className="mt-4 space-y-3">
        {categories.map((category) => {
          const isEditing = state.editingId === category.id
          return (
            <div
              key={category.id}
              className={`rounded-xl border border-slate-200 p-3 ${
                category.disabled ? 'opacity-60' : ''
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  {isEditing ? (
                    <input
                      value={state.draftName}
                      onChange={(event) =>
                        dispatchLocal({
                          type: 'UPDATE_DRAFT',
                          value: event.target.value,
                        })
                      }
                      className="w-48 rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-700"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-slate-900">
                      {category.name}
                    </p>
                  )}
                  <p className="text-xs text-slate-500">
                    {counts.get(category.id) || 0} transactions
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={handleSave}
                        className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => dispatchLocal({ type: 'CANCEL' })}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          dispatchLocal({
                            type: 'START_EDIT',
                            id: category.id,
                            name: category.name,
                          })
                        }
                        className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          dispatch({
                            type: category.disabled
                              ? 'ENABLE_CATEGORY'
                              : 'DISABLE_CATEGORY',
                            payload: { id: category.id },
                          })
                        }
                        className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                      >
                        {category.disabled ? 'Enable' : 'Disable'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
