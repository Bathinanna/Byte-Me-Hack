'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Camera, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTheme } from '../layout';

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatar, setAvatar] = useState(session?.user?.image || '/default-avatar.png');
  const [name, setName] = useState(session?.user?.name || '');
  const [bio, setBio] = useState('');
  const [status, setStatus] = useState('');
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const { darkMode, setDarkMode } = useTheme();

  useEffect(() => {
    if (!session) {
      router.push('/login');
    } else {
      // Load user profile data
      const loadProfile = async () => {
        try {
          const response = await fetch('/api/profile');
          let data = null;
          try { data = await response.json(); } catch { data = null; }
          if (response.ok && data) {
            setName(data.name || session.user.name || '');
            setAvatar(data.image || session.user.image || '/default-avatar.png');
            setBio(data.bio || '');
            setStatus(data.status || '');
            setEmailNotificationsEnabled(typeof data.emailNotificationsEnabled === 'boolean' ? data.emailNotificationsEnabled : true);
          } else {
            toast.error(data?.error || 'Failed to load profile');
          }
        } catch (error) {
          toast.error('Failed to load profile. Network or parsing error.');
        }
      };
      loadProfile();
    }
  }, [session, router]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setAvatar(data.avatarUrl);
        await update({ ...session, user: { ...session?.user, image: data.avatarUrl } });
      } else {
        const error = await response.json();
        setError(error.message || 'Failed to upload avatar');
      }
    } catch (error) {
      setError('Failed to upload avatar. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          bio,
          status,
          emailNotificationsEnabled,
        }),
      });

      let data = null;
      try { data = await response.json(); } catch { data = null; }
      if (response.ok && data) {
        await update({ ...session, user: { ...session?.user, name, image: avatar } });
        router.refresh();
      } else {
        toast.error(data?.error || 'Failed to update profile');
        setError(data?.error || 'Failed to update profile');
      }
    } catch (error) {
      setError('Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded relative" role="alert">
                <span className="block sm:inline">{error}</span>
              </div>
            )}

            {/* Avatar Section */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100">
                  <Image
                    src={avatar}
                    alt="Profile"
                    width={128}
                    height={128}
                    className="object-cover"
                  />
                </div>
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 bg-blue-500 text-white p-2 rounded-full cursor-pointer hover:bg-blue-600 transition-colors"
                >
                  <Camera size={20} />
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                    disabled={isLoading}
                  />
                </label>
              </div>
            </div>

            {/* Profile Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
                  Bio
                </label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <input
                  type="text"
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="What's on your mind?"
                  disabled={isLoading}
                />
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="emailNotificationsEnabled" className="block text-sm font-medium text-gray-700">
                  Email Notifications
                </label>
                <input
                  id="emailNotificationsEnabled"
                  type="checkbox"
                  checked={emailNotificationsEnabled}
                  onChange={e => {
                    setEmailNotificationsEnabled(e.target.checked);
                    toast.success(e.target.checked ? 'Email notifications enabled' : 'Email notifications disabled');
                  }}
                  className="ml-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={isLoading}
                />
              </div>

              <div className="flex items-center gap-4 mb-4">
                <img src={avatar} alt="Avatar" className="w-20 h-20 rounded-full" />
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-2 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100"
                  aria-label="Toggle dark mode"
                  title="Toggle dark mode"
                >
                  {darkMode ? '🌙 Dark' : '☀️ Light'}
                </button>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin h-5 w-5" />
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 