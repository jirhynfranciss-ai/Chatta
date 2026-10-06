import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import toast from "react-hot-toast";
import { Archive, Ban, Search, Trash2 } from "lucide-react";
import { Avatar } from "@/components/common/Avatar";
import { EmptyState } from "@/components/common/EmptyState";
import { Spinner } from "@/components/common/Spinner";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useChat } from "@/hooks/useChat";
import { useAuthStore } from "@/stores/authStore";
import { supabase, friendlyError } from "@/lib/supabase";
import { logAdminActivity } from "@/lib/adminApi";
import type { Conversation, Message, Profile } from "@/types";

interface ConversationRow {
  conversation: Conversation;
  profile: Profile | null;
  lastMessage: Message | null;
  unreadCount: number;
}

export function MessagesPage() {
  const adminId = useAuthStore((s) => s.user?.id);
  const [rows, setRows] = useState<ConversationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: "archive" | "block" | "delete"; id: string } | null>(null);

  async function load() {
    setIsLoading(true);
    const { data: conversations } = await supabase.from("conversations").select("*").order("last_message_at", { ascending: false, nullsFirst: false });
    const convos = (conversations as Conversation[]) ?? [];
    const userIds = convos.map((c) => c.user_id);
    const { data: profiles } = userIds.length ? await supabase.from("profiles").select("*").in("id", userIds) : { data: [] };
    const { data: messages } = await supabase.from("messages").select("*").order("created_at", { ascending: false }).limit(1000);

    const profileMap = new Map((profiles as Profile[] | null)?.map((p) => [p.id, p]) ?? []);
    const lastMessageMap = new Map<string, Message>();
    const unreadMap = new Map<string, number>();
    (messages as Message[] | null)?.forEach((m) => {
      if (!lastMessageMap.has(m.conversation_id)) lastMessageMap.set(m.conversation_id, m);
      if (m.sender_role === "user" && !m.read_at) unreadMap.set(m.conversation_id, (unreadMap.get(m.conversation_id) ?? 0) + 1);
    });

    setRows(
      convos.map((c) => ({
        conversation: c,
        profile: profileMap.get(c.user_id) ?? null,
        lastMessage: lastMessageMap.get(c.id) ?? null,
        unreadCount: unreadMap.get(c.id) ?? 0,
      }))
    );
    setIsLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    let list = rows;
    if (unreadOnly) list = list.filter((r) => r.unreadCount > 0);
    const term = search.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (r) => r.profile?.display_name.toLowerCase().includes(term) || r.profile?.email.toLowerCase().includes(term)
      );
    }
    return list;
  }, [rows, search, unreadOnly]);

  const selected = rows.find((r) => r.conversation.id === selectedId) ?? null;
  const { messages, isLoading: messagesLoading, hasMore, loadOlder, sendMessage, markRead, isAdminTyping, connectionStatus, broadcastTyping } =
    useChat(selectedId, adminId, "admin");

  useEffect(() => {
    const unread = messages.filter((m) => m.sender_role === "user" && !m.read_at).map((m) => m.id);
    if (unread.length > 0) void markRead(unread);
  }, [messages, markRead]);

  async function handleSend(text: string) {
    try {
      await sendMessage(text);
      if (adminId && selectedId) await logAdminActivity(adminId, "SEND_MESSAGE", "conversation", selectedId);
    } catch (err) {
      toast.error(friendlyError(err));
    }
  }

  async function handleConfirmAction() {
    if (!confirmAction) return;
    const { type, id } = confirmAction;
    try {
      if (type === "delete") {
        await supabase.from("conversations").delete().eq("id", id);
        if (adminId) await logAdminActivity(adminId, "DELETE_MESSAGE", "conversation", id);
        setRows((prev) => prev.filter((r) => r.conversation.id !== id));
        if (selectedId === id) setSelectedId(null);
      } else {
        const status = type === "archive" ? "archived" : "blocked";
        await supabase.from("conversations").update({ status }).eq("id", id);
        setRows((prev) => prev.map((r) => (r.conversation.id === id ? { ...r, conversation: { ...r.conversation, status } } : r)));
      }
      toast.success("Updated.");
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setConfirmAction(null);
    }
  }

  return (
    <div className="grid h-[calc(100vh-7rem)] grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
      <div className="flex flex-col overflow-hidden rounded-2xl border border-[#2a2530] bg-[#1f1b24]">
        <div className="space-y-2 border-b border-[#2a2530] p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9c8cad]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full rounded-lg border border-[#2a2530] bg-[#17141a] py-2 pl-9 pr-3 text-sm text-[#ece6f0] outline-none focus:border-[#C65D7B]"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-[#b9a9c9]">
            <input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} /> Unread only
          </label>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <Spinner label="Loading messages..." />
          ) : filtered.length === 0 ? (
            <EmptyState title="No messages yet. 💭" />
          ) : (
            filtered.map((row) => (
              <button
                key={row.conversation.id}
                onClick={() => setSelectedId(row.conversation.id)}
                className={`flex w-full items-center gap-3 border-b border-[#2a2530]/60 px-4 py-3 text-left hover:bg-white/5 ${
                  selectedId === row.conversation.id ? "bg-white/10" : ""
                }`}
              >
                <Avatar name={row.profile?.display_name ?? "User"} src={row.profile?.avatar_url} online={row.profile?.is_online} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-medium text-[#ece6f0]">{row.profile?.display_name ?? "Unknown"}</p>
                    {row.lastMessage && <span className="text-xs text-[#9c8cad]">{formatDistanceToNow(new Date(row.lastMessage.created_at))}</span>}
                  </div>
                  <p className="truncate text-xs text-[#9c8cad]">{row.lastMessage?.message_text ?? "No messages yet"}</p>
                </div>
                {row.unreadCount > 0 && (
                  <span className="rounded-full bg-[#8B3A3A] px-2 py-0.5 text-xs text-white">{row.unreadCount}</span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-col overflow-hidden rounded-2xl border border-[#2a2530] bg-[#1f1b24]">
        {!selected ? (
          <div className="flex flex-1 items-center justify-center text-[#9c8cad]">Select a conversation</div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-[#2a2530] p-4">
              <div className="flex items-center gap-3">
                <Avatar name={selected.profile?.display_name ?? "User"} src={selected.profile?.avatar_url} online={selected.profile?.is_online} />
                <div>
                  <p className="font-medium">{selected.profile?.display_name ?? "Unknown"}</p>
                  <p className="text-xs text-[#9c8cad]">
                    {selected.profile?.email} {selected.profile?.facebook_url ? `· ${selected.profile.facebook_url}` : ""}
                  </p>
                  {selected.profile?.created_at && (
                    <p className="text-xs text-[#9c8cad]">Joined {format(new Date(selected.profile.created_at), "MMM d, yyyy")}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmAction({ type: "archive", id: selected.conversation.id })}
                  aria-label="Archive"
                  className="rounded-lg p-2 hover:bg-white/10"
                >
                  <Archive className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setConfirmAction({ type: "block", id: selected.conversation.id })}
                  aria-label="Block user"
                  className="rounded-lg p-2 text-amber-400 hover:bg-white/10"
                >
                  <Ban className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setConfirmAction({ type: "delete", id: selected.conversation.id })}
                  aria-label="Delete conversation"
                  className="rounded-lg p-2 text-red-400 hover:bg-white/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            {connectionStatus === "disconnected" && (
              <div className="bg-red-500/10 px-4 py-1.5 text-center text-xs text-red-300">Connection lost. Retrying...</div>
            )}
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {hasMore && (
                <button onClick={() => void loadOlder()} className="mx-auto block text-sm text-[#C65D7B] hover:underline">
                  Load older messages
                </button>
              )}
              {messagesLoading ? (
                <Spinner label="Loading messages..." />
              ) : (
                messages.map((m) => <MessageBubble key={m.id} message={m} isOwn={m.sender_role === "admin"} />)
              )}
              {isAdminTyping && <p className="text-xs text-[#9c8cad]">Typing...</p>}
            </div>
            <ChatInput onSend={handleSend} onTyping={broadcastTyping} disabled={selected.conversation.status === "blocked"} />
          </>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={confirmAction?.type === "delete" ? "Delete conversation?" : confirmAction?.type === "block" ? "Block this user?" : "Archive conversation?"}
        description="This action affects the user's ability to chat and cannot always be reversed easily."
        danger={confirmAction?.type !== "archive"}
        confirmLabel="Confirm"
        onConfirm={() => void handleConfirmAction()}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
