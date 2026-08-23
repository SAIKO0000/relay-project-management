"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth"
import { Eye, EyeOff, Mail, Lock, Loader2 } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { toast } from "react-hot-toast"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { signIn } = useAuth()
  const publicDemoUrl = process.env.NEXT_PUBLIC_PUBLIC_DEMO_URL
  const accessRequestEmail = process.env.NEXT_PUBLIC_ACCESS_REQUEST_EMAIL
  const accessRequestHref = accessRequestEmail
    ? `mailto:${accessRequestEmail}?subject=${encodeURIComponent('Relay private beta access request')}&body=${encodeURIComponent('Name:\nReason for testing:\nExpected testing dates:\n\nI agree to use only fictional or non-sensitive content and not upload illegal, offensive, confidential, copyrighted, or malicious material.')}`
    : null

  // Set dynamic page title
  useEffect(() => {
    document.title = "Sign In | Relay"
  }, [])

  // Load saved credentials on component mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('gyg-remembered-email')
    const wasRemembered = localStorage.getItem('gyg-remember-me') === 'true'
    
    // Passwords must never be persisted in localStorage.
    localStorage.removeItem('gyg-remembered-password')
    if (savedEmail && wasRemembered) {
      queueMicrotask(() => {
        setEmail(savedEmail)
        setRememberMe(true)
      })
    }
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      toast.error("Please fill in all fields")
      return
    }

    setIsLoading(true)
    try {
      const { success, error } = await signIn(email, password)
      if (success) {
        // Save credentials if remember me is checked
        if (rememberMe) {
          localStorage.setItem('gyg-remembered-email', email)
          localStorage.setItem('gyg-remember-me', 'true')
        } else {
          // Clear saved credentials if remember me is not checked
          localStorage.removeItem('gyg-remembered-email')
          localStorage.removeItem('gyg-remember-me')
        }
      } else if (error) {
        toast.error(error)
      }
    } finally {
      setIsLoading(false)
    }
  }, [email, password, rememberMe, signIn])

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev)
  }, [])

  const isFormValid = useMemo(() => {
    return email.trim() !== '' && password.trim() !== '' && !isLoading
  }, [email, password, isLoading])

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="mx-auto w-32 h-32 mb-6">
            <Image 
              src="/logo.svg" 
              alt="Relay by GYG Power Systems"
              width={128}
              height={128}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">
            Welcome back to Relay
          </h1>
          <p className="text-gray-600 mt-2">
            Sign in to access your project dashboard
          </p>
        </div>

        {/* Login Form */}
        <Card className="shadow-xl border border-gray-200 bg-white">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl text-center text-gray-900">Sign In</CardTitle>
            <CardDescription className="text-center text-gray-600">
              Enter your credentials to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Password
                  </Label>
                  <Link 
                    href="/auth/forgot-password"
                    className="text-xs text-orange-600 hover:text-orange-700 font-medium transition-colors duration-200"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                    disabled={isLoading}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-11 px-3 py-2 hover:bg-transparent"
                    onClick={togglePasswordVisibility}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={setRememberMe}
                  className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                />
                <Label
                  htmlFor="remember"
                  className="text-sm font-medium text-gray-700 cursor-pointer"
                >
                  Remember
                </Label>
              </div>

              {/* Sign In Button */}
              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                disabled={!isFormValid}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>

              <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-center text-sm text-orange-900">
                Private beta access is invitation-only. Approved testers receive an email invitation.
                {accessRequestHref && (
                  <a
                    href={accessRequestHref}
                    className="mt-2 block font-semibold text-orange-700 underline-offset-4 hover:underline"
                  >
                    Request private beta access
                  </a>
                )}
              </div>

              {publicDemoUrl && (
                <div className="text-center">
                  <Link
                    href={publicDemoUrl}
                    className="text-orange-600 hover:text-orange-700 font-medium transition-colors duration-200"
                  >
                    Open the browser-local public demo
                  </Link>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>Relay · Electrical project management by GYG Power Systems</p>
        </div>
      </div>
    </div>
  )
}
