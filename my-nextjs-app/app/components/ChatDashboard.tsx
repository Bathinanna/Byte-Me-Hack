import React, { useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  image: string;
  email: string;
}

interface ChatRoom {
  id: string;
  name: string;
  users: User[];
}

interface ChatDashboardProps {
  chatrooms: ChatRoom[];
  user: User;
}

const ChatDashboard: React.FC<ChatDashboardProps> = ({ chatrooms, user }) => {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<{ [roomId: string]: any[] }>({});
  const [loading, setLoading] = useState<{ [roomId: string]: boolean }>({});
  const [muted, setMuted] = useState<{ [roomId: string]: boolean }>({});

  useEffect(() => {
    // Fetch mute status for all chatrooms on mount
    (async () => {
      const statuses: { [roomId: string]: boolean } = {};
      for (const chatroom of chatrooms) {
        const res = await fetch(`/api/messages/mute-status?roomId=${chatroom.id}`);
        const data = await res.json();
        statuses[chatroom.id] = !!data.muted;
      }
      setMuted(statuses);
    })();
  }, [chatrooms]);

  const handleSearch = async (roomId: string) => {
    if (!searchKeyword) return;
    setLoading((prev) => ({ ...prev, [roomId]: true }));
    const res = await fetch(`/api/messages/search?roomId=${roomId}&keyword=${encodeURIComponent(searchKeyword)}`);
    const data = await res.json();
    setSearchResults((prev) => ({ ...prev, [roomId]: data }));
    setLoading((prev) => ({ ...prev, [roomId]: false }));
  };

  const highlight = (text: string, keyword: string) => {
    if (!keyword) return text;
    const parts = text.split(new RegExp(`(${keyword})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === keyword.toLowerCase() ? <mark key={i}>{part}</mark> : part
    );
  };

  const toggleMute = async (roomId: string) => {
    const isMuted = muted[roomId];
    if (isMuted) {
      await fetch('/api/messages/mute', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId }),
      });
    } else {
      await fetch('/api/messages/mute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId }),
      });
    }
    setMuted((prev) => ({ ...prev, [roomId]: !isMuted }));
  };

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <h2>Your Chatrooms</h2>
      <ul>
        {chatrooms.map(chatroom => (
          <li key={chatroom.id} style={{ marginBottom: 32 }}>
            <h3>{chatroom.name}
              <button onClick={() => toggleMute(chatroom.id)} style={{ marginLeft: 8 }} title={muted[chatroom.id] ? 'Unmute' : 'Mute'}>
                {muted[chatroom.id] ? '🔕' : '🔔'}
              </button>
            </h3>
            <p>Participants:</p>
            <ul>
              {chatroom.users.map(participant => (
                <li key={participant.id}>{participant.name}</li>
              ))}
            </ul>
            <div style={{ marginTop: 8 }}>
              <input
                type="text"
                placeholder="Search messages..."
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                style={{ marginRight: 8 }}
              />
              <button onClick={() => handleSearch(chatroom.id)} disabled={loading[chatroom.id]}>
                {loading[chatroom.id] ? 'Searching...' : 'Search'}
              </button>
            </div>
            {searchResults[chatroom.id] && (
              <div style={{ marginTop: 8 }}>
                <h4>Search Results:</h4>
                {searchResults[chatroom.id].length === 0 ? (
                  <p>No messages found.</p>
                ) : (
                  <ul>
                    {searchResults[chatroom.id].map((msg, idx) => (
                      <li key={msg.id || idx}>
                        <b>{msg.user?.name || 'Unknown'}:</b> {highlight(msg.content, searchKeyword)}
                        <span style={{ color: '#888', marginLeft: 8, fontSize: 12 }}>{new Date(msg.createdAt).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ChatDashboard;