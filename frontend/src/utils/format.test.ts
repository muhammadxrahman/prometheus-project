import { describe, expect, it } from 'vitest'
import { formatDay, formatDayShort, formatPrice, formatVolume, formatVolumeCompact } from './format'

describe('format', () => {
  it('shows prices with 2 to 4 decimals', () => {
    expect(formatPrice(359.339)).toBe('359.339')
    expect(formatPrice(1234.5)).toBe('1,234.50')
    expect(formatPrice(366.57629)).toBe('366.5763')
  })

  it('groups volume digits and compacts axis ticks', () => {
    expect(formatVolume(34544536)).toBe('34,544,536')
    expect(formatVolumeCompact(34544536)).toBe('34.5M')
    expect(formatVolumeCompact(0)).toBe('0')
  })

  it('formats calendar days without shifting them by time zone', () => {
    expect(formatDay('2026-09-17')).toBe('Thu, Sep 17, 2026')
    expect(formatDayShort('2026-10-01')).toBe('Oct 1')
  })
})
