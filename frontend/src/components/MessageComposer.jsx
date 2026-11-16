import { useEffect, useRef, useState } from "react";

function MessageComposer({ sendMessage, replyState, clearReply }) {
  const [text, setText] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (replyState) inputRef.current?.focus();
  }, [replyState]);

  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    const nextHeight = Math.min(textarea.scrollHeight, 120);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > 120 ? "auto" : "hidden";
  }, [text]);

  useEffect(() => {
    const handleGlobalKeyPress = (event) => {
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.key.length !== 1
      ) {
        return;
      }

      const activeElement = document.activeElement;
      const isTypingField = ["INPUT", "TEXTAREA"].includes(
        activeElement?.tagName,
      );
      const isEditable = activeElement?.isContentEditable;
      const hasBlockingOverlay = document.querySelector(
        '[role="dialog"], [role="menu"]',
      );

      if (
        isTypingField ||
        isEditable ||
        activeElement?.closest?.('[role="dialog"], [role="menu"]') ||
        hasBlockingOverlay
      ) {
        return;
      }

      event.preventDefault();
      inputRef.current?.focus();
      setText((currentText) => `${currentText}${event.key}`);
    };

    window.addEventListener("keydown", handleGlobalKeyPress);
    return () =>
      window.removeEventListener("keydown", handleGlobalKeyPress);
  }, []);

  const handleTextChange = (event) => {
    setText(event.target.value);
  };

  const sendCurrentMessage = () => {
    if (!text.trim()) return;

    const content = replyState
      ? `> @${replyState.username}: \`${replyState.content}\`\n\n${text}`
      : text;
    sendMessage(content);
    setText("");
    if (replyState) clearReply();
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendCurrentMessage();
  };

  const handleInputKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendCurrentMessage();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="min-w-0 shrink-0 border-t border-zinc-800 bg-zinc-950 px-4 py-4 sm:px-8"
    >
      {replyState && (
        <div className="mb-3 flex items-center justify-between gap-3 border-l border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-500">
          <p className="min-w-0 truncate">
            Replying to @{replyState.username}
          </p>
          <button
            type="button"
            onClick={clearReply}
            className="shrink-0 text-zinc-500 transition-colors hover:text-blue-400"
            aria-label="Cancel reply"
          >
            [x] to cancel
          </button>
        </div>
      )}
      <label htmlFor="chat-message" className="sr-only">
        Type a message
      </label>
      <div className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          id="chat-message"
          rows="1"
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleInputKeyDown}
          placeholder="Type a message..."
          autoComplete="off"
          className="max-h-[120px] min-h-12 min-w-0 flex-1 resize-none overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-zinc-700 focus:outline-none"
        />
        {text.trim().length > 0 && (
          <button
            type="submit"
            className="shrink-0 rounded-md p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            aria-label="Send message"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5 rotate-45"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13"
              />
            </svg>
          </button>
        )}
      </div>
    </form>
  );
}

export default MessageComposer;
