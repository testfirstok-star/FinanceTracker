import type { EntryType, Keyword } from '../types'

export interface ParsedEntry {
  description: string
  amount: number
  categoryId: string | null
  type: EntryType
  matched: boolean
}

export interface ParseError {
  error: string
}

const NUMBER_TOKEN = /^\$?(\d+(?:[.,]\d{1,2})?)$/
const ANY_NUMBER = /\$?\d+(?:[.,]\d{1,2})?/

function parseAmount(token: string): number {
  return parseFloat(token.replace('$', '').replace(',', '.'))
}

/** Pulls an amount out of free text and returns the remaining description. */
function extractAmount(text: string): { amount: number; description: string } | null {
  const tokens = text.trim().split(/\s+/)
  if (tokens.length === 0) return null

  if (NUMBER_TOKEN.test(tokens[0])) {
    return { amount: parseAmount(tokens[0]), description: tokens.slice(1).join(' ').trim() }
  }
  if (tokens.length > 1 && NUMBER_TOKEN.test(tokens[tokens.length - 1])) {
    return { amount: parseAmount(tokens[tokens.length - 1]), description: tokens.slice(0, -1).join(' ').trim() }
  }
  const match = text.match(ANY_NUMBER)
  if (match) {
    return { amount: parseAmount(match[0]), description: text.replace(match[0], '').trim() }
  }
  return null
}

/**
 * Matches free text like "lunch 12" against the user's editable keyword list.
 * Longer/more specific keywords win over shorter ones (e.g. "water bill" beats "water").
 */
export function parseChatEntry(
  text: string,
  keywords: Keyword[],
  fallbackCategoryId: string | null,
): ParsedEntry | ParseError {
  const extracted = extractAmount(text)
  if (!extracted || Number.isNaN(extracted.amount)) {
    return { error: 'Include an amount, e.g. "lunch 12"' }
  }
  if (!extracted.description) {
    return { error: 'Include a short description, e.g. "lunch 12"' }
  }

  const lowerDesc = extracted.description.toLowerCase()
  let best: Keyword | null = null
  for (const kw of keywords) {
    if (lowerDesc.includes(kw.keyword) && (!best || kw.keyword.length > best.keyword.length)) {
      best = kw
    }
  }

  return {
    description: extracted.description,
    amount: extracted.amount,
    categoryId: best?.categoryId ?? fallbackCategoryId,
    type: best?.type ?? 'expense',
    matched: !!best,
  }
}
