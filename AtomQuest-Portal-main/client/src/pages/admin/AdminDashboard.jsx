import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCompletionReport, getAnalytics, broadcastNotification } from '../../services/api';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, LineChart, Line,
  CartesianGrid, Legend, Cell,
} from 'recharts';
import { Users, BarChart2, Bell, TrendingUp, Shield, ArrowRight } from 'lucide-react';

const COLORS = ['#6366f1','#06b6d4','#10b981','#f59e0b','#ef4444','#8b5cf6'];

function BroadcastModal({ onClose }) {
  const [form, setForm]   = useState({ title:'', message:'', targetRole:'all', link:'/' });
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!form.title || !form.message) return toast.error('Title and message required');
    setSending(true);
    try {
      const { data } = await broadcastNotification(form);
      toast.success(data.message);
      onClose();
    } catch { toast.error('Failed to send'); }
    finally { setSending(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth:480 }}>
        <div className="modal-header">
          <h3 style={{ fontWeight:700 }}>Broadcast Notification</h3>
          <button onClick={onClose} style={{ background:'none',border:'none',fontSize:20,cursor:'pointer',color:'var(--text-2)' }}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Target Role</label>
            <select className="form-control" value={form.targetRole} onChange={e=>setForm(f=>({...f,targetRole:e.target.value}))}>
              <option value="all">All Users</option>
              <option value="employee">Employees Only</option>
              <option value="manager">Managers Only</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-control" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g., Q2 Check-in Window is Open"/>
          </div>
          <div className="form-group">
            <label className="form-label">Message *</label>
            <textarea className="form-control" rows={3} value={form.message} onChange={e=>setForm(f=>({...f,message:e.target.value}))} placeholder="The message employees will see…"/>
          </div>
          <div className="form-group">
            <label className="form-label">Deep Link (optional)</label>
            <input className="form-control" value={form.link} onChange={e=>setForm(f=>({...f,link:e.target.value}))} placeholder="/employee/goals"/>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSend} disabled={sending}>
            <Bell size={14}/> {sending?'Sending…':'Send Notification'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [report,   setReport]   = useState(null);
  const [analytics,setAnalytics]= useState(null);
  const [loading,  setLoading]  = useState(true);
  const [showBroadcast, setShowBroadcast] = useState(false);

  useEffect(() => {
    Promise.all([getCompletionReport(), getAnalytics()])
      .then(([r, a]) => { setReport(r.data); setAnalytics(a.data.analytics); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:80 }}><div className="spinner"/></div>;

  const summary    = report?.summary || {};
  const qoq        = analytics?.qoqAverageScores || {};
  const qoqData    = [
    { name:'Q1', score: qoq.q1||0 },
    { name:'Q2', score: qoq.q2||0 },
    { name:'Q3', score: qoq.q3||0 },
    { name:'Q4', score: qoq.q4||0 },
  ];

  const deptData   = Object.entries(analytics?.departmentScores||{}).map(([dept,score])=>({ dept, score }));
  const thrustData = Object.entries(analytics?.thrustAreaBreakdown||{}).map(([name,d])=>({
    name: name.length>16 ? name.slice(0,14)+'…' : name,
    count: d.count,
    avgScore: d.count ? Math.round(d.totalScore/d.count) : 0,
  }));

  const checkinData= [
    { q:'Q1', rate: summary.checkinCompletion?.q1||0 },
    { q:'Q2', rate: summary.checkinCompletion?.q2||0 },
    { q:'Q3', rate: summary.checkinCompletion?.q3||0 },
    { q:'Q4', rate: summary.checkinCompletion?.q4||0 },
  ];

  const statusData = Object.entries(summary.byStatus||{}).map(([s,c])=>({ name:s.replace(/_/g,' '), value:c })).filter(x=>x.value>0);

  return (
    <div>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800 }}>Admin Dashboard</h1>
          <p style={{ color:'var(--text-2)', marginTop:4 }}>Organization-wide performance overview</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn btn-secondary" onClick={()=>setShowBroadcast(true)}>
            <Bell size={15}/> Broadcast
          </button>
          <Link to="/admin/reports" className="btn btn-primary">
            <BarChart2 size={15}/> Full Reports <ArrowRight size={13}/>
          </Link>
        </div>
      </div>

      {/* Top Stats */}
      <div className="stats-grid" style={{ marginBottom:24 }}>
        {[
          { icon:Users,    label:'Total Employees',     value:summary.total||0,              color:'var(--primary)',   bg:'rgba(99,102,241,.1)' },
          { icon:Shield,   label:'Completion Rate',     value:`${summary.overallCompletion||0}%`, color:'var(--success)',bg:'rgba(16,185,129,.1)' },
          { icon:TrendingUp,label:'Approved Sheets',    value:summary.byStatus?.approved||0,  color:'var(--success)',  bg:'rgba(16,185,129,.1)' },
          { icon:Bell,     label:'Pending Approvals',   value:(summary.byStatus?.submitted||0)+(summary.byStatus?.under_review||0), color:'var(--warning)', bg:'rgba(245,158,11,.1)' },
          { icon:BarChart2, label:'Q1 Check-in Rate',   value:`${summary.checkinCompletion?.q1||0}%`, color:'var(--secondary)', bg:'rgba(6,182,212,.1)' },
        ].map(s=>(
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background:s.bg }}><s.icon size={20} color={s.color}/></div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginBottom:20 }}>
        {/* QoQ Trend */}
        <div className="card">
          <div className="card-header"><h3 style={{ fontWeight:700, fontSize:15 }}>Quarter-on-Quarter Avg Score</h3></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={qoqData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                <XAxis dataKey="name" tick={{ fontSize:12 }}/>
                <YAxis domain={[0,100]} tick={{ fontSize:12 }}/>
                <Tooltip formatter={v=>[`${v}%`,'Avg Score']}/>
                <Line type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={2.5} dot={{ r:5, fill:'var(--primary)' }}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Check-in completion */}
        <div className="card">
          <div className="card-header"><h3 style={{ fontWeight:700, fontSize:15 }}>Check-in Completion by Quarter</h3></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={checkinData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                <XAxis dataKey="q" tick={{ fontSize:12 }}/>
                <YAxis domain={[0,100]} tick={{ fontSize:12 }}/>
                <Tooltip formatter={v=>[`${v}%`,'Completion']}/>
                <Bar dataKey="rate" radius={[4,4,0,0]}>
                  {checkinData.map((_,i)=><Cell key={i} fill={COLORS[i]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom:20 }}>
        {/* Department heatmap */}
        <div className="card">
          <div className="card-header"><h3 style={{ fontWeight:700, fontSize:15 }}>Dept Average Score Heatmap</h3></div>
          <div className="card-body">
            {deptData.length === 0
              ? <div style={{ textAlign:'center', color:'var(--text-2)', padding:24 }}>No approved data yet</div>
              : deptData.map(d=>(
                  <div key={d.dept} style={{ marginBottom:12 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:13, fontWeight:600 }}>{d.dept}</span>
                      <span style={{ fontSize:13, fontWeight:700, color:d.score>=80?'var(--success)':d.score>=60?'var(--warning)':'var(--danger)' }}>{d.score}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill"
                        style={{ width:`${d.score}%`, background:d.score>=80?'var(--success)':d.score>=60?'var(--warning)':'var(--danger)' }}/>
                    </div>
                  </div>
                ))}
          </div>
        </div>

        {/* Thrust Area breakdown */}
        <div className="card">
          <div className="card-header"><h3 style={{ fontWeight:700, fontSize:15 }}>Goal Distribution by Thrust Area</h3></div>
          <div className="card-body">
            {thrustData.length === 0
              ? <div style={{ textAlign:'center', color:'var(--text-2)', padding:24 }}>No data yet</div>
              : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={thrustData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                    <XAxis type="number" tick={{ fontSize:11 }}/>
                    <YAxis dataKey="name" type="category" tick={{ fontSize:11 }} width={100}/>
                    <Tooltip/>
                    <Bar dataKey="count" name="Goals" radius={[0,4,4,0]}>
                      {thrustData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
          </div>
        </div>
      </div>

      {/* Manager Effectiveness */}
      {report?.managerEffectiveness?.length > 0 && (
        <div className="card" style={{ marginBottom:20 }}>
          <div className="card-header">
            <h3 style={{ fontWeight:700, fontSize:15 }}>Manager Effectiveness</h3>
            <span className="badge badge-draft">Check-in completion rates</span>
          </div>
          <table>
            <thead>
              <tr><th>Manager</th><th>Team Size</th><th>Approved</th><th>Q1 CI</th><th>Q2 CI</th><th>Q3 CI</th><th>Q4 CI</th><th>Approval Rate</th></tr>
            </thead>
            <tbody>
              {report.managerEffectiveness.map((m,i)=>(
                <tr key={i}>
                  <td style={{ fontWeight:600, fontSize:13 }}>{m.name}</td>
                  <td style={{ textAlign:'center' }}>{m.total}</td>
                  <td style={{ textAlign:'center' }}>{m.approved}</td>
                  {['q1','q2','q3','q4'].map(q=>(
                    <td key={q} style={{ textAlign:'center' }}>
                      <span style={{ fontSize:12, fontWeight:600, color:(m.checkins[q]/Math.max(m.approved,1))>=0.8?'var(--success)':'var(--warning)' }}>
                        {m.checkins[q]}/{m.approved}
                      </span>
                    </td>
                  ))}
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <div className="progress-bar" style={{ flex:1 }}>
                        <div className="progress-fill score-excellent"
                          style={{ width:`${m.total?Math.round(m.approved/m.total*100):0}%` }}/>
                      </div>
                      <span style={{ fontSize:12, fontWeight:700 }}>{m.total?Math.round(m.approved/m.total*100):0}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Quick navigation */}
      <div className="grid-4">
        {[
          { to:'/admin/users',   icon:'👥', label:'Manage Users',   sub:'Add, edit, assign managers' },
          { to:'/admin/cycle',   icon:'📅', label:'Cycle Config',   sub:'Set windows & escalation rules' },
          { to:'/admin/reports', icon:'📊', label:'Export Reports', sub:'CSV / Excel achievement data' },
          { to:'/admin/audit',   icon:'🔍', label:'Audit Log',      sub:'Track all post-lock changes' },
        ].map(item=>(
          <Link key={item.to} to={item.to} style={{ textDecoration:'none' }}>
            <div className="card" style={{ padding:20, cursor:'pointer', transition:'box-shadow 0.15s' }}
              onMouseEnter={e=>e.currentTarget.style.boxShadow='var(--shadow-md)'}
              onMouseLeave={e=>e.currentTarget.style.boxShadow='var(--shadow)'}>
              <div style={{ fontSize:28, marginBottom:10 }}>{item.icon}</div>
              <div style={{ fontWeight:700, fontSize:14 }}>{item.label}</div>
              <div style={{ fontSize:12, color:'var(--text-2)', marginTop:4 }}>{item.sub}</div>
            </div>
          </Link>
        ))}
      </div>

      {showBroadcast && <BroadcastModal onClose={()=>setShowBroadcast(false)}/>}
    </div>
  );
}
