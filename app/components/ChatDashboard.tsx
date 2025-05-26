'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, LogOut, User } from 'lucide-react';
import { socket } from '@/app/lib/socket';
import ChatRoom from './ChatRoom';
import { ChatRoom as ChatRoomType, User as UserType } from '@prisma/client';
import { toast } from 'react-hot-toast';
import { useTheme } from '../layout';
import Image from 'next/image';

export default function ChatDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [chatRooms, setChatRooms] = useState<(ChatRoomType & { users: UserType[] })[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [isGroup, setIsGroup] = useState(true);
  const [targetUserId, setTargetUserId] = useState('');
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const socketRef = useRef<any>(null);
  const [unreadCounts, setUnreadCounts] = useState<{ [roomId: string]: number }>({});
  const { darkMode, setDarkMode } = useTheme();
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!session) {
      router.push('/login');
      return;
    }

    // Fetch chat rooms
    const fetchChatRooms = async () => {
      try {
        const response = await fetch('/api/chatrooms');
        let data = null;
        try { data = await response.json(); } catch { data = null; }
        if (response.ok && data) {
          setChatRooms(data);
          if (data.length > 0 && !selectedRoom) {
            setSelectedRoom(data[0].id);
          }
        } else {
          toast.error(data?.error || 'Failed to load chat rooms');
        }
      } catch (error) {
        toast.error('Failed to load chat rooms. Network or parsing error.');
      }
    };

    fetchChatRooms();

    // Socket connection
    if (!socketRef.current) {
      socketRef.current = socket;
      socketRef.current.connect();
    }
    socketRef.current.on('online_users', (userIds: string[]) => {
      setOnlineUserIds(userIds);
    });
    socketRef.current.on('new-message', (message: any) => {
      if (message.roomId !== selectedRoom) {
        setUnreadCounts((prev) => ({
          ...prev,
          [message.roomId]: (prev[message.roomId] || 0) + 1,
        }));
        toast.custom((t) => (
          <div className={`bg-blue-600 text-white px-4 py-2 rounded shadow ${t.visible ? 'animate-enter' : 'animate-leave'}`}
               onClick={() => {
                 setSelectedRoom(message.roomId);
                 toast.dismiss(t.id);
               }}>
            <b>New message</b> in {message.roomName || 'a chat'}: <br />
            <span className="font-mono">{message.content}</span>
          </div>
        ));
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.off('online_users');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [session, router, selectedRoom]);

  useEffect(() => {
    // Reset unread count when switching to a room
    if (selectedRoom) {
      setUnreadCounts((prev) => ({ ...prev, [selectedRoom]: 0 }));
    }
  }, [selectedRoom]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim() && isGroup) return;
    if (!targetUserId && !isGroup) return;

    try {
      const response = await fetch('/api/chatrooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newRoomName,
          isGroup,
          targetUserId: !isGroup ? targetUserId : undefined,
        }),
      });

      if (response.ok) {
        const newRoom = await response.json();
        setChatRooms(prev => [...prev, newRoom]);
        setSelectedRoom(newRoom.id);
        setIsCreatingRoom(false);
        setNewRoomName('');
        setTargetUserId('');
      }
    } catch (error) {
      console.error('Error creating chat room:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  if (!session) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col dark:bg-gray-900 dark:border-gray-700 relative">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Chats</h2>
          <button
            onClick={() => setIsCreatingRoom(true)}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
            aria-label="Create new chat room"
            title="Create new chat room"
          >
            <Plus size={20} />
          </button>
        </div>
        {/* Search Bar */}
        <div className="p-2 border-b border-gray-200 dark:border-gray-700">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search chats..."
            className="w-full px-3 py-2 rounded bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 m-2 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100"
          aria-label="Toggle dark mode"
          title="Toggle dark mode"
        >
          {darkMode ? '🌙 Dark' : '☀️ Light'}
        </button>
        {/* Profile Link */}
        <Link
          href="/profile"
          className="flex items-center gap-2 p-4 text-gray-700 hover:bg-gray-50 border-b border-gray-200 dark:hover:bg-gray-800 dark:border-gray-700"
        >
          <User size={20} />
          <span>Profile</span>
        </Link>
        {/* Chat Rooms List */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {chatRooms
            .filter(room => {
              const name = room.isGroup
                ? room.name
                : room.users.find((u) => u.id !== session.user.id)?.name || '';
              return name.toLowerCase().includes(search.toLowerCase());
            })
            .map((room) => {
              let isOnline = false;
              if (room.isGroup) {
                isOnline = room.users.some(u => u.id !== session.user.id && onlineUserIds.includes(u.id));
              } else {
                const otherUser = room.users.find(u => u.id !== session.user.id);
                isOnline = Boolean(otherUser && onlineUserIds.includes(otherUser.id));
              }
              // Avatar logic
              const avatar = room.isGroup
                ? '/group-avatar.png'
                : room.users.find((u) => u.id !== session.user.id)?.image || '/default-avatar.png';
              const displayName = room.isGroup
                ? room.name
                : room.users.find((u) => u.id !== session.user.id)?.name || 'Unknown User';
              // Last message preview (optional, fallback to blank)
              const lastMsg = (room as any).lastMessage?.content || '';
              return (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoom(room.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800 transition-colors ${selectedRoom === room.id ? 'bg-blue-50 dark:bg-blue-900' : ''}`}
                >
                  <div className="flex-shrink-0">
                    <Image src={avatar} alt={displayName} width={40} height={40} className="rounded-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{displayName}</span>
                      {isOnline && <span className="ml-1 w-2 h-2 bg-green-400 rounded-full inline-block" title="Online"></span>}
                      {unreadCounts[room.id] > 0 && (
                        <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">{unreadCounts[room.id]}</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{lastMsg}</div>
                  </div>
                </button>
              );
            })}
        </div>
        {/* Sign Out Button */}
        <button
          onClick={handleSignOut}
          className="p-4 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 flex items-center gap-2"
        >
          <LogOut size={20} />
          <span>Sign Out</span>
        </button>
        {/* Floating New Chat Button */}
        <button
          onClick={() => setIsCreatingRoom(true)}
          className="absolute bottom-6 right-6 z-10 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg p-4 transition-colors focus:outline-none focus:ring-2 focus:ring-green-400"
          aria-label="New Chat"
          title="New Chat"
        >
          <Plus size={28} />
        </button>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedRoom ? (
          <ChatRoom
            roomId={selectedRoom}
            initialMessages={[]}
            participants={chatRooms.find(r => r.id === selectedRoom)?.users || []}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a chat room to start messaging
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      {isCreatingRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Create New Chat</h3>
            <form onSubmit={handleCreateRoom}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chat Type
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={isGroup}
                      onChange={() => setIsGroup(true)}
                      className="mr-2"
                    />
                    Group Chat
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={!isGroup}
                      onChange={() => setIsGroup(false)}
                      className="mr-2"
                    />
                    Direct Message
                  </label>
                </div>
              </div>

              {isGroup ? (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Room Name
                  </label>
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="Enter room name"
                  />
                </div>
              ) : (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    User ID
                  </label>
                  <input
                    type="text"
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="Enter user ID"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingRoom(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 