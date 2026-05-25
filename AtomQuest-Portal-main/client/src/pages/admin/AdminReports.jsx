import React, { useState, useEffect } from 'react';
import { getAchievementReport, getCompletionReport, getAnalytics } from '../../services/api';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell,
} from 'recharts';
import { Download, FileText, BarChart2, TrendingUp, RefreshCw } from 'lucide-react';

const COLORS = ['#6366f1','#06b6d4','#10b981','#f59e0b','#ef4444','#8b5cf6'];

function ExportCard({ title, sub, icon: Icon, color, bg, onExport, loading }) {
  return (
    <div className="card" style={{ display:'flex', flexDirection:'column', gap:12, padding:20 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:40, height:40, background:bg, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon size={20} color={color}/>
        </div>
        <div>
          <div style={{ fontWeight:700, fontSize:14 }}>{title}</div>
          <div style={{ fontSize:12, color:'var(--text-2)' }}>{sub}</div>
        </div>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button className="btn btn-secondary btn-sm" onClick={()=>onExport('csv')} disabled={loading}>
          <Download size={12}/> CSV
        </button>
        <button className="btn btn-primary btn-sm" onClick={()=>onExport('excel')} disabled={loading}>
          <Download size={12}/> Excel
        </button>
      </div>
    </div>
  );
}

export default function AdminReports() {
  const [reportData, setReportData] = useState([]);
  const [analytics,  setAnalytics]  = useState(null);
  const [completion, setCompletion] = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [exporting,  setExporting]  = useState(false);
  const [tab,        setTab]        = useState('overview');

  const cycle = new Date().getFullYear().toString();

  useEffect(() => {
    Promise.all([
      getAchievementReport({ cycle }),
      getAnalytics({ cycle }),
      getCompletionReport({ cycle }),
    ]).then(([r, a, c]) => {
      setReportData(r.data.data||[]);
      setAnalytics(a.data.analytics);
      setCompletion(c.data);
    }).finally(() => setLoading(false));
  }, []);

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const resp = await fetch(
  `${import.meta.env.VITE_API_URL}/api/reports/achievement?cycle=${cycle}&format=${format}`,
  {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`
    }
  }
);
      if (!resp.ok) throw new Error('Export failed');
      const blob = await resp.blob();
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `achievement_report_${cycle}.${format==='excel'?'xlsx':'csv'}`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} exported!`);
    } catch { toast.error('Export failed'); }
    finally { setExporting(false); }
  };

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:80 }}><div className="spinner"/></div>;

  const qoq       = analytics?.qoqAverageScores || {};
  const qoqData   = ['q1','q2','q3','q4'].map(q=>({ name:q.toUpperCase(), score:qoq[q]||0 }));
  const deptData  = Object.entries(analytics?.departmentScores||{}).map(([dept,score])=>({ dept, score }));
  const thrustData= Object.entries(analytics?.thrustAreaBreakdown||{}).map(([name,d])=>({
    name: name.length>18 ? name.slice(0,16)+'…' : name,
    goals:d.count,
    avgScore: d.count ? Math.round(d.totalScore/d.count) : 0,
  }));

  const empTrends = (analytics?.employeeTrends||[]).slice(0,8).map(e=>({
    name: e.employee?.split(' ')[0]||'—',
    q1: e.scores?.q1||0, q2: e.scores?.q2||0, q3: e.scores?.q3||0, q4: e.scores?.q4||0,
  }));

  const TABS = ['overview','trends','employees','raw'];

  return (
    <div>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800 }}>Reports & Analytics</h1>
          <p style={{ color:'var(--text-2)', marginTop:4 }}>FY {cycle} · {reportData.length} goal records</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-secondary btn-sm" onClick={()=>{ setLoading(true); window.location.reload(); }}>
            <RefreshCw size={14}/> Refresh
          </button>
          <button className="btn btn-secondary btn-sm" onClick={()=>handleExport('csv')} disabled={exporting}>
            <Download size={14}/> CSV
          </button>
          <button className="btn btn-primary btn-sm" onClick={()=>handleExport('excel')} disabled={exporting}>
            <Download size={14}/> Export Excel
          </button>
        </div>
      </div>

      {/* Export cards */}
      <div className="grid-3" style={{ marginBottom:24 }}>
        <ExportCard title="Achievement Report" sub="Planned vs actual per employee" icon={FileText} color="var(--primary)" bg="rgba(99,102,241,.1)" onExport={handleExport} loading={exporting}/>
        <ExportCard title="Completion Dashboard" sub={`${completion?.summary?.overallCompletion||0}% approval rate`} icon={BarChart2} color="var(--success)" bg="rgba(16,185,129,.1)" onExport={handleExport} loading={exporting}/>
        <ExportCard title="QoQ Trend Data" sub="Quarter-over-quarter scores" icon={TrendingUp} color="var(--secondary)" bg="rgba(6,182,212,.1)" onExport={handleExport} loading={exporting}/>
      </div>

      {/* Tab nav */}
      <div style={{ display:'flex', gap:4, marginBottom:20, borderBottom:'2px solid var(--border)', paddingBottom:0 }}>
        {TABS.map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            style={{ padding:'10px 18px', border:'none', borderRadius:'8px 8px 0 0', cursor:'pointer', fontWeight:600, fontSize:14,
              background: tab===t ? 'var(--primary)' : 'transparent',
              color: tab===t ? 'white' : 'var(--text-2)',
              borderBottom: tab===t ? '2px solid var(--primary)' : 'none',
              marginBottom: tab===t ? -2 : 0,
            }}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div>
          <div className="grid-2" style={{ marginBottom:20 }}>
            <div className="card">
              <div className="card-header"><h3 style={{ fontWeight:700, fontSize:15 }}>QoQ Average Score</h3></div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={220}>
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

            <div className="card">
              <div className="card-header"><h3 style={{ fontWeight:700, fontSize:15 }}>Department Score Heatmap</h3></div>
              <div className="card-body">
                {deptData.length===0
                  ? <div style={{ textAlign:'center', color:'var(--text-2)', padding:32 }}>No approved data</div>
                  : deptData.map((d,i)=>(
                    <div key={d.dept} style={{ marginBottom:12 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                        <span style={{ fontSize:13, fontWeight:600 }}>{d.dept}</span>
                        <span style={{ fontSize:13, fontWeight:700, color:d.score>=80?'var(--success)':d.score>=60?'var(--warning)':'var(--danger)' }}>{d.score}%</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width:`${d.score}%`, background:COLORS[i%COLORS.length] }}/>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3 style={{ fontWeight:700, fontSize:15 }}>Goal Distribution by Thrust Area</h3></div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={thrustData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                  <XAxis dataKey="name" tick={{ fontSize:11 }}/>
                  <YAxis yAxisId="left" orientation="left" tick={{ fontSize:11 }}/>
                  <YAxis yAxisId="right" orientation="right" domain={[0,100]} tick={{ fontSize:11 }}/>
                  <Tooltip/>
                  <Legend/>
                  <Bar yAxisId="left" dataKey="goals" name="Goal Count" fill="#6366f1" radius={[4,4,0,0]}/>
                  <Bar yAxisId="right" dataKey="avgScore" name="Avg Score %" fill="#06b6d4" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Trends */}
      {tab === 'trends' && (
        <div className="card">
          <div className="card-header"><h3 style={{ fontWeight:700, fontSize:15 }}>Employee QoQ Score Trends (Top 8)</h3></div>
          <div className="card-body">
            {empTrends.length===0
              ? <div style={{ textAlign:'center', color:'var(--text-2)', padding:40 }}>No approved goal data to show trends</div>
              : <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={['Q1','Q2','Q3','Q4'].map((q,qi)=>({ q, ...Object.fromEntries(empTrends.map(e=>[e.name, e[`q${qi+1}`]])) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                    <XAxis dataKey="q" tick={{ fontSize:12 }}/>
                    <YAxis domain={[0,100]} tick={{ fontSize:12 }}/>
                    <Tooltip/>
                    <Legend/>
                    {empTrends.map((e,i)=>(
                      <Line key={e.name} type="monotone" dataKey={e.name} stroke={COLORS[i%COLORS.length]} strokeWidth={2} dot={{ r:4 }}/>
                    ))}
                  </LineChart>
                </ResponsiveContainer>}
          </div>
        </div>
      )}

      {/* Employees */}
      {tab === 'employees' && (
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontWeight:700, fontSize:15 }}>Employee Achievement Summary</h3>
            <span className="badge badge-draft">{analytics?.totalEmployees||0} employees</span>
          </div>
          <table>
            <thead>
              <tr><th>Employee</th><th>Dept</th><th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th><th>Avg</th></tr>
            </thead>
            <tbody>
              {(analytics?.employeeTrends||[]).map((e,i)=>{
                const avg = Math.round((['q1','q2','q3','q4'].reduce((s,q)=>s+(e.scores[q]||0),0))/4);
                return (
                  <tr key={i}>
                    <td style={{ fontWeight:600, fontSize:13 }}>{e.employee}</td>
                    <td style={{ fontSize:12, color:'var(--text-2)' }}>{e.department}</td>
                    {['q1','q2','q3','q4'].map(q=>(
                      <td key={q} style={{ textAlign:'center' }}>
                        <span style={{ fontWeight:700, fontSize:13, color:(e.scores[q]||0)>=80?'var(--success)':(e.scores[q]||0)>=50?'var(--warning)':'var(--danger)' }}>
                          {e.scores[q]||0}%
                        </span>
                      </td>
                    ))}
                    <td style={{ textAlign:'center' }}>
                      <span style={{ fontWeight:800, fontSize:14, color:avg>=80?'var(--success)':avg>=50?'var(--warning)':'var(--danger)' }}>{avg}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Raw Data */}
      {tab === 'raw' && (
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontWeight:700, fontSize:15 }}>Raw Achievement Data</h3>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn btn-secondary btn-sm" onClick={()=>handleExport('csv')} disabled={exporting}><Download size={12}/> CSV</button>
              <button className="btn btn-primary btn-sm" onClick={()=>handleExport('excel')} disabled={exporting}><Download size={12}/> Excel</button>
            </div>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Employee</th><th>Dept</th><th>Quarter</th><th>Goal</th>
                  <th>UoM</th><th>Target</th><th>Wt%</th><th>Actual</th><th>Status</th><th>Score</th>
                </tr>
              </thead>
              <tbody>
                {reportData.slice(0,100).map((r,i)=>(
                  <tr key={i}>
                    <td style={{ fontSize:12 }}>{r['Employee Name']}</td>
                    <td style={{ fontSize:12 }}>{r['Department']}</td>
                    <td><span className="badge badge-primary" style={{ fontSize:10 }}>{r['Quarter']}</span></td>
                    <td style={{ fontSize:12, maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r['Goal Title']}</td>
                    <td style={{ fontSize:12 }}>{r['UoM Type']}</td>
                    <td style={{ fontSize:12, fontWeight:600 }}>{r['Target']}</td>
                    <td style={{ fontSize:12 }}>{r['Weightage (%)']}</td>
                    <td style={{ fontSize:12, fontWeight:600 }}>{r['Actual Achievement']}</td>
                    <td style={{ fontSize:12 }}>{r['Status']}</td>
                    <td style={{ fontWeight:700, fontSize:12, color:(r['Score (%)']||0)>=80?'var(--success)':(r['Score (%)']||0)>=50?'var(--warning)':'var(--danger)' }}>
                      {r['Score (%)']}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {reportData.length > 100 && (
              <div style={{ padding:14, textAlign:'center', fontSize:13, color:'var(--text-2)' }}>
                Showing 100 of {reportData.length} records. Export for full data.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
