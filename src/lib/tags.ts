import type { Account } from '../types'

/** Anything with an optional tags array — Account and RecurringExpense both qualify. */
interface Tagged {
  tags?: string[]
}

/**
 * Tag suggestions offered on the Accounts UI — the user can add any free-form tag beyond these.
 * Tags are labels for filtering only; how an account's spend is counted is Account.kind.
 */
export const SUGGESTED_TAGS = ['bank', 'recur']

/** Tag suggestions offered on the Recurring items UI. */
export const RECURRING_TAG_SUGGESTIONS = ['insurance']

export function hasTag(item: Tagged, tag: string): boolean {
  return (item.tags ?? []).some((t) => t.toLowerCase() === tag.toLowerCase())
}

/** The account confirmed recurring expenses auto-post to when an item has no explicit accountId: the first active account tagged "recur". */
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
