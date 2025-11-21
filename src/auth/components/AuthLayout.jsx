import React from 'react'

/**
 * AuthLayout - Consistent layout wrapper for all authentication pages
 * Provides centered card layout, logo/branding, and responsive design
 */
export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo/Branding */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">TimeBlocks</h1>
          <p className="text-sm text-gray-600 mt-1">Organize your time with precision</p>
        </div>

        {/* Main Card */}
        <div className="bg-white shadow-xl rounded-2xl p-8">
          {children}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <div className="space-x-4">
            <a href="#" className="hover:text-gray-700">Terms</a>
            <span>•</span>
            <a href="#" className="hover:text-gray-700">Privacy</a>
            <span>•</span>
            <a href="#" className="hover:text-gray-700">Support</a>
          </div>
        </div>
      </div>
    </div>
  )
}

