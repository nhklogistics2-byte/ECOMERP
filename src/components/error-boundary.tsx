'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Global error boundary — catches any unhandled client-side errors
 * and shows a friendly fallback instead of Next.js's "Application error".
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-red-200 rounded-lg p-6 text-center space-y-3">
            <div className="size-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="size-6" />
            </div>
            <h2 className="text-base font-bold text-gray-900">Something went wrong</h2>
            <p className="text-sm text-gray-500">
              An unexpected error occurred while loading this page. The server might be starting up
              or a data source might be unavailable. Try reloading.
            </p>
            {this.state.error && (
              <details className="text-left bg-gray-50 rounded-md p-2 text-[11px] text-gray-600">
                <summary className="cursor-pointer font-medium text-gray-700">
                  Error details
                </summary>
                <pre className="mt-1 whitespace-pre-wrap break-all">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
            >
              <RefreshCw className="size-4" />
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
