import React from 'react'
import { Link } from 'react-router-dom'
import VerifyEmailForm from '../components/VerifyEmailForm'
import { useAuthStore } from '../store'

const VerifyEmailPage: React.FC = () => {
  const pendingEmail = useAuthStore((state) => state.pendingEmail)

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white shadow-xl rounded-2xl p-8 space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold text-gray-900">Verify your email</h1>
            <p className="text-sm text-gray-600">
              Enter the 6-digit code sent to your inbox to activate your account.
            </p>
          </div>
          <VerifyEmailForm defaultEmail={pendingEmail ?? undefined} />
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

export default VerifyEmailPage


