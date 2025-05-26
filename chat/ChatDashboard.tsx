"use client";
import { useState, useRef, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import ChatRoom from '../components/Chat/ChatRoom';

type User = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

type ChatRoomType = {
  id: string;
  name: string;
  users: User[];
};

export default function ChatDashboard({ chatrooms, user }: { chatrooms: ChatRoomType[]; user: User }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showCreateModal && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showCreateModal]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/chatrooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: roomName,
          isGroup: true
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || `Failed to create room (Status: ${res.status})`);
      }
      
      setShowCreateModal(false);
      setRoomName("");
      window.location.reload();
    } catch (err: any) {
      console.error('Error creating room:', err);
      setError(err.message || 'Failed to create room. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Your Chat Rooms</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded">Create Room</button>
          <button onClick={() => signOut()} className="px-4 py-2 bg-gray-600 text-white rounded">Logout</button>
        </div>
      </div>
      {showCreateModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <form onSubmit={handleCreateRoom} className="bg-white p-6 rounded shadow flex flex-col gap-4 min-w-[300px]">
            <h2 className="text-lg font-bold">Create Chat Room</h2>
            <input ref={inputRef} value={roomName} onChange={e => setRoomName(e.target.value)} placeholder="Room Name" className="border p-2 rounded" required disabled={loading} />
            {error && <div className="text-red-500 text-sm">{error}</div>}
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded" disabled={loading}>{loading ? 'Creating...' : 'Create'}</button>
              <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 bg-gray-300 rounded" disabled={loading}>Cancel</button>
            </div>
          </form>
        </div>
      )}
      {chatrooms.length === 0 ? (
        <div className="text-center text-gray-500 mt-8">No chat rooms found. Create one to get started!</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {chatrooms.map((room) => (
            <div key={room.id} className="border rounded-lg shadow-sm h-[600px]">
              <ChatRoom roomId={room.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 