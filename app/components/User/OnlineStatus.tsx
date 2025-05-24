'use client';

import React from 'react';

interface OnlineStatusProps {
  isOnline: boolean;
}

export default function OnlineStatus({ isOnline }: OnlineStatusProps) {
  return (
    <span
      className={`inline-block w-3 h-3 rounded-full border-2 ${
        isOnline ? 'bg-green-500 border-green-500' : 'bg-gray-300 border-gray-300'
      }`}
      title={isOnline ? 'Online' : 'Offline'}
    />
  );
}