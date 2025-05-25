import React from 'react';

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
  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <h2>Your Chatrooms</h2>
      <ul>
        {chatrooms.map(chatroom => (
          <li key={chatroom.id}>
            <h3>{chatroom.name}</h3>
            <p>Participants:</p>
            <ul>
              {chatroom.users.map(participant => (
                <li key={participant.id}>{participant.name}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ChatDashboard;