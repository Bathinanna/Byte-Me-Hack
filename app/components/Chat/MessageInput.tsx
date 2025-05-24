'use client';

import React, { useState } from 'react';
import MediaUpload from './MediaUpload';

interface MessageInputProps {
  onSend: (text: string) => void;
  onMediaUpload?: (file: File) => void;
  disabled?: boolean;
}

export default function MessageInput({ onSend, onMediaUpload, disabled }: MessageInputProps) {
  const [text, setText] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSend(text);
      setText('');
    }
  };

  return (
    <form onSubmit={handleSend} className="flex items-center space-x-2">
      {onMediaUpload && <MediaUpload onUpload={onMediaUpload} />}
      <input
        type="text"
        value={text}
        onChange={e => setText(e.target.value)}
        className="flex-1 p-2 border rounded-lg"
        placeholder="Type a message..."
        disabled={disabled}
      />
      <button
        type="submit"
        className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        disabled={disabled}
      >
        Send
      </button>
    </form>
  );
}