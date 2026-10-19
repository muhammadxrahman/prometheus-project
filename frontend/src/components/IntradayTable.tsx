import type { IntradayRow } from '../api/intraday'
import { formatDay, formatPrice, formatVolume } from '../utils/format'

interface IntradayTableProps {
  ticker: string
  rows: IntradayRow[]
}

function IntradayTable({ ticker, rows }: IntradayTableProps) {
  return (
    <div className="table-responsive">
      <table className="table table-striped table-hover align-middle">
        <caption className="visually-hidden">{ticker} daily averages of 15-minute bars over the last month</caption>
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
              <td className="text-nowrap">
                <time dateTime={row.day}>{formatDay(row.day)}</time>
              </td>
              <td className="text-end font-monospace">{formatPrice(row.lowAverage)}</td>
              <td className="text-end font-monospace">{formatPrice(row.highAverage)}</td>
              <td className="text-end font-monospace">{formatVolume(row.volume)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default IntradayTable
