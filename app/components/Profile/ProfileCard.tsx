'use client';

import React from 'react';
import { signOut } from 'next-auth/react';
import { LogOut, Settings } from 'lucide-react';
import UserAvatar from '../User/UserAvatar';

interface ProfileCardProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  showSettings?: boolean;
}

export default function ProfileCard({ user, showSettings = true }: ProfileCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center space-x-4">
        <UserAvatar user={user} size={64} />
        <div className="flex-1">
          <h2 className="text-xl font-semibold">{user.name}</h2>
          <p className="text-gray-500">{user.email}</p>
        </div>
      </div>
      {showSettings && (
        <div className="mt-6 flex justify-between">
          <button
            onClick={() => window.location.href = '/settings'}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <Settings size={20} />
            <span>Settings</span>
          </button>
          <button
            onClick={() => signOut()}
            className="flex items-center space-x-2 text-red-600 hover:text-red-700"
          >
            <LogOut size={20} />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
}