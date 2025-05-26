import React from 'react';

export default function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="bg-red-100 text-red-700 text-center px-4 py-2 rounded-md my-4 mx-auto max-w-md font-semibold shadow">
      {message}
    </div>
  );
} 