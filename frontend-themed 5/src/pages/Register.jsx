import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { registerUser } from "../api/api"
import { useAuth } from "../context/AuthContext"

export default function Register() {
  const { login }  = useAuth()
  const navigate   = useNavigate()

  const [form,    setForm]    = useState({ email: "", username: "", password: "" })
  const [error,   setError]   = useState("")
  const [loading, setLoading] = useState(false)

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await registerUser(form)
      // Auto-login after successful registration
      await login(form.email, form.password)
      navigate("/dashboard")
    } catch (err) {
      const detail = err.response?.data?.detail
      // FastAPI validation errors come back as an array
      if (Array.isArray(detail)) {
        setError(detail.map((d) => d.msg).join(", "))
      } else {
        setError(detail || "Registration failed. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="denim-bg" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="glass-card" style={{ width: "100%", maxWidth: 420, padding: 40, margin: 24 }}>

        <h1 className="font-script" style={{ fontSize: 36, color: "var(--pink-dark)", textAlign: "center", marginBottom: 8 }}>
          Create account
        </h1>
        <p className="font-dm" style={{ color: "var(--text-light)", textAlign: "center", marginBottom: 32, fontSize: 14 }}>
          Start capturing memories ✨
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
            <input type="email" className="input-field" placeholder="you@email.com"
              value={form.email} onChange={update("email")} required />
          </div>

          <div>
            <label className="font-dm" style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", display: "block", marginBottom: 6 }}>
              Username
            </label>
            <input type="text" className="input-field" placeholder="laoniang123"
              value={form.username} onChange={update("username")} required />
            <p style={{ fontSize: 12, color: "var(--text-light)", marginTop: 4 }}>
              Letters, numbers, underscores only
            </p>
          </div>

          <div>
            <label className="font-dm" style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", display: "block", marginBottom: 6 }}>
              Password
            </label>
            <input type="password" className="input-field" placeholder="••••••••"
              value={form.password} onChange={update("password")} required />
            <p style={{ fontSize: 12, color: "var(--text-light)", marginTop: 4 }}>
              Min 8 characters, at least one uppercase letter and one number
            </p>
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ width: "100%", marginTop: 8 }}>
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="font-dm" style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: "var(--text-light)" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "var(--pink-dark)", fontWeight: 600, textDecoration: "none" }}>
            Sign in
          </Link>
        </p>

      </div>
    </div>
  )
}
