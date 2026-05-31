import { Navigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

// ─────────────────────────────────────────────────────────────
// Wraps any page that requires login.
// If the user is not logged in, redirects them to /login.
// Used in App.jsx like:
//   <ProtectedRoute><Dashboard /></ProtectedRoute>
// ─────────────────────────────────────────────────────────────

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  // Still checking if a saved token is valid — show nothing yet
  if (loading) {
    return (
      <div className="denim-bg" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ color: "white", fontFamily: "DM Sans", fontSize: 16, opacity: 0.8 }}>
          Loading...
        </div>
      </div>
    )
  }

  // Not logged in — send to login page
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Logged in — show the page
  return children
}
