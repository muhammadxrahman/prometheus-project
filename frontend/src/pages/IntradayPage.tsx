import { useEffect, useRef, useState } from 'react'
import { ApiError, fetchIntraday, type IntradayRow } from '../api/intraday'
import ErrorAlert from '../components/ErrorAlert'
import IntradayChart from '../components/IntradayChart'
import IntradayTable from '../components/IntradayTable'
import TickerForm from '../components/TickerForm'
import ViewToggle, { type ResultView } from '../components/ViewToggle'

type RequestState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; ticker: string; rows: IntradayRow[] }
  | { status: 'error'; error: ApiError }

function IntradayPage() {
  const [state, setState] = useState<RequestState>({ status: 'idle' })
  // kept across searches so the reader's choice sticks
  const [view, setView] = useState<ResultView>('chart')
  const controllerRef = useRef<AbortController | null>(null)

  // cancel any request still running when the page goes away
  useEffect(() => () => controllerRef.current?.abort(), [])

  async function handleSubmit(ticker: string) {
    // a new search cancels the previous one so a slow response can't overwrite a newer result
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    setState({ status: 'loading' })
    try {
      const rows = await fetchIntraday(ticker, controller.signal)
      setState({ status: 'success', ticker, rows })
    } catch (err) {
      if (controller.signal.aborted) return
      const error = err instanceof ApiError ? err : new ApiError(0, 'Something went wrong. Please try again.')
      setState({ status: 'error', error })
    }
  }

  // gray page with white header, cards and footer so each section stands apart
  return (
    <div className="d-flex flex-column min-vh-100 bg-body-tertiary">
      <header className="bg-body border-bottom">
        <div className="container py-4">
          <h1 className="h3 mb-1">Stock Tracker</h1>
          <p className="text-body-secondary mb-0">
            Daily low and high averages and total volume from 15-minute bars over the last month.
          </p>
        </div>
      </header>

      <main className="container flex-grow-1 py-4">
        <section className="card shadow-sm mb-4" aria-label="Search">
          <div className="card-body">
            <TickerForm loading={state.status === 'loading'} onSubmit={handleSubmit} />
          </div>
        </section>

        {state.status === 'error' && (
          <ErrorAlert
            message={state.error.message}
            retryAfter={state.error.retryAfter}
            onDismiss={() => setState({ status: 'idle' })}
          />
        )}
        {state.status === 'success' && state.rows.length === 0 && (
          <section className="card shadow-sm">
            <div className="card-body text-body-secondary">No trading data for {state.ticker} in the last month.</div>
          </section>
        )}
        {state.status === 'success' && state.rows.length > 0 && (
          <section className="card shadow-sm" aria-label={`${state.ticker} results`}>
            <div className="card-header bg-body d-flex flex-wrap align-items-center justify-content-between gap-2 py-3">
              <h2 className="h6 mb-0">
                {state.ticker} <span className="fw-normal text-body-secondary">· daily averages, last month</span>
              </h2>
              <ViewToggle value={view} onChange={setView} />
            </div>
            <div className="card-body">
              {view === 'chart' ? (
                <IntradayChart ticker={state.ticker} rows={state.rows} />
              ) : (
                <IntradayTable ticker={state.ticker} rows={state.rows} />
              )}
            </div>
          </section>
        )}
      </main>

      <footer className="bg-body border-top">
        <div className="container py-3 small text-body-secondary">
          Market data from Yahoo Finance, aggregated from 15-minute bars. The current day's row may be partial while
          the market is open.
        </div>
      </footer>
    </div>
  )
}

export default IntradayPage
