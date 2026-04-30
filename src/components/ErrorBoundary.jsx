import React from 'react'
import Attribution from './Attribution'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('App crashed:', error, errorInfo)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 p-6">
        <div className="glass-panel p-6 max-w-md w-full text-center">
          <h2 className="text-xl font-black text-gray-100 mb-2">Something went wrong</h2>
          <p className="text-sm text-gray-400 mb-4">
            The app hit an unexpected error. Reloading usually fixes it.
          </p>
          <button
            className="btn-primary w-full"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
          {this.state.error?.message && (
            <p className="mt-4 text-[11px] text-gray-600 break-words">
              {this.state.error.message}
            </p>
          )}
          <div className="mt-5 flex justify-center">
            <Attribution />
          </div>
        </div>
      </div>
    )
  }
}

