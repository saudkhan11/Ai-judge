import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../context/AuthContext';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [recent, setRecent]       = useState([]);
  const [health, setHealth]       = useState(null);

  useEffect(() => {
    API.get('/analytics').then(r => setAnalytics(r.data)).catch(()=>{});
    API.get('/evaluations?limit=5').then(r => setRecent(r.data || [])).catch(()=>{});
    API.get('/health').then(r => setHealth(r.data)).catch(()=>{});
  }, []);

  const stats = [
    { label:'Total Evaluations', value: analytics?.total || 0,      color:'var(--cyan)'    },
    { label:'Average Score',     value: analytics?.avg_score?.toFixed(1) || '—', color:'var(--emerald)' },
    { label:'HITL Flags',        value: analytics?.hitl_count || 0,  color:'var(--rose)'   },
    { label:'Bias Corrections',  value: analytics?.bias_count || 0,  color:'var(--amber)'  },
  ];

  return (
    <div style={{padding:28,animation:'fadeIn .3s ease'}}>
      <div style={{marginBottom:28}}>
        <h1 style={{fontSize:'1.8rem',fontWeight:700,background:'linear-gradient(135deg,#fff 40%,var(--cyan))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
          Welcome back, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p style={{color:'var(--t2)',fontSize:13,marginTop:4}}>AI Judge Platform — BERT · Random Forest · AIF360 · Groq + Gemini</p>
      </div>

      {/* AI Status */}
      {health && (
        <div style={{background:'var(--surf)',border:'1px solid var(--bd)',borderRadius:12,padding:'12px 18px',marginBottom:22,display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
          <span style={{fontSize:12,color:'var(--t2)'}}>AI Status:</span>
          {health.ai_status?.groq_available && <span className="badge badge-emerald">✓ Groq Active</span>}
          {health.ai_status?.gemini_available && <span className="badge badge-cyan">✓ Gemini Backup</span>}
          <span style={{fontSize:11,color:'var(--t3)',fontFamily:'Fira Code',marginLeft:'auto'}}>
            Provider: {health.ai_status?.current_provider || '—'} | Calls: {health.ai_status?.call_counts?.groq || 0}
          </span>
        </div>
      )}

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:24}}>
        {stats.map(s => (
          <div key={s.label} className="card" style={{padding:18}}>
            <div style={{fontSize:11,color:'var(--t2)',fontFamily:'Fira Code',letterSpacing:1,marginBottom:8}}>{s.label}</div>
            <div style={{fontSize:'2rem',fontWeight:700,color:s.color}}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:24}}>
        {[
          { icon:'⚡', title:'New Evaluation', desc:'Submit a project for AI scoring', action:()=>nav('/evaluate'), color:'var(--cyan)' },
          { icon:'🏆', title:'Create Hackathon', desc:'Set up a new competition', action:()=>nav('/hackathons'), color:'var(--amber)' },
          { icon:'💬', title:'AI Assistant', desc:'Ask about scores and criteria', action:()=>nav('/assistant'), color:'var(--violet)' },
        ].map(a => (
          <div key={a.title} className="card" onClick={a.action}
            style={{cursor:'pointer',transition:'border-color .2s'}}
            onMouseOver={e=>e.currentTarget.style.borderColor='rgba(6,182,212,.3)'}
            onMouseOut={e=>e.currentTarget.style.borderColor='var(--bd)'}>
            <div style={{fontSize:28,marginBottom:10}}>{a.icon}</div>
            <div style={{fontSize:14,fontWeight:600,color:'#fff',marginBottom:4}}>{a.title}</div>
            <div style={{fontSize:12,color:'var(--t2)'}}>{a.desc}</div>
          </div>
        ))}
      </div>

      {/* Recent Evaluations */}
      <div className="card">
        <div className="section-title">Recent Evaluations</div>
        {recent.length === 0 ? (
          <div style={{textAlign:'center',padding:'32px 0',color:'var(--t3)',fontSize:13}}>
            No evaluations yet. <span style={{color:'var(--cyan)',cursor:'pointer'}} onClick={()=>nav('/evaluate')}>Run your first →</span>
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {recent.map(e => (
              <div key={e._id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px',background:'var(--surf2)',borderRadius:10,cursor:'pointer'}}
                onClick={()=>nav('/history')}>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:'#fff'}}>{e.title}</div>
                  <div style={{fontSize:10,color:'var(--t3)',fontFamily:'Fira Code',marginTop:2}}>{e.team} · {new Date(e.created_at).toLocaleDateString()}</div>
                </div>
                <div style={{fontSize:'1.3rem',fontWeight:700,background:'linear-gradient(135deg,var(--cyan),var(--indigo))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
                  {e.weighted_score}/10
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
