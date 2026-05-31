import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { RequireAdmin, RequireVoter, RequireSuperAdmin, RedirectAuthenticated } from '@/components/guards'

// Layouts
import AdminLayout   from '@/components/admin/AdminLayout'
import VoterLayout   from '@/components/voter/VoterLayout'

// Admin pages
import AdminLoginPage      from '@/pages/admin/Login'
import AdminDashboard      from '@/pages/admin/Dashboard'
import AdminElectionsPage  from '@/pages/admin/Elections'
import AdminElectionDetail from '@/pages/admin/ElectionDetail'
import CreateElectionPage  from '@/pages/admin/CreateElection'
import AdminVotersPage     from '@/pages/admin/Voters'
import AdminAdminsPage     from '@/pages/admin/Admins'

// Voter pages
import VoterLoginPage    from '@/pages/voter/Login'
import VoterDashboard    from '@/pages/voter/Dashboard'
import VoterElectionPage from '@/pages/voter/Election'

const router = createBrowserRouter([
  // Root redirect
  { path: '/', element: <Navigate to="/login" replace /> },

  // Admin login — redirect to dashboard if already authed
  {
    path: '/admin/login',
    element: (
      <RedirectAuthenticated adminTo="/admin/dashboard" voterTo="/dashboard">
        <AdminLoginPage />
      </RedirectAuthenticated>
    ),
  },

  // Voter login — redirect if already authed
  {
    path: '/login',
    element: (
      <RedirectAuthenticated adminTo="/admin/dashboard" voterTo="/dashboard">
        <VoterLoginPage />
      </RedirectAuthenticated>
    ),
  },

  // Admin protected routes
  {
    element: <RequireAdmin />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { path: '/admin/dashboard',        element: <AdminDashboard />      },
          { path: '/admin/elections',        element: <AdminElectionsPage />  },
          { path: '/admin/elections/create', element: <CreateElectionPage />  },
          { path: '/admin/elections/:id',    element: <AdminElectionDetail /> },
          { path: '/admin/voters',           element: <AdminVotersPage />     },
          {
            path: '/admin/admins',
            element: (
              <RequireSuperAdmin>
                <AdminAdminsPage />
              </RequireSuperAdmin>
            ),
          },
          { path: '/admin/*', element: <Navigate to="/admin/dashboard" replace /> },
        ],
      },
    ],
  },

  // Voter protected routes
  {
    element: <RequireVoter />,
    children: [
      {
        element: <VoterLayout />,
        children: [
          { path: '/dashboard',    element: <VoterDashboard />     },
          { path: '/election/:id', element: <VoterElectionPage />  },
        ],
      },
    ],
  },

  // 404 fallback
  { path: '*', element: <Navigate to="/login" replace /> },
])

export default function AppRouter() {
  return <RouterProvider router={router} />
}
