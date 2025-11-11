import React, { useState } from 'react'
import { useAuthStore } from '../../auth/store'

type Props = {
  defaultEmail?: string
  onSuccess?: () => void
}

const ResetPasswordForm: React.FC<Props> = ({ defaultEmail, onSuccess }) => {
  const resetPassword = useAuthStore((state) => state.resetPassword)
  const [email, setEmail] = useState(defaultEmail || '')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setMessage(null)
    try {
      await resetPassword(email, code, password)
      setStatus('success')
      setMessage('Password updated. You can now sign in with your new password.')
      onSuccess?.()
    } catch (err: any) {
      setStatus('error')
      setMessage(err?.message || 'Unable to reset password')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="reset-email-input">
          Email
        </label>
        <input
          id="reset-email-input"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="reset-code">
          Reset code
        </label>
        <input
          id="reset-code"
          type="text"
          required
          value={code}
          onChange={(e) => setCode(e.target.value.trim())}
          className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="123456"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="reset-password">
          New password
        </label>
        <input
          id="reset-password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="At least 8 characters"
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
        {status === 'loading' ? 'Updating…' : 'Reset password'}
      </button>
    </form>
  )
}

export default ResetPasswordForm


