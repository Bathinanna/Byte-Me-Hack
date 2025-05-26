'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { File, Image as ImageIcon, Music, Video, Play, Pause, Volume2 } from 'lucide-react';
import { MessageAttachment as Attachment } from '@prisma/client';

interface MessageAttachmentProps {
  attachment: Attachment;
}

export default function MessageAttachment({ attachment }: MessageAttachmentProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

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
          <div className="w-full bg-gray-800 rounded-lg p-3">
            <div className="flex items-center space-x-3">
              <button
                onClick={handlePlayPause}
                className="p-2 bg-blue-600 rounded-full hover:bg-blue-700 transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 text-white" />
                ) : (
                  <Play className="w-4 h-4 text-white" />
                )}
              </button>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min="0"
                    max={duration}
                    value={currentTime}
                    onChange={(e) => {
                      if (audioRef.current) {
                        audioRef.current.currentTime = Number(e.target.value);
                        setCurrentTime(Number(e.target.value));
                      }
                    }}
                    className="flex-1 h-1 bg-gray-600 rounded-full appearance-none cursor-pointer"
                  />
                  <span className="text-sm text-gray-400">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <Volume2 className="w-4 h-4 text-gray-400" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="w-20 h-1 bg-gray-600 rounded-full appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>
            <audio
              ref={audioRef}
              src={attachment.url}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
          </div>
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