"use client";

import { LoginPage as CredentialsLoginPage } from '@/app/components/Auth/LoginPage'; // Use an alias to avoid name collision

// If you still want to keep OAuth buttons on this page, you can import signIn and other necessary hooks here.
// import { signIn } from 'next-auth/react';
// import { useRouter, useSearchParams } from 'next/navigation';
// import { useState } from 'react';

export default function LoginPageContainer() {
  // const router = useRouter();
  // const searchParams = useSearchParams();
  // const callbackUrl = searchParams.get('callbackUrl') || '/chat';
  // const [loading, setLoading] = useState(false);

  // const handleOAuthLogin = async (provider: string) => {
  //   setLoading(true);
  //   await signIn(provider, { callbackUrl });
  //   // setLoading(false); // Will redirect, so this might not run
  // };

  return (
    <CredentialsLoginPage />
    // <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
    //   <div className="w-full max-w-md p-8 bg-gray-800 rounded-lg shadow-xl space-y-6">
    //     {/* Credentials Login Form - Rendered by CredentialsLoginPage */}
    //     <CredentialsLoginPage />

    //     {/* OAuth Buttons - You can keep them here or move them into CredentialsLoginPage component */}
    //     <div className="relative mt-6">
    //       <div className="absolute inset-0 flex items-center">
    //         <div className="w-full border-t border-gray-700"></div>
    //       </div>
    //       <div className="relative flex justify-center text-sm">
    //         <span className="px-2 bg-gray-800 text-gray-500">Or continue with</span>
    //       </div>
    //     </div>

    //     <div className="space-y-3 mt-6">
    //       <button
    //         onClick={() => handleOAuthLogin('github')}
    //         disabled={loading}
    //         className="w-full flex items-center justify-center px-4 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-green-500 disabled:opacity-50"
    //       >
    //         <span className="mr-2">&#x1F4BB;</span> {/* Placeholder icon */}
    //         Sign in with GitHub
    //       </button>
    //       <button
    //         onClick={() => handleOAuthLogin('google')}
    //         disabled={loading}
    //         className="w-full flex items-center justify-center px-4 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-green-500 disabled:opacity-50"
    //       >
    //         <span className="mr-2">&#x1F4E7;</span> {/* Placeholder icon */}
    //         Sign in with Google
    //       </button>
    //     </div>
    //   </div>
    // </div>
  );
} 