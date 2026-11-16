import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_API_BASE_URL = "http://localhost:8000";
const DEFAULT_CHAT_WS_URL = "ws://localhost:8000/ws/chat";

function getApiBaseUrl() {
  return (import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(
    /\/$/,
    "",
  );
}

function getChatSocketUrl() {
  return import.meta.env.VITE_CHAT_WS_URL ?? DEFAULT_CHAT_WS_URL;
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : "An unexpected chat error occurred.";
}

async function getResponseError(response, fallbackMessage) {
  const responseText = await response.text();
  if (responseText) {
    try {
      const body = JSON.parse(responseText);
      if (body?.error?.message) return body.error.message;
    } catch (parseError) {
      if (!(parseError instanceof SyntaxError)) throw parseError;
    }
  }
  return `${fallbackMessage} (HTTP ${response.status}).`;
}

function mergeMessages(existingMessages, incomingMessages) {
  const messagesById = new Map();
  for (const message of [...incomingMessages, ...existingMessages]) {
    if (message?.id) messagesById.set(message.id, message);
  }

  return [...messagesById.values()].sort(
    (first, second) =>
      new Date(first.created_at).getTime() -
      new Date(second.created_at).getTime(),
  );
}

function useChat() {
  const socketRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [error, setError] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const typingTimerRef = useRef(null);

  const fetchMessages = useCallback(async ({ cursor, limit, signal } = {}) => {
    const query = new URLSearchParams();
    if (cursor) query.set("cursor", cursor);
    if (limit) query.set("limit", String(limit));

    const queryString = query.toString();
    const url = `${getApiBaseUrl()}/api/messages${
      queryString ? `?${queryString}` : ""
    }`;
    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
      signal,
    });

    if (!response.ok) {
      throw new Error(
        await getResponseError(response, "Unable to load message history"),
      );
    }

    const result = await response.json();
    if (!Array.isArray(result.messages)) {
      throw new Error("The message history response has an invalid format.");
    }

    setMessages((currentMessages) =>
      mergeMessages(currentMessages, result.messages),
    );
    setNextCursor(result.next_cursor ?? null);
    setError(null);
    return result;
  }, []);

  const deleteMessage = useCallback(
    async (messageOrId, csrfHeaders) => {
      const messageId =
        typeof messageOrId === "string" ? messageOrId : messageOrId?.id;
      if (!messageId) {
        setError("A message ID is required to delete a message.");
        return false;
      }
      if (!csrfHeaders || Object.keys(csrfHeaders).length === 0) {
        setError("Message deletion requires the agreed CSRF protection headers.");
        return false;
      }

      try {
        const response = await fetch(
          `${getApiBaseUrl()}/api/messages/${encodeURIComponent(messageId)}`,
          {
            method: "DELETE",
            credentials: "include",
            headers: { Accept: "application/json", ...csrfHeaders },
          },
        );

        if (!response.ok) {
          throw new Error(
            await getResponseError(response, "Unable to delete message"),
          );
        }

        setMessages((currentMessages) =>
          currentMessages.filter((message) => message.id !== messageId),
        );
        setError(null);
        return true;
      } catch (deleteError) {
        setError(getErrorMessage(deleteError));
        return false;
      }
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    const socket = new WebSocket(getChatSocketUrl());
    socketRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    socket.onclose = () => {
      setIsConnected(false);
      if (socketRef.current === socket) socketRef.current = null;
    };

    socket.onerror = () => {
      setIsConnected(false);
      setError("Unable to connect to the chat server.");
    };

    socket.onmessage = (event) => {
      let messageEvent;
      try {
        messageEvent = JSON.parse(event.data);
      } catch (parseError) {
        setError(`Received an invalid chat event: ${getErrorMessage(parseError)}`);
        return;
      }

      const { event: eventName, payload } = messageEvent;
      if (eventName === "new_message" && payload?.id) {
        setMessages((currentMessages) =>
          currentMessages.some((message) => message.id === payload.id)
            ? currentMessages
            : [...currentMessages, payload],
        );
      } else if (eventName === "message_deleted" && payload?.message_id) {
        setMessages((currentMessages) =>
          currentMessages.filter(
            (message) => message.id !== payload.message_id,
          ),
        );
      } else if (eventName === "online_users" && Array.isArray(payload?.users)) {
        setOnlineUsers(payload.users);
      } else if (eventName === "typing") {
        const username =
          typeof payload?.username === "string"
            ? payload.username
            : typeof payload?.user?.username === "string"
              ? payload.user.username
              : null;

        if (username?.trim()) {
          setTypingUser(username);
          window.clearTimeout(typingTimerRef.current);
          typingTimerRef.current = window.setTimeout(() => {
            setTypingUser(null);
            typingTimerRef.current = null;
          }, 3000);
        }
      } else if (eventName === "error") {
        setError(payload?.message ?? "The chat server reported an error.");
      }
    };

    Promise.resolve()
      .then(() => {
        if (!controller.signal.aborted) {
          return fetchMessages({ signal: controller.signal });
        }
        return null;
      })
      .catch((historyError) => {
        if (
          historyError instanceof DOMException &&
          historyError.name === "AbortError"
        ) {
          return;
        }
        setError(getErrorMessage(historyError));
      });

    return () => {
      controller.abort();
      socket.onopen = null;
      socket.onclose = null;
      socket.onerror = null;
      socket.onmessage = null;
      socket.close();
      if (socketRef.current === socket) socketRef.current = null;
      window.clearTimeout(typingTimerRef.current);
    };
  }, [fetchMessages]);

  const sendMessage = useCallback((content) => {
    const normalizedContent = content.trim();
    if (!normalizedContent) return;

    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setError("Message not sent: chat is disconnected.");
      return;
    }

    try {
      socket.send(
        JSON.stringify({
          event: "send_message",
          payload: { content: normalizedContent },
        }),
      );
      setError(null);
    } catch (sendError) {
      setError(getErrorMessage(sendError));
    }
  }, []);

  return {
    messages,
    onlineUsers,
    isConnected,
    typingUser,
    error,
    nextCursor,
    fetchMessages,
    deleteMessage,
    sendMessage,
  };
}

export default useChat;
