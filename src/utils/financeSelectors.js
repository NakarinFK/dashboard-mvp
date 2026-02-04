import { formatCurrency } from './format.js'

const CASHFLOW_COLORS = [
  '#f97316',
  '#38bdf8',
  '#22c55e',
  '#eab308',
  '#6366f1',
  '#ec4899',
  '#8b5cf6',
]

export function buildAccountSummaries(accounts, transactions) {
  const incomeByAccount = new Map()
  const expenseByAccount = new Map()

  transactions.forEach((transaction) => {
    if (transaction.type === 'income' && transaction.toAccount) {
      incomeByAccount.set(
        transaction.toAccount,
        (incomeByAccount.get(transaction.toAccount) || 0) +
          Number(transaction.amount || 0)
      )
    }

    if (transaction.type === 'expense' && transaction.fromAccount) {
      expenseByAccount.set(
        transaction.fromAccount,
        (expenseByAccount.get(transaction.fromAccount) || 0) +
          Number(transaction.amount || 0)
      )
    }
  })

  return accounts.map((account) => ({
    name: account.name,
    balance: account.balance,
    income: incomeByAccount.get(account.id) || 0,
    expenses: expenseByAccount.get(account.id) || 0,
  }))
}

export function buildCashFlow(transactions) {
  const inflow = sumByType(transactions, 'income')
  const outflow = sumByType(transactions, 'expense')
  const breakdownMap = new Map()

  transactions.forEach((transaction) => {
    if (transaction.type !== 'expense') return
    const key = transaction.category || 'Uncategorized'
    breakdownMap.set(key, (breakdownMap.get(key) || 0) + transaction.amount)
  })

  const breakdown = Array.from(breakdownMap.entries())
    .map(([label, value], index) => ({
      label,
      value,
      color: CASHFLOW_COLORS[index % CASHFLOW_COLORS.length],
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)

  return { inflow, outflow, breakdown }
}

export function buildTransactionRows(transactions, accounts) {
  const accountMap = new Map(accounts.map((account) => [account.id, account.name]))

  return transactions.map((transaction) => {
    const fromName = transaction.fromAccount
      ? accountMap.get(transaction.fromAccount) || 'Unknown'
      : '—'
    const toName = transaction.toAccount
      ? accountMap.get(transaction.toAccount) || 'Unknown'
      : '—'

    let method = '—'
    if (transaction.type === 'income') {
      method = toName
    } else if (transaction.type === 'expense') {
      method = fromName
    } else if (transaction.type === 'transfer') {
      method = `${fromName} → ${toName}`
    }

    return {
      id: transaction.id,
      transaction: transaction.note || transaction.category || transaction.type,
      amount: transaction.amount,
      category: transaction.category || 'Transfer',
      method,
      date: transaction.date,
      cycleStart: transaction.date,
    }
  })
}

export function buildBudgetCategories(budgetCategories, transactions) {
  const spendByCategory = new Map()

  transactions.forEach((transaction) => {
    if (transaction.type !== 'expense') return
    const key = transaction.category || 'Uncategorized'
    spendByCategory.set(key, (spendByCategory.get(key) || 0) + transaction.amount)
  })

  return budgetCategories.map((category) => ({
    ...category,
    spent: spendByCategory.get(category.name) ?? category.spent ?? 0,
  }))
}

export function buildKpis({ accounts, transactions, subscriptions, budget }) {
  const totalBalance = accounts.reduce(
    (sum, account) => sum + Number(account.balance || 0),
    0
  )
  const inflow = sumByType(transactions, 'income')
  const outflow = sumByType(transactions, 'expense')
  const plannedCosts = subscriptions.reduce(
    (sum, item) => sum + Number(item.cost || 0),
    0
  )
  const budgetTotal = budget.reduce(
    (sum, item) => sum + Number(item.budget || 0),
    0
  )
  const spentTotal = budget.reduce(
    (sum, item) => sum + Number(item.spent || 0),
    0
  )

  return [
    {
      label: 'Total Balance',
      value: formatCurrency(totalBalance),
      note: `Across ${accounts.length} accounts`,
    },
    {
      label: 'Cash Flow (This Month)',
      value: formatCurrency(inflow - outflow),
      note: `Inflow ${formatCurrency(inflow)} · Outflow ${formatCurrency(outflow)}`,
    },
    {
      label: 'Planned Costs',
      value: formatCurrency(plannedCosts),
      note: 'Subscriptions and fixed costs',
    },
    {
      label: 'Budget Left',
      value: formatCurrency(budgetTotal - spentTotal),
      note: 'Remaining before month end',
    },
  ]
}

function sumByType(transactions, type) {
  return transactions
    .filter((transaction) => transaction.type === type)
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0)
}
