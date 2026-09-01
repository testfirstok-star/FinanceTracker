import type { Account } from '../types'

/** Tag suggestions offered in the UI — the user can add any free-form tag beyond these. */
export const SUGGESTED_TAGS = ['bank', 'recur', 'invest']

/**
 * Tags with built-in meaning: an account carrying either is "tracking-only" — money logged there
 * doesn't count toward the Expenses total or Cash Flow's Savings figure, the same treatment
 * Investment already got. "recur" is where confirmed recurring items auto-post (see
 * resolveRecurringOccurrence), so a subscription that's really part of a credit card bill you log
 * separately doesn't get counted twice.
 */
export const TRACKING_TAGS = ['invest', 'recur'] as const

export function hasTag(account: Pick<Account, 'tags'>, tag: string): boolean {
  return (account.tags ?? []).some((t) => t.toLowerCase() === tag.toLowerCase())
}

export function isTrackingOnly(account: Pick<Account, 'tags'>): boolean {
  return TRACKING_TAGS.some((t) => hasTag(account, t))
}

/** The account confirmed recurring expenses auto-post to: the first active account tagged "recur". */
export function findFirstAccountWithTag(accounts: Account[], tag: string): Account | undefined {
  return accounts.find((a) => !a.archived && hasTag(a, tag))
}
