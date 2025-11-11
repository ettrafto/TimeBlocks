import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import SignupForm from '../components/SignupForm'
import VerifyEmailForm from '../components/VerifyEmailForm'
import { useAuthStore } from '../store'

const SignupPage: React.FC = () => {
  const pendingEmail = useAuthStore((state) => state.pendingEmail)
  const [emailForVerification, setEmailForVerification] = useState<string | null>(pendingEmail)

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-xl space-y-6">
        <div className="bg-white shadow-xl rounded-2xl p-8 space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold text-gray-900">Create your TimeBlocks account</h1>
            <p className="text-sm text-gray-600">
              Organize your time with advanced scheduling and task automation.
            </p>
          </div>
          <SignupForm onComplete={(email) => setEmailForVerification(email)} />
          <div className="text-sm text-center text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Sign in
            </Link>
          </div>
        </div>
        <div className="bg-white shadow-lg rounded-2xl p-8 space-y-4">
          <div className="space-y-1 text-center">
            <h2 className="text-lg font-semibold text-gray-900">Verify your email</h2>
            <p className="text-sm text-gray-600">
              Enter the verification code we sent to your inbox to activate your account.
            </p>
          </div>
          <VerifyEmailForm defaultEmail={emailForVerification} />
        </div>
      </div>
    </div>
  )
}

export default SignupPage


