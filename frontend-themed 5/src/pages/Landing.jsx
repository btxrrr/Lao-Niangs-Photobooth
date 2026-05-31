import { useNavigate } from "react-router-dom"

const features = [
  { icon:"🖐️", title:"Gesture Shutter",       desc:"Trigger the camera hands-free with a pose" },
  { icon:"🤸", title:"AI Pose Suggestions",    desc:"Follow silhouette overlays for fun shots" },
  { icon:"🌅", title:"Background Replacement", desc:"Swap your background in real time" },
  { icon:"📖", title:"Flipbook Memories",      desc:"Burst shots stitched into animated strips" },
  { icon:"📱", title:"QR Sharing",             desc:"Instant download to your phone" },
]

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div style={{minHeight:"100vh",background:"var(--cream)",overflowX:"hidden",position:"relative"}}>
      <style>{`
        @keyframes floatY  {0%,100%{transform:translateY(0) rotate(var(--r,0deg))}50%{transform:translateY(-14px) rotate(var(--r,0deg))}}
        @keyframes floatY2 {0%,100%{transform:translateY(0) rotate(var(--r,0deg))}50%{transform:translateY(-9px)  rotate(var(--r,0deg))}}
        @keyframes sparkle {0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.3;transform:scale(0.6)}}
        @keyframes fadeUp  {from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin    {to{transform:rotate(360deg)}}
        @keyframes drift   {0%,100%{transform:translateX(0) rotate(var(--r,0deg))}50%{transform:translateX(10px) rotate(var(--r,0deg))}}
        .fup { animation: fadeUp 0.7s ease both }
        .feat-card:hover { transform: translateY(-6px) scale(1.02); box-shadow: 0 16px 40px rgba(90,122,150,0.18), 0 4px 12px rgba(244,167,185,0.18) !important; }
        .feat-card { transition: all 0.3s ease; }
        .cta-btn:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(224,122,149,0.5) !important; }
        .cta-btn { transition: all 0.25s ease; }
        .polaroid-wrap:hover { transform: rotate(0deg) scale(1.06) !important; }
        .polaroid-wrap { transition: transform 0.35s ease; }
      `}</style>

      {/* ── DENIM HERO ─────────────────────────────────────────────────────── */}
      <div className="denim-bg" style={{position:"relative",overflow:"hidden",paddingBottom:80}}>

        {/* Blobs */}
        <div style={{position:"absolute",width:400,height:400,borderRadius:"50%",background:"rgba(244,167,185,0.2)",top:-120,right:-80,filter:"blur(60px)",pointerEvents:"none"}} />
        <div style={{position:"absolute",width:300,height:300,borderRadius:"50%",background:"rgba(255,255,255,0.08)",bottom:-80,left:-60,filter:"blur(50px)",pointerEvents:"none"}} />

        {/* Denim texture lines */}
        <div style={{position:"absolute",inset:0,backgroundImage:"repeating-linear-gradient(90deg,transparent,transparent 3px,rgba(255,255,255,0.03) 3px,rgba(255,255,255,0.03) 6px),repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,0.03) 3px,rgba(255,255,255,0.03) 6px)",pointerEvents:"none"}} />

        {/* Floating deco — left side */}
        <div style={{position:"absolute",top:"18%",left:"4%",animation:"floatY 3.8s ease-in-out infinite","--r":"-8deg"}}>
          <div className="polaroid-wrap" style={{background:"white",padding:"8px 8px 24px",borderRadius:3,boxShadow:"3px 5px 18px rgba(90,122,150,0.25)",transform:"rotate(-8deg)",width:90}}>
            <div style={{width:"100%",height:70,background:"linear-gradient(135deg,#FBD5E8,#A8C4D8)",borderRadius:1,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>🌸</div>
            <p style={{fontSize:8,color:"#9A8FA8",textAlign:"center",marginTop:6,fontFamily:"Dancing Script,cursive",fontSize:11}}>memories</p>
          </div>
        </div>
        <div style={{position:"absolute",top:"42%",left:"2%",animation:"floatY2 4.5s ease-in-out infinite","--r":"5deg",animationDelay:"0.8s"}}>
          <div className="polaroid-wrap" style={{background:"white",padding:"8px 8px 24px",borderRadius:3,boxShadow:"3px 5px 18px rgba(90,122,150,0.25)",transform:"rotate(5deg)",width:76}}>
            <div style={{width:"100%",height:58,background:"linear-gradient(135deg,#A8C4D8,#FBD5E8)",borderRadius:1,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>✨</div>
            <p style={{fontSize:11,color:"#9A8FA8",textAlign:"center",marginTop:6,fontFamily:"Dancing Script,cursive"}}>moments</p>
          </div>
        </div>

        {/* Floating deco — right side */}
        <div style={{position:"absolute",top:"15%",right:"4%",animation:"drift 5s ease-in-out infinite","--r":"6deg"}}>
          <div style={{fontSize:72,filter:"drop-shadow(0 4px 12px rgba(244,167,185,0.5))"}}>📸</div>
        </div>
        <div style={{position:"absolute",top:"50%",right:"3%",animation:"floatY 4.2s ease-in-out infinite","--r":"-4deg",animationDelay:"1.2s"}}>
          <div className="polaroid-wrap" style={{background:"white",padding:"8px 8px 24px",borderRadius:3,boxShadow:"3px 5px 18px rgba(90,122,150,0.25)",transform:"rotate(-4deg)",width:80}}>
            <div style={{width:"100%",height:62,background:"linear-gradient(135deg,#FBD5E8,#C8E6C9)",borderRadius:1,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>💕</div>
            <p style={{fontSize:11,color:"#9A8FA8",textAlign:"center",marginTop:6,fontFamily:"Dancing Script,cursive"}}>forever</p>
          </div>
        </div>

        {/* Sparkles */}
        {[
          {top:"8%", left:"28%", size:16, delay:0},
          {top:"25%",left:"55%", size:12, delay:0.4},
          {top:"65%",left:"22%", size:14, delay:0.9},
          {top:"70%",right:"22%",size:10, delay:0.2},
          {top:"35%",left:"8%",  size:10, delay:1.1},
        ].map((s,i) => (
          <div key={i} style={{position:"absolute",top:s.top,left:s.left,right:s.right,fontSize:s.size,animation:`sparkle 2.2s ease-in-out infinite`,animationDelay:`${s.delay}s`,pointerEvents:"none"}}>✦</div>
        ))}

        {/* Nav */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"24px 40px",position:"relative",zIndex:10}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:38,height:38,background:"rgba(255,255,255,0.2)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,backdropFilter:"blur(8px)"}}>📸</div>
            <span className="font-playfair" style={{color:"white",fontSize:18,fontWeight:600}}>Lao Niangs</span>
          </div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={() => navigate("/login")} className="btn-secondary" style={{fontSize:13,padding:"9px 22px"}}>Log in</button>
            <button onClick={() => navigate("/register")} className="btn-primary cta-btn" style={{fontSize:13,padding:"9px 22px"}}>Sign up 🌸</button>
          </div>
        </div>

        {/* Hero text */}
        <div style={{textAlign:"center",padding:"60px 20px 20px",position:"relative",zIndex:5}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(255,255,255,0.15)",borderRadius:50,padding:"6px 18px",marginBottom:20,backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,0.25)"}}>
            <span style={{fontSize:12}}>✨</span>
            <span style={{color:"rgba(255,255,255,0.85)",fontSize:12,fontWeight:500,letterSpacing:"0.06em"}}>AI-Powered Photo Booth · NUS Orbital 26'</span>
          </div>

          <h1 className="font-script fup" style={{color:"white",fontSize:"clamp(42px,8vw,80px)",lineHeight:1.1,marginBottom:12,textShadow:"0 4px 24px rgba(0,0,0,0.15)",animationDelay:"0.1s"}}>
            Imagine Capturing<br />
            <span style={{color:"#FBD5E8"}}>Memories</span>
          </h1>

          <p className="fup" style={{color:"rgba(255,255,255,0.7)",fontSize:"clamp(14px,2.5vw,18px)",letterSpacing:"0.12em",marginBottom:36,animationDelay:"0.25s"}}>
            Anywhere &nbsp;•&nbsp; Anytime &nbsp;•&nbsp; Effortlessly
          </p>

          <div className="fup" style={{display:"flex",gap:14,justifyContent:"center",flexWrap:"wrap",animationDelay:"0.4s"}}>
            <button onClick={() => navigate("/register")} className="btn-primary cta-btn" style={{fontSize:16,padding:"15px 40px"}}>
              Start Capturing 📷
            </button>
            <button onClick={() => navigate("/login")} className="btn-secondary" style={{fontSize:15,padding:"15px 32px"}}>
              Log in →
            </button>
          </div>
        </div>

        {/* Wave */}
        <div style={{position:"absolute",bottom:-2,left:0,right:0}}>
          <svg viewBox="0 0 1440 80" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{width:"100%",height:80,display:"block"}}>
            <path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" fill="var(--cream)" />
          </svg>
        </div>
      </div>

      {/* ── FEATURES ────────────────────────────────────────────────────────── */}
      <div style={{padding:"80px 20px",background:"var(--cream)",position:"relative"}}>

        {/* Scrapbook deco */}
        <div style={{position:"absolute",top:30,left:20,fontSize:22,opacity:0.3,transform:"rotate(-15deg)"}}>🌸</div>
        <div style={{position:"absolute",top:50,right:30,fontSize:18,opacity:0.3,transform:"rotate(12deg)"}}>✨</div>
        <div style={{position:"absolute",bottom:40,left:40,fontSize:16,opacity:0.25,transform:"rotate(-8deg)"}}>💕</div>

        <div style={{maxWidth:760,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:52}}>
            <div style={{display:"inline-block",background:"rgba(244,167,185,0.15)",borderRadius:50,padding:"6px 18px",marginBottom:14}}>
              <span style={{color:"#DB6A8A",fontSize:12,fontWeight:600,letterSpacing:"0.08em"}}>✦ FEATURES ✦</span>
            </div>
            <h2 className="font-script" style={{color:"#3D3450",fontSize:"clamp(32px,5vw,48px)",lineHeight:1.2,marginBottom:10}}>
              Everything you need
            </h2>
            <p style={{color:"#9A8FA8",fontSize:14,maxWidth:420,margin:"0 auto"}}>
              A full creative photo booth experience — no hardware, no green screen, just vibes.
            </p>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:16}}>
            {features.map((f,i) => (
              <div key={i} className="feat-card" style={{
                background:"white",
                border:"1.5px solid rgba(244,167,185,0.2)",
                borderRadius:20,
                padding:"24px 20px",
                boxShadow:"0 4px 16px rgba(90,122,150,0.08)",
                cursor:"default",
                position:"relative",
                overflow:"hidden"
              }}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,var(--pink-light),var(--denim-light))",opacity:0.6}} />
                <div style={{fontSize:32,marginBottom:12}}>{f.icon}</div>
                <p style={{fontWeight:600,fontSize:14,color:"#3D3450",marginBottom:6}}>{f.title}</p>
                <p style={{fontSize:12,color:"#9A8FA8",lineHeight:1.6}}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CTA STRIP ───────────────────────────────────────────────────────── */}
      <div className="denim-bg" style={{padding:"60px 20px",textAlign:"center",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",width:300,height:300,borderRadius:"50%",background:"rgba(244,167,185,0.2)",top:-100,right:-60,filter:"blur(50px)",pointerEvents:"none"}} />

        {/* Floating tape pieces */}
        <div style={{position:"absolute",top:16,left:"20%",width:50,height:16,background:"rgba(244,167,185,0.45)",borderRadius:2,transform:"rotate(-2deg)"}} />
        <div style={{position:"absolute",top:20,right:"22%",width:44,height:16,background:"rgba(168,196,216,0.45)",borderRadius:2,transform:"rotate(3deg)"}} />

        <div style={{position:"relative",zIndex:2}}>
          <h2 className="font-script" style={{color:"white",fontSize:"clamp(28px,5vw,44px)",marginBottom:10}}>
            Ready to make memories? 🌷
          </h2>
          <p style={{color:"rgba(255,255,255,0.65)",fontSize:14,marginBottom:28,letterSpacing:"0.05em"}}>
            Join and start capturing moments that last forever.
          </p>
          <button onClick={() => navigate("/register")} className="btn-primary cta-btn" style={{fontSize:16,padding:"15px 44px",background:"white",color:"#DB6A8A",boxShadow:"0 6px 24px rgba(0,0,0,0.12)"}}>
            Create your account →
          </button>
        </div>
      </div>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <div style={{background:"var(--cream-dark)",padding:"20px",textAlign:"center",borderTop:"1px solid rgba(244,167,185,0.2)"}}>
        <p style={{color:"#9A8FA8",fontSize:12}}>
          🌸 Lao Niangs Photo Booth &nbsp;·&nbsp; NUS Orbital Apollo 11 26' &nbsp;·&nbsp; Made with 💕
        </p>
      </div>
    </div>
  )
}
