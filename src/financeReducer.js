import { accounts as mockAccounts, transactions as mockTransactions } from './data/mockData.js'

const STORAGE_KEY = 'financeState-v1'

const seedAccounts = mockAccounts.map((account, index) => ({
  id: `acc-${index + 1}`,
  name: account.name,
  balance: Number(account.balance) || 0,
}))

const accountIdByName = seedAccounts.reduce((map, account) => {
  map[account.name] = account.id
  return map
}, {})

const seedTransactions = mockTransactions.map((transaction) => ({
  id: `txn-${transaction.id}`,
  type: 'expense',
  amount: Number(transaction.amount) || 0,
  fromAccount: accountIdByName[transaction.method] ?? null,
  toAccount: null,
  category: transaction.category,
  note: transaction.transaction,
  date: transaction.date,
}))

const seedState = {
  accounts: seedAccounts,
  baseAccounts: seedAccounts,
  transactions: seedTransactions,
}

const cloneAccounts = (accounts) => accounts.map((account) => ({ ...account }))

function applyTransaction(accounts, transaction, direction = 1) {
  const amount = Number(transaction.amount) || 0
  if (!amount) return

  if (transaction.type === 'income') {
    adjustAccount(accounts, transaction.toAccount, amount * direction)
    return
  }

  if (transaction.type === 'expense') {
    adjustAccount(accounts, transaction.fromAccount, -amount * direction)
    return
  }

  if (transaction.type === 'transfer') {
    adjustAccount(accounts, transaction.fromAccount, -amount * direction)
    adjustAccount(accounts, transaction.toAccount, amount * direction)
  }
}

function adjustAccount(accounts, accountId, delta) {
  if (!accountId) return
  const index = accounts.findIndex((account) => account.id === accountId)
  if (index === -1) return
  const current = accounts[index]
  accounts[index] = {
    ...current,
    balance: Number(current.balance) + delta,
  }
}

function deriveBaseAccountsFromCurrent(accounts, transactions) {
  const baseAccounts = cloneAccounts(accounts)
  for (const transaction of transactions) {
    applyTransaction(baseAccounts, transaction, -1)
  }
  return baseAccounts
}

function recalculateBalances(state) {
  const accounts = cloneAccounts(state.baseAccounts)
  for (const transaction of state.transactions) {
    applyTransaction(accounts, transaction, 1)
  }
  return { ...state, accounts }
}

function normalizeState(state) {
  if (!state || !Array.isArray(state.accounts)) return seedState
  const transactions = Array.isArray(state.transactions) ? state.transactions : []
  const baseAccounts = Array.isArray(state.baseAccounts)
    ? state.baseAccounts
    : deriveBaseAccountsFromCurrent(state.accounts, transactions)

  return recalculateBalances({
    accounts: state.accounts,
    baseAccounts,
    transactions,
  })
}

const createId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

export function initFinanceState() {
  if (typeof window === 'undefined') {
    return seedState
  }

  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return seedState

  try {
    return normalizeState(JSON.parse(saved))
  } catch (error) {
    return seedState
  }
}

export function persistFinanceState(state) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function financeReducer(state, action) {
  switch (action.type) {
    case 'ADD_TRANSACTION': {
      const payload = action.payload || {}
      const transaction = {
        id: createId(),
        type: payload.type || 'expense',
        amount: Math.abs(Number(payload.amount) || 0),
        fromAccount: payload.fromAccount ?? null,
        toAccount: payload.toAccount ?? null,
        category: payload.category || 'Uncategorized',
        note: payload.note || '',
        date: payload.date || new Date().toISOString().slice(0, 10),
      }

      const nextState = {
        ...state,
        transactions: [transaction, ...state.transactions],
      }

      return recalculateBalances(nextState)
    }
    case 'DELETE_TRANSACTION': {
      const id = action.payload?.id
      if (!id) return state
      const nextState = {
        ...state,
        transactions: state.transactions.filter((item) => item.id !== id),
      }
      return recalculateBalances(nextState)
    }
    case 'ADD_ACCOUNT': {
      const payload = action.payload || {}
      const newAccount = {
        id: createId(),
        name: payload.name || 'New Account',
        balance: Number(payload.balance) || 0,
      }
      return {
        ...state,
        accounts: [...state.accounts, newAccount],
        baseAccounts: [...state.baseAccounts, newAccount],
      }
    }
    case 'RECALCULATE_BALANCES': {
      return recalculateBalances(state)
    }
    default:
      return state
  }
}
