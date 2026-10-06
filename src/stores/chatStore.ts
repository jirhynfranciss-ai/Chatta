import { create } from "zustand";
import type { Message } from "@/types";

interface ChatState {
  messages: Message[];
  isAdminTyping: boolean;
  connectionStatus: "connecting" | "connected" | "disconnected";
  setMessages: (messages: Message[]) => void;
  prependMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, patch: Partial<Message>) => void;
  setTyping: (typing: boolean) => void;
  setConnectionStatus: (status: ChatState["connectionStatus"]) => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isAdminTyping: false,
  connectionStatus: "connecting",

  setMessages: (messages) => set({ messages }),
  prependMessages: (messages) =>
    set((state) => ({ messages: [...messages, ...state.messages] })),
  addMessage: (message) =>
    set((state) => (state.messages.some((m) => m.id === message.id) ? state : { messages: [...state.messages, message] })),
  updateMessage: (id, patch) =>
    set((state) => {
      const newId = patch.id;
      // Avoid duplicate entries if realtime already delivered the confirmed row
      // under its final id while we still had an optimistic placeholder.
      const withoutDuplicate = newId && newId !== id ? state.messages.filter((m) => m.id !== newId) : state.messages;
      return { messages: withoutDuplicate.map((m) => (m.id === id ? { ...m, ...patch } : m)) };
    }),
  setTyping: (typing) => set({ isAdminTyping: typing }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  reset: () => set({ messages: [], isAdminTyping: false, connectionStatus: "connecting" }),
}));
