import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import RequestResetForm from '../components/RequestResetForm'
import ResetPasswordForm from '../components/ResetPasswordForm'

const ResetPasswordPage: React.FC = () => {
  const [mode, setMode] = useState<'request' | 'reset'>('request')
  const [email, setEmail] = useState<string | undefined>()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="bg-white shadow-xl rounded-2xl p-8 space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold text-gray-900">Reset your password</h1>
            <p className="text-sm text-gray-600">
              Request a reset code and set a new password for your TimeBlocks account.
            </p>
          </div>
          <div className="flex rounded-md bg-gray-100 p-1 text-sm font-medium text-gray-600">
            <button
              onClick={() => setMode('request')}
              className={`flex-1 rounded-md px-3 py-1 transition ${
                mode === 'request' ? 'bg-white text-gray-900 shadow' : ''
              }`}
            >
              Request code
            </button>
            <button
              onClick={() => setMode('reset')}
              className={`flex-1 rounded-md px-3 py-1 transition ${
                mode === 'reset' ? 'bg-white text-gray-900 shadow' : ''
              }`}
            >
              Enter code
            </button>
          </div>
          {mode === 'request' ? (
            <RequestResetForm
              onRequested={(address) => {
                setEmail(address)
                setMode('reset')
              }}
            />
          ) : (
            <ResetPasswordForm defaultEmail={email} onSuccess={() => setMode('request')} />
          )}
          <div className="text-sm text-center text-gray-600">
            <Link to="/login" className="text-blue-600 hover:text-blue-500">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResetPasswordPage


