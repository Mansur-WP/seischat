import { useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import Chatroom from './components/Chatroom.jsx'
import { GuestOnlyRoute, ProtectedRoute } from './components/auth/RouteGuards.jsx'
import { useAuth } from './context/AuthContext.jsx'
import { getAuthFeedback } from './context/authErrors.js'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'

function AuthenticatedChat() {
  const { clearError, error, isSubmitting, logout, user } = useAuth()
  const navigate = useNavigate()
  const [logoutError, setLogoutError] = useState(null)

  async function handleLogout() {
    setLogoutError(null)
    clearError()
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch (requestError) {
      setLogoutError(getAuthFeedback(requestError, { operation: 'logout' }).message)
    }
  }

  return (
    <div className="flex h-dvh flex-col bg-zinc-950 text-zinc-300">
      <header className="flex shrink-0 items-center justify-end gap-4 border-b border-zinc-800 bg-zinc-950 px-4 py-2 text-sm sm:px-8">
        {(logoutError || error) && (
          <p className="mr-auto text-rose-300" role="alert">
            {logoutError ||
              getAuthFeedback(error, { operation: 'logout' }).message}
          </p>
        )}
        <span className="text-zinc-400">
          Signed in as{' '}
          <strong className="font-medium text-zinc-200">
            {user.username}
          </strong>
        </span>
        <button
          className="rounded-md border border-zinc-700 px-3 py-1.5 text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-60"
          disabled={isSubmitting}
          onClick={handleLogout}
          type="button"
        >
          {isSubmitting ? 'Signing out…' : 'Sign out'}
        </button>
      </header>
      <div className="min-h-0 flex-1 [&>div]:!h-full">
        <Chatroom onLogout={handleLogout} />
      </div>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route element={<GuestOnlyRoute />}>
        <Route element={<Login />} path="/login" />
        <Route element={<Register />} path="/register" />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<AuthenticatedChat />} path="/chat" />
      </Route>
      <Route element={<Navigate replace to="/chat" />} path="/" />
      <Route element={<Navigate replace to="/chat" />} path="*" />
    </Routes>
  )
}

export default App;
