'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { MessageSquare, Send, Smile, Globe2, FileText, Mic, AlertTriangle } from 'lucide-react';
import { initSocket } from '@/app/lib/socket';
import { useMessageSuggestions } from '@/app/hooks/useMessageSuggestions';
import { useEmotionDetection } from '@/app/hooks/useEmotionDetection';
import { useConversationSummary } from '@/app/hooks/useConversationSummary';
import { useTranslation, SupportedLanguage } from '@/app/hooks/useTranslation';
import { useVoiceInput } from '@/app/hooks/useVoiceInput';
import { useEmojiSuggestions } from '@/app/hooks/useEmojiSuggestions';
import { useToxicityFilter } from '@/app/hooks/useToxicityFilter';
import EmojiPicker from 'emoji-picker-react';

interface Message {
  id: string;
  content: string;
  createdAt: string;
  emotion?: string;
  avatarExpression?: string;
  user: {
    id: string;
    name: string;
    image: string;
  };
  reactions: Array<{
    id: string;
    messageId: string;
    emoji: string;
    user: {
      id: string;
      name: string;
    };
  }>;
}

interface ChatRoomProps {
  roomId: string;
}

export default function ChatRoom({ roomId }: ChatRoomProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState<SupportedLanguage>('en');
  const [showTranslations, setShowTranslations] = useState(false);
  const [suggestedEmojis, setSuggestedEmojis] = useState<string[]>([]);
  const [toxicityWarning, setToxicityWarning] = useState<string | null>(null);

  const { getSuggestions, loading: suggestionsLoading } = useMessageSuggestions();
  const { detectEmotion, getAvatarExpression } = useEmotionDetection();
  const { summarizeConversation } = useConversationSummary();
  const { translateMessage } = useTranslation();
  const { startRecording, stopRecording, isRecording } = useVoiceInput();
  const { getEmojiSuggestions } = useEmojiSuggestions();
  const { filterMessage } = useToxicityFilter();

  const socket = initSocket();

  useEffect(() => {
    if (!roomId || !session?.user) return;

    const fetchMessages = async () => {
      const response = await fetch(`/api/messages?chatRoomId=${roomId}`);
      const data = await response.json();
      setMessages(data.messages);
    };

    fetchMessages();
    socket.emit('join-room', roomId);

    socket.on('new-message', (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on('new-reaction', (reaction: Message['reactions'][0]) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === reaction.messageId
            ? { ...msg, reactions: [...msg.reactions, reaction] }
            : msg
        )
      );
    });

    return () => {
      socket.emit('leave-room', roomId);
      socket.off('new-message');
      socket.off('new-reaction');
    };
  }, [roomId, session?.user]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !session?.user) return;

    // Check for toxicity
    const toxicityResult = await filterMessage(newMessage);
    if (!toxicityResult.isAllowed) {
      setToxicityWarning(toxicityResult.reason);
      return;
    }
    setToxicityWarning(toxicityResult.reason || null);

    // Detect emotion before sending
    const emotion = await detectEmotion(newMessage);
    const avatarExpression = emotion ? getAvatarExpression(emotion.label) : null;

    socket.emit('send-message', {
      content: toxicityResult.filteredText || newMessage,
      userId: session.user.id,
      chatRoomId: roomId,
      emotion: emotion?.label,
      avatarExpression,
    });

    setNewMessage('');
    setSuggestedEmojis([]);
  };

  const handleVoiceInput = async () => {
    if (isRecording) {
      try {
        const text = await stopRecording();
        setNewMessage((prev) => prev + ' ' + text);
      } catch (error) {
        console.error('Voice input error:', error);
      }
    } else {
      startRecording();
    }
  };

  const handleMessageChange = async (text: string) => {
    setNewMessage(text);
    setToxicityWarning(null);

    // Get emoji suggestions if the message ends with a space
    if (text.endsWith(' ')) {
      const emojis = await getEmojiSuggestions(text.trim());
      setSuggestedEmojis(emojis);
    } else {
      setSuggestedEmojis([]);
    }
  };

  const handleSummarize = async () => {
    const messageTexts = messages.map((msg) => msg.content);
    const summary = await summarizeConversation(messageTexts);
    if (summary) {
      alert('Chat Summary:\n\n' + summary);
    }
  };

  const handleTranslate = async (message: Message) => {
    if (!showTranslations) return message.content;
    const translated = await translateMessage(message.content, targetLanguage);
    return translated || message.content;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-xl font-semibold">Chat Room</h2>
        <div className="flex items-center space-x-2">
          <select
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value as SupportedLanguage)}
            className="p-2 border rounded"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="it">Italian</option>
            <option value="pt">Portuguese</option>
          </select>
          <button
            onClick={() => setShowTranslations(!showTranslations)}
            className={`p-2 rounded ${
              showTranslations ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
            }`}
          >
            <Globe2 className="w-5 h-5" />
          </button>
          <button
            onClick={handleSummarize}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <FileText className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.user.id === session?.user?.id ? 'justify-end' : 'justify-start'
            }`}
          >
            <div className="flex flex-col max-w-[70%]">
              <div className="flex items-center space-x-2 mb-1">
                <img
                  src={message.avatarExpression || message.user.image}
                  alt={message.user.name}
                  className="w-6 h-6 rounded-full"
                />
                <span className="text-sm text-gray-600">{message.user.name}</span>
                <span className="text-xs text-gray-400">
                  {format(new Date(message.createdAt), 'HH:mm')}
                </span>
                {message.emotion && (
                  <span className="text-xs bg-gray-100 rounded px-2">
                    {message.emotion}
                  </span>
                )}
              </div>
              <div className="bg-white rounded-lg p-3 shadow">
                <p>{showTranslations ? handleTranslate(message) : message.content}</p>
                {message.reactions?.length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {message.reactions.map((reaction) => (
                      <span
                        key={reaction.id}
                        className="text-sm bg-gray-100 rounded px-2 py-1"
                        title={reaction.user.name}
                      >
                        {reaction.emoji}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t p-4">
        {toxicityWarning && (
          <div className="flex items-center space-x-2 text-amber-600 mb-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">{toxicityWarning}</span>
          </div>
        )}

        {suggestedEmojis.length > 0 && (
          <div className="flex space-x-2 mb-2">
            {suggestedEmojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setNewMessage((prev) => prev + emoji)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <Smile className="w-5 h-5" />
          </button>
          <button
            onClick={handleVoiceInput}
            className={`p-2 rounded ${
              isRecording ? 'bg-red-100 text-red-600' : 'hover:bg-gray-100'
            }`}
          >
            <Mic className="w-5 h-5" />
          </button>
          <button
            onClick={() => getSuggestions(messages.slice(-3).map(m => m.content).join('\n'))}
            disabled={suggestionsLoading}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => handleMessageChange(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type a message..."
            className="flex-1 p-2 border rounded-lg"
          />
          <button
            onClick={handleSendMessage}
            className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        {showEmojiPicker && (
          <div className="absolute bottom-20 right-4">
            <EmojiPicker
              onEmojiClick={(emoji) => {
                setNewMessage((prev) => prev + emoji.emoji);
                setShowEmojiPicker(false);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}