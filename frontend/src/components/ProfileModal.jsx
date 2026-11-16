function ProfileModal({ user, onClose }) {
  const name = user.name ?? user.username ?? "Unknown peer";
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 font-sans text-zinc-300 backdrop-blur-sm"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="peer-dossier-title"
        className="w-full max-w-sm border border-zinc-800 bg-zinc-950 p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="mb-6 flex items-center justify-between gap-6 border-b border-zinc-800 pb-3">
          <h2
            id="peer-dossier-title"
            className="text-sm font-semibold text-zinc-200"
          >
            Profile
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-zinc-400 transition-colors hover:text-blue-400 focus:outline-none focus:text-blue-400"
            aria-label="Close peer profile"
          >
            Close
          </button>
        </header>

        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-800 text-3xl font-semibold text-blue-500">
            {initial}
          </div>
          <p className="text-lg font-semibold text-zinc-200">{name}</p>
          <p className="mt-4 text-sm text-zinc-400">Status: Online</p>
        </div>
      </section>
    </div>
  );
}

export default ProfileModal;
