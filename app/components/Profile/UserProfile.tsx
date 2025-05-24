import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { OnlineStatus } from '../User/OnlineStatus';
import { useSocket } from '@/app/hooks/useSocket';

export function UserProfile() {
  const { data: session } = useSession();
  const socket = useSocket(process.env.NEXT_PUBLIC_SOCKET_URL || 'ws://localhost:3001');

  if (!session?.user) {
    return null;
  }

  return (
    <div className="flex items-center space-x-3 p-4">
      <div className="relative">
        {session.user.image && (
          <Image
            src={session.user.image}
            alt={session.user.name || 'User'}
            width={40}
            height={40}
            className="rounded-full"
          />
        )}
        <div className="absolute bottom-0 right-0">
          <OnlineStatus isOnline={!!socket?.connected} />
        </div>
      </div>
      <div>
        <p className="font-medium">{session.user.name}</p>
        <p className="text-sm text-gray-500">{session.user.email}</p>
      </div>
    </div>
  );
} 