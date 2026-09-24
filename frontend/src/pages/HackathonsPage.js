import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { API } from '../context/AuthContext';

export default function HackathonsPage() {
  const nav = useNavigate();
  const [hacks, setHacks]     = useState([]);
  const [showing, setShowing] = useState('list'); // list | create
  const [form, setForm]       = useState({ title:'', description:'', start_date:'', end_date:'', domain:'general', hackathon_type:'both', max_teams:500, prize_pool:'' });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));

  useEffect(() => { API.get('/hackathons').then(r=>setHacks(r.data||[])).catch(()=>{}); }, []);

  const create = async e => {
    e.preventDefault();
    if (!form.title || !form.start_date || !form.end_date) { toast.error('Title, start and end dates required'); return; }
    setLoading(true);
    try {
      const { data } = await API.post('/hackathons', form);
      setHacks(h=>[data,...h]); setShowing('list'); toast.success('Hackathon created!');
    } catch(err) { toast.error(err.response?.data?.error||'Failed'); }
    finally { setLoading(false); }
  };

  const STATUS_COLORS = { draft:'var(--t3)', active:'var(--emerald)', judging:'var(--amber)', completed:'var(--blue)', archived:'var(--t3)' };

  return (
    <div style={{padding:28}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
        <div><h1 style={{fontSize:'1.8rem',fontWeight:700,background:'linear-gradient(135deg,#fff 40%,var(--cyan))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Hackathons</h1><p style={{color:'var(--t2)',fontSize:13,marginTop:4}}>Manage competitions and track submissions</p></div>
        <button className="btn-primary" onClick={()=>setShowing(s=>s==='list'?'create':'list')}>{showing==='list'?'+ Create Hackathon':'← Back to List'}</button>
      </div>

      {showing === 'create' ? (
        <div className="card glow">
          <div className="section-title">Create Hackathon</div>
          <form onSubmit={create}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div style={{gridColumn:'1/-1'}}><label className="label">Title *</label><input className="input" value={form.title} onChange={set('title')} placeholder="e.g. National AI Hackathon 2025" /></div>
              <div style={{gridColumn:'1/-1'}}><label className="label">Description</label><textarea className="input" style={{minHeight:80,resize:'none'}} value={form.description} onChange={set('description')} placeholder="What is this hackathon about?" /></div>
              <div><label className="label">Start Date *</label><input className="input" type="date" value={form.start_date} onChange={set('start_date')} /></div>
              <div><label className="label">End Date *</label><input className="input" type="date" value={form.end_date} onChange={set('end_date')} /></div>
              <div><label className="label">Domain</label><select className="input" style={{cursor:'pointer'}} value={form.domain} onChange={set('domain')}>{['general','healthcare','fintech','edtech','sustainability','social good','cybersecurity'].map(d=><option key={d} value={d}>{d}</option>)}</select></div>
              <div><label className="label">Type</label><select className="input" style={{cursor:'pointer'}} value={form.hackathon_type} onChange={set('hackathon_type')}><option value="both">Both</option><option value="college">College</option><option value="corporate">Corporate</option></select></div>
              <div><label className="label">Max Teams</label><input className="input" type="number" value={form.max_teams} onChange={set('max_teams')} /></div>
              <div><label className="label">Prize Pool</label><input className="input" value={form.prize_pool} onChange={set('prize_pool')} placeholder="e.g. $10,000" /></div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:20}}>
              <button className="btn-primary" type="submit" disabled={loading}>{loading?'Creating...':'Create Hackathon'}</button>
              <button className="btn-secondary" type="button" onClick={()=>setShowing('list')}>Cancel</button>
            </div>
          </form>
        </div>
      ) : (
        <div>
          {hacks.length === 0 ? (
            <div className="card" style={{textAlign:'center',padding:'48px 20px'}}>
              <div style={{fontSize:40,marginBottom:14}}>🏆</div>
              <div style={{fontSize:14,fontWeight:600,color:'#fff',marginBottom:6}}>No hackathons yet</div>
              <div style={{fontSize:13,color:'var(--t2)',marginBottom:16}}>Create your first hackathon to start evaluating projects</div>
              <button className="btn-primary" onClick={()=>setShowing('create')}>+ Create Hackathon</button>
            </div>
          ) : (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              {hacks.map(h=>(
                <div key={h._id} className="card" style={{cursor:'pointer'}} onClick={()=>nav(`/hackathons/${h._id}`)}>
                  <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:10}}>
                    <h3 style={{fontSize:15,fontWeight:600,color:'#fff'}}>{h.title}</h3>
                    <span style={{fontSize:10,fontFamily:'Fira Code',padding:'2px 8px',borderRadius:100,border:'1px solid var(--bd)',color:STATUS_COLORS[h.status]||'var(--t2)'}}>{h.status}</span>
                  </div>
                  <p style={{fontSize:12,color:'var(--t2)',marginBottom:12,lineHeight:1.5}}>{h.description?.substring(0,100)||'No description'}...</p>
                  <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                    <span style={{fontSize:11,color:'var(--t3)'}}>{h.domain}</span>
                    <span style={{fontSize:11,color:'var(--t3)'}}>·</span>
                    <span style={{fontSize:11,color:'var(--t3)'}}>{h.registered_teams||0} teams</span>
                    <span style={{fontSize:11,color:'var(--t3)'}}>·</span>
                    <span style={{fontSize:11,color:'var(--t3)'}}>{h.total_submissions||0} submissions</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
