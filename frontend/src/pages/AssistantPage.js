import React, { useState, useRef, useEffect } from 'react';
import { API } from '../context/AuthContext';
import toast from 'react-hot-toast';

const SUGS = ['How does BERT tokenization work?','What is Random Forest scoring?','How does AIF360 detect bias?','What triggers Human-in-Loop?','How to improve my score?'];

export default function AssistantPage() {
  const [msgs, setMsgs]   = useState([{ role:'assistant', content:"Hi! I'm the AI Judge assistant. Ask me about BERT, Random Forest, AIF360, scoring criteria, or how to improve your project evaluation." }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottom = useRef(null);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior:'smooth' }); }, [msgs]);

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg) return;
    setInput('');
    const newMsgs = [...msgs, { role:'user', content:msg }];
    setMsgs(newMsgs); setLoading(true);
    try {
      const history = newMsgs.slice(1).map(m=>({ role:m.role, content:m.content }));
      const { data } = await API.post('/chat', { message:msg, history });
      setMsgs(m=>[...m, { role:'assistant', content:data.reply, provider:data.provider }]);
    } catch(err) {
      setMsgs(m=>[...m, { role:'assistant', content:"Sorry, couldn't connect. Please try again." }]);
    } finally { setLoading(false); }
  };

  return (
    <div style={{padding:28}}>
      <div style={{marginBottom:20}}>
        <h1 style={{fontSize:'1.8rem',fontWeight:700,background:'linear-gradient(135deg,#fff 40%,var(--violet))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>AI Evaluation Assistant</h1>
        <p style={{color:'var(--t2)',fontSize:13,marginTop:4}}>Ask about BERT, AIF360, scoring, or how to improve submissions</p>
      </div>
      <div className="card" style={{padding:0,overflow:'hidden',display:'flex',flexDirection:'column',height:'calc(100vh - 200px)'}}>
        <div style={{flex:1,overflowY:'auto',padding:18,display:'flex',flexDirection:'column',gap:12}}>
          {msgs.map((m,i)=>(
            <div key={i} style={{display:'flex',gap:10,maxWidth:'82%',alignSelf:m.role==='user'?'flex-end':'flex-start',flexDirection:m.role==='user'?'row-reverse':'row'}}>
              <div style={{width:28,height:28,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,flexShrink:0,background:m.role==='user'?'var(--surf2)':'linear-gradient(135deg,var(--indigo),var(--cyan))'}}>
                {m.role==='user'?'👤':'⚖️'}
              </div>
              <div style={{padding:'10px 14px',borderRadius:10,fontSize:13,lineHeight:1.6,
                background:m.role==='user'?'linear-gradient(135deg,var(--indigo),rgba(99,102,241,.7))':'var(--surf2)',
                border:m.role==='user'?'none':'1px solid var(--bd)',
                borderTopRightRadius:m.role==='user'?3:10,borderTopLeftRadius:m.role==='user'?10:3}}>
                {m.content}
                {m.provider && <div style={{fontSize:9,color:'rgba(255,255,255,0.4)',marginTop:4,fontFamily:'Fira Code'}}>via {m.provider}</div>}
              </div>
            </div>
          ))}
          {loading && <div style={{display:'flex',gap:10,alignSelf:'flex-start'}}><div style={{width:28,height:28,borderRadius:8,background:'linear-gradient(135deg,var(--indigo),var(--cyan))',display:'flex',alignItems:'center',justifyContent:'center'}}>⚖️</div><div style={{padding:'12px 14px',background:'var(--surf2)',border:'1px solid var(--bd)',borderRadius:10,borderTopLeftRadius:3,display:'flex',gap:4}}>{[0,0.2,0.4].map((d,i)=><div key={i} style={{width:5,height:5,borderRadius:'50%',background:'var(--cyan)',animation:`blink 1.2s ${d}s infinite`}}></div>)}</div></div>}
          <div ref={bottom} />
        </div>
        {msgs.length <= 1 && (
          <div style={{display:'flex',gap:7,padding:'0 18px 10px',flexWrap:'wrap'}}>
            {SUGS.map(s=><button key={s} onClick={()=>send(s)} style={{background:'var(--surf)',border:'1px solid var(--bd2)',borderRadius:20,padding:'5px 12px',fontSize:11,color:'var(--t2)',cursor:'pointer'}}>{s}</button>)}
          </div>
        )}
        <div style={{borderTop:'1px solid var(--bd)',padding:'12px 16px',display:'flex',gap:10,alignItems:'flex-end',background:'var(--bg2)'}}>
          <textarea value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask about the algorithm or your evaluation…"
            onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}}
            style={{flex:1,background:'var(--surf)',border:'1px solid var(--bd2)',borderRadius:10,padding:'9px 13px',color:'var(--t1)',fontFamily:'Space Grotesk',fontSize:13,resize:'none',outline:'none',minHeight:40,maxHeight:100,lineHeight:1.4}} />
          <button onClick={()=>send()} disabled={loading||!input.trim()} style={{width:38,height:38,background:'linear-gradient(135deg,var(--indigo),var(--cyan))',border:'none',borderRadius:9,color:'#fff',fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,opacity:loading||!input.trim()?0.4:1}}>↑</button>
        </div>
      </div>
    </div>
  );
}
