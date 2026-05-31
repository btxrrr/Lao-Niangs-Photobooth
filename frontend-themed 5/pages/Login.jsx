import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

// ─────────────────────────────────────────────────────────────
// This is a working example Login page.
// Your friend can style it however they want — the important
// parts are the useAuth() hook and the handleSubmit function.
// ─────────────────────────────────────────────────────────────

export default function Login() {
  const { login } = useAuth()
  const navigate  = useNavigate()

  const [email,    setEmail]    = useState("")
  const [password, setPassword] = useState("")
  const [error,    setError]    = useState("")
  const [loading,  setLoading]  = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await login(email, password)
      navigate("/dashboard")            // redirect after successful login
    } catch (err) {
      const msg = err.response?.data?.detail || "Login failed. Please try again."
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="denim-bg" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="glass-card" style={{ width: "100%", maxWidth: 400, padding: 40, margin: 24 }}>

        <h1 className="font-script" style={{ fontSize: 36, color: "var(--pink-dark)", textAlign: "center", marginBottom: 8 }}>
          Welcome back
        </h1>
        <p className="font-dm" style={{ color: "var(--text-light)", textAlign: "center", marginBottom: 32, fontSize: 14 }}>
          Sign in to your photo booth
        </p>

        {error && (
          <div style={{ background: "#FEE2E2", border: "1px solid #F87171", borderRadius: 12, padding: "10px 16px", marginBottom: 20, color: "#B91C1C", fontSize: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label className="font-dm" style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", display: "block", marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              className="input-field"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="font-dm" style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", display: "block", marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div style={{ textAlign: "right", marginTop: -8 }}>
            <Link to="/forgot-password" style={{ fontSize: 13, color: "var(--denim-dark)", textDecoration: "none" }}>
              Forgot password?
            </Link>
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ width: "100%", marginTop: 8 }}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="font-dm" style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: "var(--text-light)" }}>
          Don't have an account?{" "}
          <Link to="/register" style={{ color: "var(--pink-dark)", fontWeight: 600, textDecoration: "none" }}>
            Sign up
          </Link>
        </p>

      </div>
    </div>
  )
}
