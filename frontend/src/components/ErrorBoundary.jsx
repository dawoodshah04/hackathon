import { Component } from 'react'

/** Last line of defence: a render error shows a recoverable screen instead of a blank page. */
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Unhandled render error', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="grid min-h-dvh place-items-center px-4">
        <div className="max-w-sm text-center">
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="mt-1.5 text-sm text-stone-600">An unexpected error stopped this page from loading. Reloading usually fixes it.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="focus-ring mt-6 inline-flex h-9 items-center rounded-lg bg-brand-700 px-3.5 text-sm font-medium text-white hover:bg-brand-800"
          >
            Reload
          </button>
        </div>
      </div>
    )
  }
}
