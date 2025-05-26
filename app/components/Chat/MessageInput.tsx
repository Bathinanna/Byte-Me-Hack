'use client';

import { useState, useRef, useEffect } from 'react';
import { Paperclip, Smile, Send, Mic, StopCircle, X } from 'lucide-react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { useSession } from 'next-auth/react';

interface MessageInputProps {
  onSend: (content: string, attachments: File[]) => void;
  onTyping: () => void;
  replyingTo?: {
    id: string;
    content: string;
    userName: string;
  };
  onCancelReply?: () => void;
}

export default function MessageInput({
  onSend,
  onTyping,
  replyingTo,
  onCancelReply,
}: MessageInputProps) {
  const { data: session } = useSession();
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const timerRef = useRef<NodeJS.Timeout>();
  const MAX_RECORDING_DURATION = 60; // 60 seconds max

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          if (prev >= MAX_RECORDING_DURATION) {
            handleStopRecording();
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setRecordingDuration(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && attachments.length === 0) return;

    try {
      // If still recording, stop it first
      if (isRecording) {
        handleStopRecording();
        // Wait for the recording to be processed
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Process attachments before sending
      const processedAttachments = await Promise.all(
        attachments.map(async (file) => {
          if (file.type.startsWith('audio/')) {
            // For audio files, ensure they're in the correct format
            const arrayBuffer = await file.arrayBuffer();
            return new File([arrayBuffer], file.name, { type: 'audio/webm' });
          }
          return file;
        })
      );

      onSend(content, processedAttachments);
      setContent('');
      setAttachments([]);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message. Please try again.');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments((prev) => [...prev, ...files]);
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setContent((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const audioFile = new File([audioBlob], `voice-message-${Date.now()}.webm`, { 
            type: 'audio/webm'
          });
          
          // Create a temporary URL for preview
          const audioUrl = URL.createObjectURL(audioFile);
          
          // Add to attachments
          setAttachments((prev) => [...prev, audioFile]);
          
          // Clean up the URL after 5 minutes
          setTimeout(() => URL.revokeObjectURL(audioUrl), 300000);
        } catch (error) {
          console.error('Error creating audio file:', error);
          alert('Error processing audio recording. Please try again.');
        } finally {
          stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check your permissions.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      } catch (error) {
        console.error('Error stopping recording:', error);
        setIsRecording(false);
      }
    }
  };

  return (
    <div className="relative">
      {replyingTo && (
        <div className="mb-2 p-2 bg-gray-800 rounded-md flex justify-between items-center">
          <div className="text-sm text-gray-400">
            Replying to <span className="text-white">{replyingTo.userName}</span>: {replyingTo.content}
          </div>
          <button
            onClick={onCancelReply}
            className="text-gray-500 hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((file, index) => (
            <div
              key={index}
              className="flex items-center space-x-2 bg-gray-800 px-2 py-1 rounded-md"
            >
              <span className="text-sm text-gray-300">{file.name}</span>
              <button
                onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                className="text-gray-500 hover:text-white"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end space-x-2">
        <div className="flex-1 relative">
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              onTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Type a message..."
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            rows={1}
          />
          <div className="absolute right-2 bottom-2 flex space-x-2">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="text-gray-400 hover:text-white"
            >
              <Smile className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-gray-400 hover:text-white"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              className={`text-gray-400 hover:text-white ${
                isRecording ? 'text-red-500 animate-pulse' : ''
              }`}
            >
              {isRecording ? <StopCircle className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          </div>
          {showEmojiPicker && (
            <div className="absolute bottom-12 right-0">
              <EmojiPicker onEmojiClick={handleEmojiClick} />
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={!content.trim() && attachments.length === 0}
          className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-green-500 disabled:opacity-50"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>

      {/* Recording indicator */}
      {isRecording && (
        <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-full flex items-center space-x-2 animate-pulse">
          <div className="w-3 h-3 bg-white rounded-full animate-ping" />
          <span>Recording {formatDuration(recordingDuration)}</span>
        </div>
      )}

      {/* Audio preview */}
      {attachments.length > 0 && attachments.some(file => file.type.startsWith('audio/')) && (
        <div className="mt-2 p-3 bg-gray-800 rounded-lg">
          {attachments.map((file, index) => (
            file.type.startsWith('audio/') && (
              <div key={index} className="flex items-center space-x-3">
                <audio
                  controls
                  src={URL.createObjectURL(file)}
                  className="flex-1"
                />
                <button
                  onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                  className="text-red-500 hover:text-red-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )
          ))}
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        multiple
        accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt"
      />
    </div>
  );
}