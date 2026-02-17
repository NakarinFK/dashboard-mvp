// Category and budget management utilities
import { buildBudgetMap } from './seedData.js'
import { getCurrentCycleId } from '../utils/cycle.js'

export function ensureCategories(categories) {
  if (!Array.isArray(categories)) {
    return []
  }
  return categories
}

export function ensureBudgets(budgets, categories) {
  if (!Array.isArray(budgets)) {
    const currentCycleId = getCurrentCycleId()
    return [
      {
        cycleId: currentCycleId,
        budgets: buildBudgetMap(categories, []),
      },
    ]
  }
  return budgets
}

export function ensurePlanningCosts(planningCosts, categories) {
  if (!Array.isArray(planningCosts)) {
    return []
  }
  return planningCosts
}

export function isCategoryActive(category) {
  return category && category.active !== false
}

export function matchesCategoryType(category, type) {
  return category && category.type === type
}

export function getDefaultCategoryId(categories, type) {
  const activeCategories = categories.filter(isCategoryActive)
  const matchingCategories = activeCategories.filter((cat) =>
    matchesCategoryType(cat, type)
  )
  return matchingCategories.length > 0 ? matchingCategories[0].id : ''
}

export function getCategoryWarning(formState, categories, editingTransaction) {
  if (!formState.categoryId || editingTransaction) return ''
  const category = categories.find((cat) => cat.id === formState.categoryId)
  if (!category) return ''
  if (!isCategoryActive(category)) {
    return 'This category is inactive.'
  }
  if (!matchesCategoryType(category, formState.type)) {
    const expectedType = formState.type === 'income' ? 'income' : 'expense'
    return `This is an ${category.type} category, but you're recording an ${formState.type}.`
  }
  return ''
}

export function isCategoryValidForType(categoryId, type, categories) {
  const category = categories.find((cat) => cat.id === categoryId)
  return category && matchesCategoryType(category, type)
}
