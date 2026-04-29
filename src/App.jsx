import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Suspense, lazy } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './hooks/useAuth'
import Navbar from './components/Navbar'

const AuthPage = lazy(() => import('./pages/AuthPage'))
const FeedPage = lazy(() => import('./pages/FeedPage'))
const CreatePostPage = lazy(() => import('./pages/CreatePostPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'))
const ChatPage = lazy(() => import('./pages/ChatPage'))

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          <p className="text-sm text-primary-400 font-medium tracking-widest uppercase">Loading</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/auth" replace />
  return children
}

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
}

function PageWrapper({ children }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="w-full"
    >
      {children}
    </motion.div>
  )
}

function AppRoutes() {
  const { user } = useAuth()
  const location = useLocation()

  return (
    <>
      {/* Show navbar everywhere except auth page */}
      <AnimatePresence mode="wait">
        {location.pathname !== '/auth' && <Navbar />}
      </AnimatePresence>

      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-950">
          <div className="flex flex-col items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-tr from-primary-600 to-accent-600 rounded-2xl flex items-center justify-center shadow-neon-primary animate-pulse-glow">
              <span className="text-white text-2xl">⚡</span>
            </div>
            <span className="w-5 h-5 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          </div>
        </div>
      }>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/auth" element={
              <PageWrapper>
                {user ? <Navigate to="/" replace /> : <AuthPage />}
              </PageWrapper>
            } />
            <Route path="/" element={<PageWrapper><FeedPage /></PageWrapper>} />
            <Route path="/create" element={
              <ProtectedRoute>
                <PageWrapper><CreatePostPage /></PageWrapper>
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <PageWrapper><ProfilePage /></PageWrapper>
              </ProtectedRoute>
            } />
            <Route path="/user/:userId" element={
              <PageWrapper><UserProfilePage /></PageWrapper>
            } />
            <Route path="/chat" element={
              <ProtectedRoute>
                <PageWrapper><ChatPage /></PageWrapper>
              </ProtectedRoute>
            } />
            <Route path="/chat/:userId" element={
              <ProtectedRoute>
                <PageWrapper><ChatPage /></PageWrapper>
              </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </Suspense>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
