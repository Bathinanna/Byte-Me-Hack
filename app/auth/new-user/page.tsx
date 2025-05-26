'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from '../../layout';

export default function NewUserPage() {
  const router = useRouter();
  const { darkMode } = useTheme();

  useEffect(() => {
    // Redirect to chat after 5 seconds
    const timer = setTimeout(() => {
      router.push('/chat');
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} py-12 px-4 sm:px-6 lg:px-8`}>
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className={`mt-6 text-center text-3xl font-extrabold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Welcome to Byte-Me!
          </h2>
          <p className={`mt-2 text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Your account has been created successfully.
          </p>
          <p className={`mt-2 text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            You will be redirected to the chat page in a few seconds...
          </p>
        </div>
        <div className="mt-8 space-y-4">
          <Link
            href="/chat"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Go to Chat Now
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