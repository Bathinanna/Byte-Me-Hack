'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { MessageSquare, Send, Smile, Globe2, FileText, Mic, AlertTriangle, UserPlus, X, Users, Paperclip } from 'lucide-react';
import getSocket from '@/app/lib/socket';
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
  readBy?: string[];
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
  const [showProfile, setShowProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [emailToAdd, setEmailToAdd] = useState('');
  const [addUserMessage, setAddUserMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [creator, setCreator] = useState<any | null>(null);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantsError, setParticipantsError] = useState<string | null>(null);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const socketRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showReactionPickerFor, setShowReactionPickerFor] = useState<string | null>(null);
  const emojiList = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '🙏'];
  const [systemMessages, setSystemMessages] = useState<{ text: string; type: string; userName: string }[]>([]);

  const { getSuggestions, loading: suggestionsLoading } = useMessageSuggestions();
  const { detectEmotion, getAvatarExpression } = useEmotionDetection();
  const { summarizeConversation } = useConversationSummary();
  const { translateMessage } = useTranslation();
  const { startRecording, stopRecording, isRecording } = useVoiceInput();
  const { getEmojiSuggestions } = useEmojiSuggestions();
  const { filterMessage } = useToxicityFilter();

  useEffect(() => {
    let isMounted = true;
    (async () => {
      socketRef.current = await getSocket();
      const socket = socketRef.current;
      console.log("[ChatRoom] Socket connected:", socket.id);
      socket.emit('join-room', roomId);

      const fetchMessages = async () => {
        console.log(`[ChatRoom] Fetching messages for roomId: ${roomId}`);
        setLoading(true);
        setFetchError(null);
        try {
          const response = await fetch(`/api/messages?chatRoomId=${roomId}`);
          if (response.ok) {
            const data = await response.json();
            console.log("[ChatRoom] Messages fetched successfully:", data);
            setMessages(Array.isArray(data.messages) ? data.messages : []);
          } else {
            const errorData = await response.text(); // Get text for non-JSON errors
            console.error(`[ChatRoom] Failed to fetch messages. Status: ${response.status}. Response: ${errorData}`);
            setFetchError(`Failed to load messages (status: ${response.status})`);
            setMessages([]);
          }
        } catch (err) {
          console.error("[ChatRoom] Error in fetchMessages catch block:", err);
          setFetchError('Failed to load messages. Network or parsing error.');
          setMessages([]);
        } finally {
          console.log("[ChatRoom] fetchMessages finally block, setLoading to false.");
          setLoading(false);
        }
      };
      fetchMessages();

      socket.on('new-message', (message: Message) => {
        console.log("[ChatRoom] Received new-message:", message);
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

      socket.on('typing', (data: { userName: string }) => {
        if (data && data.userName && data.userName !== session?.user?.name) {
          setTypingUser(data.userName);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 2000);
        }
      });

      socket.on('message_read', ({ messageId, userId }: { messageId: string, userId: string }) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  readBy: msg.readBy && Array.isArray(msg.readBy)
                    ? [...new Set([...msg.readBy, userId])]
                    : [userId],
                }
              : msg
          )
        );
      });

      socket.on('online_users', (userIds: string[]) => {
        if (isMounted) setOnlineUserIds(userIds);
      });

      socket.on('system-message', (msg: { text: string; type: string; userName: string }) => {
        setSystemMessages((prev) => [...prev, msg]);
      });

    })();
    return () => {
      isMounted = false;
      if (socketRef.current) {
        socketRef.current.off('online_users');
        socketRef.current.emit('leave-room', roomId);
        socketRef.current.off('new-message');
        socketRef.current.off('new-reaction');
        socketRef.current.off('typing');
        socketRef.current.off('message_read');
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [roomId, session?.user]);

  // Emit read receipt for the latest message when messages change
  useEffect(() => {
    if (messages.length && session?.user?.id && roomId && socketRef.current) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && (!lastMsg.readBy || !lastMsg.readBy.includes(session.user.id))) {
        socketRef.current.emit('message_read', {
          roomId,
          messageId: lastMsg.id,
          userId: session.user.id,
        });
      }
    }
  }, [messages, session?.user?.id, roomId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !session?.user?.id || !roomId || !socketRef.current) {
      console.error("[ChatRoom] Cannot send message: missing message, user ID, room ID, or socket.");
      return;
    }
    setLoading(true);
    console.log("[ChatRoom] Attempting to send message:", { content: newMessage, userId: session.user.id, chatRoomId: roomId });
    try {
      // Check for toxicity
      const toxicityResult = await filterMessage(newMessage);
      const toxicityReason = toxicityResult.reason;
      setToxicityWarning(typeof toxicityReason === 'string' ? toxicityReason : null);

      // Detect emotion before sending
      const emotion = await detectEmotion(newMessage);
      const avatarExpression = emotion ? getAvatarExpression(emotion.label) : null;

      socketRef.current.emit('send-message', {
        content: toxicityResult.filteredText || newMessage,
        userId: session.user.id,
        chatRoomId: roomId,
        emotion: emotion?.label,
        avatarExpression,
      });
      console.log("[ChatRoom] Message emitted via socket.");
      setNewMessage('');
      setSuggestedEmojis([]);
    } catch (err) {
      console.error("[ChatRoom] Error in handleSendMessage:", err);
      setFetchError('Failed to send message');
    } finally {
      setLoading(false);
    }
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
    // Emit typing event
    if (session?.user?.name && roomId && socketRef.current) {
      socketRef.current.emit('typing', { roomId, userName: session.user.name });
    }

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

  const handleOpenAddUserModal = () => {
    setShowAddUserModal(true);
    setEmailToAdd('');
    setAddUserMessage(null);
  };

  const handleAddUserToRoom = async () => {
    if (!emailToAdd.trim()) {
      setAddUserMessage({ type: 'error', text: 'Please enter an email address.' });
      return;
    }
    setAddUserMessage(null); 

    const apiUrl = `/api/chatrooms/${roomId}/participants`;
    console.log(`[ChatRoom] Attempting to add user. Room ID: ${roomId}, Email: ${emailToAdd}, API URL: ${apiUrl}`);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: emailToAdd }),
      });

      const result = await response.json();

      if (response.ok) {
        setAddUserMessage({ type: 'success', text: result.message || 'User action completed.' });
        setEmailToAdd(''); // Clear input on success or if user already in room
        // Optionally close modal on success: setShowAddUserModal(false);
      } else {
        setAddUserMessage({ type: 'error', text: result.error || 'Failed to add user.' });
      }
    } catch (error) {
      console.error("Error adding user to room:", error);
      setAddUserMessage({ type: 'error', text: 'An unexpected error occurred.' });
    }
  };

  const handleOpenParticipantsModal = async () => {
    setShowParticipantsModal(true);
    setParticipantsLoading(true);
    setParticipantsError(null);
    try {
      const res = await fetch(`/api/chatrooms/${roomId}`);
      const data = await res.json();
      if (res.ok) {
        setParticipants(data.users || []);
        setCreator(data.creator || null);
      } else {
        setParticipantsError(data.error || 'Failed to load participants');
      }
    } catch (err) {
      setParticipantsError('Failed to load participants');
    } finally {
      setParticipantsLoading(false);
    }
  };

  const handleAttachClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !socketRef.current || !session?.user?.id || !roomId) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.url) {
        socketRef.current.emit('send-message', {
          content: data.url,
          userId: session.user.id,
          chatRoomId: roomId,
        });
      } else {
        alert(data.error || 'Failed to upload file');
      }
    } catch (err) {
      alert('Failed to upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddReaction = (messageId: string, emoji: string) => {
    if (!socketRef.current || !session?.user?.id) return;
    socketRef.current.emit('add-reaction', {
      emoji,
      userId: session.user.id,
      messageId,
    });
    setShowReactionPickerFor(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b bg-gray-800 text-white">
        <h2 className="text-xl font-semibold">Chat Room</h2>
        <div className="flex items-center space-x-2">
          <button onClick={() => setShowProfile(true)} className="p-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded text-sm">
            Profile
          </button>
          <button 
            onClick={handleOpenAddUserModal}
            className="p-2 hover:bg-gray-700 rounded"
            title="Add user to room"
          >
            <UserPlus className="w-5 h-5" />
          </button>
          <button 
            onClick={handleOpenParticipantsModal}
            className="p-2 hover:bg-gray-700 rounded"
            title="View participants"
          >
            <Users className="w-5 h-5" />
          </button>
          <select
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value as SupportedLanguage)}
            className="p-2 border rounded bg-gray-200 text-gray-800 text-sm focus:ring-blue-500 focus:border-blue-500"
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
              showTranslations ? 'bg-blue-500 text-white' : 'hover:bg-gray-700'
            }`}
          >
            <Globe2 className="w-5 h-5" />
          </button>
          <button
            onClick={handleSummarize}
            className="p-2 hover:bg-gray-700 rounded"
          >
            <FileText className="w-5 h-5" />
          </button>
        </div>
      </div>

      {showProfile && session?.user && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded shadow flex flex-col items-center gap-4">
            <img src={session.user.image ?? '/default-avatar.png'} alt={session.user.name ?? 'User Avatar'} className="w-20 h-20 rounded-full" />
            <div className="text-lg font-bold">{session.user.name ?? 'User Name'}</div>
            <div className="text-gray-600">{session.user.email}</div>
            <button onClick={() => setShowProfile(false)} className="px-4 py-2 bg-blue-600 text-white rounded">Close</button>
          </div>
        </div>
      )}

      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Add User to Chat Room</h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="emailToAdd" className="block text-sm font-medium text-gray-300 mb-1">User Email</label>
                <input
                  type="email"
                  id="emailToAdd"
                  value={emailToAdd}
                  onChange={(e) => setEmailToAdd(e.target.value)}
                  placeholder="Enter user's email address"
                  className="w-full p-2 border rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {addUserMessage && (
                <div className={`p-3 rounded-md text-sm ${
                  addUserMessage.type === 'success' ? 'bg-green-700 text-green-100' : 'bg-red-700 text-red-100'
                }`}>
                  {addUserMessage.text}
                </div>
              )}
              <button
                onClick={handleAddUserToRoom}
                className="w-full p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
              >
                Add User
              </button>
            </div>
          </div>
        </div>
      )}

      {showParticipantsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Participants</h3>
              <button onClick={() => setShowParticipantsModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            {participantsLoading ? (
              <div className="text-gray-300">Loading...</div>
            ) : participantsError ? (
              <div className="text-red-400">{participantsError}</div>
            ) : (
              <div className="space-y-3">
                {creator && (
                  <div className="flex items-center gap-3 p-2 rounded bg-blue-900">
                    <img src={creator.image ?? '/default-avatar.png'} alt={creator.name ?? 'Creator'} className="w-8 h-8 rounded-full" />
                    <span className="font-bold text-blue-200">{creator.name ?? 'Creator'}</span>
                    <span className="text-xs bg-blue-700 text-white px-2 py-0.5 rounded">Creator</span>
                  </div>
                )}
                {participants.filter(u => !creator || u.id !== creator.id).map((user) => (
                  <div key={user.id} className="flex items-center gap-3 p-2 rounded bg-gray-700">
                    <img src={user.image ?? '/default-avatar.png'} alt={user.name ?? 'User'} className="w-8 h-8 rounded-full" />
                    <span className="text-gray-100">{user.name ?? user.email ?? 'User'}</span>
                    {onlineUserIds.includes(user.id) && (
                      <span className="ml-2 w-3 h-3 bg-green-400 rounded-full inline-block" title="Online"></span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {loading && <div className="p-4 text-center text-gray-500">Loading messages...</div>}
      {fetchError && <div className="p-4 text-center text-red-500">{fetchError}</div>}

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900">
        {typingUser && (
          <div className="text-sm text-blue-300 mb-2">{typingUser} is typing...</div>
        )}
        {systemMessages.map((msg, idx) => (
          <div key={`sysmsg-${idx}`} className="text-center my-2">
            <span className="inline-block bg-yellow-100 text-yellow-800 px-3 py-1 rounded italic text-sm shadow">{msg.text}</span>
          </div>
        ))}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.user.id === session?.user?.id ? 'justify-end' : 'justify-start'
            }`}
          >
            <div className={`flex flex-col max-w-[70%] ${
              message.user.id === session?.user?.id ? 'items-end' : 'items-start' 
            }`}>
              <div className="flex items-center space-x-2 mb-1">
                {message.user.id !== session?.user?.id && (
                  <img
                    src={message.avatarExpression || message.user.image}
                    alt={message.user.name ?? 'User Avatar'}
                    className="w-6 h-6 rounded-full"
                  />
                )}
                <span className={`text-sm ${message.user.id === session?.user?.id ? 'text-gray-400' : 'text-gray-500'}`}>
                  {message.user.id === session?.user?.id ? 'You' : message.user.name}
                </span>
                <span className="text-xs text-gray-500">
                  {format(new Date(message.createdAt), 'HH:mm')}
                </span>
                {message.emotion && (
                  <span className={`text-xs rounded px-2 py-0.5 ${message.user.id === session?.user?.id ? 'bg-green-700 text-gray-200' : 'bg-gray-200 text-gray-700'}`}>
                    {message.emotion}
                  </span>
                )}
              </div>
              <div
                className={`rounded-lg p-3 shadow max-w-md ${
                  message.user.id === session?.user?.id
                    ? 'bg-green-600 text-white'  // WhatsApp-like green for sent
                    : 'bg-white text-black'       // White for received
                }`}
              >
                <p>{showTranslations ? handleTranslate(message) : message.content}</p>
                {/* Reaction button and picker */}
                <button
                  onClick={() => setShowReactionPickerFor(message.id)}
                  className="ml-2 p-1 hover:bg-gray-200 rounded"
                  title="React"
                >
                  <Smile className="w-4 h-4" />
                </button>
                {showReactionPickerFor === message.id && (
                  <div className="absolute z-50 bg-white border rounded shadow p-2 flex gap-1 mt-1">
                    {emojiList.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleAddReaction(message.id, emoji)}
                        className="text-xl hover:bg-gray-100 rounded"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
                {/* Display reactions */}
                {message.reactions && message.reactions.length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {[...new Set(message.reactions.map(r => r.emoji))].map((emoji) => {
                      const count = message.reactions.filter(r => r.emoji === emoji).length;
                      return (
                        <span key={emoji} className="text-sm bg-gray-200 rounded px-2 py-1 flex items-center gap-1">
                          {emoji} <span className="text-xs">{count}</span>
                        </span>
                      );
                    })}
                  </div>
                )}
                {message.readBy && session?.user?.id && message.readBy.includes(session.user.id) && (
                  <span className="text-xs text-green-400 ml-2">✓ Seen</span>
                )}
                {/* File/image preview */}
                {message.content && message.content.startsWith('/uploads/') && (
                  message.content.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <img src={message.content} alt="uploaded" className="mt-2 max-w-xs max-h-48 rounded shadow" />
                  ) : (
                    <a href={message.content} target="_blank" rel="noopener noreferrer" className="mt-2 block text-blue-300 underline">Download file</a>
                  )
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
          <button
            onClick={handleAttachClick}
            className="p-2 hover:bg-gray-100 rounded"
            disabled={uploading}
            title="Attach file"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <input
            type="text"
            value={newMessage}
            onChange={(e) => handleMessageChange(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type a message..."
            className="flex-1 p-2 border rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={handleSendMessage}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
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