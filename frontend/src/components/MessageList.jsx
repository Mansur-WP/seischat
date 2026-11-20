import { useEffect, useRef, useState } from "react";

function formatTime(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "--:--";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function renderMessageContent(content) {
  const safeContent = typeof content === "string" ? content : "";
  const mentionPattern = /(^|[^\p{L}\p{N}_-])(@[\p{L}\p{N}_-]+)/gu;
  const parts = [];
  let cursor = 0;

  for (const match of safeContent.matchAll(mentionPattern)) {
    const mentionStart = match.index + match[1].length;
    const mention = match[2];

    parts.push(safeContent.slice(cursor, mentionStart));
    parts.push(
      <span key={mentionStart} className="font-semibold text-blue-400">
        {mention}
      </span>,
    );
    cursor = mentionStart + mention.length;
  }

  parts.push(safeContent.slice(cursor));
  return parts;
}

function getSenderInfo(message) {
  const sender = message?.sender ?? message?.author ?? message?.user;
  const senderUsername =
    typeof sender === "string" ? sender : sender?.username;
  const usernameCandidate = [
    senderUsername,
    message?.username,
    message?.handle,
    typeof sender === "object" ? sender?.name : null,
  ].find(
    (value) =>
      typeof value === "string" &&
      value.trim() &&
      !["undefined", "null"].includes(value.trim().toLowerCase()),
  );
  const username = usernameCandidate?.trim().replace(/^@+/, "") || "someone";
  const displayNameCandidate = [
    typeof sender === "object" ? sender?.display_name : null,
    typeof sender === "object" ? sender?.name : null,
    typeof sender === "string" ? sender : null,
    message?.username,
    username,
  ].find((value) => typeof value === "string" && value.trim());
  const displayName = displayNameCandidate?.trim() || "someone";

  return { sender, username, displayName };
}

function createReplyState(message) {
  const { username } = getSenderInfo(message);
  return {
    username,
    content: typeof message?.content === "string" ? message.content : "",
  };
}

function isOwnedMessage(
  message,
  { sender, username, displayName },
  currentUserName,
  currentUserHandle,
  currentUserId,
) {
  return (
    message?.username?.toLowerCase() === "you" ||
    sender?.id === "current-user" ||
    (currentUserId && sender?.id === currentUserId) ||
    (currentUserId && message?.user_id === currentUserId) ||
    username.toLowerCase() === currentUserName?.toLowerCase() ||
    username.toLowerCase() === currentUserHandle?.toLowerCase() ||
    displayName.toLowerCase() === currentUserName?.toLowerCase() ||
    message?.handle?.toLowerCase() === currentUserHandle?.toLowerCase()
  );
}

function MessageList({
  messages,
  onReply,
  onDelete,
  onUserClick,
  currentUserName,
  currentUserHandle,
  currentUserId,
}) {
  const messagesEndRef = useRef(null);
  const [activeMessageId, setActiveMessageId] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const closeContextMenu = () => {
      setContextMenu(null);
      setActiveMessageId(null);
    };

    window.addEventListener("click", closeContextMenu);
    return () => window.removeEventListener("click", closeContextMenu);
  }, []);

  const activeMessage = messages.find(
    (message) => message.id === activeMessageId,
  );

  if (messages.length === 0) {
    return (
      <section
        aria-label="Chat history"
        className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto bg-zinc-950 px-4 text-zinc-500"
      >
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-zinc-600">
          💬
        </div>
        <p className="text-sm">No messages yet</p>
        <p className="mt-1 text-xs text-zinc-600">
          Send a message to start the conversation.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-label="Chat history"
      className="min-h-0 flex-1 overflow-y-auto bg-zinc-950 px-4 pb-16 pt-6 sm:px-8"
    >
      <div className="flex min-h-full flex-col justify-end space-y-3 text-sm leading-6">
        {messages.map((message) => {
          const senderInfo = getSenderInfo(message);
          const { sender, displayName: authorName } = senderInfo;
          const isCurrentUser = isOwnedMessage(
            message,
            senderInfo,
            currentUserName,
            currentUserHandle,
            currentUserId,
          );
          const authorValue = sender ?? authorName;
          const timestamp = formatTime(message.created_at);

          return (
            <article
              key={message.id}
              className={`group flex py-1 ${
                isCurrentUser ? "justify-end" : "justify-start"
              }`}
              onContextMenu={(event) => {
                event.preventDefault();
                setActiveMessageId(message.id);
                setContextMenu({
                  messageId: message.id,
                  x: event.clientX,
                  y: event.clientY,
                });
              }}
            >
              <div className="min-w-0 max-w-[85%] sm:max-w-[75%]">
                <div
                  className={`min-w-0 rounded-xl border px-3 py-2 ${
                    isCurrentUser
                      ? "border-blue-900/40 bg-blue-950/30"
                      : "border-zinc-800 bg-zinc-900"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-5 text-xs">
                    {isCurrentUser ? (
                      <span className="font-medium text-zinc-400">You</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onUserClick(authorValue)}
                        className="min-w-0 truncate font-medium text-blue-500 hover:text-blue-400 hover:underline focus:outline-none focus-visible:underline"
                      >
                        {authorName}
                      </button>
                    )}
                    <time
                      dateTime={message.created_at}
                      className="shrink-0 text-zinc-500"
                    >
                      {timestamp}
                    </time>
                  </div>
                  <p className="break-words whitespace-pre-wrap text-sm text-zinc-200 [overflow-wrap:anywhere]">
                    {renderMessageContent(message.content)}
                  </p>
                </div>
                <div
                  className={`mt-1 flex gap-3 text-xs ${
                    isCurrentUser ? "justify-end" : "justify-start"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onReply(createReplyState(message))}
                    className="rounded px-1 py-0.5 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200 focus:outline-none focus-visible:bg-zinc-900 focus-visible:text-zinc-200"
                  >
                    Reply
                  </button>
                  {isCurrentUser && (
                    <button
                      type="button"
                      onClick={() => onDelete(message.id)}
                      className="rounded px-1 py-0.5 text-red-400/80 hover:bg-zinc-900 hover:text-red-300 focus:outline-none focus-visible:bg-zinc-900 focus-visible:text-red-300"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      {contextMenu &&
        contextMenu.messageId === activeMessageId &&
        activeMessage && (
          <div className="pointer-events-none fixed inset-0 z-50">
            <div
              role="menu"
              className="pointer-events-auto absolute z-50 min-w-[120px] rounded-md border border-zinc-700 bg-zinc-900 py-1 shadow-xl"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onReply(createReplyState(activeMessage));
                  setContextMenu(null);
                  setActiveMessageId(null);
                }}
                className="w-full px-4 py-2 text-left text-sm text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-blue-400"
              >
                Reply
              </button>
              {(() => {
                const isOwned = isOwnedMessage(
                  activeMessage,
                  getSenderInfo(activeMessage),
                  currentUserName,
                  currentUserHandle,
                  currentUserId,
                );
                return isOwned ? (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onDelete(activeMessage.id);
                      setContextMenu(null);
                      setActiveMessageId(null);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-400 transition-colors hover:bg-zinc-800 hover:text-red-300"
                  >
                    Delete
                  </button>
                ) : null;
              })()}
            </div>
          </div>
        )}
    </section>
  );
}

export default MessageList;
