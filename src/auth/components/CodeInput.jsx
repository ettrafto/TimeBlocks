import React, { useRef, useState, useEffect } from 'react'

/**
 * CodeInput - 6-digit verification code input component
 * Features:
 * - 6 separate input fields
 * - Auto-advance to next field
 * - Auto-focus first empty field
 * - Handle paste of full 6-digit code
 * - Visual feedback
 * - Accessible keyboard navigation
 */
export default function CodeInput({ 
  value = '', 
  onChange, 
  disabled = false,
  error = false,
  'aria-label': ariaLabel = 'Verification code',
  ...props 
}) {
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const inputRefs = useRef([])
  
  // Initialize refs array on mount
  useEffect(() => {
    if (inputRefs.current.length !== 6) {
      inputRefs.current = Array(6).fill(null).map(() => React.createRef())
    }
  }, [])

  // Sync value prop to internal state
  useEffect(() => {
    if (value && value.length === 6) {
      setDigits(value.split(''))
    } else if (!value) {
      setDigits(['', '', '', '', '', ''])
    }
  }, [value])

  // Auto-focus first empty input
  useEffect(() => {
    if (!disabled && inputRefs.current.length === 6) {
      const firstEmpty = digits.findIndex(d => !d)
      const indexToFocus = firstEmpty === -1 ? 5 : firstEmpty
      const ref = inputRefs.current[indexToFocus]
      if (ref && ref.current) {
        ref.current.focus()
      }
    }
  }, [digits, disabled])

  const handleChange = (index, newValue) => {
    // Only allow digits
    if (newValue && !/^\d$/.test(newValue)) {
      return
    }

    const newDigits = [...digits]
    newDigits[index] = newValue

    // Auto-advance to next field
    if (newValue && index < 5 && inputRefs.current.length === 6) {
      const nextRef = inputRefs.current[index + 1]
      if (nextRef && nextRef.current) {
        nextRef.current.focus()
      }
    }

    setDigits(newDigits)
    const code = newDigits.join('')
    onChange?.(code)
  }

  const handleKeyDown = (index, e) => {
    // Handle backspace to move to previous field
    if (e.key === 'Backspace' && !digits[index] && index > 0 && inputRefs.current.length === 6) {
      const prevRef = inputRefs.current[index - 1]
      if (prevRef && prevRef.current) {
        prevRef.current.focus()
      }
      const newDigits = [...digits]
      newDigits[index - 1] = ''
      setDigits(newDigits)
      onChange?.(newDigits.join(''))
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').trim()
    
    if (/^\d{6}$/.test(pasted)) {
      const pastedDigits = pasted.split('')
      setDigits(pastedDigits)
      onChange?.(pasted)
      // Focus last input after paste
      if (inputRefs.current.length === 6) {
        const lastRef = inputRefs.current[5]
        if (lastRef && lastRef.current) {
          setTimeout(() => lastRef.current.focus(), 0)
        }
      }
    }
  }

  // Ensure refs array is ready before rendering
  if (inputRefs.current.length !== 6) {
    inputRefs.current = Array(6).fill(null).map(() => React.createRef())
  }

  return (
    <div className="flex gap-2" role="group" aria-label={ariaLabel}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={inputRefs.current[index]}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={index === 0 ? handlePaste : undefined}
          disabled={disabled}
          className={`
            w-12 h-12 text-center text-lg font-semibold
            rounded-md border-2
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            transition-colors
            ${error 
              ? 'border-red-300 bg-red-50' 
              : 'border-gray-300 bg-white hover:border-gray-400'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          aria-label={`Digit ${index + 1} of 6`}
          aria-invalid={error}
          {...props}
        />
      ))}
    </div>
  )
}
