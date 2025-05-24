'use client';

import React from 'react';
import UserAvatar from './UserAvatar';

interface UserBadgeProps {
  user: {
    id: string;
    name?: string | null;
    image?: string | null;
    email?: string | null;
  };
  showEmail?: boolean;
  className?: string;
}

export default function UserBadge({ user, showEmail = false, className = '' }: UserBadgeProps) {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <UserAvatar user={user} size={32} />
      <div className="flex flex-col">
        <span className="font-medium">{user.name}</span>
        {showEmail && user.email && (
          <span className="text-sm text-gray-500">{user.email}</span>
        )}
      </div>
    </div>
  );
}