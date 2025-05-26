import SearchBar from './SearchBar';
import ChatList from './ChatList';
import { useState } from 'react';

export default function Sidebar({ selectedChatRoom, setSelectedChatRoom }: { selectedChatRoom: any, setSelectedChatRoom: (chat: any) => void }) {
  const [showNewGroup, setShowNewGroup] = useState(false);

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-green-900 via-gray-900 to-gray-800 shadow-lg rounded-r-2xl">
      <div className="p-4 border-b border-gray-800">
        <SearchBar />
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 py-2">
        <ChatList selectedChatRoom={selectedChatRoom} setSelectedChatRoom={setSelectedChatRoom} />
      </div>
      <div className="p-4 border-t border-gray-800">
        <button
          className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 rounded-full text-white font-semibold shadow-md transition-all duration-150"
          onClick={() => setShowNewGroup(true)}
        >
          + New Group
        </button>
        {showNewGroup && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-gray-800 p-6 rounded-xl shadow-2xl">
              <p className="text-lg font-bold mb-4">New Group Modal (Coming Soon)</p>
              <button
                className="mt-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
                onClick={() => setShowNewGroup(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 