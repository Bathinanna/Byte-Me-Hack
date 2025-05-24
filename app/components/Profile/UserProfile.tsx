'use client';

import React from 'react';
import ProfileCard from './ProfileCard';

interface UserProfileProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export default function UserProfile({ user }: UserProfileProps) {
  return (
    <div className="max-w-lg mx-auto">
      <ProfileCard user={user} showSettings={false} />
    </div>
  );
}