import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API } from '../context/AuthContext';

export default function LeaderboardPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [board, setBoard] = useState([]);
  const [hack, setHack]   = useState(null);

  useEffect(() => {
    API.get(`/hackathons/${id}`).then(r=>setHack(r.data)).catch(()=>{});
    API.get(`/hackathons/${id}/leaderboard`).then(r=>setBoard(r.data||[])).catch(()=>{});
  }, [id]);

  const medals = ['🥇','🥈','🥉'];

  return (
    <div style={{padding:28}}>
      <button className="btn-secondary" style={{marginBottom:20}} onClick={()=>nav(`/hackathons/${id}`)}>← Back</button>
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:'1.8rem',fontWeight:700,background:'linear-gradient(135deg,#fff 40%,var(--amber))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>🏆 Leaderboard</h1>
        {hack && <p style={{color:'var(--t2)',fontSize:13,marginTop:4}}>{hack.title}</p>}
      </div>
      {board.length === 0 ? (
        <div className="card" style={{textAlign:'center',padding:'48px 20px'}}>
          <div style={{fontSize:40,marginBottom:12}}>📊</div>
          <div style={{fontSize:14,color:'var(--t2)'}}>No evaluations yet. Run evaluations to populate the leaderboard.</div>
        </div>
      ) : (
        <div className="card">
          <div style={{display:'grid',gridTemplateColumns:'60px 1fr 120px 120px 120px',gap:10,padding:'8px 14px',borderBottom:'1px solid var(--bd)',marginBottom:8}}>
            {['Rank','Team/Project','AI Score','Human Score','Final'].map(h=><div key={h} style={{fontSize:10,color:'var(--t3)',fontFamily:'Fira Code',letterSpacing:1,textTransform:'uppercase'}}>{h}</div>)}
          </div>
          {board.map((b,i)=>(
            <div key={b._id} style={{display:'grid',gridTemplateColumns:'60px 1fr 120px 120px 120px',gap:10,padding:'12px 14px',borderBottom:'1px solid var(--bd)',alignItems:'center',background:i<3?'rgba(245,158,11,0.03)':'transparent'}}>
              <div style={{fontSize:i<3?'1.4rem':'1rem',fontWeight:700,color:'var(--amber)'}}>{medals[i]||`#${b.rank}`}</div>
              <div><div style={{fontSize:13,fontWeight:600,color:'#fff'}}>{b.team_id||'Team'}</div></div>
              <div style={{fontFamily:'Fira Code',fontSize:12,color:'var(--cyan)'}}>{b.ai_score}/10</div>
              <div style={{fontFamily:'Fira Code',fontSize:12,color:'var(--violet)'}}>{b.human_score?`${b.human_score}/10`:'—'}</div>
              <div style={{fontFamily:'Fira Code',fontSize:14,fontWeight:700,color:'var(--emerald)'}}>{b.final_score}/10</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
