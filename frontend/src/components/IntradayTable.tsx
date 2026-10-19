import type { IntradayRow } from '../api/intraday'

interface IntradayTableProps {
  ticker: string
  rows: IntradayRow[]
}

const priceFormat = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })
const volumeFormat = new Intl.NumberFormat()
// days are calendar dates (YYYY-MM-DD); format in UTC so the viewer's time zone can't shift them
const dayFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

function IntradayTable({ ticker, rows }: IntradayTableProps) {
  if (rows.length === 0) {
    return <p className="text-body-secondary">No trading data for {ticker} in the last month.</p>
  }

  return (
    <div className="table-responsive">
      <table className="table table-striped table-hover align-middle">
        <caption className="caption-top">
          {ticker}: daily averages of 15-minute bars over the last month
        </caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col" className="text-end">
              Low avg
            </th>
            <th scope="col" className="text-end">
              High avg
            </th>
            <th scope="col" className="text-end">
              Volume
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.day}>
              <td>
                <time dateTime={row.day}>{dayFormat.format(new Date(row.day))}</time>
              </td>
              <td className="text-end font-monospace">{priceFormat.format(row.lowAverage)}</td>
              <td className="text-end font-monospace">{priceFormat.format(row.highAverage)}</td>
              <td className="text-end font-monospace">{volumeFormat.format(row.volume)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default IntradayTable
