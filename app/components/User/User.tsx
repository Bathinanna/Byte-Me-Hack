'use client';

import React from 'react';
import UserAvatar from './UserAvatar';
import OnlineStatus from './OnlineStatus';

interface UserProps {
  user: {
    id: string;
    name: string;
    image?: string;
    isOnline?: boolean;
  };
  onClick?: () => void;
}

export default function User({ user, onClick }: UserProps) {
  return (
    <div
      className="flex items-center space-x-3 p-2 hover:bg-gray-100 rounded cursor-pointer"
      onClick={onClick}
    >
      <UserAvatar user={user} size={32} />
      <span className="font-medium">{user.name}</span>
      <OnlineStatus isOnline={!!user.isOnline} />
    </div>
  );
}