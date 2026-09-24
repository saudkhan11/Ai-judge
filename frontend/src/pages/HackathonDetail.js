import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function HackathonDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [hack, setHack]   = useState(null);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    API.get(`/hackathons/${id}`).then(r=>setHack(r.data)).catch(()=>nav('/hackathons'));
    API.get(`/hackathons/${id}/teams`).then(r=>setTeams(r.data||[])).catch(()=>{});
  }, [id]);

  if (!hack) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'50vh'}}><div className="spinner"></div></div>;

  return (
    <div style={{padding:28}}>
      <button className="btn-secondary" style={{marginBottom:20}} onClick={()=>nav('/hackathons')}>← Back</button>
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:'1.8rem',fontWeight:700,background:'linear-gradient(135deg,#fff 40%,var(--amber))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>{hack.title}</h1>
        <p style={{color:'var(--t2)',fontSize:13,marginTop:4}}>{hack.description}</p>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
        {[['Status',hack.status],['Teams',hack.registered_teams||0],['Submissions',hack.total_submissions||0],['Domain',hack.domain]].map(([l,v])=>(
          <div key={l} className="card" style={{padding:16}}><div style={{fontSize:10,color:'var(--t2)',fontFamily:'Fira Code',marginBottom:6}}>{l}</div><div style={{fontSize:'1.2rem',fontWeight:700,color:'var(--amber)'}}>{v}</div></div>
        ))}
      </div>
      <div style={{display:'flex',gap:12,marginBottom:20}}>
        <button className="btn-primary" onClick={()=>nav(`/hackathons/${id}/leaderboard`)}>🏆 View Leaderboard</button>
        <button className="btn-secondary" onClick={()=>nav('/evaluate')}>⚡ Evaluate Submission</button>
      </div>
      <div className="card">
        <div className="section-title">Registered Teams ({teams.length})</div>
        {teams.length===0 ? <div style={{color:'var(--t3)',fontSize:13}}>No teams registered yet.</div> :
          teams.map(t=><div key={t._id} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid var(--bd)',fontSize:13}}><span style={{color:'#fff'}}>{t.name}</span><span style={{color:'var(--t2)'}}>{t.institution}</span></div>)}
      </div>
    </div>
  );
}
