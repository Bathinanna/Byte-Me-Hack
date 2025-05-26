import React from 'react';

interface ChatRoomProps {
  roomId: string;
  initialMessages: any[];
  participants: any[];
}

const ChatRoom: React.FC<ChatRoomProps> = ({ roomId, initialMessages, participants }) => {
  return <div>ChatRoom component placeholder</div>;
};

export default ChatRoom; 