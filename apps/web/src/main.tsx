import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import {
  ErrorComponent,
  Link,
  RouterProvider,
  createRootRouteWithContext,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'

import { ThemeProvider } from './components/theme-provider'
import { RootRoute } from './routes/__root'
import { Executive } from './components/president/executive'
import { PresidentialSchedule } from './routes/executive/presidential-schedule'
import { PresidentialActions } from './routes/executive/presidential-actions'
import { ExecutiveOrdersReader } from './components/orders/executive-orders-reader'
import { createClient } from '@supabase/supabase-js'
import {
  executiveOrderMarkdownQueryOptions,
  executiveOrdersQueryOptions,
} from './hooks/executive-orders'
import { ItineraryOrderReader } from './components/president/itinerary-order-reader'
import { Overview } from './routes/home/Overview'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

const rootRoute = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: RootRoute,
  notFoundComponent: () => {
    return (
      <div>
        <p>This is the notFoundComponent configured on root route</p>
        <Link to='/'>Start Over</Link>
      </div>
    )
  },
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Overview,
})

const executiveRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'executive',
  component: Executive,
})

const presidentialScheduleRoute = createRoute({
  getParentRoute: () => executiveRoute,
  path: 'president',
  component: PresidentialSchedule,
})

const presidentialScheduleOrderRoute = createRoute({
  getParentRoute: () => presidentialScheduleRoute,
  path: '$id',
  component: ItineraryOrderReader,
  loader: ({ context: { queryClient }, params: { id } }) =>
    queryClient.ensureQueryData(executiveOrderMarkdownQueryOptions(id)),
})

const presidentialOrdersRoute = createRoute({
  getParentRoute: () => executiveRoute,
  path: 'orders',
  component: PresidentialActions,
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(executiveOrdersQueryOptions),
})

export const presidentialOrderReaderRoute = createRoute({
  getParentRoute: () => presidentialOrdersRoute,
  path: '$id',
  errorComponent: ErrorComponent,
  loader: ({ context: { queryClient }, params: { id } }) =>
    queryClient.ensureQueryData(executiveOrderMarkdownQueryOptions(id)),
  component: () => (
    <ExecutiveOrdersReader loaderDataPath={'/executive/orders/$id'} />
  ),
})

const routeTree = rootRoute.addChildren([
  executiveRoute,
  presidentialScheduleRoute.addChildren([presidentialScheduleOrderRoute]),
  presidentialOrdersRoute.addChildren([presidentialOrderReaderRoute]),
  indexRoute,
])

const queryClient = new QueryClient()

// Set up a Router instance
const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  // Since we're using React Query, we don't want loader calls to ever be stale
  // This will ensure that the loader is always called when the route is preloaded or visited
  defaultPreloadStaleTime: 0,
  context: {
    queryClient,
  },
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme='light' storageKey='wikipolitica-theme'>
          <RouterProvider router={router} />
        </ThemeProvider>
      </QueryClientProvider>
    </StrictMode>
  )
}
