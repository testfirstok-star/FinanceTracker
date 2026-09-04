import type { Account } from '../types'

/** Anything with an optional tags array — Account and RecurringExpense both qualify. */
interface Tagged {
  tags?: string[]
}

/** Tag suggestions offered on the Accounts UI — the user can add any free-form tag beyond these. */
export const SUGGESTED_TAGS = ['bank', 'recur', 'invest']

/** Tag suggestions offered on the Recurring items UI. */
export const RECURRING_TAG_SUGGESTIONS = ['insurance']

/**
 * Tags with built-in meaning: an account carrying either is "tracking-only" — money logged there
 * doesn't count toward the Expenses total or Cash Flow's Savings figure, the same treatment
 * Investment already got. "recur" is where confirmed recurring items auto-post (see
 * resolveRecurringOccurrence), so a subscription that's really part of a credit card bill you log
 * separately doesn't get counted twice.
 */
export const TRACKING_TAGS = ['invest', 'recur'] as const

export function hasTag(item: Tagged, tag: string): boolean {
  return (item.tags ?? []).some((t) => t.toLowerCase() === tag.toLowerCase())
}

export function isTrackingOnly(account: Tagged): boolean {
  return TRACKING_TAGS.some((t) => hasTag(account, t))
}

/** The account confirmed recurring expenses auto-post to: the first active account tagged "recur". */
export function findFirstAccountWithTag(accounts: Account[], tag: string): Account | undefined {
  return accounts.find((a) => !a.archived && hasTag(a, tag))
}

/** If a category's name matches a known recurring-item tag suggestion (e.g. "Insurance"), that tag. */
export function matchingSuggestionForCategory(categoryName: string): string | undefined {
  const lower = categoryName.trim().toLowerCase()
  return RECURRING_TAG_SUGGESTIONS.find((t) => t.toLowerCase() === lower)
}

/** Adds the category-derived tag if the category name matches a suggestion and it isn't already present. Never removes tags. */
export function withCategoryDerivedTag(categoryName: string | undefined, currentTags: string[]): string[] {
  const derived = categoryName ? matchingSuggestionForCategory(categoryName) : undefined
  if (!derived || currentTags.some((t) => t.toLowerCase() === derived)) return currentTags
  return [...currentTags, derived]
}
