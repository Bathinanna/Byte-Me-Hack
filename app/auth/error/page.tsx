'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from '../../layout';

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const { darkMode } = useTheme();

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'Configuration':
        return 'There is a problem with the server configuration.';
      case 'AccessDenied':
        return 'You do not have permission to sign in.';
      case 'Verification':
        return 'The verification link may have expired or has already been used.';
      case 'OAuthSignin':
        return 'Error in the OAuth sign-in process.';
      case 'OAuthCallback':
        return 'Error in the OAuth callback process.';
      case 'OAuthCreateAccount':
        return 'Could not create OAuth provider user in the database.';
      case 'EmailCreateAccount':
        return 'Could not create email provider user in the database.';
      case 'Callback':
        return 'Error in the OAuth callback process.';
      case 'OAuthAccountNotLinked':
        return 'To confirm your identity, sign in with the same account you used originally.';
      case 'EmailSignin':
        return 'Check your email address.';
      case 'CredentialsSignin':
        return 'Sign in failed. Check the details you provided are correct.';
      case 'SessionRequired':
        return 'Please sign in to access this page.';
      default:
        return 'An error occurred during authentication.';
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} py-12 px-4 sm:px-6 lg:px-8`}>
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className={`mt-6 text-center text-3xl font-extrabold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Authentication Error
          </h2>
          <div className={`mt-4 text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {getErrorMessage(error)}
          </div>
        </div>
        <div className="mt-8 space-y-4">
          <Link
            href="/login"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Return to Login
          </Link>
          <Link
            href="/"
            className={`w-full flex justify-center py-2 px-4 border ${darkMode ? 'border-gray-600 bg-gray-800 hover:bg-gray-700 text-gray-200' : 'border-gray-300 bg-white hover:bg-gray-50 text-gray-700'} rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
} 