import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to:'/',           icon:'⚡', label:'Dashboard'   },
  { to:'/evaluate',   icon:'🧠', label:'Evaluate'    },
  { to:'/hackathons', icon:'🏆', label:'Hackathons'  },
  { to:'/compare',    icon:'⚖️', label:'Human vs AI' },
  { to:'/history',    icon:'📋', label:'History'     },
  { to:'/assistant',  icon:'💬', label:'Assistant'   },
];

export default function Layout() {
  const { user, logout } = useAuth();
  return (
    <div style={{display:'flex',minHeight:'100vh'}}>
      {/* SIDEBAR */}
      <aside style={{width:220,background:'var(--bg2)',borderRight:'1px solid var(--bd)',display:'flex',flexDirection:'column',padding:'20px 0',position:'sticky',top:0,height:'100vh',flexShrink:0}}>
        {/* Brand */}
        <div style={{padding:'0 18px 18px',borderBottom:'1px solid var(--bd)',marginBottom:16}}>
          <div style={{fontSize:15,fontWeight:700,background:'linear-gradient(135deg,#fff,var(--cyan))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>AI Judge</div>
          <div style={{fontSize:9,color:'var(--t3)',fontFamily:'Fira Code',letterSpacing:1,marginTop:2}}>EVALUATION PLATFORM</div>
          <div style={{marginTop:10,display:'flex',flexWrap:'wrap',gap:4}}>
            <span style={{fontSize:9,background:'rgba(16,185,129,0.1)',border:'1px solid rgba(16,185,129,0.25)',color:'var(--emerald)',padding:'2px 6px',borderRadius:4,fontFamily:'Fira Code'}}>Groq</span>
            <span style={{fontSize:9,background:'rgba(59,130,246,0.1)',border:'1px solid rgba(59,130,246,0.25)',color:'var(--blue)',padding:'2px 6px',borderRadius:4,fontFamily:'Fira Code'}}>Gemini</span>
            <span style={{fontSize:9,background:'rgba(6,182,212,0.08)',border:'1px solid rgba(6,182,212,0.2)',color:'var(--cyan)',padding:'2px 6px',borderRadius:4,fontFamily:'Fira Code'}}>BERT</span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{padding:'0 10px',flex:1}}>
          <div style={{fontSize:9,color:'var(--t3)',letterSpacing:2,textTransform:'uppercase',fontFamily:'Fira Code',padding:'0 8px',marginBottom:6}}>Menu</div>
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to} end={n.to==='/'} style={({isActive})=>({
              display:'flex',alignItems:'center',gap:9,
              padding:'9px 12px',borderRadius:8,marginBottom:2,
              fontSize:13,fontWeight:500,textDecoration:'none',
              transition:'all .15s',
              background: isActive ? 'linear-gradient(135deg,rgba(99,102,241,.18),rgba(6,182,212,.1))' : 'transparent',
              color: isActive ? '#fff' : 'var(--t2)',
              border: isActive ? '1px solid rgba(99,102,241,.25)' : '1px solid transparent',
            })}>
              <span style={{fontSize:14,width:18,textAlign:'center'}}>{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div style={{padding:'14px 18px 0',borderTop:'1px solid var(--bd)'}}>
          <div style={{display:'flex',alignItems:'center',gap:9}}>
            <div style={{width:30,height:30,borderRadius:8,background:'linear-gradient(135deg,var(--indigo),var(--cyan))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,flexShrink:0}}>
              {user?.name?.[0]?.toUpperCase()||'U'}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,fontWeight:600,color:'var(--t1)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user?.name}</div>
              <div style={{fontSize:9,color:'var(--t3)',fontFamily:'Fira Code'}}>{user?.role}</div>
            </div>
            <button onClick={logout} title="Logout" style={{background:'none',border:'none',color:'var(--t3)',cursor:'pointer',fontSize:15,transition:'color .2s'}}
              onMouseOver={e=>e.target.style.color='var(--rose)'}
              onMouseOut={e=>e.target.style.color='var(--t3)'}>↩</button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{flex:1,overflowY:'auto',minHeight:'100vh'}}>
        <Outlet />
      </main>
    </div>
  );
}
