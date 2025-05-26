import { useEffect, useState } from 'react';

export default function ChatList({ selectedChatRoom, setSelectedChatRoom }: { selectedChatRoom: any, setSelectedChatRoom: (chat: any) => void }) {
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchChats() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/chatrooms');
        if (!res.ok) throw new Error('Failed to fetch chats');
        const data = await res.json();
        setChats(data);
      } catch (err: any) {
        setError(err.message || 'Error loading chats');
      } finally {
        setLoading(false);
      }
    }
    fetchChats();
  }, []);

  if (loading) return <div className="p-4 text-gray-400">Loading chats...</div>;
  if (error) return <div className="p-4 text-red-400">{error}</div>;
  if (!chats.length) return <div className="p-4 text-gray-400">No chats found.</div>;

  return (
    <ul className="divide-y divide-gray-800">
      {chats.map((chat: any) => (
        <li
          key={chat.id}
          className={`flex items-center px-4 py-3 hover:bg-gray-800 cursor-pointer ${selectedChatRoom && selectedChatRoom.id === chat.id ? 'bg-gray-800' : ''}`}
          onClick={() => setSelectedChatRoom(chat)}
        >
          <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-lg font-bold mr-3">
            {chat.name ? chat.name[0] : 'C'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-white truncate">{chat.name || 'Chat'}</span>
              <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">{chat.updatedAt ? new Date(chat.updatedAt).toLocaleDateString() : ''}</span>
            </div>
            <div className="text-sm text-gray-400 truncate">{chat._count?.messages ? `${chat._count.messages} messages` : 'No messages yet'}</div>
          </div>
        </li>
      ))}
    </ul>
  );
} 