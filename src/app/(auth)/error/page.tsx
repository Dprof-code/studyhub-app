'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function AuthErrorPage() {
    const searchParams = useSearchParams();
    const error = searchParams.get('error');

    const getErrorMessage = (error: string | null) => {
        switch (error) {
            case 'Configuration':
                return 'There is a problem with the server configuration.';
            case 'AccessDenied':
                return 'Access denied. You do not have permission to sign in.';
            case 'Verification':
                return 'The verification token has expired or has already been used.';
            case 'OAuthSignin':
                return 'Error in constructing an authorization URL.';
            case 'OAuthCallback':
                return 'Error in handling the response from an OAuth provider.';
            case 'OAuthCreateAccount':
                return 'Could not create OAuth account in the database.';
            case 'EmailCreateAccount':
                return 'Could not create email account in the database.';
            case 'Callback':
                return 'Error in the OAuth callback handler route.';
            case 'OAuthAccountNotLinked':
                return 'The account is not linked. To confirm your identity, sign in with the same account you used originally.';
            case 'EmailSignin':
                return 'Sending the e-mail with the verification token failed.';
            case 'CredentialsSignin':
                return 'The authorize callback returned null in the Credentials provider.';
            case 'SessionRequired':
                return 'The content of this page requires you to be signed in at all times.';
            default:
                return 'An unknown error occurred during authentication.';
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
                <div className="text-center">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                        <span className="material-symbols-outlined text-red-600">error</span>
                    </div>
                    <h2 className="mt-4 text-xl font-semibold text-gray-900">
                        Authentication Error
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        {getErrorMessage(error)}
                    </p>
                    <div className="mt-6 space-y-3">
                        <Link
                            href="/sign-in"
                            className="w-full inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                        >
                            Try Again
                        </Link>
                        <Link
                            href="/"
                            className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                        >
                            Go Home
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}