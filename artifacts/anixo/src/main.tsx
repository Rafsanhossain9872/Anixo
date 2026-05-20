import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App'
// @ts-ignore
import { LanguageProvider } from './context/LanguageContext.jsx'
// @ts-ignore
import { UserListProvider } from './context/UserListContext.jsx'
// @ts-ignore
import { LoadingProvider } from './context/LoadingContext.jsx'
// @ts-ignore
import { AuthProvider } from './store/authStore.jsx'
// @ts-ignore
import { initSecurity } from './utils/security.js'

initSecurity();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
          <UserListProvider>
            <LoadingProvider>
              <App />
            </LoadingProvider>
          </UserListProvider>
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
