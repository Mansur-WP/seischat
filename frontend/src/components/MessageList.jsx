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
  const mentionPattern = /(^|[^A-Za-z0-9_])(@[A-Za-z0-9_]+)/g;
  const parts = [];
  let cursor = 0;

  for (const match of content.matchAll(mentionPattern)) {
    const mentionStart = match.index + match[1].length;
    const mention = match[2];

    parts.push(content.slice(cursor, mentionStart));
    parts.push(
      <span key={mentionStart} className="font-semibold text-blue-400">
        {mention}
      </span>,
    );
    cursor = mentionStart + mention.length;
  }

  parts.push(content.slice(cursor));
  return parts;
}

function MessageList({
  messages,
  onReply,
  onDelete,
  onUserClick,
  currentUserName,
  currentUserHandle,
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
        className="flex min-h-0 flex-grow flex-col items-center justify-center bg-zinc-950 px-4 text-zinc-500"
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
      className="min-h-0 flex-grow overflow-y-auto bg-zinc-950 px-4 pb-16 pt-6 sm:px-8"
    >
      <div className="space-y-3 text-sm leading-6">
        {messages.map((message) => {
          const author = message.author ?? message.user;
          const authorName =
            (typeof author === "string"
              ? author
              : author?.name ?? author?.username) ?? message.username;
          const isCurrentUser =
            message.username?.toLowerCase() === "you" ||
            author?.id === "current-user" ||
            authorName?.toLowerCase() === currentUserName?.toLowerCase() ||
            message.handle?.toLowerCase() === currentUserHandle?.toLowerCase();
          const authorValue = author ?? authorName;
          const timestamp = formatTime(message.created_at);

          return (
            <article
              key={message.id}
              className={`flex py-1 ${
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
              <div
                className={`max-w-[85%] rounded-xl border px-3 py-2 sm:max-w-[75%] ${
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
                      className="min-w-0 truncate font-medium text-blue-500 hover:text-blue-400 hover:underline"
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
                <p className="break-words whitespace-pre-wrap text-sm text-zinc-200">
                  {renderMessageContent(message.content)}
                </p>
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
                onClick={() => onReply(activeMessage)}
                className="w-full px-4 py-2 text-left text-sm text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-blue-400"
              >
                Reply
              </button>
              {(activeMessage.username?.toLowerCase() === "you" ||
                activeMessage.username?.toLowerCase() ===
                  currentUserName?.toLowerCase() ||
                activeMessage.handle?.toLowerCase() ===
                  currentUserHandle?.toLowerCase()) && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => onDelete(activeMessage)}
                  className="w-full px-4 py-2 text-left text-sm text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-blue-400"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        )}
    </section>
  );
}

export default MessageList;
