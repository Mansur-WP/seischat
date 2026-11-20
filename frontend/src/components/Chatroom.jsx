import { useState } from "react";
import MessageComposer from "./MessageComposer";
import MessageList from "./MessageList";
import OnlineUsers from "./OnlineUsers";
import ProfileModal from "./ProfileModal";
import useChat from "../hooks/useChat";
import { useAuth } from "../context/AuthContext";

function Chatroom() {
  const { user, logout } = useAuth();
  const currentUserName = user?.username || "You";
  const currentUserHandle = user?.username || "you";

  const {
    messages,
    onlineUsers,
    isConnected,
    typingUser,
    error,
    sendMessage,
    deleteMessage,
  } = useChat();
  const [replyState, setReplyState] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedPeer, setSelectedPeer] = useState(null);

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-zinc-950 font-sans text-zinc-300 md:flex-row">
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close contacts sidebar"
          className="fixed inset-0 z-30 bg-black/70 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <aside
        className={`h-full shrink-0 overflow-hidden border-r border-zinc-800 transition-[width] duration-300 ease-in-out ${
          isSidebarOpen
            ? "fixed inset-y-0 left-0 z-40 w-64 shadow-2xl md:relative md:inset-auto md:z-auto md:shadow-none"
            : "hidden md:block md:w-0"
        }`}
      >
        {isSidebarOpen && (
          <OnlineUsers
            onlineUsers={onlineUsers}
            currentUserName={currentUserName}
            onUpdateName={() => {}}
            onSelectPeer={(peer) => {
              setSelectedPeer(peer);
              setIsSidebarOpen(false);
            }}
            onLogout={logout}
          />
        )}
      </aside>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-950 px-4 py-3 sm:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSidebarOpen((open) => !open)}
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 hover:border-zinc-700 focus:outline-none focus:ring-0 focus:border-zinc-700 transition-colors"
              aria-expanded={isSidebarOpen}
              aria-label={`${isSidebarOpen ? "Close" : "Open"} contacts`}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold tracking-wide text-zinc-200">
                SeisChat
              </h1>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-3 text-xs text-zinc-500">
            {typingUser && (
              <span className="truncate animate-pulse text-blue-400">
                {typingUser} is typing...
              </span>
            )}
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                isConnected
                  ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.35)]"
                  : "bg-zinc-600"
              }`}
            />
            <span>{isConnected ? "Connected" : "Disconnected"}</span>
            <button
              type="button"
              onClick={() => logout()}
              className="ml-2 rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              Sign out
            </button>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="shrink-0 border-b border-red-900/60 bg-red-950/40 px-4 py-2 text-sm text-red-300 sm:px-8"
          >
            {error}
          </div>
        )}

        <MessageList
          messages={messages}
          onReply={setReplyState}
          onDelete={deleteMessage}
          currentUserName={currentUserName}
          currentUserHandle={currentUserHandle}
          currentUserId={user?.id}
          onUserClick={(author) =>
            setSelectedPeer(
              typeof author === "string" ? { name: author } : author,
            )
          }
        />
        <MessageComposer
          sendMessage={sendMessage}
          replyState={replyState}
          clearReply={() => setReplyState(null)}
        />
      </main>
      {selectedPeer && (
        <ProfileModal
          user={selectedPeer}
          onClose={() => setSelectedPeer(null)}
        />
      )}
    </div>
  );
}

export default Chatroom;
