import { useEffect, useRef, useState } from "react";
import { BASE_URL } from "../../../common/utils/url";
import type { ChatMessage } from "../types";

type UseBattleChatChannelParams = {
  battleId: string | undefined;
  onMessage: (message: ChatMessage) => void;
  onSystemMessage?: (message: string) => void;
};

export function useBattleChatChannel({
  battleId,
  onMessage,
  onSystemMessage,
}: UseBattleChatChannelParams) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Guard: only connect if battleId exists
    if (!battleId) {
      return;
    }

    const token = localStorage.getItem("access_token") || "";
    const wsBase = BASE_URL.replace(/^http/i, (match) =>
      match.toLowerCase() === "https" ? "wss" : "ws",
    );
    const qs = token ? `?token=${encodeURIComponent(token)}` : "";
    const ws = new WebSocket(`${wsBase}/ws/chat/combat/${battleId}${qs}`);

    wsRef.current = ws;

    const handleOpen = () => {
      setConnected(true);
      onSystemMessage?.("Chat connected.");
    };

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as Record<string, unknown>;
        const type = data.type as string | undefined;

        if (type === "chat_message") {
          const senderId = Number(data.sender_id ?? 0);
          const senderName = typeof data.sender_username === "string" ? data.sender_username : "Unknown";
          const message = typeof data.message === "string" ? data.message : "";

          if (message) {
            onMessage({
              id: Number(data.id ?? Date.now()),
              senderId,
              senderName,
              text: message,
            });
          }
          return;
        }

        if (type === "chat_history") {
          const messages = Array.isArray(data.messages) ? data.messages : [];
          messages.forEach((historyItem, index) => {
            const senderId = Number(historyItem.sender_id ?? 0);
            const senderName = typeof historyItem.sender_username === "string" 
              ? historyItem.sender_username 
              : (typeof historyItem["sender__username"] === "string" ? historyItem["sender__username"] : "Unknown");
            const message = typeof historyItem.message === "string" ? historyItem.message : "";
            // Use index to ensure uniqueness if ID is missing or duplicate in history
            const id = historyItem.id ? Number(historyItem.id) : Date.now() + index;

            if (message) {
              onMessage({ id, senderId, senderName, text: message });
            }
          });
          return;
        }

        if (type === "error" || type === "rate_limited") {
          onSystemMessage?.(typeof data.message === "string" ? data.message : "Chat error.");
        }
      } catch (err) {
        onSystemMessage?.("Chat parse error.");
        console.error("Chat WS parse error:", err);
      }
    };

    const handleError = () => {
      onSystemMessage?.("Chat connection failed.");
    };

    const handleClose = () => {
      setConnected(false);
      onSystemMessage?.("Chat disconnected.");
    };

    ws.addEventListener("open", handleOpen);
    ws.addEventListener("message", handleMessage);
    ws.addEventListener("error", handleError);
    ws.addEventListener("close", handleClose);

    return () => {
      ws.removeEventListener("open", handleOpen);
      ws.removeEventListener("message", handleMessage);
      ws.removeEventListener("error", handleError);
      ws.removeEventListener("close", handleClose);
      ws.close();
    };
  }, [battleId, onMessage, onSystemMessage]);

  const sendMessage = (message: string) => {
    const trimmed = message.trim();
    if (!trimmed || !wsRef.current) {
      return false;
    }

    if (wsRef.current.readyState !== WebSocket.OPEN) {
      onSystemMessage?.("Chat is not connected.");
      return false;
    }

    wsRef.current.send(JSON.stringify({ type: "chat.message", message: trimmed }));
    return true;
  };

  return {
    connected,
    sendMessage,
  };
}
