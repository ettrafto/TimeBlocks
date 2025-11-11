export type AuthRole = 'USER' | 'ADMIN'

export type AuthUser = {
  id: string
  email: string
  name?: string | null
  role: AuthRole
  emailVerifiedAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated'


