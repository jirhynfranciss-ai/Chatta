import { useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import { supabase, friendlyError } from "@/lib/supabase";
import { useChatStore } from "@/stores/chatStore";
import type { Message } from "@/types";

const PAGE_SIZE = 30;

interface PendingMessage extends Message {
  status: "sending" | "sent" | "failed";
}

export function useChat(conversationId: string | null, currentUserId: string | undefined, role: "user" | "admin") {
  const { messages, setMessages, prependMessages, addMessage, updateMessage, setTyping, isAdminTyping, connectionStatus, setConnectionStatus } =
    useChatStore();
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [pendingStatus, setPendingStatus] = useState<Record<string, PendingMessage["status"]>>({});
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Initial load
  useEffect(() => {
    if (!conversationId) return;
    let active = true;
    async function load() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: false })
          .limit(PAGE_SIZE);
        if (error) throw error;
        const ordered = ((data as Message[]) ?? []).slice().reverse();
        if (active) {
          setMessages(ordered);
          setHasMore((data?.length ?? 0) === PAGE_SIZE);
        }
      } catch {
        // handled by connection status indicator
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [conversationId, setMessages]);

  const loadOlder = useCallback(async () => {
    if (!conversationId || messages.length === 0) return;
    const oldest = messages[0];
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .lt("created_at", oldest.created_at)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);
    if (error) return;
    const older = ((data as Message[]) ?? []).slice().reverse();
    prependMessages(older);
    setHasMore((data?.length ?? 0) === PAGE_SIZE);
  }, [conversationId, messages, prependMessages]);

  // Realtime subscription
  useEffect(() => {
    if (!conversationId) return;
    setConnectionStatus("connecting");

    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          addMessage(payload.new as Message);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const updated = payload.new as Message;
          updateMessage(updated.id, updated);
        }
      )
      .on("broadcast", { event: "typing" }, (payload) => {
        const senderRole = (payload.payload as { role?: string })?.role;
        if (senderRole && senderRole !== role) {
          setTyping(true);
          if (typingTimeout.current) clearTimeout(typingTimeout.current);
          typingTimeout.current = setTimeout(() => setTyping(false), 2500);
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setConnectionStatus("connected");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setConnectionStatus("disconnected");
        else if (status === "CLOSED") setConnectionStatus("disconnected");
      });

    return () => {
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      void supabase.removeChannel(channel);
    };
  }, [conversationId, role, addMessage, updateMessage, setTyping, setConnectionStatus]);

  const broadcastTyping = useCallback(() => {
    if (!conversationId) return;
    void supabase.channel(`conversation:${conversationId}`).send({
      type: "broadcast",
      event: "typing",
      payload: { role },
    });
  }, [conversationId, role]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!conversationId || !currentUserId) return;
      const tempId = uuid();
      const optimistic: Message = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: currentUserId,
        sender_role: role,
        message_text: text,
        created_at: new Date().toISOString(),
        read_at: null,
        metadata: null,
      };
      addMessage(optimistic);
      setPendingStatus((prev) => ({ ...prev, [tempId]: "sending" }));
      try {
        const { data, error } = await supabase
          .from("messages")
          .insert({ conversation_id: conversationId, sender_id: currentUserId, sender_role: role, message_text: text })
          .select()
          .single();
        if (error) throw error;
        updateMessage(tempId, data as Message);
        setPendingStatus((prev) => {
          const next = { ...prev };
          delete next[tempId];
          return next;
        });
      } catch (err) {
        setPendingStatus((prev) => ({ ...prev, [tempId]: "failed" }));
        throw new Error(friendlyError(err));
      }
    },
    [conversationId, currentUserId, role, addMessage, updateMessage]
  );

  const markRead = useCallback(
    async (messageIds: string[]) => {
      if (messageIds.length === 0) return;
      await supabase.from("messages").update({ read_at: new Date().toISOString() }).in("id", messageIds).is("read_at", null);
    },
    []
  );

  return {
    messages,
    isLoading,
    hasMore,
    loadOlder,
    sendMessage,
    markRead,
    pendingStatus,
    isAdminTyping,
    connectionStatus,
    broadcastTyping,
  };
}
