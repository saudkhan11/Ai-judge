import React, { useState, useEffect } from 'react';
import { API } from '../context/AuthContext';

export default function HistoryPage() {
  const [evals, setEvals] = useState([]);
  const [sel, setSel]     = useState(null);
  const [page, setPage]   = useState(1);

  useEffect(() => {
    API.get(`/evaluations?page=${page}&limit=20`).then(r=>setEvals(e=>[...e,...(r.data||[])]) ).catch(()=>{});
  }, [page]);

  return (
    <div style={{padding:28}}>
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:'1.8rem',fontWeight:700,background:'linear-gradient(135deg,#fff 40%,var(--cyan))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Evaluation History</h1>
        <p style={{color:'var(--t2)',fontSize:13,marginTop:4}}>All evaluations stored in your database</p>
      </div>
      <div style={{display:'grid',gridTemplateColumns:sel?'1fr 1fr':'1fr',gap:16}}>
        <div>
          {evals.length===0 ? (
            <div className="card" style={{textAlign:'center',padding:'48px 20px',color:'var(--t3)'}}>No evaluations yet.</div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {evals.map(e=>(
                <div key={e._id} onClick={()=>setSel(e)} className="card" style={{padding:'14px 16px',cursor:'pointer',borderColor:sel?._id===e._id?'rgba(6,182,212,.4)':'var(--bd)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:'#fff'}}>{e.title}</div>
                      <div style={{fontSize:10,color:'var(--t3)',fontFamily:'Fira Code',marginTop:3}}>{e.team} · {new Date(e.created_at).toLocaleDateString()}</div>
                      <div style={{display:'flex',gap:6,marginTop:6,flexWrap:'wrap'}}>
                        <span style={{fontSize:9,color:'var(--t3)',fontFamily:'Fira Code'}}>{e.domain}</span>
                        {e.hitl_triggered&&<span style={{fontSize:9,color:'var(--rose)',fontFamily:'Fira Code'}}>🚨 HITL</span>}
                        {e.bias_report?.bias_applied&&<span style={{fontSize:9,color:'var(--amber)',fontFamily:'Fira Code'}}>⚖️ Bias</span>}
                      </div>
                    </div>
                    <div style={{fontSize:'1.4rem',fontWeight:700,background:'linear-gradient(135deg,var(--cyan),var(--indigo))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>{e.weighted_score}</div>
                  </div>
                </div>
              ))}
              <button className="btn-secondary" style={{marginTop:8}} onClick={()=>setPage(p=>p+1)}>Load More</button>
            </div>
          )}
        </div>
        {sel && (
          <div className="card" style={{height:'fit-content',position:'sticky',top:20}}>
            <div className="section-title">Details</div>
            <div style={{marginBottom:12}}>
              <div style={{fontSize:15,fontWeight:700,color:'#fff',marginBottom:3}}>{sel.title}</div>
              <div style={{fontSize:11,color:'var(--t3)',fontFamily:'Fira Code'}}>{sel.team}</div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:14}}>
              {Object.entries(sel.adjusted_scores||{}).map(([c,s],i)=>(
                <div key={c} style={{display:'flex',justifyContent:'space-between',fontSize:12}}>
                  <span style={{color:'var(--t2)'}}>{c}</span>
                  <span style={{fontFamily:'Fira Code',color:['#6366f1','#06b6d4','#10b981','#f59e0b','#8b5cf6','#ec4899'][i]}}>{s}</span>
                </div>
              ))}
            </div>
            <div style={{background:'var(--surf2)',borderRadius:8,padding:'10px 12px',fontFamily:'Fira Code',fontSize:11,color:'var(--cyan)',marginBottom:10}}>
              Weighted Score: {sel.weighted_score}/10
            </div>
            <button className="btn-secondary" style={{width:'100%'}} onClick={()=>setSel(null)}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}
