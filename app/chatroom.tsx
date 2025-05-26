import React, { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Session } from "next-auth";

interface Message {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
  parentMessageId?: string;
  avatarExpression?: string | null;
  emotion?: string;
  pinned?: boolean;
}

const Chatroom: React.FC = () => {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [typingUser, setTypingUser] = React.useState<string | null>(null);
  const [systemMessages, setSystemMessages] = React.useState<{ text: string }[]>([]);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [onlineUserIds, setOnlineUserIds] = React.useState<string[]>([]);
  const [session, setSession] = React.useState<Session | null>(null);
  const [cursor, setCursor] = React.useState<string | null>(null);

  const fetchMoreMessages = async (): Promise<Message[]> => {
    try {
      const response = await fetch(`/api/messages?cursor=${cursor || ''}`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      const data = await response.json();
      setCursor(data.nextCursor);
      return data.messages;
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  };

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    if (target.scrollTop + target.clientHeight >= target.scrollHeight - 100) {
      loadMoreMessages();
    }
  };

  const loadMoreMessages = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const newMessages = await fetchMoreMessages();
      setMessages((prevMessages) => [...prevMessages, ...newMessages]);
    } catch (error) {
      console.error("Error loading more messages:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleTyping = (user: string) => {
    setTypingUser(user);
  };

  const handleSystemMessage = (message: { text: string }) => {
    setSystemMessages((prevMessages) => [...prevMessages, message]);
  };

  const handleMessage = (message: Message) => {
    setMessages((prevMessages) => [...prevMessages, message]);
  };

  const handleOnlineUser = (userId: string) => {
    setOnlineUserIds((prevIds) => [...prevIds, userId]);
  };

  const handleOfflineUser = (userId: string) => {
    setOnlineUserIds((prevIds) => prevIds.filter((id) => id !== userId));
  };

  const handleSession = (session: Session) => {
    setSession(session);
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm" ref={messagesContainerRef} onScroll={handleScroll}>
      <div className="flex flex-col space-y-6 w-full max-w-2xl mx-auto">
        {/* Load More Indicator */}
        {loadingMore && (
          <div className="flex justify-center items-center py-4">
            <Loader2 className="animate-spin w-6 h-6 text-slate-400" />
          </div>
        )}

        {/* Typing Indicator */}
        {typingUser && (
          <div className="flex items-center gap-2 text-sm text-blue-300 mb-4 animate-pulse">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
            </div>
            {typingUser} is typing...
          </div>
        )}

        {/* System Messages */}
        {systemMessages.map((msg, idx) => (
          <div key={`sysmsg-${idx}`} className="text-center my-4">
            <span className="inline-block bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-200 px-4 py-2 rounded-full italic text-sm shadow-lg border border-yellow-400/30 backdrop-blur-sm">
              {msg.text}
            </span>
          </div>
        ))}

        {/* Messages */}
        <div className="space-y-6">
          {messages
            .filter((m) => !m.parentMessageId)
            .map((message) => (
              <div
                key={message.id}
                className={`flex ${message.user.id === session?.user?.id ? "justify-end" : "justify-start"} group`}
              >
                <div
                  className={`flex flex-col max-w-[75%] ${
                    message.user.id === session?.user?.id ? "items-end" : "items-start"
                  }`}
                >
                  {/* Message Header */}
                  <div className="flex items-center space-x-3 mb-2">
                    {message.user.id !== session?.user?.id && (
                      <div className="relative">
                        <img
                          src={message.avatarExpression || message.user.image || '/default-avatar.png'}
                          alt={message.user.name ?? "User Avatar"}
                          className="w-8 h-8 rounded-full border-2 border-slate-600 shadow-lg"
                        />
                        {onlineUserIds.includes(message.user.id) && (
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-800"></div>
                        )}
                      </div>
                    )}
                    <span
                      className={`text-sm font-medium ${
                        message.user.id === session?.user?.id ? "text-slate-300" : "text-slate-400"
                      }`}
                    >
                      {message.user.id === session?.user?.id ? "You" : message.user.name}
                    </span>
                    <span className="text-xs text-slate-500">{format(new Date(message.createdAt), "HH:mm")}</span>
                    {message.emotion && (
                      <span
                        className={`text-xs rounded-full px-3 py-1 font-medium ${
                          message.user.id === session?.user?.id
                            ? "bg-green-500/20 text-green-300 border border-green-400/30"
                            : "bg-blue-500/20 text-blue-300 border border-blue-400/30"
                        }`}
                      >
                        {message.emotion}
                      </span>
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`rounded-2xl p-4 shadow-xl max-w-md relative backdrop-blur-sm transition-all duration-200 group-hover:shadow-2xl ${
                      message.user.id === session?.user?.id
                        ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-blue-500/25"
                        : "bg-gradient-to-br from-slate-700/80 to-slate-800/80 text-white border border-slate-600/50"
                    } ${message.pinned ? "ring-2 ring-yellow-400/50" : ""}`}
                  >
                    {/* ... rest of the message bubble content ... */}
                  </div>
                </div>
              </div>
            ))}
        </div>
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default Chatroom; 