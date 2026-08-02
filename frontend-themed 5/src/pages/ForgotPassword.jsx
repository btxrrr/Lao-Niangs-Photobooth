import { useState } from "react"
import { Link } from "react-router-dom"
import api from "../api/axios"

export default function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [emailError, setEmailError] = useState("")
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const validate = () => {
    if (!email) return "Email is required"
    if (!/\S+@\S+\.\S+/.test(email)) return "Enter a valid email address"
    return ""
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validate()
    if (err) { setEmailError(err); return }
    setLoading(true)
    try {
      // --- MOCK ---
      setSent(true)
      // --- REAL ---
      // await api.post("/auth/forgot-password", { email })
      // setSent(true)
    } catch (err) {
      setEmailError(err.response?.data?.detail || "Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="denim-bg" style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"40px 20px",position:"relative",overflow:"hidden"}}>
      <div className="blob" style={{width:260,height:260,background:"rgba(244,167,185,0.22)",top:-50,right:-40}} />
      <div className="blob" style={{width:180,height:180,background:"rgba(255,255,255,0.08)",bottom:-40,left:-30}} />

      <div className="float"  style={{position:"absolute",top:"15%",left:"7%",fontSize:24,"--rot":"-10deg"}}>🔑</div>
      <div className="float2" style={{position:"absolute",top:"20%",right:"8%",fontSize:20,"--rot":"8deg"}}>✨</div>
      <div className="float3" style={{position:"absolute",bottom:"22%",right:"10%",fontSize:16,"--rot":"-5deg"}}>🌸</div>
      <div className="sparkle" style={{position:"absolute",bottom:"30%",left:"10%",fontSize:14}}>⭐</div>

      <div style={{width:"100%",maxWidth:420,position:"relative",zIndex:2}}>
        <div style={{textAlign:"center",marginBottom:28}} className="fade-up">
          <div style={{display:"inline-flex",alignItems:"center",gap:10,marginBottom:12}}>
            <div style={{width:42,height:42,background:"rgba(255,255,255,0.2)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,backdropFilter:"blur(8px)"}}>📸</div>
            <span className="font-playfair" style={{color:"white",fontSize:22,fontWeight:600}}>Lao Niangs</span>
          </div>
          <p style={{color:"rgba(255,255,255,0.6)",fontSize:11,letterSpacing:"0.15em",textTransform:"uppercase"}}>Photo Booth · NUS Orbital 26'</p>
        </div>

        <div className="glass-card fade-up" style={{padding:36,animationDelay:"0.1s",position:"relative"}}>
          <div style={{position:"absolute",top:-10,left:"50%",transform:"translateX(-50%) rotate(-1.5deg)",width:52,height:18,background:"rgba(244,167,185,0.5)",borderRadius:2}} />

          {sent ? (
            <div style={{textAlign:"center",padding:"16px 0"}}>
              <div style={{fontSize:52,marginBottom:16}}>💌</div>
              <h2 className="font-script" style={{color:"#DB6A8A",fontSize:30,marginBottom:8}}>Check your inbox!</h2>
              <p style={{color:"#9A8FA8",fontSize:13,marginBottom:8}}>We sent a reset link to</p>
              <p style={{color:"#DB6A8A",fontWeight:600,fontSize:14,marginBottom:24}}>{email}</p>
              <Link to="/login">
                <button className="btn-primary" style={{fontSize:14}}>Back to login →</button>
              </Link>
            </div>
          ) : (
            <>
              <div style={{marginBottom:24}}>
                <h2 className="font-script" style={{color:"#DB6A8A",fontSize:32,lineHeight:1.2,marginBottom:4}}>Reset password 🔑</h2>
                <p style={{color:"#9A8FA8",fontSize:13}}>Enter your email and we'll send you a reset link</p>
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{marginBottom:20}}>
                  <label style={{display:"block",fontSize:12,fontWeight:600,color:"#7A6E85",marginBottom:6,letterSpacing:"0.04em",textTransform:"uppercase"}}>Email address</label>
                  <input
                    type="email" value={email}
                    onChange={(e) => { setEmail(e.target.value); setEmailError("") }}
                    className={`input-field ${emailError ? "input-error" : ""}`}
                    placeholder="you@example.com"
                  />
                  {emailError && <p style={{color:"#F87171",fontSize:12,marginTop:4}}>⚠ {emailError}</p>}
                </div>

                <button type="submit" disabled={loading} className="btn-primary" style={{width:"100%"}}>
                  {loading ? "Sending... ✨" : "Send reset link →"}
                </button>
              </form>

              <div style={{textAlign:"center",marginTop:20,paddingTop:20,borderTop:"1px solid rgba(244,167,185,0.2)"}}>
                <Link to="/login" style={{color:"#DB6A8A",fontWeight:600,textDecoration:"none",fontSize:13}}>← Back to login</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
