import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * ErrorBoundary Component
 * 
 * Catches JavaScript errors anywhere in child component tree and displays
 * a fallback UI instead of crashing the entire application.
 * 
 * Features:
 * - Professional government-style error display
 * - Option to retry (refresh page)
 * - Option to go back to dashboard
 * - Logs errors for debugging
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render shows the fallback UI
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log the error to console (in production, send to error reporting service)
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({
            error: error,
            errorInfo: errorInfo
        });

        // Could send to error reporting service here
        // logErrorToService(error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8 text-center">
                        {/* Icon */}
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="w-10 h-10 text-red-600" />
                        </div>

                        {/* Title */}
                        <h1 className="text-2xl font-bold text-slate-900 mb-3">
                            Something went wrong
                        </h1>

                        {/* Description */}
                        <p className="text-slate-600 mb-6">
                            An unexpected error occurred. Our team has been notified and is working on a fix.
                        </p>

                        {/* Error details (development only) */}
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <div className="mb-6 p-4 bg-slate-100 rounded-lg text-left">
                                <p className="text-sm font-mono text-red-600 mb-2">
                                    {this.state.error.toString()}
                                </p>
                                {this.state.errorInfo && (
                                    <details className="text-xs text-slate-600">
                                        <summary className="cursor-pointer hover:text-slate-800">
                                            Stack trace
                                        </summary>
                                        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">
                                            {this.state.errorInfo.componentStack}
                                        </pre>
                                    </details>
                                )}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button
                                onClick={this.handleRetry}
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors"
                            >
                                <RefreshCw size={18} />
                                Try Again
                            </button>
                            <Link
                                to="/dashboard"
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
                            >
                                <Home size={18} />
                                Go to Dashboard
                            </Link>
                        </div>

                        {/* Support info */}
                        <p className="mt-6 text-sm text-slate-500">
                            If the problem persists, please contact support at{' '}
                            <a href="mailto:support@pmis.gov.in" className="text-primary-600 hover:underline">
                                support@pmis.gov.in
                            </a>
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
