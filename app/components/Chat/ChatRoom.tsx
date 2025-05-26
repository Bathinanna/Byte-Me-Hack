"use client"

import { useEffect, useState, useRef, useMemo, useCallback } from "react"
import { useSession } from "next-auth/react"
import { format } from "date-fns"
import {
  Send,
  Smile,
  Globe2,
  Mic,
  AlertTriangle,
  X,
  Users,
  Paperclip,
  Pin,
  Reply,
  Trash2,
  Loader2,
  Hash,
  Settings,
  Download,
  Search,
  Check,
  CheckCheck,
} from "lucide-react"
import getSocket from "@/app/lib/socket"
import { useMessageSuggestions } from "@/app/hooks/useMessageSuggestions"
import { useEmotionDetection } from "@/app/hooks/useEmotionDetection"
import { useConversationSummary } from "@/app/hooks/useConversationSummary"
import { useTranslation, type SupportedLanguage } from "@/app/hooks/useTranslation"
import { useVoiceInput } from "@/app/hooks/useVoiceInput"
import { useEmojiSuggestions } from "@/app/hooks/useEmojiSuggestions"
import { useToxicityFilter } from "@/app/hooks/useToxicityFilter"
import EmojiPicker from "emoji-picker-react"
import toast from "react-hot-toast"
import { useCall } from "@/app/hooks/useCall"

interface Message {
  id: string
  content: string
  createdAt: string
  emotion?: string
  user: {
    id: string
    name: string
    image: string
  }
  reactions: Array<{
    id: string
    messageId: string
    emoji: string
    user: { id: string; name: string }
  }>
  readBy?: string[]
  pinned: boolean
  parentMessageId?: string
  replies?: Message[]
}

interface ChatRoomProps {
  roomId: string
}

// Enhanced avatar system
const getAvatarUrl = (seed: string, style = "avataaars") => {
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&radius=50`
}

const getDefaultAvatar = (userId: string) => {
  const styles = ["avataaars", "personas", "adventurer", "big-smile"]
  const style = styles[userId.length % styles.length]
  return getAvatarUrl(userId, style)
}

// Link preview component
function LinkPreview({ url }: { url: string }) {
  const [preview, setPreview] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let mounted = true

    fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
      .then((res) => res.json())
      .then((data) => {
        if (mounted) {
          if (data.error) {
            setError(true)
        } else {
            setPreview(data)
          }
          setLoading(false)
        }
      })
      .catch(() => {
        if (mounted) {
          setError(true)
          setLoading(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [url])

  if (loading) {
  return (
      <div className="flex items-center gap-2 p-3 mt-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
        <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
        <span className="text-sm text-slate-400">Loading preview...</span>
      </div>
    )
  }

  if (error || !preview) return null

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block mt-3 p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:border-blue-500/50 transition-colors group"
    >
      {preview.image && (
        <img
          src={preview.image || "/placeholder.svg"}
          alt={preview.title}
          className="w-full h-32 object-cover rounded mb-2"
        />
      )}
      <div className="text-sm font-medium text-white mb-1">{preview.title}</div>
      <div className="text-xs text-slate-400 line-clamp-2">{preview.description}</div>
      <div className="text-xs text-blue-400 mt-1">{new URL(url).hostname}</div>
    </a>
  )
}

// In MessageBubble, add sentiment indicator (emoji) next to timestamp or username
function getSentimentEmoji(emotion: string | undefined) {
  switch (emotion) {
    case 'joy': return '😊';
    case 'sadness': return '😢';
    case 'anger': return '😡';
    case 'fear': return '😨';
    case 'love': return '❤️';
    case 'surprise': return '😲';
    case 'neutral': return '😐';
    default: return '';
  }
}

// Message component
function MessageBubble({
  message,
  isOwn,
  onReact,
  onReply,
  onPin,
  onDelete,
  showTranslations,
  onlineUsers,
}: {
  message: Message
  isOwn: boolean
  onReact: (messageId: string, emoji: string) => void
  onReply: (messageId: string) => void
  onPin: (messageId: string) => void
  onDelete: (messageId: string) => void
  showTranslations: boolean
  onlineUsers: string[]
}) {
  const [showActions, setShowActions] = useState(false)
  const [showReactions, setShowReactions] = useState(false)

  const quickReactions = ["👍", "❤️", "😂", "😮", "😢", "🎉"]
  const isOnline = onlineUsers.includes(message.user.id)

  const extractUrl = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    return text.match(urlRegex)?.[0] || null
  }

  const url = extractUrl(message.content)

  return (
    <div
      className={`flex gap-3 group ${isOwn ? "flex-row-reverse" : "flex-row"}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      {!isOwn && (
        <div className="relative flex-shrink-0">
          <img
            src={message.user.image || getDefaultAvatar(message.user.id)}
            alt={message.user.name}
            className="w-8 h-8 rounded-full border-2 border-slate-600"
          />
          {isOnline && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900" />
          )}
        </div>
      )}

      {/* Message content */}
      <div className={`flex flex-col max-w-[70%] ${isOwn ? "items-end" : "items-start"}`}>
        {/* Header */}
        {!isOwn && (
          <div className="flex items-center gap-2 mb-1 px-1">
            <span className="text-sm font-medium text-slate-300">{message.user.name}</span>
            {/* Sentiment indicator */}
            {message.emotion && (
              <span className="ml-1" title={message.emotion}>{getSentimentEmoji(message.emotion)}</span>
            )}
            <span className="text-xs text-slate-500">{format(new Date(message.createdAt), "HH:mm")}</span>
          </div>
        )}
        {/* Message body */}
        <div className={`px-3 py-2 rounded-lg ${isOwn ? "bg-blue-600" : "bg-slate-700"}`}>
          {message.content}
        </div>
        {/* Link preview if URL is present */}
        {url && <LinkPreview url={url} />}
        {/* Reactions */}
        {message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {message.reactions.map((reaction) => (
              <span key={reaction.id} className="text-xs bg-slate-800 px-1 rounded">
                {reaction.emoji} {reaction.user.name}
              </span>
            ))}
          </div>
        )}
        {/* Actions */}
        {showActions && (
          <div className="flex gap-1 mt-1">
            <button onClick={() => onReact(message.id, "👍")} className="p-1 rounded hover:bg-slate-700">
              👍
            </button>
            <button onClick={() => onReply(message.id)} className="p-1 rounded hover:bg-slate-700">
              <Reply className="w-4 h-4" />
            </button>
            <button onClick={() => onPin(message.id)} className="p-1 rounded hover:bg-slate-700">
              <Pin className="w-4 h-4" />
            </button>
            {isOwn && (
              <button onClick={() => onDelete(message.id)} className="p-1 rounded hover:bg-slate-700">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Main chat room component
export default function ChatRoom({ roomId }: ChatRoomProps) {
  const { data: session } = useSession()
  const { inCall, callType, localStream, remoteStream, startCall, endCall } = useCall(session?.user?.id || "", "remoteUserId")

  // Core state
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // UI state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showParticipants, setShowParticipants] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [showSearch, setShowSearch] = useState(false)

  // Room state
  const [roomName, setRoomName] = useState("")
  const [participants, setParticipants] = useState<any[]>([])
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [isTyping, setIsTyping] = useState(false)

  // Features
  const [showTranslations, setShowTranslations] = useState(false)
  const [targetLanguage, setTargetLanguage] = useState<SupportedLanguage>("en")
  const [notificationPref, setNotificationPref] = useState<"all" | "mentions" | "none">("all")

  // Recording
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)

  // Refs
  const socketRef = useRef<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  // Hooks
  const { getSuggestions } = useMessageSuggestions()
  const { detectEmotion } = useEmotionDetection()
  const { summarizeConversation } = useConversationSummary()
  const { translateMessage } = useTranslation()
  const { startRecording, stopRecording } = useVoiceInput()
  const { getEmojiSuggestions } = useEmojiSuggestions()
  const { filterMessage } = useToxicityFilter()

  // Filtered messages for search
  const filteredMessages = useMemo(() => {
    if (!searchQuery) return messages
    return messages.filter(
      (msg) =>
        msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.user.name.toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }, [messages, searchQuery])

  // Pinned messages
  const pinnedMessages = useMemo(() => messages.filter((msg) => msg.pinned), [messages])

  // Initialize socket and fetch data
  useEffect(() => {
    let mounted = true

    const init = async () => {
      try {
        // Initialize socket
        socketRef.current = await getSocket()
        const socket = socketRef.current

        socket.emit("join-room", roomId)

        // Fetch initial data
        const [messagesRes, roomRes] = await Promise.all([
          fetch(`/api/messages?chatRoomId=${roomId}`),
          fetch(`/api/chatrooms/${roomId}`),
        ])

        const [messagesData, roomData] = await Promise.all([messagesRes.json(), roomRes.json()])

        if (mounted) {
          if (messagesRes.ok) {
            setMessages(messagesData.messages || [])
          }
          if (roomRes.ok) {
            setRoomName(roomData.name || "Chat Room")
            setParticipants(roomData.users || [])
          }
          setLoading(false)
        }

        // Socket listeners
        socket.on("new-message", (message: Message) => {
          if (mounted) {
            setMessages((prev) => [...prev, message])
          }
        })

        socket.on("new-reaction", (reaction: any) => {
          if (mounted) {
      setMessages((prev) =>
        prev.map((msg) =>
                msg.id === reaction.messageId ? { ...msg, reactions: [...msg.reactions, reaction] } : msg,
              ),
            )
          }
        })

        socket.on("typing", (data: { userName: string }) => {
          if (mounted && data.userName !== session?.user?.name) {
            setTypingUsers((prev) => [...prev.filter((u) => u !== data.userName), data.userName])
            setTimeout(() => {
              setTypingUsers((prev) => prev.filter((u) => u !== data.userName))
            }, 3000)
          }
        })

        socket.on("online_users", (userIds: string[]) => {
          if (mounted) setOnlineUsers(userIds)
        })

        socket.on("message_read", ({ messageId, userId }: any) => {
          if (mounted) {
            setMessages((prev) =>
              prev.map((msg) => (msg.id === messageId ? { ...msg, readBy: [...(msg.readBy || []), userId] } : msg)),
            )
          }
        })
      } catch (err) {
        if (mounted) {
          setError("Failed to connect to chat")
          setLoading(false)
        }
      }
    }

    init()

    return () => {
      mounted = false
      if (socketRef.current) {
        socketRef.current.emit("leave-room", roomId)
        socketRef.current.disconnect()
      }
    }
  }, [roomId, session?.user?.name])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Send message
  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !session?.user || !socketRef.current) return
    const content = newMessage.trim()
    setNewMessage("")
    try {
      // Filter for toxicity
      const filtered = await filterMessage(content)
      if (filtered.isAllowed === false) {
        toast.error("Message blocked: detected as toxic.")
        setNewMessage(content)
        return
      }
      // Detect emotion
      const emotion = await detectEmotion(content)
      // Send via socket
      socketRef.current.emit("send-message", {
        content: filtered.filteredText || content,
      userId: session.user.id,
      chatRoomId: roomId,
      emotion: emotion?.label,
      })
      // Optimistic update
      const tempMessage: Message = {
        id: Date.now().toString(),
        content: filtered.filteredText || content,
        createdAt: new Date().toISOString(),
        user: {
          id: session.user.id,
          name: session.user.name || "",
          image: session.user.image || getDefaultAvatar(session.user.id),
        },
        reactions: [],
        pinned: false,
        emotion: emotion?.label,
      }
      setMessages((prev) => [...prev, tempMessage])
    } catch (err) {
      toast.error("Failed to send message")
      setNewMessage(content) // Restore message
    }
  }, [newMessage, session?.user, roomId, filterMessage, detectEmotion])

  // Handle typing
  const handleTyping = useCallback(() => {
    if (!isTyping && session?.user?.name && socketRef.current) {
      setIsTyping(true)
      socketRef.current.emit("typing", { roomId, userName: session.user.name })

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false)
      }, 1000)
    }
  }, [isTyping, session?.user?.name, roomId])

  // Message actions
  const handleReaction = useCallback(
    (messageId: string, emoji: string) => {
      if (!socketRef.current || !session?.user) return

      socketRef.current.emit("add-reaction", {
        emoji,
        userId: session.user.id,
        messageId,
      })
    },
    [session?.user],
  )

  const handlePin = useCallback(
    async (messageId: string) => {
      try {
        const message = messages.find((m) => m.id === messageId)
        if (!message) return

        await fetch(`/api/messages/${messageId}/pin`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pinned: !message.pinned }),
        })

        setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, pinned: !m.pinned } : m)))
      } catch (err) {
        toast.error("Failed to pin message")
      }
    },
    [messages],
  )

  const handleDelete = useCallback(
    (messageId: string) => {
      if (!confirm("Delete this message?")) return

      if (socketRef.current) {
        socketRef.current.emit("delete-message", { roomId, messageId })
      }

      setMessages((prev) => prev.filter((m) => m.id !== messageId))
    },
    [roomId],
  )

  // File upload
  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!file || !session?.user || !socketRef.current) return

      try {
        const formData = new FormData()
        formData.append("file", file)

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        const data = await res.json()

      if (res.ok && data.url) {
          socketRef.current.emit("send-message", {
          content: data.url,
          userId: session.user.id,
          chatRoomId: roomId,
          })
      } else {
          toast.error("Failed to upload file")
      }
    } catch (err) {
        toast.error("Failed to upload file")
      }
    },
    [session?.user, roomId],
  )

  // Voice recording
  const handleStartRecording = useCallback(async () => {
    try {
      setIsRecording(true)
      await startRecording()
    } catch (err) {
      toast.error("Failed to start recording")
      setIsRecording(false)
    }
  }, [startRecording])

  const handleStopRecording = useCallback(async () => {
    try {
      const audioData = await stopRecording()
      setIsRecording(false)

      if (audioData) {
        const blob = new Blob([audioData], { type: "audio/webm" })
        setAudioBlob(blob)
      }
    } catch (err) {
      toast.error("Failed to stop recording")
      setIsRecording(false)
    }
  }, [stopRecording])

  const handleSendAudio = useCallback(async () => {
    if (!audioBlob) return

    const file = new File([audioBlob], "voice-message.webm", { type: "audio/webm" })
    await handleFileUpload(file)
    setAudioBlob(null)
  }, [audioBlob, handleFileUpload])

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-900">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-400">Loading chat...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-900">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800">
        <div className="flex items-center gap-3">
          <Hash className="w-5 h-5 text-slate-400" />
          <h1 className="text-lg font-semibold text-white">{roomName}</h1>
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            {onlineUsers.length} online
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Video Call button */}
          <button 
            onClick={() => startCall('video')}
            className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"
            title="Start Video Call"
          >
            <Globe2 className="w-5 h-5" />
          </button>
          {/* Audio Call button */}
          <button 
            onClick={() => startCall('audio')}
            className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"
            title="Start Audio Call"
          >
            <Mic className="w-5 h-5" />
          </button>
          {/* Search */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-2 rounded-lg transition-colors ${
              showSearch ? "bg-blue-600 text-white" : "hover:bg-slate-700 text-slate-400"
            }`}
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Participants */}
          <button
            onClick={() => setShowParticipants(!showParticipants)}
            className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"
          >
            <Users className="w-5 h-5" />
          </button>

          {/* Settings */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"
          >
            <Settings className="w-5 h-5" />
              </button>
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="p-4 border-b border-slate-700 bg-slate-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      )}

      {/* Pinned messages */}
      {pinnedMessages.length > 0 && (
        <div className="p-3 bg-yellow-500/10 border-b border-yellow-500/20">
          <div className="flex items-center gap-2 text-yellow-400 text-sm font-medium mb-2">
            <Pin className="w-4 h-4" />
            Pinned Messages
            </div>
          <div className="space-y-1">
            {pinnedMessages.slice(0, 3).map((msg) => (
              <div key={msg.id} className="text-sm text-yellow-200 truncate">
                <span className="font-medium">{msg.user.name}:</span> {msg.content}
                  </div>
                ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredMessages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isOwn={message.user.id === session?.user?.id}
            onReact={handleReaction}
            onReply={setReplyingTo}
            onPin={handlePin}
            onDelete={handleDelete}
            showTranslations={showTranslations}
            onlineUsers={onlineUsers}
          />
        ))}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100" />
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200" />
                </div>
            {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
        </div>
      )}

        <div ref={messagesEndRef} />
          </div>

      {/* Audio preview */}
      {audioBlob && (
        <div className="p-4 border-t border-slate-700 bg-slate-800">
          <div className="flex items-center gap-3">
            <audio controls src={URL.createObjectURL(audioBlob)} className="flex-1" />
                <button
              onClick={handleSendAudio}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
              Send
                </button>
                <button
              onClick={() => setAudioBlob(null)}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
              Cancel
                </button>
          </div>
                  </div>
                )}

      {/* Input area */}
      <div className="p-4 border-t border-slate-700 bg-slate-800">
        {replyingTo && (
          <div className="mb-3 p-2 bg-slate-700 rounded-lg flex items-center justify-between">
            <span className="text-sm text-slate-300">
              Replying to {messages.find((m) => m.id === replyingTo)?.user.name}
                        </span>
            <button onClick={() => setReplyingTo(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
                  </div>
                )}

        <div className="flex items-end gap-3">
          {/* File upload */}
          <input
            ref={fileInputRef}
            type="file"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            className="hidden"
          />

                <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-slate-400 hover:text-white transition-colors"
                >
            <Paperclip className="w-5 h-5" />
                </button>

          {/* Voice recording */}
          <button
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            className={`p-2 transition-colors ${
              isRecording ? "text-red-500 animate-pulse" : "text-slate-400 hover:text-white"
            }`}
          >
            <Mic className="w-5 h-5" />
          </button>

          {/* Message input */}
          <div className="flex-1 relative">
                    <input
                      type="text"
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value)
                handleTyping()
              }}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Type a message..."
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 pr-12"
            />

                    <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                    >
              <Smile className="w-5 h-5" />
                    </button>
          </div>

          {/* Send button */}
                    <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
            <Send className="w-5 h-5" />
                    </button>
                  </div>

        {/* Emoji picker */}
        {showEmojiPicker && (
          <div className="absolute bottom-20 right-4 z-50">
            <EmojiPicker
              onEmojiClick={(emoji) => {
                setNewMessage((prev) => prev + emoji.emoji)
                setShowEmojiPicker(false)
              }}
            />
                        </div>
        )}
                        </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="absolute top-16 right-4 w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Settings</h3>
            <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
                      </div>

          <div className="space-y-4">
            {/* Translation */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Translation</label>
              <div className="flex items-center gap-2">
                  <button
                  onClick={() => setShowTranslations(!showTranslations)}
                  className={`p-2 rounded-lg transition-colors ${
                    showTranslations ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-400"
                  }`}
                >
                  <Globe2 className="w-4 h-4" />
                  </button>
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value as SupportedLanguage)}
                  className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="it">Italian</option>
                  <option value="pt">Portuguese</option>
                </select>
              </div>
            </div>

            {/* Notifications */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Notifications</label>
              <select
                value={notificationPref}
                onChange={(e) => setNotificationPref(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              >
                <option value="all">All messages</option>
                <option value="mentions">Mentions only</option>
                <option value="none">None</option>
              </select>
          </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-700">
          <button
                onClick={async () => {
                  const summary = await summarizeConversation(messages.map((m) => m.content))
                  if (summary) {
                    alert(`Chat Summary:\n\n${summary}`)
                  }
                }}
                className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                Generate Summary
            </button>
            </div>
                </div>
            </div>
          )}

      {/* Participants panel */}
      {showParticipants && (
        <div className="absolute top-16 right-4 w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Participants</h3>
            <button onClick={() => setShowParticipants(false)} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
          </button>
        </div>

          <div className="space-y-3 max-h-80 overflow-y-auto">
            {participants.map((user) => (
              <div key={user.id} className="flex items-center gap-3">
                <div className="relative">
                  <img src={user.image || getDefaultAvatar(user.id)} alt={user.name} className="w-8 h-8 rounded-full" />
                  {onlineUsers.includes(user.id) && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-800" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">{user.name}</div>
                  <div className="text-xs text-slate-400">{onlineUsers.includes(user.id) ? "Online" : "Offline"}</div>
                </div>
              </div>
            ))}
          </div>
          </div>
        )}

      {/* Call modal overlay */}
      {inCall && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-4 rounded-lg">
            <h2 className="text-white mb-2">{callType === 'video' ? 'Video Call' : 'Audio Call'}</h2>
            {localStream && (
              <video autoPlay muted playsInline ref={el => { if (el) el.srcObject = localStream; }} className="w-64 h-48 bg-slate-700 rounded" />
            )}
            {remoteStream && (
              <video autoPlay playsInline ref={el => { if (el) el.srcObject = remoteStream; }} className="w-64 h-48 bg-slate-700 rounded mt-2" />
            )}
            <button onClick={endCall} className="mt-2 p-2 bg-red-600 text-white rounded">End Call</button>
      </div>
        </div>
      )}
    </div>
  )
}
