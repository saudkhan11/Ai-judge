import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { API } from '../context/AuthContext';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

const CRITERIA = [
  { key:'Innovation & Originality',   weight:'25%', color:'#6366f1' },
  { key:'Technical Complexity',       weight:'20%', color:'#06b6d4' },
  { key:'Feasibility & Scalability',  weight:'20%', color:'#10b981' },
  { key:'Impact & Social Good',       weight:'15%', color:'#f59e0b' },
  { key:'Functional MVP',             weight:'10%', color:'#8b5cf6' },
  { key:'Clarity & Documentation',    weight:'10%', color:'#ec4899' },
];

const STEPS = [
  { id:'s1', badge:'OCR',    label:'Extracting text from uploaded files'      },
  { id:'s2', badge:'PRE',    label:'Binarization & deskewing pre-processing'  },
  { id:'s3', badge:'BERT',   label:'Tokenization & semantic embedding'        },
  { id:'s4', badge:'NLP',    label:'Keyword boost & penalty detection'        },
  { id:'s5', badge:'RF',     label:'Random Forest scoring all criteria'       },
  { id:'s6', badge:'WEIGHT', label:'Applying weighted average formula'        },
  { id:'s7', badge:'AIF360', label:'Bias detection & fairness correction'     },
  { id:'s8', badge:'HITL',   label:'Human-in-Loop threshold check'            },
];

export default function EvaluatePage() {
  const [form, setForm]   = useState({ team_name:'', project_title:'', description:'', tech_stack:'', github_link:'', domain:'general' });
  const [file, setFile]   = useState(null);
  const [step, setStep]   = useState(-1);
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);

  const onDrop = useCallback(files => { if (files[0]) setFile(files[0]); }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, maxFiles:1, maxSize:50*1024*1024 });
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));

  const submit = async e => {
    e.preventDefault();
    if (!form.team_name || !form.project_title || !form.description) { toast.error('Team name, title and description required'); return; }
    setLoading(true); setResult(null); setStep(0);
    const iv = setInterval(() => setStep(s => s < STEPS.length-1 ? s+1 : s), 1800);
    try {
      const { data } = await API.post('/evaluate', form, {
  headers:{'Content-Type':'application/json'}
});
      clearInterval(iv); setStep(STEPS.length);
      setTimeout(() => { setResult(data); setLoading(false); }, 500);
      toast.success('Evaluation complete!');
    } catch (err) {
      clearInterval(iv); setLoading(false); setStep(-1);
      toast.error(err.response?.data?.error || 'Evaluation failed. Is the backend running?');
    }
  };

  const radarData = result ? CRITERIA.map(c => ({ subject: c.key.split(' ')[0], score: result.adjusted_scores?.[c.key]||0 })) : [];
  const barData   = result ? CRITERIA.map(c => ({ name: c.key.split(' ')[0], score: result.adjusted_scores?.[c.key]||0, fill: c.color })) : [];

  return (
    <div style={{padding:28,maxWidth:900,margin:'0 auto'}}>
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:'1.8rem',fontWeight:700,background:'linear-gradient(135deg,#fff 40%,var(--cyan))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>AI Judge — A Second Brain for Human Evaluation</h1>
        <p style={{color:'var(--t2)',fontSize:13,marginTop:4}}>BERT · Random Forest · AIF360 · Groq+Gemini Dual API</p>
      </div>

      {/* Pipeline strip */}
      <div style={{display:'flex',background:'var(--surf)',border:'1px solid var(--bd)',borderRadius:12,overflow:'hidden',marginBottom:20}}>
        {['Ingest','Pre-process','BERT','Random Forest','Weighted','AIF360','HITL','Output'].map((s,i)=>(
          <div key={i} style={{flex:1,textAlign:'center',padding:'8px 4px',borderRight:i<7?'1px solid var(--bd)':'none',background:i===0?'rgba(0,212,255,0.07)':'transparent'}}>
            <div style={{fontSize:9,fontFamily:'Fira Code',color:'var(--t3)'}}>{s}</div>
          </div>
        ))}
      </div>

      {!result && !loading && (
        <form onSubmit={submit}>
          <div className="card glow" style={{marginBottom:16}}>
            <div className="section-title">Project Submission</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label className="label">Team Name *</label><input className="input" value={form.team_name} onChange={set('team_name')} placeholder="e.g. Neural Ninjas" /></div>
              <div><label className="label">Project Title *</label><input className="input" value={form.project_title} onChange={set('project_title')} placeholder="e.g. MediScan AI" /></div>
              <div style={{gridColumn:'1/-1'}}><label className="label">Description * (more detail = better evaluation)</label><textarea className="input" style={{minHeight:110,resize:'none',lineHeight:1.6}} value={form.description} onChange={set('description')} placeholder="Problem, solution, technology, users, impact, results..." /></div>
              <div><label className="label">GitHub / Demo Link</label><input className="input" value={form.github_link} onChange={set('github_link')} placeholder="https://github.com/..." /></div>
              <div><label className="label">Tech Stack</label><input className="input" value={form.tech_stack} onChange={set('tech_stack')} placeholder="React, Python, BERT, TensorFlow..." /></div>
              <div style={{gridColumn:'1/-1'}}><label className="label">Domain</label>
                <select className="input" style={{cursor:'pointer'}} value={form.domain} onChange={set('domain')}>
                  {['general','healthcare','fintech','edtech','sustainability','social good','cybersecurity'].map(d=><option key={d} value={d}>{d.charAt(0).toUpperCase()+d.slice(1)}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="card" style={{marginBottom:16}}>
            <div className="section-title">Upload Project Files</div>
            <p style={{fontSize:11,color:'var(--t2)',marginBottom:12}}>OCR extracts text from PDF/PPT/DOCX · Speech-to-Text transcribes MP4/MP3</p>
            <div {...getRootProps()} style={{border:`2px dashed ${isDragActive?'var(--cyan)':'var(--bd2)'}`,borderRadius:12,padding:28,textAlign:'center',cursor:'pointer',transition:'all .2s',background:isDragActive?'rgba(6,182,212,.04)':'transparent'}}>
              <input {...getInputProps()} />
              <div style={{fontSize:32,marginBottom:10}}>📁</div>
              <p style={{color:'#fff',fontWeight:600,marginBottom:4}}>Drop files here or click to browse</p>
              <p style={{color:'var(--t3)',fontSize:12}}>PDF · PPT · DOCX (OCR) &nbsp;|&nbsp; MP4 · MP3 (Speech-to-Text) · Max 50MB</p>
            </div>
            {file && (
              <div style={{marginTop:12,display:'flex',alignItems:'center',gap:10,background:'var(--surf2)',borderRadius:9,padding:'10px 14px'}}>
                <span style={{fontSize:20}}>📄</span>
                <div><div style={{fontSize:12,fontWeight:600,color:'#fff'}}>{file.name}</div><div style={{fontSize:10,color:'var(--t3)',fontFamily:'Fira Code'}}>{(file.size/1024).toFixed(1)} KB</div></div>
                <button type="button" onClick={()=>setFile(null)} style={{marginLeft:'auto',background:'none',border:'none',color:'var(--t3)',cursor:'pointer',fontSize:16}}>✕</button>
              </div>
            )}
          </div>

          <button className="btn-primary" type="submit" style={{width:'100%',padding:14,fontSize:13}}>⚡ RUN ALGORITHM PIPELINE</button>
        </form>
      )}

      {loading && (
        <div className="card" style={{textAlign:'center',padding:'48px 20px'}}>
          <div className="spinner" style={{margin:'0 auto 18px'}}></div>
          <h3 style={{color:'#fff',fontWeight:700,marginBottom:22}}>Running Algorithm Pipeline…</h3>
          <div style={{display:'flex',flexDirection:'column',gap:8,maxWidth:380,margin:'0 auto',textAlign:'left'}}>
            {STEPS.map((s,i) => (
              <div key={s.id} style={{display:'flex',alignItems:'center',gap:10,fontFamily:'Fira Code',fontSize:11,
                opacity: i<=step?1:0, color:i<step?'var(--emerald)':i===step?'var(--cyan)':'var(--t3)',transition:'all .4s'}}>
                <span style={{padding:'1px 6px',borderRadius:3,border:'1px solid',fontSize:9,fontWeight:600,
                  borderColor:i<step?'rgba(16,185,129,.3)':i===step?'rgba(6,182,212,.3)':'var(--bd)',
                  background:i<step?'rgba(16,185,129,.1)':i===step?'rgba(6,182,212,.1)':'transparent',
                  color:i<step?'var(--emerald)':i===step?'var(--cyan)':'var(--t3)'}}>{s.badge}</span>
                {s.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {result && (
        <div style={{animation:'fadeIn .5s ease'}}>
          {/* Hero */}
          <div style={{background:'linear-gradient(135deg,var(--surf),rgba(99,102,241,.09))',border:'1px solid rgba(99,102,241,.2)',borderRadius:16,padding:24,display:'grid',gridTemplateColumns:'1fr auto',gap:16,alignItems:'center',marginBottom:16}}>
            <div>
              <div style={{fontFamily:'Fira Code',fontSize:9,color:'var(--cyan)',letterSpacing:2,textTransform:'uppercase',marginBottom:4}}>{form.team_name}</div>
              <h2 style={{fontSize:'1.4rem',fontWeight:700,color:'#fff',marginBottom:12}}>{form.project_title}</h2>
              <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
                <span className="badge badge-violet">⬡ {result.originality}% Original</span>
                <span className={`badge badge-${result.risk_level==='Low'?'emerald':result.risk_level==='High'?'rose':'amber'}`}>◎ {result.risk_level} Risk</span>
                <span className="badge badge-cyan">▲ {result.deployment_readiness}</span>
                <span style={{fontSize:9,fontFamily:'Fira Code',padding:'4px 10px',borderRadius:100,border:'1px solid var(--bd)',color:'var(--t2)'}}>🤖 {result.models_used}</span>
                {result.hitl?.triggered && <span className="badge badge-rose" style={{animation:'blink 1.5s infinite'}}>🚨 HITL</span>}
                {result.bias?.bias_applied && <span className="badge badge-amber">⚖️ Bias Corrected</span>}
              </div>
            </div>
            <div style={{background:'var(--surf2)',border:'1px solid var(--bd)',borderRadius:12,padding:'14px 22px',textAlign:'center',minWidth:120}}>
              <div style={{fontFamily:'Fira Code',fontSize:9,letterSpacing:2,textTransform:'uppercase',color:'var(--t3)',marginBottom:4}}>Weighted Score</div>
              <div style={{fontSize:'3rem',fontWeight:700,lineHeight:1,background:'linear-gradient(135deg,var(--cyan),var(--indigo))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>{result.weighted_score}</div>
              <div style={{fontFamily:'Fira Code',fontSize:10,color:'var(--t3)',marginTop:2}}>/ 10</div>
            </div>
          </div>

          
          <div style={{background:'rgba(6,182,212,.05)',border:'1px solid rgba(6,182,212,.15)',borderRadius:10,padding:'10px 14px',marginBottom:14,fontFamily:'Fira Code',fontSize:11,color:'var(--cyan)',overflowX:'auto',whiteSpace:'nowrap'}}>
            Final = {CRITERIA.map(c=>`(${result.adjusted_scores?.[c.key]||0}×${c.weight})`).join(' + ')} = {result.weighted_score}
          </div>

          {/* Score grid */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16}}>
            {CRITERIA.map(c=>{
              const s = result.adjusted_scores?.[c.key]||0;
              return (
                <div key={c.key} className="card" style={{padding:14}}>
                  <div style={{fontSize:9,color:'var(--t2)',fontFamily:'Fira Code',letterSpacing:1,textTransform:'uppercase',marginBottom:3}}>{c.key}</div>
                  <div style={{fontSize:9,color:'var(--t3)',fontFamily:'Fira Code',marginBottom:7}}>Weight: {c.weight}</div>
                  <div style={{fontSize:'1.6rem',fontWeight:700,color:c.color,marginBottom:7}}>{s}<span style={{fontSize:'0.9rem',opacity:.35}}>/10</span></div>
                  <div style={{height:3,background:'var(--bd)',borderRadius:2,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${s*10}%`,background:c.color,borderRadius:2,transition:'width 1s'}}></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Charts */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
            <div className="card" style={{padding:18}}>
              <div className="section-title">Radar</div>
              <ResponsiveContainer width="100%" height={180}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(148,163,184,0.15)" />
                  <PolarAngleAxis dataKey="subject" tick={{fontSize:10,fill:'var(--t2)'}} />
                  <Radar dataKey="score" stroke="var(--cyan)" fill="var(--cyan)" fillOpacity={0.15} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="card" style={{padding:18}}>
              <div className="section-title">Breakdown</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={barData}>
                  <XAxis dataKey="name" tick={{fontSize:9,fill:'var(--t2)'}} />
                  <YAxis domain={[0,10]} tick={{fontSize:9,fill:'var(--t2)'}} />
                  <Tooltip contentStyle={{background:'var(--surf)',border:'1px solid var(--bd)',color:'var(--t1)',fontSize:11}} />
                  <Bar dataKey="score" radius={[4,4,0,0]} fill="var(--cyan)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Strengths / Weaknesses */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
            <div className="card">
              <div className="section-title" style={{color:'var(--emerald)'}}>Strengths</div>
              <ul style={{listStyle:'none',display:'flex',flexDirection:'column',gap:8}}>
                {(result.strengths||[]).map((s,i)=><li key={i} style={{fontSize:12,color:'#94a3b8',paddingLeft:14,position:'relative'}}><span style={{position:'absolute',left:0,color:'var(--t3)'}}>—</span>{s}</li>)}
              </ul>
            </div>
            <div className="card">
              <div className="section-title" style={{color:'var(--rose)'}}>Weaknesses</div>
              <ul style={{listStyle:'none',display:'flex',flexDirection:'column',gap:8}}>
                {(result.weaknesses||[]).map((w,i)=><li key={i} style={{fontSize:12,color:'#94a3b8',paddingLeft:14,position:'relative'}}><span style={{position:'absolute',left:0,color:'var(--t3)'}}>—</span>{w}</li>)}
              </ul>
            </div>
          </div>

          {/* Recommendations */}
          <div className="card" style={{marginBottom:14}}>
            <div className="section-title">Technical Recommendations</div>
            <ul style={{listStyle:'none',display:'flex',flexDirection:'column',gap:8}}>
              {(result.technical_recommendations||[]).map((r,i)=><li key={i} style={{fontSize:12,color:'#94a3b8',paddingLeft:14,position:'relative'}}><span style={{position:'absolute',left:0,color:'var(--t3)'}}>—</span>{r}</li>)}
            </ul>
          </div>

          {/* Bias Report */}
          <div style={{background:'rgba(245,158,11,.05)',border:'1px solid rgba(245,158,11,.2)',borderRadius:12,padding:18,marginBottom:14}}>
            <div className="section-title" style={{color:'var(--amber)'}}>AIF360 Fairness Report</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {(result.bias?.bias_items||[]).map((b,i)=>(
                <div key={i} style={{display:'flex',gap:10,alignItems:'flex-start'}}>
                  <span style={{fontSize:9,fontFamily:'Fira Code',fontWeight:600,padding:'2px 7px',borderRadius:3,flexShrink:0,
                    background:b.type==='ok'?'rgba(16,185,129,.1)':'rgba(245,158,11,.1)',
                    color:b.type==='ok'?'var(--emerald)':'var(--amber)',
                    border:`1px solid ${b.type==='ok'?'rgba(16,185,129,.3)':'rgba(245,158,11,.3)'}`}}>{b.label}</span>
                  <span style={{fontSize:12,color:'var(--t2)'}}>{b.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* HITL */}
          {result.hitl?.triggered && (
            <div style={{background:'rgba(244,63,94,.08)',border:'2px solid rgba(244,63,94,.35)',borderRadius:12,padding:16,marginBottom:14,display:'flex',gap:12}}>
              <span style={{fontSize:22}}>🚨</span>
              <div>
                <div style={{color:'var(--rose)',fontWeight:700,marginBottom:4}}>Human-in-Loop Triggered</div>
                <div style={{fontSize:12,color:'var(--t2)'}}>{result.hitl.reason}</div>
              </div>
            </div>
          )}

          {/* NLP */}
          <div style={{background:'rgba(139,92,246,.05)',border:'1px solid rgba(139,92,246,.2)',borderRadius:12,padding:18,marginBottom:18}}>
            <div className="section-title" style={{color:'var(--violet)'}}>BERT NLP Analysis</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:12}}>
              {[['Words',result.nlp_analysis?.word_count,'var(--cyan)'],['Sentences',result.nlp_analysis?.sentence_count,'var(--cyan)'],['Depth',`${result.nlp_analysis?.depth_score}/10`,'var(--emerald)'],['Vagueness',`${result.nlp_analysis?.vagueness_score}/10`,result.nlp_analysis?.vagueness_score>5?'var(--rose)':'var(--emerald)']].map(([l,v,c])=>(
                <div key={l} style={{background:'var(--surf)',borderRadius:9,padding:'10px 12px'}}>
                  <div style={{fontSize:9,color:'var(--t3)',fontFamily:'Fira Code',marginBottom:4}}>{l}</div>
                  <div style={{fontSize:'1.1rem',fontWeight:700,color:c}}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
              {(result.nlp_analysis?.tokens||[]).map((t,i)=><span key={i} style={{fontSize:9,fontFamily:'Fira Code',padding:'2px 7px',background:'rgba(139,92,246,.1)',border:'1px solid rgba(139,92,246,.25)',color:'#c084fc',borderRadius:4}}>{t}</span>)}
            </div>
          </div>

        <div style={{display:'flex',gap:12,marginBottom:8}}>
  <button className="btn-secondary" style={{flex:1,padding:12}} onClick={()=>{setResult(null);setStep(-1);}}>↩ Submit Another Project</button>
  <button className="btn-primary" style={{flex:1,padding:12}} onClick={()=>{
    const title = document.title;
    document.title = `AI Judge — ${form.project_title} — ${form.team_name}`;
    window.print();
    document.title = title;
  }}>⬇ Export PDF</button>
</div>
        </div>
      )}
    </div>
  );
}
