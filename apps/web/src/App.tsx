import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/components/ui'
import AppRouter from '@/router'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:          1_000 * 30,
      retry:              1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AppRouter />
      </ToastProvider>
    </QueryClientProvider>
  )
}
