'use client';

import React, { useRef } from 'react';

interface MediaUploadProps {
  onUpload: (file: File) => void;
}

export default function MediaUpload({ onUpload }: MediaUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <div>
      <button
        type="button"
        className="p-2 bg-gray-100 rounded hover:bg-gray-200"
        onClick={() => fileInputRef.current?.click()}
      >
        📎
      </button>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
        accept="image/*,video/*,application/pdf"
      />
    </div>
  );
}