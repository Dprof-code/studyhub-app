'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { signIn, getSession } from 'next-auth/react';

// Zod schema for sign-in validation
const signInSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address')
    .min(1, 'Email is required'),

  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
});

type SignInFormData = z.infer<typeof signInSchema>;

const SignIn = () => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Check if Google OAuth is available
  const isGoogleEnabled = process.env.NEXT_PUBLIC_GOOGLE_ENABLED === 'true';

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setError,
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    mode: 'onChange',
  });

  const onSubmit = async (data: SignInFormData) => {
    setIsSubmitting(true);
    try {
      const signInData = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (signInData?.error) {
        setError('email', {
          type: 'server',
          message: signInData.error,
        });
      } else {
        await router.refresh();
        const updatedSession = await getSession();

        if (updatedSession?.user?.username) {
          router.push(`/${updatedSession.user.username}`);
        } else {
          router.push('/resources');
        }
      }
    } catch (error) {
      console.error('Submission error:', error);
      setError('email', {
        type: 'server',
        message: 'Something went wrong. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      console.log('🚀 Starting Google sign-in...');

      const result = await signIn('google', {
        redirect: false,
        callbackUrl: '/dashboard'
      });

      console.log('Google sign-in result:', result);

      if (result?.error) {
        console.error('❌ Google sign-in error:', result.error);
        setError('email', {
          type: 'server',
          message: 'Google sign-in failed. Please try again.',
        });
      } else if (result?.ok) {
        console.log('✅ Google sign-in successful, redirecting...');

        // Small delay to ensure session is created
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Get the updated session
        const session = await getSession();
        console.log('Session after Google sign-in:', session);

        if (session?.user?.username) {
          console.log('Redirecting to profile:', `/${session.user.username}`);
          router.push(`/${session.user.username}`);
        } else {
          console.log('No username found, redirecting to dashboard');
          router.push('/dashboard');
        }
      } else if (result?.url) {
        console.log('Redirecting to:', result.url);
        window.location.href = result.url;
      }
    } catch (error) {
      console.error('❌ Google sign-in error:', error);
      setError('email', {
        type: 'server',
        message: 'Google sign-in failed. Please try again.',
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-primary/5 flex">
      {/* Left Panel - Image */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden">
        {/* Background Image */}
        <Image
          src="/auth_page_image.jpg"
          alt="Students collaborating"
          fill
          className="object-cover"
          priority
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/60 via-primary/40 to-accent/30"></div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-center p-12 text-center">
          <div className="mb-8">
            <span className="material-symbols-outlined text-6xl text-white mb-4 block drop-shadow-lg">
              hub
            </span>
            <h2 className="text-3xl font-bold text-white mb-4 drop-shadow-lg">
              Welcome Back to StudyHub
            </h2>
            <p className="text-lg text-white/90 max-w-md drop-shadow-sm">
              Continue your academic journey and connect with your learning community.
            </p>
          </div>

          <div className="mt-8 flex space-x-4">
            <div className="feature-highlight-overlay">
              <span className="material-symbols-outlined">login</span>
              <span>Quick Access</span>
            </div>
            <div className="feature-highlight-overlay">
              <span className="material-symbols-outlined">dashboard</span>
              <span>Your Dashboard</span>
            </div>
            <div className="feature-highlight-overlay">
              <span className="material-symbols-outlined">notifications</span>
              <span>Stay Updated</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-8 max-w-md lg:max-w-lg mx-auto">
        <div className="w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-theme-foreground mb-2">Welcome Back</h1>
            <p className="text-theme-muted">Sign in to your StudyHub account</p>
          </div>

          {/* Google OAuth Button - Only show if enabled */}
          {isGoogleEnabled && (
            <>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
                className={`w-full mb-6 p-3 border border-border rounded-default bg-card text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-3 ${isGoogleLoading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
              >
                {isGoogleLoading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-xl">refresh</span>
                    Signing in with Google...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                  </>
                )}
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
            {/* Email */}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                {...register('email')}
                className={`form-input ${errors.email ? 'border-destructive focus:border-destructive' : ''}`}
                placeholder="Enter your email"
              />
              {errors.email && (
                <span className="text-destructive text-sm mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">error</span>
                  {errors.email.message}
                </span>
              )}
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                {...register('password')}
                className={`form-input ${errors.password ? 'border-destructive focus:border-destructive' : ''}`}
                placeholder="Enter your password"
              />
              {errors.password && (
                <span className="text-destructive text-sm mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">error</span>
                  {errors.password.message}
                </span>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
                />
                <span className="ml-2 text-sm text-muted-foreground">Remember me</span>
              </label>
              <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                Forgot password?
              </Link>
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
                  Signing In...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">login</span>
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p className="text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/sign-up" className="text-primary font-medium hover:underline">
                Create account
              </Link>
            </p>
          </div>

          {/* Legal Links */}
          <div className="mt-8 text-center text-sm text-muted-foreground">
            <Link href="/terms" className="hover:underline">
              Terms of Service
            </Link>
            {' • '}
            <Link href="/privacy" className="hover:underline">
              Privacy Policy
            </Link>
            {' • '}
            <Link href="/help" className="hover:underline">
              Help Center
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignIn;