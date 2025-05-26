import { useEffect, useState, useRef } from 'react';

export default function ChatArea({ selectedChatRoom }: { selectedChatRoom: any }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedChatRoom) return;
    setLoading(true);
    setError('');
    setMessages([]);
    async function fetchMessages() {
      try {
        const res = await fetch(`/api/messages?chatRoomId=${selectedChatRoom.id}`);
        if (!res.ok) throw new Error('Failed to fetch messages');
        const data = await res.json();
        setMessages(data.messages || []);
      } catch (err: any) {
        setError(err.message || 'Error loading messages');
      } finally {
        setLoading(false);
      }
    }
    fetchMessages();
  }, [selectedChatRoom]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !selectedChatRoom) return;
    setSending(true);
    const optimisticMsg = {
      id: Math.random().toString(),
      content: input,
      user: { name: 'You' },
      createdAt: new Date().toISOString(),
    };
    setMessages((msgs) => [...msgs, optimisticMsg]);
    setInput('');
    try {
      const formData = new FormData();
      formData.append('content', optimisticMsg.content);
      formData.append('roomId', selectedChatRoom.id);
      const res = await fetch('/api/messages', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to send message');
    } catch (err) {
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  }

  if (!selectedChatRoom) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-gray-900">
        <div className="text-gray-400 text-xl">Select a chat to start messaging</div>
      </div>
    );
  }

  if (loading) return <div className="flex items-center justify-center h-full w-full text-gray-400">Loading messages...</div>;
  if (error) return <div className="flex items-center justify-center h-full w-full text-red-400">{error}</div>;

  return (
    <div className="flex flex-col h-full w-full bg-gray-900">
      <div className="p-4 border-b border-gray-800 text-lg font-bold">{selectedChatRoom.name || 'Chat'}</div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 ? (
          <div className="text-gray-400">No messages yet.</div>
        ) : (
          messages.map((msg: any, idx) => (
            <div key={msg.id + idx} className="bg-gray-800 rounded p-2 text-white max-w-xl">
              <div className="text-sm text-gray-300">{msg.user?.name || 'User'}</div>
              <div>{msg.content}</div>
              <div className="text-xs text-gray-500 text-right">{msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString() : ''}</div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSend} className="p-4 border-t border-gray-800 flex gap-2">
        <input
          type="text"
          className="flex-1 px-3 py-2 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Type a message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={!selectedChatRoom || sending}
        />
        <button
          type="submit"
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white font-semibold disabled:opacity-50"
          disabled={!input.trim() || !selectedChatRoom || sending}
        >
          Send
        </button>
      </form>
    </div>
  );
} 