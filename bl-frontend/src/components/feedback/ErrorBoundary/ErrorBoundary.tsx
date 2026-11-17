import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ServerErrorPage } from '@/app/pages/StatusPages'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled UI error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return <ServerErrorPage onRetry={() => window.location.reload()} />
    }
    return this.props.children
  }
}
