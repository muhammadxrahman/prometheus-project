import { describe, expect, it } from 'vitest'
import { cleanTicker, isValidTicker } from './ticker'

describe('cleanTicker', () => {
  it('upper-cases and strips all whitespace', () => {
    expect(cleanTicker('  ts la \n')).toBe('TSLA')
  })

  it('keeps the symbols tickers use', () => {
    expect(cleanTicker('^gspc')).toBe('^GSPC')
    expect(cleanTicker('brk.b')).toBe('BRK.B')
    expect(cleanTicker('eurusd=x')).toBe('EURUSD=X')
  })
})

describe('isValidTicker', () => {
  it.each(['TSLA', '^GSPC', 'BRK.B', 'BRK-B', 'EURUSD=X', 'A'])('accepts %s', (ticker) => {
    expect(isValidTicker(ticker)).toBe(true)
  })

  it.each(['', 'TSLA!', '.TSLA', '-A', 'tsla', 'A'.repeat(16)])('rejects %j', (ticker) => {
    expect(isValidTicker(ticker)).toBe(false)
  })
})
