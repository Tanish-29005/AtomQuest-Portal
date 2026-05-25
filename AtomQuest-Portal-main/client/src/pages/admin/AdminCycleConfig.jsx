import React, { useState, useEffect } from 'react';
import { getCycleConfig, updateCycleConfig } from '../../services/api';
import toast from 'react-hot-toast';
import { Save, Plus, Trash2, Calendar, Bell } from 'lucide-react';

const DEFAULT_THRUST_AREAS = [
  { name:'Revenue Growth', description:'Initiatives driving top-line revenue' },
  { name:'Customer Excellence', description:'Customer satisfaction and NPS' },
  { name:'Operational Efficiency', description:'Process improvement and cost reduction' },
  { name:'People & Culture', description:'Team development and engagement' },
  { name:'Innovation', description:'New product and technology initiatives' },
  { name:'Compliance & Risk', description:'Regulatory compliance and risk management' },
];

export default function AdminCycleConfig() {
  const year = new Date().getFullYear();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    getCycleConfig(year).then(({ data }) => {
      if (data.cycle) {
        setConfig(data.cycle);
      } else {
        // Default scaffold
        setConfig({
          year,
          goalSettingOpen:  `${year}-05-01`,
          goalSettingClose: `${year}-05-31`,
          quarters: {
            q1: { label:'Q1 (Apr–Jun)', windowOpen:`${year}-07-01`, windowClose:`${year}-07-31` },
            q2: { label:'Q2 (Jul–Sep)', windowOpen:`${year}-10-01`, windowClose:`${year}-10-31` },
            q3: { label:'Q3 (Oct–Dec)', windowOpen:`${year+1}-01-01`, windowClose:`${year+1}-01-31` },
            q4: { label:'Q4 Annual',   windowOpen:`${year+1}-03-01`, windowClose:`${year+1}-04-30` },
          },
          escalationRules: { goalSubmissionDays:7, goalApprovalDays:5, checkinDays:7 },
          thrustAreas: DEFAULT_THRUST_AREAS,
          isActive: true,
        });
      }
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await updateCycleConfig({ ...config, year });
      setConfig(data.cycle);
      toast.success('Cycle configuration saved!');
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const setQ = (q, field, value) => setConfig(c => ({ ...c, quarters: { ...c.quarters, [q]: { ...c.quarters[q], [field]: value } } }));
  const setEsc = (k, v)         => setConfig(c => ({ ...c, escalationRules: { ...c.escalationRules, [k]: Number(v) } }));
  const addThrust  = ()         => setConfig(c => ({ ...c, thrustAreas: [...(c.thrustAreas||[]), { name:'', description:'' }] }));
  const removeThrust = i        => setConfig(c => ({ ...c, thrustAreas: c.thrustAreas.filter((_,idx)=>idx!==i) }));
  const editThrust  = (i,k,v)   => setConfig(c => { const t=[...c.thrustAreas]; t[i]={...t[i],[k]:v}; return { ...c, thrustAreas:t }; });

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:80 }}><div className="spinner"/></div>;

  return (
    <div>
      <div className="config-header">
        <div>
          <h1 style={{ fontSize:22, fontWeight:800 }}>Cycle Configuration</h1>
          <p style={{ color:'var(--text-2)', marginTop:4 }}>Manage check-in windows, escalation rules, and thrust areas for {year}</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={15}/> {saving ? 'Saving…' : 'Save Config'}
        </button>
      </div>

      {/* Goal Setting Window */}
      <div className="card" style={{ marginBottom:16 }}>
        <div className="card-header">
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Calendar size={17} color="var(--primary)"/>
            <h3 style={{ fontWeight:700, fontSize:15 }}>Phase 1 — Goal Setting Window</h3>
          </div>
        </div>
        <div className="card-body">
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Window Opens</label>
              <input className="form-control" type="date" value={config?.goalSettingOpen?.slice(0,10)||''} onChange={e=>setConfig(c=>({...c,goalSettingOpen:e.target.value}))}/>
            </div>
            <div className="form-group">
              <label className="form-label">Window Closes</label>
              <input className="form-control" type="date" value={config?.goalSettingClose?.slice(0,10)||''} onChange={e=>setConfig(c=>({...c,goalSettingClose:e.target.value}))}/>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <input type="checkbox" id="active" checked={config?.isActive||false} onChange={e=>setConfig(c=>({...c,isActive:e.target.checked}))} style={{ accentColor:'var(--primary)' }}/>
            <label htmlFor="active" style={{ fontSize:13, fontWeight:500 }}>Cycle is active (employees can submit goals)</label>
          </div>
        </div>
      </div>

      {/* Quarterly Windows */}
      <div className="card" style={{ marginBottom:16 }}>
        <div className="card-header">
          <h3 style={{ fontWeight:700, fontSize:15 }}>Check-in Windows</h3>
          <span style={{ fontSize:12, color:'var(--text-2)' }}>Employees can only log achievements during these windows</span>
        </div>
        <div className="card-body">
          <div className="grid-2">
            {['q1','q2','q3','q4'].map(q => (
              <div key={q} style={{ padding:16, background:'var(--surface-2)', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)' }}>
                <div style={{ fontWeight:700, fontSize:14, marginBottom:12, color:'var(--primary)' }}>
                  {config?.quarters?.[q]?.label || q.toUpperCase()}
                </div>
                <div className="grid-2">
                  <div className="form-group" style={{ marginBottom:8 }}>
                    <label className="form-label">Opens</label>
                    <input className="form-control" type="date" value={config?.quarters?.[q]?.windowOpen?.slice(0,10)||''} onChange={e=>setQ(q,'windowOpen',e.target.value)}/>
                  </div>
                  <div className="form-group" style={{ marginBottom:8 }}>
                    <label className="form-label">Closes</label>
                    <input className="form-control" type="date" value={config?.quarters?.[q]?.windowClose?.slice(0,10)||''} onChange={e=>setQ(q,'windowClose',e.target.value)}/>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Escalation Rules */}
      <div className="card" style={{ marginBottom:16 }}>
        <div className="card-header">
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Bell size={17} color="var(--warning)"/>
            <h3 style={{ fontWeight:700, fontSize:15 }}>Escalation Rules</h3>
          </div>
          <span style={{ fontSize:12, color:'var(--text-2)' }}>Automated reminders after N days of inaction</span>
        </div>
        <div className="card-body">
          <div className="grid-3">
            {[
              { key:'goalSubmissionDays', label:'Goal Submission', desc:'Days after cycle opens before escalating non-submitted drafts' },
              { key:'goalApprovalDays',   label:'Goal Approval',   desc:'Days after submission before escalating unapproved sheets to manager' },
              { key:'checkinDays',        label:'Check-in',        desc:'Days after window opens before reminding managers of pending check-ins' },
            ].map(rule => (
              <div key={rule.key} style={{ padding:16, background:'rgba(245,158,11,.05)', borderRadius:'var(--radius-sm)', border:'1px solid rgba(245,158,11,.2)' }}>
                <div style={{ fontWeight:700, fontSize:13, marginBottom:4 }}>{rule.label}</div>
                <div style={{ fontSize:11, color:'var(--text-2)', marginBottom:10 }}>{rule.desc}</div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <input type="number" min={1} max={30}
                    value={config?.escalationRules?.[rule.key]||7}
                    onChange={e=>setEsc(rule.key,e.target.value)}
                    style={{ width:70, padding:'7px 10px', border:'1px solid var(--border)', borderRadius:6, fontSize:14, fontWeight:700 }}/>
                  <span style={{ fontSize:13, color:'var(--text-2)' }}>days</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Thrust Areas */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ fontWeight:700, fontSize:15 }}>Thrust Areas</h3>
          <button className="btn btn-secondary btn-sm" onClick={addThrust}><Plus size={14}/> Add</button>
        </div>
        <div className="card-body">
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {(config?.thrustAreas||[]).map((t,i)=>(
              <div key={i} className="thrust-area-row">
                <div>
                  <input className="form-control" value={t.name} onChange={e=>editThrust(i,'name',e.target.value)} placeholder="Thrust area name"/>
                </div>
                <div>
                  <input className="form-control" value={t.description} onChange={e=>editThrust(i,'description',e.target.value)} placeholder="Brief description…"/>
                </div>
                <button className="btn btn-sm" style={{ color:'var(--danger)', border:'1px solid var(--border)', background:'none', marginTop:0 }} onClick={()=>removeThrust(i)}>
                  <Trash2 size={14}/>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
