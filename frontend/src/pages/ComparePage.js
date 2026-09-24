import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { API } from '../context/AuthContext';

const CRITERIA = ['Innovation & Originality','Technical Complexity','Feasibility & Scalability','Impact & Social Good','Functional MVP','Clarity & Documentation'];
const COLORS   = ['#6366f1','#06b6d4','#10b981','#f59e0b','#8b5cf6','#ec4899'];

export default function ComparePage() {
  const [evals, setEvals]     = useState([]);
  const [selId, setSelId]     = useState('');
  const [selEv, setSelEv]     = useState(null);
  const [scores, setScores]   = useState({});
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState('');

  useEffect(() => { API.get('/evaluations?limit=50').then(r=>setEvals(r.data||[])).catch(()=>{}); }, []);
  useEffect(() => {
    if (!selId) { setSelEv(null); return; }
    API.get('/evaluations/' + selId).then(r=>setSelEv(r.data)).catch(()=>{});
  }, [selId]);

  const submit = async () => {
    if (!selId) { toast.error('Select an evaluation first'); return; }
    const missing = CRITERIA.filter(c=>!scores[c]||isNaN(scores[c]));
    if (missing.length) { toast.error('Enter all 6 scores'); return; }
    setLoading(true);
    try {
      const { data } = await API.post('/human-score', { evaluation_id:selId, scores, comments });
      setResult(data); toast.success('Comparison complete!');
    } catch(err) { toast.error(err.response?.data?.error||'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{padding:28}}>
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:'1.8rem',fontWeight:700,background:'linear-gradient(135deg,#fff 40%,var(--violet))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Human Judge vs AI</h1>
        <p style={{color:'var(--t2)',fontSize:13,marginTop:4}}>Compare human scores with AI — AIF360 detects calibration gaps</p>
      </div>

      <div className="card" style={{marginBottom:16}}>
        <div className="section-title">Select Evaluation</div>
        <select className="input" value={selId} onChange={e=>setSelId(e.target.value)}>
          <option value="">— Choose an evaluation —</option>
          {evals.map(e=><option key={e._id} value={e._id}>{e.title} — {e.team} ({e.weighted_score}/10)</option>)}
        </select>
        {selEv && (
          <div style={{marginTop:12,background:'var(--surf2)',borderRadius:9,padding:'12px 14px',fontSize:12}}>
            <div style={{display:'flex',gap:16,flexWrap:'wrap',alignItems:'center'}}>
              <span style={{color:'var(--cyan)',fontWeight:700,fontSize:14}}>Project: {selEv.title}</span>
              <span style={{color:'var(--violet)'}}>Team: {selEv.team}</span>
              <span style={{color:'var(--t2)'}}>AI Score: <span style={{color:'var(--cyan)',fontWeight:700}}>{selEv.weighted_score}/10</span></span>
              <span style={{color:'var(--t3)'}}>Provider: {selEv.ai_provider||'groq'}</span>
            </div>
          </div>
        )}
      </div>

      {selEv && (
        <div className="card" style={{marginBottom:16}}>
          <div className="section-title">Your Human Scores (0-10)</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:14}}>
            {CRITERIA.map((c,i)=>(
              <div key={c}>
                <label className="label" style={{color:COLORS[i]}}>{c}</label>
                <input className="input" type="number" min="0" max="10" step="0.5" placeholder="0-10"
                  value={scores[c]||''} onChange={e=>setScores(s=>({...s,[c]:parseFloat(e.target.value)}))} />
              </div>
            ))}
          </div>
          <div style={{marginBottom:14}}>
            <label className="label">Comments (optional)</label>
            <textarea className="input" style={{minHeight:70,resize:'none'}} placeholder="Your observations..." value={comments} onChange={e=>setComments(e.target.value)} />
          </div>
          <button className="btn-primary" onClick={submit} disabled={loading}>{loading?'Analysing...':'Analyse Human vs AI'}</button>
        </div>
      )}

      {result && (
        <div style={{animation:'fadeIn .4s ease'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
            <div className="card">
              <div className="section-title" style={{color:'var(--cyan)'}}>AI Scores</div>
              {CRITERIA.map((c,i)=><div key={c} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid var(--bd)',fontSize:12}}><span style={{color:'var(--t2)'}}>{c}</span><span style={{color:COLORS[i],fontFamily:'Fira Code'}}>{selEv.adjusted_scores?.[c]||0}</span></div>)}
              <div style={{display:'flex',justifyContent:'space-between',padding:'10px 0 0',fontSize:13,fontWeight:700}}><span style={{color:'var(--t2)'}}>Weighted</span><span style={{color:'var(--cyan)'}}>{selEv.weighted_score}</span></div>
            </div>
            <div className="card">
              <div className="section-title" style={{color:'var(--violet)'}}>Human Scores</div>
              {CRITERIA.map((c,i)=><div key={c} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid var(--bd)',fontSize:12}}><span style={{color:'var(--t2)'}}>{c}</span><span style={{color:'#c084fc',fontFamily:'Fira Code'}}>{scores[c]||0}</span></div>)}
              <div style={{display:'flex',justifyContent:'space-between',padding:'10px 0 0',fontSize:13,fontWeight:700}}><span style={{color:'var(--t2)'}}>Weighted</span><span style={{color:'var(--violet)'}}>{result.human_weighted}</span></div>
            </div>
          </div>

          {result.comparison && (
            <div style={{background:'linear-gradient(135deg,rgba(139,92,246,.08),rgba(6,182,212,.05))',border:'1px solid rgba(139,92,246,.2)',borderRadius:12,padding:18}}>
              <div className="section-title" style={{color:'var(--violet)'}}>AIF360 Calibration Analysis</div>
              {result.comparison.overall_insight && <div style={{fontSize:12,color:'var(--t2)',marginBottom:14,padding:'10px 12px',background:'rgba(99,102,241,.06)',borderRadius:8,lineHeight:1.6}}>{result.comparison.overall_insight}</div>}
              {[...(result.comparison.lagging||[]).map(t=>({t,cls:'rose',badge:'LAGGING'})),
                ...(result.comparison.leading||[]).map(t=>({t,cls:'emerald',badge:'LEADING'})),
                ...(result.comparison.aligned||[]).map(t=>({t,cls:'cyan',badge:'ALIGNED'}))
              ].map((item,i)=>(
                <div key={i} style={{display:'flex',gap:10,marginBottom:8,alignItems:'flex-start'}}>
                  <span style={{fontSize:9,fontFamily:'Fira Code',fontWeight:600,padding:'2px 7px',borderRadius:3,flexShrink:0,
                    background:'rgba(99,102,241,.1)',color:'var(--violet)',border:'1px solid rgba(139,92,246,.3)'}}>{item.badge}</span>
                  <span style={{fontSize:12,color:'var(--t2)'}}>{item.t}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
