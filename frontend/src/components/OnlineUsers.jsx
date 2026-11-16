import { useState } from "react";

function OnlineUsers({
  onlineUsers,
  onSelectPeer,
  currentUserName,
  onUpdateName,
}) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState(currentUserName);
  const handleName = isEditingName ? draftName : currentUserName;
  const handle = `@${handleName.trim().toLowerCase().replace(/\s+/g, "_")}`;
  const currentUserInitial = currentUserName.charAt(0).toUpperCase();

  const handleSaveName = () => {
    const updatedName = draftName.trim();
    if (!updatedName) return;

    onUpdateName(updatedName);
    setDraftName(updatedName);
    setIsEditingName(false);
  };

  const handleCancelName = () => {
    setDraftName(currentUserName);
    setIsEditingName(false);
  };

  return (
    <aside className="flex h-full w-full flex-col border-r border-zinc-800 bg-zinc-950">
      <header className="border-b border-zinc-800 px-3 py-5 sm:px-5">
        <h2 className="text-sm font-semibold text-zinc-200">Contacts</h2>
        <p className="mt-1 text-xs text-zinc-500">{onlineUsers.length} online</p>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-5 sm:px-5">
        <ul className="ml-2 space-y-3 border-l border-zinc-800 pl-2">
          {onlineUsers.map((user) => (
            <li key={user.id}>
              <button
                type="button"
                onClick={() => onSelectPeer(user)}
                className="flex w-full min-w-0 cursor-pointer items-center gap-2 text-left text-xs text-zinc-300 transition-colors hover:text-white sm:text-sm"
              >
                <span
                  aria-label="Online"
                  className="inline-block h-2 w-2 shrink-0 rounded-full bg-blue-500"
                />
                <span className="truncate">{user.username}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <section className="shrink-0 border-t border-zinc-800 bg-zinc-950 p-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              onSelectPeer({ name: currentUserName, status: "Online" })
            }
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 font-bold text-blue-500"
            aria-label={`Open ${currentUserName} profile`}
          >
            {currentUserInitial}
          </button>
          <div className="min-w-0 flex-1">
            {!isEditingName ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onSelectPeer({ name: currentUserName, status: "Online" })
                  }
                  className="truncate text-left text-sm text-zinc-200"
                >
                  {currentUserName}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraftName(currentUserName);
                    setIsEditingName(true);
                  }}
                  className="ml-2 shrink-0 cursor-pointer text-zinc-600 transition-colors hover:text-blue-300"
                  aria-label="Edit username"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-3.5 w-3.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m16.862 4.487 2.651 2.651M5 19l4.5-1 9.5-9.5a1.875 1.875 0 0 0-2.65-2.65l-9.5 9.5L5 19Z"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleSaveName();
                    if (event.key === "Escape") handleCancelName();
                  }}
                  autoFocus
                  aria-label="Username"
                  className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-blue-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <div className="mt-2 flex items-center">
                  <button
                    type="button"
                    onClick={handleSaveName}
                    className="cursor-pointer text-xs text-blue-500 hover:text-blue-400"
                  >
                    [Save]
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelName}
                    className="ml-3 cursor-pointer text-xs text-zinc-500 hover:text-zinc-400"
                  >
                    [Cancel]
                  </button>
                </div>
              </div>
            )}
            <div className="truncate text-xs text-zinc-500">{handle}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            localStorage.clear();
            window.location.reload();
          }}
          className="mt-3 w-full text-left text-xs text-red-500/80 transition-colors hover:text-red-400"
        >
          Log Out
        </button>
      </section>
    </aside>
  );
}

export default OnlineUsers;
