import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

function NeuralCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animId;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const NODES = 60;
    const nodes = Array.from({length: NODES}, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      r: Math.random() * 3 + 1.5,
      pulse: Math.random() * Math.PI * 2,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const t = Date.now() / 1000;

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 160) {
            const alpha = (1 - dist/160) * 0.35;
            const grad = ctx.createLinearGradient(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y);
            grad.addColorStop(0, `rgba(99,102,241,${alpha})`);
            grad.addColorStop(0.5, `rgba(6,182,212,${alpha * 1.5})`);
            grad.addColorStop(1, `rgba(139,92,246,${alpha})`);
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = grad;
            ctx.lineWidth = (1 - dist/160) * 1.2;
            ctx.stroke();

            if (dist < 100 && Math.sin(t * 2 + i + j) > 0.7) {
              const progress = (Math.sin(t * 3 + i * 0.5) + 1) / 2;
              const px = nodes[i].x + (nodes[j].x - nodes[i].x) * progress;
              const py = nodes[i].y + (nodes[j].y - nodes[i].y) * progress;
              ctx.beginPath();
              ctx.arc(px, py, 2, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(6,182,212,0.9)`;
              ctx.fill();
            }
          }
        }
      }

      nodes.forEach((n, i) => {
        n.pulse += 0.03;
        const glow = (Math.sin(n.pulse) + 1) / 2;
        const radius = n.r + glow * 1.5;
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, radius * 4);
        const isSpecial = i % 7 === 0;
        if (isSpecial) {
          grad.addColorStop(0, `rgba(6,182,212,${0.6 + glow * 0.4})`);
          grad.addColorStop(1, 'rgba(6,182,212,0)');
        } else {
          grad.addColorStop(0, `rgba(99,102,241,${0.4 + glow * 0.3})`);
          grad.addColorStop(1, 'rgba(99,102,241,0)');
        }
        ctx.beginPath();
        ctx.arc(n.x, n.y, radius * 4, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = isSpecial
          ? `rgba(6,182,212,${0.8 + glow * 0.2})`
          : `rgba(139,92,246,${0.7 + glow * 0.3})`;
        ctx.fill();

        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > canvas.width)  n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
      });

      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={canvasRef} style={{position:'fixed',top:0,left:0,width:'100%',height:'100%',zIndex:0,pointerEvents:'none'}} />;
}

export default function LoginPage() {
  const { login, register } = useAuth();
  const nav = useNavigate();
  const [tab, setTab]   = useState('signin');
  const [role, setRole] = useState('organizer');
  const [form, setForm] = useState({ name:'', email:'', password:'', organization:'' });
  const [loading, setLoading] = useState(false);

  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));

  const handleLogin = async e => {
    e.preventDefault();
    if (!form.email || !form.password) { toast.error('Email and password required'); return; }
    setLoading(true);
    try { await login(form.email, form.password); nav('/'); }
    catch (err) { toast.error(err.response?.data?.error || 'Login failed'); }
    finally { setLoading(false); }
  };

  const handleRegister = async e => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { toast.error('All fields required'); return; }
    if (form.password.length < 8) { toast.error('Password min 8 chars'); return; }
    setLoading(true);
    try { await register({...form, role}); nav('/'); toast.success('Account created!'); }
    catch (err) { toast.error(err.response?.data?.error || 'Registration failed'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{position:'relative',display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',padding:20}}>
      <NeuralCanvas />

      <div style={{position:'fixed',top:'10%',left:'15%',width:400,height:400,background:'radial-gradient(circle,rgba(99,102,241,0.12) 0%,transparent 70%)',borderRadius:'50%',pointerEvents:'none',zIndex:0}} />
      <div style={{position:'fixed',bottom:'15%',right:'10%',width:350,height:350,background:'radial-gradient(circle,rgba(6,182,212,0.10) 0%,transparent 70%)',borderRadius:'50%',pointerEvents:'none',zIndex:0}} />
      <div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:600,height:600,background:'radial-gradient(circle,rgba(139,92,246,0.06) 0%,transparent 70%)',borderRadius:'50%',pointerEvents:'none',zIndex:0}} />

      <div style={{width:'100%',maxWidth:420,animation:'slideUp .6s cubic-bezier(.22,1,.36,1) both',position:'relative',zIndex:1}}>
        <div style={{textAlign:'center',marginBottom:32}}>
          <div style={{width:72,height:72,background:'linear-gradient(135deg,var(--indigo),var(--cyan))',borderRadius:20,display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:32,marginBottom:14,boxShadow:'0 0 60px rgba(99,102,241,.5), 0 0 120px rgba(6,182,212,.2)'}}>⚖️</div>
          <h1 style={{fontSize:'2rem',fontWeight:700,background:'linear-gradient(135deg,#fff 30%,var(--cyan))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>AI Judge</h1>
          <p style={{fontSize:12,color:'var(--t2)',marginTop:5}}>A Second Brain for Human Evaluation</p>
          <div style={{display:'flex',justifyContent:'center',gap:6,marginTop:10,flexWrap:'wrap'}}>
            {['BERT','Random Forest','AIF360','Groq+Gemini'].map(t=>(
              <span key={t} style={{fontSize:9,background:'rgba(6,182,212,.08)',border:'1px solid rgba(6,182,212,.2)',color:'var(--cyan)',padding:'2px 8px',borderRadius:100,fontFamily:'Fira Code',letterSpacing:1}}>{t}</span>
            ))}
          </div>
        </div>

        <div className="card" style={{backdropFilter:'blur(20px)',background:'rgba(15,15,30,0.85)',border:'1px solid rgba(99,102,241,0.25)',boxShadow:'0 0 80px rgba(99,102,241,0.15), 0 25px 50px rgba(0,0,0,0.5)'}}>
          <div style={{display:'flex',gap:3,background:'var(--surf2)',borderRadius:10,padding:3,marginBottom:22}}>
            {['signin','signup'].map(t=>(
              <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:'8px',textAlign:'center',fontSize:12,fontWeight:500,borderRadius:8,border:'none',cursor:'pointer',transition:'all .2s',background:tab===t?'var(--surf3)':'transparent',color:tab===t?'#fff':'var(--t2)'}}>
                {t==='signin'?'Sign In':'Sign Up'}
              </button>
            ))}
          </div>

          {tab === 'signin' ? (
            <form onSubmit={handleLogin}>
              <div style={{marginBottom:14}}>
                <label className="label">Email</label>
                <input className="input" type="email" placeholder="you@org.com" value={form.email} onChange={set('email')} />
              </div>
              <div style={{marginBottom:20}}>
                <label className="label">Password</label>
                <input className="input" type="password" placeholder="••••••••" value={form.password} onChange={set('password')} />
              </div>
              <button className="btn-primary" type="submit" style={{width:'100%'}} disabled={loading}>
                {loading ? 'Signing in...' : 'ACCESS PLATFORM →'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <div style={{marginBottom:14}}>
                <label className="label">Full Name</label>
                <input className="input" placeholder="Your name" value={form.name} onChange={set('name')} />
              </div>
              <div style={{marginBottom:14}}>
                <label className="label">Email</label>
                <input className="input" type="email" placeholder="you@org.com" value={form.email} onChange={set('email')} />
              </div>
              <div style={{marginBottom:14}}>
                <label className="label">Organization</label>
                <input className="input" placeholder="University / Company" value={form.organization} onChange={set('organization')} />
              </div>
              <div style={{marginBottom:14}}>
                <label className="label">Role</label>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                  {[['organizer','🏆','Organizer'],['judge','⚖️','Judge'],['participant','🚀','Participant']].map(([r,icon,label])=>(
                    <div key={r} onClick={()=>setRole(r)} style={{border:`1px solid ${role===r?'var(--cyan)':'var(--bd)'}`,borderRadius:10,padding:'10px 6px',textAlign:'center',cursor:'pointer',transition:'all .2s',background:role===r?'rgba(6,182,212,.07)':'var(--surf2)'}}>
                      <div style={{fontSize:18,marginBottom:4}}>{icon}</div>
                      <div style={{fontSize:10,color:role===r?'var(--cyan)':'var(--t2)',fontWeight:500}}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{marginBottom:20}}>
                <label className="label">Password</label>
                <input className="input" type="password" placeholder="Min 8 characters" value={form.password} onChange={set('password')} />
              </div>
              <button className="btn-primary" type="submit" style={{width:'100%'}} disabled={loading}>
                {loading ? 'Creating...' : 'CREATE ACCOUNT →'}
              </button>
            </form>
          )}
        </div>

        <p style={{textAlign:'center',marginTop:16,fontSize:11,color:'var(--t3)',position:'relative',zIndex:1}}>
          Powered by Advanced NLP Evaluation Engine
        </p>
      </div>
    </div>
  );
}