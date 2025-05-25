'use client';

import { useState } from 'react';
import Image from 'next/image';
import { File, Image as ImageIcon, Music, Video } from 'lucide-react';
import { MessageAttachment as Attachment } from '@prisma/client';

interface MessageAttachmentProps {
  attachment: Attachment;
}

export default function MessageAttachment({ attachment }: MessageAttachmentProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getFileIcon = () => {
    switch (attachment.type) {
      case 'IMAGE':
        return <ImageIcon className="w-5 h-5" />;
      case 'AUDIO':
        return <Music className="w-5 h-5" />;
      case 'VIDEO':
        return <Video className="w-5 h-5" />;
      default:
        return <File className="w-5 h-5" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderPreview = () => {
    switch (attachment.type) {
      case 'IMAGE':
        return (
          <div className="relative w-full h-48">
            <Image
              src={attachment.url}
              alt={attachment.name || 'Attachment'}
              fill
              className="object-contain rounded-lg"
            />
          </div>
        );
      case 'AUDIO':
        return (
          <audio
            controls
            className="w-full"
            src={attachment.url}
          >
            Your browser does not support the audio element.
          </audio>
        );
      case 'VIDEO':
        return (
          <video
            controls
            className="w-full rounded-lg"
            src={attachment.url}
          >
            Your browser does not support the video element.
          </video>
        );
      default:
        return null;
    }
  };

  return (
    <div className="mt-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-700 w-full"
      >
        {getFileIcon()}
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-medium text-gray-300 truncate">
            {attachment.name}
          </p>
          <p className="text-xs text-gray-500">
            {formatFileSize(attachment.size ?? 0)}
          </p>
        </div>
      </button>

      {isExpanded && (
        <div className="mt-2">
          {renderPreview()}
          <a
            href={attachment.url}
            download={attachment.name}
            className="mt-2 inline-flex items-center text-sm text-green-500 hover:text-green-400"
            target="_blank"
            rel="noopener noreferrer"
          >
            Download
          </a>
        </div>
      )}
    </div>
  );
} 