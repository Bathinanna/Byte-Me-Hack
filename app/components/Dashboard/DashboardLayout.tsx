import { useState } from 'react';
import Sidebar from './Sidebar';
import ChatRoom from '../Chat/ChatRoom';

export default function DashboardLayout() {
  const [selectedChatRoom, setSelectedChatRoom] = useState(null);

  return (
    <div className="flex h-screen w-screen bg-gray-900 text-white">
      <div className="w-full md:w-1/3 lg:w-1/4 border-r border-gray-800">
        <Sidebar selectedChatRoom={selectedChatRoom} setSelectedChatRoom={setSelectedChatRoom} />
      </div>
      <div className="flex-1">
        {selectedChatRoom ? (
          <ChatRoom roomId={(selectedChatRoom as any).id} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-xl">
            Select a chat to start messaging
          </div>
        )}
      </div>
    </div>
  );
} 