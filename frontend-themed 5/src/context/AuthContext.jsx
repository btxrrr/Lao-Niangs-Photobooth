import { createContext, useContext, useState, useEffect } from "react"
import { loginUser, logoutUser, getMe } from "../api/api"

// ─────────────────────────────────────────────────────────────
// AuthContext makes the logged-in user available to every page
// without having to pass it down through props manually.
//
// Usage in any component:
//   const { user, login, logout, loading } = useAuth()
// ─────────────────────────────────────────────────────────────

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)   // the logged-in user object
  const [loading, setLoading] = useState(true)   // true while checking token on page load

  // On first load, check if a token is already saved (e.g. user refreshed the page)
  useEffect(() => {
    const token = localStorage.getItem("token")
    if (token) {
      getMe()
        .then((res) => setUser(res.data))
        .catch(() => {
          // Token is invalid or expired — clear it
          localStorage.removeItem("token")
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const handleAuthExpired = () => {
      localStorage.removeItem("token")
      setUser(null)
      setLoading(false)
    }

    window.addEventListener("auth:expired", handleAuthExpired)
    return () => window.removeEventListener("auth:expired", handleAuthExpired)
  }, [])

  // Call this from your Login page
  const login = async (email, password) => {
    const res = await loginUser({ email, password })
    localStorage.setItem("token", res.data.access_token)
    setUser(res.data.user)
    return res.data.user
  }

  // Call this from your logout button
  const logout = async () => {
    try { await logoutUser() } catch (_) {}
    localStorage.removeItem("token")
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

// Shortcut hook — import this in any page/component
export function useAuth() {
  return useContext(AuthContext)
}
