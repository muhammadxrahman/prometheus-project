import { useEffect, useRef, useState } from 'react'
import { ApiError, fetchIntraday, type IntradayRow } from '../api/intraday'
import ErrorAlert from '../components/ErrorAlert'
import IntradayTable from '../components/IntradayTable'
import TickerForm from '../components/TickerForm'

type RequestState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; ticker: string; rows: IntradayRow[] }
  | { status: 'error'; error: ApiError }

function IntradayPage() {
  const [state, setState] = useState<RequestState>({ status: 'idle' })
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

  return (
    <main className="container py-4">
      <h1 className="h3 mb-1">Intraday averages</h1>
      <p className="text-body-secondary mb-4">
        Daily low and high averages and total volume from 15-minute bars over the last month.
      </p>

      <TickerForm loading={state.status === 'loading'} onSubmit={handleSubmit} />

      <div className="mt-4">
        {state.status === 'error' && (
          <ErrorAlert
            message={state.error.message}
            retryAfter={state.error.retryAfter}
            onDismiss={() => setState({ status: 'idle' })}
          />
        )}
        {state.status === 'success' && <IntradayTable ticker={state.ticker} rows={state.rows} />}
      </div>
    </main>
  )
}

export default IntradayPage
