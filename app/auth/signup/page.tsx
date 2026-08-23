"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/lib/auth"
import { Eye, EyeOff, Mail, Lock, User, Briefcase, Phone, Loader2 } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { toast } from "react-hot-toast"

const positions = [
  "Senior Electrical Engineer",
  "Project Manager",
  "Electrical Technician",
  "Site Supervisor", 
  "Quality Engineer",
  "Safety Officer",
  "Administrative Assistant",
  "Field Engineer",
  "Design Engineer",
  "Project Coordinator",
  "Other"
]

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    position: "",
    phone: ""
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { signUp } = useAuth()

  // Set dynamic page title
  useEffect(() => {
    document.title = "Create Account | Relay"
  }, [])

  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.email || !formData.password || !formData.position) {
      toast.error("Please fill in all required fields")
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters long")
      return
    }

    setIsLoading(true)
    try {
      const userData = {
        name: formData.name.trim(),
        position: formData.position.trim(),
        phone: formData.phone.trim() || undefined
      }

      const { success, error } = await signUp(formData.email.trim(), formData.password, userData)
      if (!success && error) {
        toast.error(error)
      }
    } finally {
      setIsLoading(false)
    }
  }, [formData, signUp])

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev)
  }, [])

  const toggleConfirmPasswordVisibility = useCallback(() => {
    setShowConfirmPassword(prev => !prev)
  }, [])

  const isFormValid = useMemo(() => {
    return (
      formData.name.trim() !== '' &&
      formData.email.trim() !== '' &&
      formData.password.trim() !== '' &&
      formData.confirmPassword.trim() !== '' &&
      formData.position.trim() !== '' &&
      formData.password === formData.confirmPassword &&
      formData.password.length >= 6 &&
      !isLoading
    )
  }, [formData, isLoading])

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
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
            Join Our Team
          </h1>
          <p className="text-gray-600 mt-2">
            Create your Relay account to start managing projects
          </p>
        </div>

        {/* Sign Up Form */}
        <Card className="shadow-xl border border-gray-200 bg-white">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl text-center text-gray-900">Create Account</CardTitle>
            <CardDescription className="text-center text-gray-600">
              Fill in your details to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Personal Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      className="pl-10 h-11 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      className="pl-10 h-11 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Password Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Password <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="At least 6 characters"
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      className="pl-10 pr-10 h-11 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                      disabled={isLoading}
                      required
                      minLength={6}
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

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                    Confirm Password <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                      className="pl-10 pr-10 h-11 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                      disabled={isLoading}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-11 px-3 py-2 hover:bg-transparent"
                      onClick={toggleConfirmPasswordVisibility}
                      disabled={isLoading}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Professional Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Position */}
                <div className="space-y-2">
                  <Label htmlFor="position" className="text-sm font-medium text-gray-700">
                    Position <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                    <Select
                      value={formData.position}
                      onValueChange={(value) => handleInputChange("position", value)}
                      disabled={isLoading}
                      required
                    >
                      <SelectTrigger className="pl-10 h-11 border-gray-300 focus:border-orange-500 focus:ring-orange-500">
                        <SelectValue placeholder="Select your position" />
                      </SelectTrigger>
                      <SelectContent>
                        {positions.map((position) => (
                          <SelectItem key={position} value={position}>
                            {position}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                    Phone Number
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+63 917 123 4567"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      className="pl-10 h-11 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>

              {/* Create Account Button */}
              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl mt-6"
                disabled={!isFormValid}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>

              {/* Divider */}
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Already have an account?</span>
                </div>
              </div>

              {/* Sign In Link */}
              <div className="text-center">
                <Link 
                  href="/auth/login"
                  className="text-orange-600 hover:text-orange-700 font-medium transition-colors duration-200"
                >
                  Sign in here
                </Link>
              </div>
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
