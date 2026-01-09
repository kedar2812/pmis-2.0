import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './i18n'

// Enhanced Error Boundary with recovery for Google Translate DOM conflicts
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Application Error:', error, errorInfo)
    this.setState({ errorInfo })

    // Check if this is likely a Google Translate related error
    const isTranslateError = error?.message?.includes('removeChild') ||
      error?.message?.includes('insertBefore') ||
      error?.message?.includes('not a child');

    if (isTranslateError) {
      console.warn('This error is likely caused by Google Translate DOM manipulation. Reloading may help.');
    }
  }

  handleReload = () => {
    // Clear Google Translate cookies before reload
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + window.location.hostname;
    localStorage.removeItem('pmis_language');
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      const isTranslateError = this.state.error?.message?.includes('removeChild') ||
        this.state.error?.message?.includes('insertBefore') ||
        this.state.error?.message?.includes('not a child');

      return (
        <div style={{
          padding: '3rem',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          textAlign: 'center'
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            borderRadius: '16px',
            padding: '2.5rem',
            maxWidth: '500px',
            color: '#1a1a2e',
            boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
          }}>
            <h1 style={{ margin: '0 0 1rem', fontSize: '1.5rem', color: '#e74c3c' }}>
              {isTranslateError ? '⚠️ Translation Conflict' : '⚠️ Something went wrong'}
            </h1>
            <p style={{ margin: '0 0 1.5rem', color: '#666', lineHeight: '1.6' }}>
              {isTranslateError
                ? 'The page translation temporarily conflicted with the app. This is a known issue with Google Translate. Click below to reload.'
                : (this.state.error?.message || 'An unexpected error occurred.')
              }
            </p>
            <button
              onClick={this.handleReload}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                padding: '0.75rem 2rem',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
              }}
              onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
            >
              🔄 Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)

