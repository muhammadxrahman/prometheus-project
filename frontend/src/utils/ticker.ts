// mirrors the backend's TICKER_PATTERN; the backend's 400 stays the source of truth
const TICKER_PATTERN = /^[A-Z0-9^][A-Z0-9.=^-]{0,14}$/

export const TICKER_MAX_LENGTH = 15

// tickers never contain whitespace, and the backend expects upper case
export function cleanTicker(input: string): string {
  return input.replace(/\s+/g, '').toUpperCase()
}

export function isValidTicker(ticker: string): boolean {
  return TICKER_PATTERN.test(ticker)
}
