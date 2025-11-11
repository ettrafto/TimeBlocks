import React, { useState } from 'react'
import { useAuthStore } from '../../auth/store'

type Props = {
  defaultEmail?: string | null
  onSuccess?: () => void
}

const VerifyEmailForm: React.FC<Props> = ({ defaultEmail, onSuccess }) => {
  const verifyEmail = useAuthStore((state) => state.verifyEmail)
  const [email, setEmail] = useState(defaultEmail || '')
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setMessage(null)
    try {
      await verifyEmail(email, code)
      setStatus('success')
      setMessage('Email verified. You can now sign in.')
      onSuccess?.()
    } catch (err: any) {
      setStatus('error')
      setMessage(err?.message || 'Unable to verify email')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="verify-email">
          Email
        </label>
        <input
          id="verify-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="verify-code">
          Verification code
        </label>
        <input
          id="verify-code"
          type="text"
          required
          value={code}
          onChange={(e) => setCode(e.target.value.trim())}
          className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="123456"
        />
      </div>
      {message && (
        <div className={`text-sm ${status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
          {message}
        </div>
      )}
      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {status === 'loading' ? 'Verifying…' : 'Verify email'}
      </button>
    </form>
  )
}

export default VerifyEmailForm


