'use client';

import React from 'react';

interface UserAvatarProps {
  user: {
    image?: string | null;
    name?: string | null;
  };
  size?: number;
  className?: string;
}

export default function UserAvatar({ user, size = 40, className = '' }: UserAvatarProps) {
  return (
    <div
      className={`relative rounded-full overflow-hidden bg-gray-200 ${className}`}
      style={{ width: size, height: size }}
    >
      {user.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.image}
          alt={user.name || 'User avatar'}
          className="object-cover w-full h-full"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-gray-500 text-sm">
            {user.name?.charAt(0).toUpperCase() || '?'}
          </span>
        </div>
      )}
    </div>
  );
}