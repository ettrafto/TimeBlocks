import React, { useState } from 'react'
import { useAuthStore } from '../../auth/store'

type Props = {
  onRequested?: (email: string) => void
}

const RequestResetForm: React.FC<Props> = ({ onRequested }) => {
  const requestReset = useAuthStore((state) => state.requestPasswordReset)
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setMessage(null)
    try {
      await requestReset(email)
      setStatus('success')
      setMessage('If the email exists, a reset code has been sent.')
      onRequested?.(email)
    } catch (err: any) {
      setStatus('error')
      setMessage(err?.message || 'Unable to request reset')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="reset-email">
          Email
        </label>
        <input
          id="reset-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="you@example.com"
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
        {status === 'loading' ? 'Sending…' : 'Send reset link'}
      </button>
    </form>
  )
}

export default RequestResetForm


