import React, { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from './AuthProvider'

// Prefixes of routes that require authentication
const PROTECTED_PREFIXES = ['/admin', '/dashboard', '/account']

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    const path = router.pathname
    const needsAuth = PROTECTED_PREFIXES.some(p => path.startsWith(p))
    if (!needsAuth) return

    // user === undefined => still checking session
    if (user === undefined) return

    // user === null => checked and unauthenticated
    if (user === null) {
      const returnTo = encodeURIComponent(router.asPath)
      router.replace(`/login?returnTo=${returnTo}`)
    }
  }, [router, user])

  // Only gate protected routes on the auth check; public site pages must
  // render immediately (and server-side) for visitors and SEO.
  const needsAuth = PROTECTED_PREFIXES.some(p => router.pathname.startsWith(p))
  if (needsAuth && user === undefined) return null

  return <>{children}</>
}

export default ProtectedRoute
