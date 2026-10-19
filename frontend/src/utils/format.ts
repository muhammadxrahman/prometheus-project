// one place for display formatting so the table and chart always agree; the UI is English, so pin en-US
const LOCALE = 'en-US'

const priceFormat = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 4 })
const volumeFormat = new Intl.NumberFormat(LOCALE)
const volumeCompactFormat = new Intl.NumberFormat(LOCALE, { notation: 'compact', maximumFractionDigits: 1 })
// days are calendar dates (YYYY-MM-DD); format in UTC so the viewer's time zone can't shift them
const dayFormat = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'short',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})
const dayShortFormat = new Intl.DateTimeFormat(LOCALE, { month: 'short', day: 'numeric', timeZone: 'UTC' })

export function formatPrice(value: number): string {
  return priceFormat.format(value)
}

export function formatVolume(value: number): string {
  return volumeFormat.format(value)
}

// axis ticks: 0 / 20M / 40M
export function formatVolumeCompact(value: number): string {
  return volumeCompactFormat.format(value)
}

export function formatDay(day: string): string {
  return dayFormat.format(new Date(day))
}

export function formatDayShort(day: string): string {
  return dayShortFormat.format(new Date(day))
}
