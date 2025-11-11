import React from 'react'
import { Link } from 'react-router-dom'
import LoginForm from '../components/LoginForm'

const LoginPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white shadow-xl rounded-2xl p-8 space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold text-gray-900">Sign in to TimeBlocks</h1>
            <p className="text-sm text-gray-600">Access your calendar and task workspace.</p>
          </div>
          <LoginForm />
          <div className="text-sm text-center text-gray-600">
            <Link to="/signup" className="font-medium text-blue-600 hover:text-blue-500">
              Need an account? Create one
            </Link>
          </div>
          <div className="text-sm text-center text-gray-600">
            <Link to="/reset-password" className="text-blue-600 hover:text-blue-500">
              Forgot password?
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage


