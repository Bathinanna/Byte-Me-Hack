import Image from 'next/image';

interface UserProps {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
  showEmail?: boolean;
}

export function User({ user, showEmail = false }: UserProps) {
  return (
    <div className="flex items-center space-x-3">
      {user.image && (
        <Image
          src={user.image}
          alt={user.name || 'User'}
          width={32}
          height={32}
          className="rounded-full"
        />
      )}
      <div>
        <p className="font-medium">{user.name}</p>
        {showEmail && user.email && (
          <p className="text-sm text-gray-500">{user.email}</p>
        )}
      </div>
    </div>
  );
} 