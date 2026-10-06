import { useEffect, useRef, useState } from "react";
import { WifiOff } from "lucide-react";
import { Avatar } from "@/components/common/Avatar";
import { Spinner } from "@/components/common/Spinner";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { useAuthStore } from "@/stores/authStore";
import { usePresence } from "@/hooks/usePresence";
import { useChat } from "@/hooks/useChat";
import { supabase, friendlyError } from "@/lib/supabase";
import toast from "react-hot-toast";

export function ChatPage() {
  const user = useAuthStore((s) => s.user);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loadingConversation, setLoadingConversation] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const adminOnline = usePresence(user?.id, "user", "admin");

  useEffect(() => {
    if (!user) return;
    let active = true;
    async function loadConversation() {
      const { data } = await supabase.from("conversations").select("id").eq("user_id", user!.id).maybeSingle();
      if (data) {
        if (active) setConversationId((data as { id: string }).id);
      } else {
        const { data: created, error } = await supabase
          .from("conversations")
          .insert({ user_id: user!.id })
          .select("id")
          .single();
        if (!error && active) setConversationId((created as { id: string }).id);
      }
      if (active) setLoadingConversation(false);
    }
    void loadConversation();
    return () => {
      active = false;
    };
  }, [user]);

  const { messages, isLoading, hasMore, loadOlder, sendMessage, markRead, pendingStatus, isAdminTyping, connectionStatus, broadcastTyping } =
    useChat(conversationId, user?.id, "user");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    const unread = messages.filter((m) => m.sender_role === "admin" && !m.read_at).map((m) => m.id);
    if (unread.length > 0) void markRead(unread);
  }, [messages, markRead]);

  async function handleSend(text: string) {
    try {
      await sendMessage(text);
    } catch (err) {
      toast.error(friendlyError(err));
    }
  }

  if (loadingConversation) return <Spinner label="Loading our little corner..." className="min-h-[60vh]" />;

  return (
    <div className="mx-auto flex h-[calc(100vh-64px)] max-w-2xl flex-col px-0 sm:px-4">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-0">
        <Avatar name="Admin" online={adminOnline} />
        <div>
          <p className="font-serif-romantic text-lg text-ink">Our little private corner. 💗</p>
          <p className="text-xs text-ink-soft">{adminOnline ? "Online" : "Offline"}</p>
        </div>
      </div>

      {connectionStatus === "disconnected" && (
        <div className="flex items-center justify-center gap-2 bg-error/10 px-4 py-2 text-sm text-error">
          <WifiOff className="h-4 w-4" /> Connection lost. Retrying...
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-0">
        {hasMore && (
          <button onClick={() => void loadOlder()} className="mx-auto block text-sm text-primary hover:underline">
            Load older messages
          </button>
        )}
        {isLoading ? (
          <Spinner label="Loading messages..." />
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-ink-soft">No messages yet. 💭</p>
        ) : (
          messages.map((m) => (
            <MessageBubble key={m.id} message={m} isOwn={m.sender_id === user?.id} status={pendingStatus[m.id]} />
          ))
        )}
        {isAdminTyping && <TypingIndicator label="Admin is typing..." />}
        <div ref={bottomRef} />
      </div>

      <ChatInput onSend={handleSend} onTyping={broadcastTyping} disabled={!conversationId} />
    </div>
  );
}
