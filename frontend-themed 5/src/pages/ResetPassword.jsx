import { useState } from "react"
import { useNavigate, useSearchParams, Link } from "react-router-dom"
import api from "../api/axios"

export default function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token")
  const [form, setForm] = useState({ password: "", confirmPassword: "" })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const e = {}
    if (!form.password) e.password = "Password is required"
    else if (form.password.length < 6) e.password = "Password must be at least 6 characters"
    if (!form.confirmPassword) e.confirmPassword = "Please confirm your password"
    else if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match"
    return e
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setErrors({ ...errors, [e.target.name]: "" })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const v = validate()
    if (Object.keys(v).length) { setErrors(v); return }
    setLoading(true)
    try {
      // --- MOCK ---
      navigate("/login")
      // --- REAL ---
      // await api.post("/auth/reset-password", { token, new_password: form.password })
      // navigate("/login")
    } catch (err) {
      setErrors({ general: err.response?.data?.detail || "Reset failed. Your link may have expired." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="denim-bg" style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"40px 20px",position:"relative",overflow:"hidden"}}>
      <div className="blob" style={{width:250,height:250,background:"rgba(244,167,185,0.22)",top:-50,left:-40}} />

      <div className="float"  style={{position:"absolute",top:"12%",right:"8%",fontSize:24,"--rot":"10deg"}}>✨</div>
      <div className="float2" style={{position:"absolute",bottom:"20%",left:"8%",fontSize:20,"--rot":"-8deg"}}>🌸</div>
      <div className="sparkle" style={{position:"absolute",top:"40%",left:"12%",fontSize:14}}>⭐</div>

      <div style={{width:"100%",maxWidth:420,position:"relative",zIndex:2}}>
        <div style={{textAlign:"center",marginBottom:28}} className="fade-up">
          <div style={{display:"inline-flex",alignItems:"center",gap:10,marginBottom:12}}>
            <div style={{width:42,height:42,background:"rgba(255,255,255,0.2)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,backdropFilter:"blur(8px)"}}>📸</div>
            <span className="font-playfair" style={{color:"white",fontSize:22,fontWeight:600}}>Lao Niangs</span>
          </div>
          <p style={{color:"rgba(255,255,255,0.6)",fontSize:11,letterSpacing:"0.15em",textTransform:"uppercase"}}>Photo Booth · NUS Orbital 26'</p>
        </div>

        <div className="glass-card fade-up" style={{padding:36,animationDelay:"0.1s",position:"relative"}}>
          <div style={{position:"absolute",top:-10,left:"50%",transform:"translateX(-50%) rotate(1deg)",width:52,height:18,background:"rgba(168,196,216,0.5)",borderRadius:2}} />

          <div style={{marginBottom:24}}>
            <h2 className="font-script" style={{color:"#DB6A8A",fontSize:32,lineHeight:1.2,marginBottom:4}}>New password 🌸</h2>
            <p style={{color:"#9A8FA8",fontSize:13}}>Enter your new password below</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{marginBottom:16}}>
              <label style={{display:"block",fontSize:12,fontWeight:600,color:"#7A6E85",marginBottom:6,letterSpacing:"0.04em",textTransform:"uppercase"}}>New Password</label>
              <input type="password" name="password" value={form.password} onChange={handleChange}
                className={`input-field ${errors.password ? "input-error" : ""}`} placeholder="Min. 6 characters" />
              {errors.password && <p style={{color:"#F87171",fontSize:12,marginTop:4}}>⚠ {errors.password}</p>}
            </div>

            <div style={{marginBottom:20}}>
              <label style={{display:"block",fontSize:12,fontWeight:600,color:"#7A6E85",marginBottom:6,letterSpacing:"0.04em",textTransform:"uppercase"}}>Confirm Password</label>
              <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange}
                className={`input-field ${errors.confirmPassword ? "input-error" : ""}`} placeholder="••••••••" />
              {errors.confirmPassword && <p style={{color:"#F87171",fontSize:12,marginTop:4}}>⚠ {errors.confirmPassword}</p>}
            </div>

            {errors.general && (
              <div style={{background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.3)",borderRadius:10,padding:"10px 14px",marginBottom:16,textAlign:"center"}}>
                <p style={{color:"#EF4444",fontSize:13}}>⚠ {errors.general}</p>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary" style={{width:"100%"}}>
              {loading ? "Resetting... ✨" : "Reset password →"}
            </button>
          </form>

          <div style={{textAlign:"center",marginTop:20,paddingTop:20,borderTop:"1px solid rgba(244,167,185,0.2)"}}>
            <Link to="/login" style={{color:"#DB6A8A",fontWeight:600,textDecoration:"none",fontSize:13}}>← Back to login</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
