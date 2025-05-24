'use client';

import React from 'react';
import ProfileCard from './ProfileCard';
import ProfileSettings from './ProfileSettings';

interface ProfileProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  onSave: (data: Partial<{ name: string }>) => Promise<void>;
}

export default function Profile({ user, onSave }: ProfileProps) {
  return (
    <div className="max-w-lg mx-auto space-y-6">
      <ProfileCard user={user} />
      <ProfileSettings user={user} onSave={onSave} />
    </div>
  );
}