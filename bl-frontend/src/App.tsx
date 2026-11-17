import { QueryClientProvider } from '@tanstack/react-query'
import { AppRouter } from '@/app/router'
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary'
import { PageLoader } from '@/components/shared'
import { ToastProvider } from '@/components/ui'
import { useRestoreSession } from '@/features/auth'
import { queryClient } from '@/lib/queryClient'

function SessionBootstrap() {
  const { isRestoring } = useRestoreSession()
  if (isRestoring) {
    return <PageLoader label="Memulihkan sesi..." className="min-h-screen" />
  }
  return <AppRouter />
}

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <SessionBootstrap />
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
