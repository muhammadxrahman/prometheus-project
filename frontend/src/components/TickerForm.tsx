import { useState, type FormEvent } from 'react'
import { cleanTicker, isValidTicker, TICKER_MAX_LENGTH } from '../utils/ticker'

// one click fills the input and searches, so a demo doesn't start with typing
const EXAMPLE_TICKERS = ['AAPL', 'MSFT', 'TSLA', '^GSPC']

interface TickerFormProps {
  loading: boolean
  onSubmit: (ticker: string) => void
}

function TickerForm({ loading, onSubmit }: TickerFormProps) {
  const [ticker, setTicker] = useState('')
  // only flag the format after a submit attempt, not while the user is still typing
  const [submitted, setSubmitted] = useState(false)
  const invalid = submitted && !isValidTicker(ticker)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
    if (isValidTicker(ticker)) onSubmit(ticker)
  }

  function handleExample(example: string) {
    setTicker(example)
    setSubmitted(false)
    onSubmit(example)
  }

  return (
    <>
      <form className="row g-2 align-items-start" onSubmit={handleSubmit} noValidate>
        <div className="col-sm-6 col-md-4">
          <label htmlFor="ticker" className="visually-hidden">
            Ticker symbol
          </label>
          <input
            id="ticker"
            type="text"
            className={`form-control${invalid ? ' is-invalid' : ''}`}
            placeholder="Ticker, e.g. TSLA"
            value={ticker}
            maxLength={TICKER_MAX_LENGTH}
            autoComplete="off"
            spellCheck={false}
            aria-describedby="ticker-feedback"
            onChange={(event) => setTicker(cleanTicker(event.target.value))}
          />
          <div id="ticker-feedback" className="invalid-feedback">
            Use letters, digits, and . = ^ - (up to {TICKER_MAX_LENGTH} characters), e.g. TSLA, BRK-B, ^GSPC.
          </div>
        </div>
        <div className="col-auto">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
            {loading ? 'Loading…' : 'Get intraday data'}
          </button>
        </div>
      </form>
      <div className="d-flex flex-wrap align-items-center gap-2 mt-3">
        <span className="small text-body-secondary">Try:</span>
        {EXAMPLE_TICKERS.map((example) => (
          <button
            key={example}
            type="button"
            className="btn btn-sm btn-outline-secondary"
            disabled={loading}
            onClick={() => handleExample(example)}
          >
            {example}
          </button>
        ))}
      </div>
    </>
  )
}

export default TickerForm
