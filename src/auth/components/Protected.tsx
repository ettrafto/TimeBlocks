import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../auth/store'

type Props = {
  children: React.ReactNode
  fallback?: React.ReactNode
}

const Protected: React.FC<Props> = ({ children, fallback = null }) => {
  const status = useAuthStore((state) => state.status)
  const navigate = useNavigate()
  const location = useLocation()

  React.useEffect(() => {
    if (status === 'unauthenticated') {
      navigate('/login', { replace: true, state: { from: location.pathname } })
    }
  }, [status, navigate, location.pathname])

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-gray-500">Checking authentication…</div>
      </div>
    )
  }

  if (status !== 'authenticated') {
    return <>{fallback}</>
  }

  return <>{children}</>
}

export default Protected


