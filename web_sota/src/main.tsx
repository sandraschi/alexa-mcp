import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Top-level error boundary for startup crashes
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[alexa-mcp] Root render error:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          fontFamily: 'monospace', background: '#0f172a', color: '#f87171',
          padding: '2rem', minHeight: '100vh'
        }}>
          <h2 style={{ color: '#fca5a5' }}>React startup error</h2>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#fcd34d' }}>
            {this.state.error.message}
          </pre>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#94a3b8', fontSize: '0.8em' }}>
            {this.state.error.stack}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}

const rootEl = document.getElementById('root')
if (!rootEl) {
  document.body.innerHTML = '<pre style="color:red;padding:2rem">FATAL: #root element not found in DOM</pre>'
} else {
  console.info('[alexa-mcp] Mounting React app...')
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    </React.StrictMode>,
  )
}
