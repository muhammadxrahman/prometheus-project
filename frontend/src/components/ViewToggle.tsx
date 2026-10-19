import { Fragment } from 'react'

export type ResultView = 'chart' | 'table'

const VIEWS: { value: ResultView; label: string }[] = [
  { value: 'chart', label: 'Chart' },
  { value: 'table', label: 'Table' },
]

interface ViewToggleProps {
  value: ResultView
  onChange: (view: ResultView) => void
}

function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="btn-group btn-group-sm" role="group" aria-label="Result view">
      {/* Bootstrap styles the label from the checked radio right before it, so they stay siblings */}
      {VIEWS.map((view) => (
        <Fragment key={view.value}>
          <input
            type="radio"
            className="btn-check"
            name="result-view"
            id={`result-view-${view.value}`}
            value={view.value}
            checked={value === view.value}
            onChange={() => onChange(view.value)}
          />
          <label className="btn btn-outline-secondary" htmlFor={`result-view-${view.value}`}>
            {view.label}
          </label>
        </Fragment>
      ))}
    </div>
  )
}

export default ViewToggle
