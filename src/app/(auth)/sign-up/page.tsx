'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

// import { RoleSelectionModal } from '@/components/auth/RoleSelectionModal';

const signUpSchema = z.object({
  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'First name can only contain letters and spaces'),

  lastName: z
    .string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Last name can only contain letters and spaces'),

  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be less than 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .toLowerCase(),

  email: z
    .string()
    .email('Please enter a valid email address')
    .min(1, 'Email is required'),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignUpFormData = z.infer<typeof signUpSchema>;

const SignUp = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'student' | 'lecturer'>('student');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  // const [googleEmail, setGoogleEmail] = useState('');

  // Check if Google OAuth is available
  const isGoogleEnabled = process.env.NEXT_PUBLIC_GOOGLE_ENABLED === 'true';

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    mode: 'onChange',
  });

  const onSubmit = async (data: SignUpFormData) => {
    setIsSubmitting(true);
    try {
      console.log('Form submitted:', data, 'Role:', activeTab);
      const response = await fetch('/api/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...data, role: activeTab.toUpperCase() }),
      });

      if (response.ok) {
        router.push('/sign-in');
      } else {
        const errorData = await response.json();
        console.error('Error creating account:', errorData);
      }
    } catch (error) {
      console.error('Submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      const result = await signIn('google', {
        redirect: false,
      });

      if (result?.error) {
        console.error('Google sign-in error:', result.error);
      } else if (result?.ok) {
        // After successful sign-in, get the session and redirect to profile
        const response = await fetch('/api/auth/session');
        const session = await response.json();

        if (session?.user?.username) {
          router.push(`/${session.user.username}`);
        } else {
          // Fallback to dashboard if username is not available immediately
          router.push('/resources');
        }
      }
    } catch (error) {
      console.error('Google sign-up error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-primary/5 flex">
      {/* Left Panel - Image */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden">
        <Image
          src="/auth_page_image.jpg"
          alt="Students collaborating"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/60 via-primary/40 to-accent/30"></div>

        <div className="relative z-10 flex flex-col justify-center items-center p-12 text-center">
          <div className="mb-8">
            <span className="material-symbols-outlined text-6xl text-white mb-4 block drop-shadow-lg">
              hub
            </span>
            <h2 className="text-3xl font-bold text-white mb-4 drop-shadow-lg">
              Join StudyHub Community
            </h2>
            <p className="text-lg text-white/90 max-w-md drop-shadow-sm">
              Connect with peers, share resources, and excel in your academic journey together.
            </p>
          </div>

          <div className="mt-8 flex space-x-4">
            <div className="feature-highlight-overlay">
              <span className="material-symbols-outlined">groups</span>
              <span>Collaborate</span>
            </div>
            <div className="feature-highlight-overlay">
              <span className="material-symbols-outlined">share</span>
              <span>Share</span>
            </div>
            <div className="feature-highlight-overlay">
              <span className="material-symbols-outlined">school</span>
              <span>Learn</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-8 max-w-md lg:max-w-lg mx-auto">
        <div className="w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-theme-foreground mb-2">Create Account</h1>
            <p className="text-theme-muted">Join the academic community</p>
          </div>

          {/* Role Tabs */}
          <div className="mb-8">
            <div className="flex bg-muted rounded-default p-1">
              <button
                type="button"
                onClick={() => setActiveTab('student')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${activeTab === 'student'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                <span className="material-symbols-outlined text-sm mr-2">school</span>
                Student
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('lecturer')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${activeTab === 'lecturer'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                <span className="material-symbols-outlined text-sm mr-2">psychology</span>
                Lecturer
              </button>
            </div>
          </div>

          {/* Google OAuth Button - Only show if enabled */}
          {isGoogleEnabled && (
            <>
              <button
                type="button"
                onClick={handleGoogleSignUp}
                className="w-full mb-6 p-3 border border-border rounded-default bg-card text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-background text-muted-foreground">Or continue with email</span>
                </div>
              </div>
            </>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input
                  type="text"
                  {...register('firstName')}
                  className={`form-input ${errors.firstName ? 'border-destructive focus:border-destructive' : ''}`}
                  placeholder="Enter your first name"
                />
                {errors.firstName && (
                  <span className="text-destructive text-sm mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">error</span>
                    {errors.firstName.message}
                  </span>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input
                  type="text"
                  {...register('lastName')}
                  className={`form-input ${errors.lastName ? 'border-destructive focus:border-destructive' : ''}`}
                  placeholder="Enter your last name"
                />
                {errors.lastName && (
                  <span className="text-destructive text-sm mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">error</span>
                    {errors.lastName.message}
                  </span>
                )}
              </div>
            </div>

            {/* Username */}
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                {...register('username')}
                className={`form-input ${errors.username ? 'border-destructive focus:border-destructive' : ''}`}
                placeholder="Choose a unique username"
              />
              {errors.username && (
                <span className="text-destructive text-sm mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">error</span>
                  {errors.username.message}
                </span>
              )}
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                {...register('email')}
                className={`form-input ${errors.email ? 'border-destructive focus:border-destructive' : ''}`}
                placeholder="Enter your email address"
              />
              {errors.email && (
                <span className="text-destructive text-sm mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">error</span>
                  {errors.email.message}
                </span>
              )}
            </div>

            {/* Password Fields */}
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                {...register('password')}
                className={`form-input ${errors.password ? 'border-destructive focus:border-destructive' : ''}`}
                placeholder="Create a strong password"
              />
              {errors.password && (
                <span className="text-destructive text-sm mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">error</span>
                  {errors.password.message}
                </span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input
                type="password"
                {...register('confirmPassword')}
                className={`form-input ${errors.confirmPassword ? 'border-destructive focus:border-destructive' : ''}`}
                placeholder="Confirm your password"
              />
              {errors.confirmPassword && (
                <span className="text-destructive text-sm mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">error</span>
                  {errors.confirmPassword.message}
                </span>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isValid || isSubmitting}
              className={`btn-primary w-full flex items-center justify-center gap-2 ${(!isValid || isSubmitting) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin">refresh</span>
                  Creating Account...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">person_add</span>
                  Create {activeTab === 'student' ? 'Student' : 'Lecturer'} Account
                </>
              )}
            </button>
          </form>

          {/* Legal Links */}
          <div className="mt-6 text-center text-sm text-muted-foreground">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="text-primary hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
          </div>

          {/* Sign In Link */}
          <div className="mt-6 text-center">
            <p className="text-muted-foreground">
              Already have an account?{' '}
              <Link href="/sign-in" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Role Selection Modal */}
      {/* <RoleSelectionModal
        isOpen={showRoleModal}
        email={googleEmail}
        onClose={() => setShowRoleModal(false)}
      /> */}
    </div>
  );
};

export default SignUp;