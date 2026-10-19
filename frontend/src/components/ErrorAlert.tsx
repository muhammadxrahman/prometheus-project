interface ErrorAlertProps {
  message: string
  // seconds until retrying makes sense, when the backend said so
  retryAfter?: number
  onDismiss: () => void
}

function ErrorAlert({ message, retryAfter, onDismiss }: ErrorAlertProps) {
  return (
    <div className="alert alert-danger alert-dismissible" role="alert">
      {message}
      {retryAfter !== undefined && <> Try again in {retryAfter} s.</>}
      {/* Bootstrap's JS isn't loaded, so React handles the close button */}
      <button type="button" className="btn-close" aria-label="Close" onClick={onDismiss} />
    </div>
  )
}

export default ErrorAlert
