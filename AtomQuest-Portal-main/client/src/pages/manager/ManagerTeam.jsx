import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTeamGoals, getTeamMembers, shareGoal } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Search, Share2, ExternalLink, Filter } from 'lucide-react';

const STATUS_BADGE = {
  draft:            <span className="badge badge-draft">Draft</span>,
  submitted:        <span className="badge badge-submitted">Submitted</span>,
  under_review:     <span className="badge badge-submitted">Under Review</span>,
  approved:         <span className="badge badge-approved">Approved ✅</span>,
  rework_requested: <span className="badge badge-rework">Needs Rework</span>,
};

const THRUST_AREAS = ['Revenue Growth','Customer Excellence','Operational Efficiency','People & Culture','Innovation','Compliance & Risk'];
const UOM_TYPES    = [{value:'min',label:'Min (Higher Better)'},{value:'max',label:'Max (Lower Better)'},{value:'timeline',label:'Timeline'},{value:'zero',label:'Zero-based'}];

function ShareGoalModal({ team, onClose, onShare }) {
  const [form, setForm] = useState({ thrustArea:'', title:'', description:'', uomType:'min', target:'', weightage:20 });
  const [selected, setSelected] = useState([]);
  const [sharing, setSharing] = useState(false);

  const toggle = id => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const handleShare = async () => {
    if (!form.title || !form.thrustArea || !form.target) return toast.error('Fill all required fields');
    if (selected.length === 0) return toast.error('Select at least one employee');
    setSharing(true);
    try {
      await onShare(form, selected);
      toast.success(`Shared goal pushed to ${selected.length} employee(s)`);
      onClose();
    } catch { toast.error('Failed to share goal'); }
    finally { setSharing(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth:640 }}>
        <div className="modal-header">
          <h3 style={{ fontWeight:700 }}>Push Shared Departmental KPI</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'var(--text-2)' }}>×</button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize:13, color:'var(--text-2)', marginBottom:16 }}>
            This goal will be pushed to selected employees. Title and target will be read-only; they can only adjust their weightage.
          </p>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Thrust Area *</label>
              <select className="form-control" value={form.thrustArea} onChange={e => setForm(f=>({...f,thrustArea:e.target.value}))}>
                <option value="">Select…</option>
                {THRUST_AREAS.map(a=><option key={a}>{a}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Goal Title *</label>
              <input className="form-control" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g., Zero critical incidents" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-control" rows={2} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/>
          </div>
          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">UoM Type *</label>
              <select className="form-control" value={form.uomType} onChange={e=>setForm(f=>({...f,uomType:e.target.value}))}>
                {UOM_TYPES.map(u=><option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Target *</label>
              <input className="form-control" type={form.uomType==='timeline'?'date':'number'} value={form.target} onChange={e=>setForm(f=>({...f,target:e.target.value}))}/>
            </div>
            <div className="form-group">
              <label className="form-label">Default Weightage %</label>
              <input className="form-control" type="number" min={10} max={100} value={form.weightage} onChange={e=>setForm(f=>({...f,weightage:Number(e.target.value)}))}/>
            </div>
          </div>

          <div style={{ marginTop:8 }}>
            <label className="form-label">Select Recipients ({selected.length} selected)</label>
            <div style={{ border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', overflow:'hidden' }}>
              {team.map(m => (
                <div key={m._id} onClick={()=>toggle(m._id)}
                  style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', cursor:'pointer',
                    background: selected.includes(m._id) ? 'rgba(99,102,241,.06)' : 'transparent',
                    borderBottom:'1px solid var(--border)' }}>
                  <input type="checkbox" checked={selected.includes(m._id)} readOnly style={{ accentColor:'var(--primary)' }}/>
                  <div className="avatar" style={{ width:30, height:30, fontSize:12 }}>
                    {m.name.split(' ').map(w=>w[0]).join('').slice(0,2)}
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600 }}>{m.name}</div>
                    <div style={{ fontSize:11, color:'var(--text-2)' }}>{m.designation}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleShare} disabled={sharing}>
            <Share2 size={14}/> {sharing ? 'Pushing…' : `Push to ${selected.length} Employee(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ManagerTeam() {
  const { user } = useAuth();
  const [sheets, setSheets]         = useState([]);
  const [team,   setTeam]           = useState([]);
  const [search, setSearch]         = useState('');
  const [filter, setFilter]         = useState('all');
  const [loading, setLoading]       = useState(true);
  const [showShare, setShowShare]   = useState(false);

 useEffect(() => {
  Promise.allSettled([getTeamGoals(), getTeamMembers()])
    .then(([s, t]) => {
      if (s.status === 'fulfilled') {
        setSheets(s.value.data.sheets || []);
      }

      if (t.status === 'fulfilled') {
        setTeam(t.value.data.team || []);
      }
    })
    .finally(() => setLoading(false));
}, []);

  const handleShare = async (goal, employeeIds) => {
    await shareGoal({ goal, employeeIds });
    const { data } = await getTeamGoals();
    setSheets(data.sheets || []);
  };

  const filtered = sheets
    .filter(s => filter === 'all' || s.status === filter)
    .filter(s => !search || s.employee?.name?.toLowerCase().includes(search.toLowerCase()) || s.employee?.employeeId?.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:80 }}><div className="spinner"/></div>;

  const QUARTER_LABELS = { q1:'Q1',q2:'Q2',q3:'Q3',q4:'Q4' };

  return (
    <div>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800 }}>Team Goal Sheets</h1>
          <p style={{ color:'var(--text-2)', marginTop:4 }}>{team.length} team members · {new Date().getFullYear()} cycle</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowShare(true)}>
          <Share2 size={15}/> Push Shared KPI
        </button>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ position:'relative', flex:1, maxWidth:300 }}>
          <Search size={15} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-3)' }}/>
          <input className="form-control" style={{ paddingLeft:32 }} placeholder="Search by name or ID…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {['all','submitted','approved','draft','rework_requested'].map(f => (
            <button key={f} onClick={()=>setFilter(f)}
              className={`btn btn-sm ${filter===f ? 'btn-primary' : 'btn-secondary'}`}>
              {f === 'all' ? 'All' : f === 'rework_requested' ? 'Rework' : f.charAt(0).toUpperCase()+f.slice(1)}
              {f !== 'all' && <span style={{ marginLeft:4, background:'rgba(255,255,255,.2)', borderRadius:100, padding:'0 5px', fontSize:11 }}>
                {sheets.filter(s=>s.status===f).length}
              </span>}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty-state card-body">
            <div style={{ fontSize:40, marginBottom:12 }}>👥</div>
            <div style={{ fontWeight:600 }}>No matching goal sheets</div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Status</th>
                <th>Goals</th>
                <th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th>
                <th>Submitted</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s._id}>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div className="avatar" style={{ width:34, height:34, fontSize:12 }}>
                        {s.employee?.name?.split(' ').map(w=>w[0]).join('').slice(0,2)}
                      </div>
                      <div>
                        <div style={{ fontWeight:600, fontSize:13 }}>{s.employee?.name}</div>
                        <div style={{ fontSize:11, color:'var(--text-2)' }}>{s.employee?.employeeId} · {s.employee?.designation}</div>
                      </div>
                    </div>
                  </td>
                  <td>{STATUS_BADGE[s.status]}</td>
                  <td style={{ textAlign:'center', fontWeight:600 }}>{s.goals?.length || 0}</td>
                  {['q1','q2','q3','q4'].map(q => (
                    <td key={q} style={{ textAlign:'center' }}>
                      {s.status === 'approved'
                        ? <span style={{ fontWeight:700, fontSize:13, color: (s.overallScores?.[q]||0)>=80?'var(--success)':(s.overallScores?.[q]||0)>=50?'var(--warning)':'var(--danger)' }}>
                            {s.overallScores?.[q] || 0}%
                          </span>
                        : <span style={{ color:'var(--text-3)', fontSize:12 }}>—</span>}
                    </td>
                  ))}
                  <td style={{ fontSize:12, color:'var(--text-2)' }}>
                    {s.submittedAt ? new Date(s.submittedAt).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    <Link to={`/manager/goals/${s._id}`} className="btn btn-secondary btn-sm">
                      <ExternalLink size={12}/> Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showShare && <ShareGoalModal team={team} onClose={()=>setShowShare(false)} onShare={handleShare}/>}
    </div>
  );
}
