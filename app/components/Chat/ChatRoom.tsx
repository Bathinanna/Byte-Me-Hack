'use client';

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { MessageSquare, Send, Smile, Globe2, FileText, Mic, AlertTriangle, UserPlus, X, Users, Paperclip, Pin, Reply, Pencil, Shield, Trash2, Loader2, Bell, BellOff, AtSign, Settings } from 'lucide-react';
import getSocket from '@/app/lib/socket';
import { useMessageSuggestions } from '@/app/hooks/useMessageSuggestions';
import { useEmotionDetection } from '@/app/hooks/useEmotionDetection';
import { useConversationSummary } from '@/app/hooks/useConversationSummary';
import { useTranslation, SupportedLanguage } from '@/app/hooks/useTranslation';
import { useVoiceInput } from '@/app/hooks/useVoiceInput';
import { useEmojiSuggestions } from '@/app/hooks/useEmojiSuggestions';
import { useToxicityFilter } from '@/app/hooks/useToxicityFilter';
import EmojiPicker from 'emoji-picker-react';
import toast from 'react-hot-toast';
import { useTheme } from '../../layout';

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
  pinned: boolean;
  parentMessageId?: string;
  replies?: Message[];
}

interface ChatRoomProps {
  roomId: string;
}

function extractUrl(text: string): string | null {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const match = text.match(urlRegex);
  return match ? match[0] : null;
}

function LinkPreview({ url }: { url: string }) {
  const [preview, setPreview] = useState<any>(null);
  useEffect(() => {
    let isMounted = true;
    fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
      .then(async res => {
        let data = null;
        try { data = await res.json(); } catch { data = null; }
        if (res.ok && data) {
          if (isMounted) setPreview(data);
        } else {
          toast.error(data?.error || 'Failed to load link preview');
        }
      })
      .catch(() => toast.error('Failed to load link preview. Network or parsing error.'));
    return () => { isMounted = false; };
  }, [url]);
  if (!preview) return <div className="text-xs text-gray-400">Loading preview...</div>;
  if (preview.error) return null;
  return (
    <a href={preview.url} target="_blank" rel="noopener noreferrer" className="block border rounded p-2 mt-2 bg-gray-50 hover:bg-gray-100">
      {preview.image && <img src={preview.image} alt={preview.title} className="w-full max-h-32 object-cover rounded mb-2" />}
      <div className="font-semibold text-sm mb-1">{preview.title}</div>
      <div className="text-xs text-gray-600">{preview.description}</div>
      <div className="text-xs text-blue-500 mt-1">{preview.url}</div>
    </a>
  );
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
  const [pinnedBarOpen, setPinnedBarOpen] = useState(true);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [mentionDropdown, setMentionDropdown] = useState<{ open: boolean; query: string; position: { top: number; left: number } }>({ open: false, query: '', position: { top: 0, left: 0 } });
  const [mentionCandidates, setMentionCandidates] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [mentionNotification, setMentionNotification] = useState<null | { by: any; message: any }>(null);
  const [admins, setAdmins] = useState<string[]>([]);
  const [editingName, setEditingName] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [notifPref, setNotifPref] = useState<'all' | 'mentions' | 'none'>('all');
  const [notifDropdown, setNotifDropdown] = useState(false);
  const { darkMode } = useTheme();

  const { getSuggestions, loading: suggestionsLoading } = useMessageSuggestions();
  const { detectEmotion, getAvatarExpression } = useEmotionDetection();
  const { summarizeConversation } = useConversationSummary();
  const { translateMessage } = useTranslation();
  const { startRecording, stopRecording, isRecording: voiceIsRecording } = useVoiceInput();
  const { getEmojiSuggestions } = useEmojiSuggestions();
  const { filterMessage } = useToxicityFilter();

  const pinnedMessages = useMemo(() => messages.filter(m => m.pinned), [messages]);

  // Fetch participants for mentions
  const fetchParticipants = useCallback(async () => {
    try {
      const res = await fetch(`/api/chatrooms/${roomId}`);
      const data = await res.json();
      if (res.ok) setMentionCandidates(data.users || []);
    } catch {}
  }, [roomId]);

  useEffect(() => { fetchParticipants(); }, [fetchParticipants]);

  // Handle @ mention in input
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === '@') {
      const rect = (e.target as HTMLInputElement).getBoundingClientRect();
      setMentionDropdown({ open: true, query: '', position: { top: rect.bottom, left: rect.left } });
    } else if (mentionDropdown.open && e.key === 'Escape') {
      setMentionDropdown({ ...mentionDropdown, open: false });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    handleMessageChange(e.target.value);
    if (mentionDropdown.open) {
      const match = e.target.value.match(/@([\w]*)$/);
      setMentionDropdown({ ...mentionDropdown, query: match ? match[1] : '' });
    }
  };

  const handleMentionSelect = (username: string) => {
    setNewMessage((prev) => prev.replace(/@([\w]*)$/, `@${username} `));
    setMentionDropdown({ ...mentionDropdown, open: false });
    inputRef.current?.focus();
  };

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
          let data = null;
          try { data = await response.json(); } catch { data = null; }
          if (response.ok && data) {
            setMessages(Array.isArray(data.messages) ? data.messages : []);
            setNextCursor(data.nextCursor || null);
          } else {
            toast.error(data?.error || 'Failed to load messages');
            setFetchError(`Failed to load messages (status: ${response.status})`);
            setMessages([]);
          }
        } catch (err) {
          toast.error('Failed to load messages. Network or parsing error.');
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

      socket.on('mention-notification', (payload: any) => {
        if (isMounted) {
          setMentionNotification({ by: payload.by, message: payload.message });
          setTimeout(() => setMentionNotification(null), 5000);
        }
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
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        content: toxicityResult.filteredText || newMessage,
        createdAt: new Date().toISOString(),
        emotion: emotion?.label,
        avatarExpression: avatarExpression || undefined,
        user: {
          id: session.user.id,
          name: session.user.name || '',
          image: session.user.image || '/default-avatar.png',
        },
        reactions: [],
        pinned: false,
        parentMessageId: undefined,
        replies: [],
      }]);
    } catch (err) {
      console.error("[ChatRoom] Error in handleSendMessage:", err);
      setFetchError('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceInput = async () => {
    if (voiceIsRecording) {
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
        setMessages((prev) => [...prev, {
          id: Date.now().toString(),
          content: data.url,
          createdAt: new Date().toISOString(),
          user: {
            id: session.user.id,
            name: session.user.name || '',
            image: session.user.image || '/default-avatar.png',
          },
          reactions: [],
          pinned: false,
          parentMessageId: undefined,
          replies: [],
        }]);
        setAudioBlob(null);
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

  const handlePinToggle = async (messageId: string, pinned: boolean) => {
    try {
      await fetch(`/api/messages/${messageId}/pin`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: !pinned }),
      });
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, pinned: !pinned } : m));
    } catch (err) {
      alert('Failed to pin/unpin message');
    }
  };

  const handleSendReply = async (parentId: string) => {
    if (!replyContent.trim() || !session?.user?.id || !roomId || !socketRef.current) return;
    try {
      const formData = new FormData();
      formData.append('content', replyContent);
      formData.append('roomId', roomId);
      formData.append('parentMessageId', parentId);
      const response = await fetch('/api/messages', {
        method: 'POST',
        body: formData,
      });
      if (response.ok) {
        setReplyContent('');
        setReplyTo(null);
        // Optionally, fetch messages again or rely on socket update
      }
    } catch (err) {
      alert('Failed to send reply');
    }
  };

  const handleStartRecording = async () => {
    if (!navigator.mediaDevices) {
      alert('Audio recording not supported in this browser.');
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    const chunks: BlobPart[] = [];
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      setAudioBlob(blob);
    };
    mediaRecorder.start();
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleSendAudio = async () => {
    if (!audioBlob || !session?.user?.id || !roomId || !socketRef.current) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'voice-message.webm');
      formData.append('content', '[Voice message]');
      formData.append('roomId', roomId);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.url) {
        socketRef.current.emit('send-message', {
          content: data.url,
          userId: session.user.id,
          chatRoomId: roomId,
        });
        setMessages((prev) => [...prev, {
          id: Date.now().toString(),
          content: data.url,
          createdAt: new Date().toISOString(),
          user: {
            id: session.user.id,
            name: session.user.name || '',
            image: session.user.image || '/default-avatar.png',
          },
          reactions: [],
          pinned: false,
          parentMessageId: undefined,
          replies: [],
        }]);
        setAudioBlob(null);
      } else {
        alert(data.error || 'Failed to upload audio');
      }
    } catch (err) {
      alert('Failed to upload audio');
    } finally {
      setLoading(false);
    }
  };

  // Fetch admins and group name
  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/chatrooms/${roomId}`);
      const data = await res.json();
      setAdmins(data.admins?.map((a: any) => a.id) || []);
      setGroupName(data.name || '');
    })();
  }, [roomId]);

  // Admin/creator check
  const isAdmin = session?.user && (admins.includes(session.user.id) || creator?.id === session.user.id);

  // Group name edit handler
  const handleGroupNameSave = async () => {
    await fetch('/api/chatrooms/name', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, newName: groupName }),
    });
    setEditingName(false);
  };

  // Admin actions
  const handleMakeAdmin = async (userId: string) => {
    await fetch('/api/chatrooms/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, userId }),
    });
    setAdmins((prev) => [...prev, userId]);
  };
  const handleRemoveAdmin = async (userId: string) => {
    await fetch('/api/chatrooms/admin', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, userId }),
    });
    setAdmins((prev) => prev.filter((id) => id !== userId));
  };
  const handleRemoveUser = async (userId: string) => {
    await fetch('/api/chatrooms/participants', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, userId }),
    });
    setParticipants((prev) => prev.filter((u: any) => u.id !== userId));
  };

  // Infinite scroll handler
  const handleScroll = async () => {
    if (!messagesContainerRef.current || loadingMore || !nextCursor) return;
    const { scrollTop } = messagesContainerRef.current;
    if (scrollTop < 100) {
      setLoadingMore(true);
      const prevHeight = messagesContainerRef.current.scrollHeight;
      const res = await fetch(`/api/messages?chatRoomId=${roomId}&cursor=${nextCursor}`);
      let data = null;
      try { data = await res.json(); } catch { data = null; }
      if (res.ok && data) {
        setMessages((prev) => [...data.messages, ...prev]);
        setNextCursor(data.nextCursor || null);
      } else {
        toast.error(data?.error || 'Failed to load more messages');
        setLoadingMore(false);
        return;
      }
      setLoadingMore(false);
      // Maintain scroll position
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight - prevHeight;
        }
      }, 0);
    }
  };

  // Fetch notification preference
  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/messages/notification-preference?roomId=${roomId}`);
      let data = null;
      try { data = await res.json(); } catch { data = null; }
      setNotifPref(data?.preference || 'all');
    })();
  }, [roomId]);

  const handleNotifPrefChange = async (pref: 'all' | 'mentions' | 'none') => {
    setNotifPref(pref);
    setNotifDropdown(false);
    await fetch('/api/messages/notification-preference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, preference: pref }),
    });
    toast.success(
      pref === 'all'
        ? 'Notifications: All messages'
        : pref === 'mentions'
        ? 'Notifications: Mentions only'
        : 'Notifications: None (muted)'
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b bg-gray-800 text-white">
        {editingName ? (
          <div className="flex items-center gap-2">
            <input value={groupName} onChange={e => setGroupName(e.target.value)} className="p-1 rounded text-black" />
            <button onClick={handleGroupNameSave} className="bg-blue-500 text-white px-2 py-1 rounded">Save</button>
            <button onClick={() => setEditingName(false)} className="text-gray-400">Cancel</button>
          </div>
        ) : (
          <h2 className="text-xl font-semibold flex items-center gap-2">
            {groupName}
            {isAdmin && (
              <span className="relative group">
                <Pencil className="w-4 h-4 cursor-pointer" onClick={() => setEditingName(true)} />
                <span className="absolute left-1/2 -translate-x-1/2 mt-1 px-2 py-1 text-xs bg-black text-white rounded opacity-0 group-hover:opacity-100 transition">Edit group name</span>
              </span>
            )}
          </h2>
        )}
        <div className="flex items-center space-x-2 relative">
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
          <button onClick={() => setNotifDropdown((v) => !v)} className="p-2 hover:bg-gray-700 rounded" title="Notification Preferences">
            {notifPref === 'all' && <Bell className="w-5 h-5" />}
            {notifPref === 'mentions' && <AtSign className="w-5 h-5" />}
            {notifPref === 'none' && <BellOff className="w-5 h-5" />}
          </button>
          {notifDropdown && (
            <div className="absolute right-0 mt-10 w-48 bg-white text-black rounded shadow z-50">
              <button className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${notifPref === 'all' ? 'font-bold' : ''}`} onClick={() => handleNotifPrefChange('all')}>
                <Bell className="inline w-4 h-4 mr-2" /> All messages
              </button>
              <button className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${notifPref === 'mentions' ? 'font-bold' : ''}`} onClick={() => handleNotifPrefChange('mentions')}>
                <AtSign className="inline w-4 h-4 mr-2" /> Mentions only
              </button>
              <button className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${notifPref === 'none' ? 'font-bold' : ''}`} onClick={() => handleNotifPrefChange('none')}>
                <BellOff className="inline w-4 h-4 mr-2" /> None (mute)
              </button>
            </div>
          )}
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
                    {admins.includes(user.id) && <span className="ml-2 text-xs bg-green-700 text-white px-2 py-0.5 rounded flex items-center gap-1"><Shield className="w-3 h-3 inline" />Admin</span>}
                    {onlineUserIds.includes(user.id) && (
                      <span className="ml-2 w-3 h-3 bg-green-400 rounded-full inline-block" title="Online"></span>
                    )}
                    {isAdmin && user.id !== session?.user?.id && (
                      <>
                        {admins.includes(user.id) ? (
                          <button onClick={() => handleRemoveAdmin(user.id)} className="ml-2 text-xs bg-yellow-700 text-white px-2 py-0.5 rounded">Remove Admin</button>
                        ) : (
                          <button onClick={() => handleMakeAdmin(user.id)} className="ml-2 text-xs bg-blue-700 text-white px-2 py-0.5 rounded">Make Admin</button>
                        )}
                        <button onClick={() => handleRemoveUser(user.id)} className="ml-2 text-xs bg-red-700 text-white px-2 py-0.5 rounded flex items-center gap-1"><Trash2 className="w-3 h-3 inline" />Remove</button>
                      </>
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

      {pinnedMessages.length > 0 && (
        <div className="bg-yellow-100 border-b border-yellow-300 p-2">
          <button onClick={() => setPinnedBarOpen(o => !o)} className="text-xs text-yellow-700 font-bold mb-1">
            {pinnedBarOpen ? 'Hide' : 'Show'} pinned messages ({pinnedMessages.length})
          </button>
          {pinnedBarOpen && (
            <div className="flex flex-col gap-2 mt-2">
              {pinnedMessages.map(msg => (
                <div key={msg.id} className="flex items-center gap-2 bg-yellow-50 p-2 rounded">
                  <Pin className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm text-yellow-900">{msg.content}</span>
                  <button onClick={() => handlePinToggle(msg.id, true)} className="ml-auto text-xs text-yellow-700 underline">Unpin</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900"
        ref={messagesContainerRef}
        onScroll={handleScroll}
        style={{ display: 'flex', flexDirection: 'column-reverse' }}
      >
        <div ref={messagesEndRef} />
        {loadingMore && (
          <div className="flex justify-center items-center py-2">
            <Loader2 className="animate-spin w-6 h-6 text-gray-400" />
          </div>
        )}
        {typingUser && (
          <div className="text-sm text-blue-300 mb-2">{typingUser} is typing...</div>
        )}
        {systemMessages.map((msg, idx) => (
          <div key={`sysmsg-${idx}`} className="text-center my-2">
            <span className="inline-block bg-yellow-100 text-yellow-800 px-3 py-1 rounded italic text-sm shadow">{msg.text}</span>
          </div>
        ))}
        {messages.filter(m => !m.parentMessageId).map((message) => (
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
                className={`rounded-lg p-3 shadow max-w-md relative ${
                  message.user.id === session?.user?.id
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-black'
                } ${message.pinned ? 'border-2 border-yellow-400' : ''}`}
              >
                <button
                  onClick={() => handlePinToggle(message.id, message.pinned)}
                  className={`absolute top-2 right-2 p-1 rounded ${message.pinned ? 'bg-yellow-200' : 'hover:bg-gray-200'}`}
                  title={message.pinned ? 'Unpin' : 'Pin'}
                >
                  <Pin className={`w-4 h-4 ${message.pinned ? 'text-yellow-600' : 'text-gray-400'}`} />
                </button>
                <p>{highlightMentions(showTranslations ? handleTranslate(message) : message.content, mentionCandidates)}</p>
                {(() => {
                  const url = extractUrl(message.content);
                  return url ? <LinkPreview url={url} /> : null;
                })()}
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
                {message.content && message.content.startsWith('/uploads/') && (
                  message.content.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <img src={message.content} alt="uploaded" className="mt-2 max-w-xs max-h-48 rounded shadow" />
                  ) : (
                    <a href={message.content} target="_blank" rel="noopener noreferrer" className="mt-2 block text-blue-300 underline">Download file</a>
                  )
                )}
                <button
                  onClick={() => setReplyTo(message.id)}
                  className="ml-2 p-1 hover:bg-gray-200 rounded"
                  title="Reply"
                >
                  <Reply className="w-4 h-4" />
                </button>
                {replyTo === message.id && (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={replyContent}
                      onChange={e => setReplyContent(e.target.value)}
                      className="flex-1 p-1 border rounded"
                      placeholder="Type your reply..."
                    />
                    <button
                      onClick={() => handleSendReply(message.id)}
                      className="px-2 py-1 bg-blue-500 text-white rounded"
                    >
                      Send
                    </button>
                    <button
                      onClick={() => { setReplyTo(null); setReplyContent(''); }}
                      className="px-2 py-1 text-gray-500 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                )}
                {message.replies && message.replies.length > 0 && (
                  <div className="ml-6 mt-2 border-l-2 border-gray-200 pl-4">
                    {message.replies.map(reply => (
                      <div key={reply.id} className="mb-2">
                        <div className="flex items-center gap-2 mb-1">
                          <img
                            src={reply.user.image}
                            alt={reply.user.name ?? 'User Avatar'}
                            className="w-5 h-5 rounded-full"
                          />
                          <span className="text-xs text-gray-500">{reply.user.name}</span>
                          <span className="text-xs text-gray-400">{format(new Date(reply.createdAt), 'HH:mm')}</span>
                        </div>
                        <div className="bg-gray-100 text-black rounded p-2 text-sm">
                          {reply.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {message.content && message.content.endsWith('.webm') && (
                  <audio controls src={message.content} className="mt-2 w-full" />
                )}
                {message.user.id === session?.user?.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Are you sure you want to delete this message?')) {
                        handlePinToggle(message.id, message.pinned);
                        socketRef.current.emit('delete-message', { roomId, messageId: message.id });
                        setMessages((prev) => prev.filter(m => m.id !== message.id));
                      }
                    }}
                    className="ml-2 p-1 hover:bg-gray-200 rounded"
                    title="Delete message"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
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
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            className={`p-2 rounded ${isRecording ? 'bg-red-100 text-red-600' : 'hover:bg-gray-100'}`}
            title={isRecording ? 'Stop recording' : 'Record voice message'}
          >
            <Mic className="w-5 h-5" />
          </button>
          {isRecording && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleStopRecording();
              }}
              className="p-2 hover:bg-gray-100 rounded"
              title="Cancel recording"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {audioBlob && (
            <div className="flex items-center gap-2 mt-2">
              <audio controls src={URL.createObjectURL(audioBlob)} />
              <button onClick={handleSendAudio} className="px-2 py-1 bg-blue-500 text-white rounded">Send</button>
              <button onClick={() => setAudioBlob(null)} className="px-2 py-1 text-gray-500 rounded">Cancel</button>
            </div>
          )}
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
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type a message..."
            className="flex-1 p-2 border rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
          />
          {mentionDropdown.open && (
            <div style={{ position: 'absolute', top: mentionDropdown.position.top + 5, left: mentionDropdown.position.left }} className="z-50 bg-white border rounded shadow p-2">
              {mentionCandidates.filter(u => u.name?.toLowerCase().includes(mentionDropdown.query.toLowerCase())).map(u => (
                <div key={u.id} className="p-1 hover:bg-blue-100 cursor-pointer" onClick={() => handleMentionSelect(u.name)}>
                  @{u.name}
                </div>
              ))}
              {mentionCandidates.length === 0 && <div className="text-gray-400">No users</div>}
            </div>
          )}
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
      {mentionNotification && (
        <div style={{ position: 'fixed', top: 20, right: 20, background: '#222', color: '#fff', padding: 16, borderRadius: 8, zIndex: 1000 }}>
          <b>@{mentionNotification.by.name}</b> mentioned you:<br />
          <span>{mentionNotification.message.content}</span>
        </div>
      )}
    </div>
  );
}

function highlightMentions(text: string, users: any[]) {
  if (!text) return null;
  const parts = text.split(/(@[\w]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      const username = part.slice(1);
      const user = users.find(u => u.name === username);
      if (user) {
        return <span key={i} className="bg-blue-100 text-blue-700 px-1 rounded">{part}</span>;
      }
    }
    return <span key={i}>{part}</span>;
  });
}