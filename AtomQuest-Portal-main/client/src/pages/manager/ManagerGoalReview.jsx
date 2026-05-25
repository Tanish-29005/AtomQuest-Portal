import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGoalSheet, approveGoalSheet, submitCheckin, getProgressInsight } from '../../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Check, X, RotateCcw, Lock, MessageSquare, Sparkles, ChevronDown, ChevronUp, Save } from 'lucide-react';

const UOM_LABEL  = { min:'Min (↑ better)', max:'Max (↓ better)', timeline:'Timeline', zero:'Zero = 100%' };
const QUARTER_LABELS = { q1:'Q1 Apr–Jun', q2:'Q2 Jul–Sep', q3:'Q3 Oct–Dec', q4:'Q4 Annual' };
const STATUS_COLORS  = { not_started:'#94a3b8', on_track:'#10b981', at_risk:'#f59e0b', completed:'#6366f1' };

function GoalRow({ goal, index, editable, onEdit }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <tr style={{ cursor:'pointer' }} onClick={() => setOpen(o=>!o)}>
        <td style={{ fontWeight:700, color:'var(--text-2)', textAlign:'center' }}>{index+1}</td>
        <td>
          <div style={{ fontWeight:600, fontSize:13 }}>{goal.title}</div>
          <div style={{ fontSize:11, color:'var(--text-2)' }}>{goal.thrustArea}</div>
        </td>
        <td><span className="badge badge-primary" style={{ fontSize:11 }}>{UOM_LABEL[goal.uomType]}</span></td>
        <td>
          {editable
            ? <input type={goal.uomType==='timeline'?'date':'number'} value={goal.target||''} onClick={e=>e.stopPropagation()}
                onChange={e=>onEdit(index,'target',e.target.value)}
                style={{ width:100,padding:'5px 8px',border:'1px solid var(--border)',borderRadius:6,fontSize:13 }}/>
            : <span style={{ fontWeight:600 }}>{goal.target}</span>}
        </td>
        <td>
          {editable
            ? <input type="number" min={10} max={100} value={goal.weightage||''} onClick={e=>e.stopPropagation()}
                onChange={e=>onEdit(index,'weightage',Number(e.target.value))}
                style={{ width:70,padding:'5px 8px',border:'1px solid var(--border)',borderRadius:6,fontSize:13 }}/>
            : <span style={{ fontWeight:700, color:'var(--primary)' }}>{goal.weightage}%</span>}
        </td>
        {['q1','q2','q3','q4'].map(q=>(
          <td key={q} style={{ textAlign:'center' }}>
            <div>
              <span style={{ fontSize:13, fontWeight:700,
                color:(goal.achievements?.[q]?.score||0)>=80?'var(--success)':(goal.achievements?.[q]?.score||0)>=50?'var(--warning)':'var(--danger)' }}>
                {goal.achievements?.[q]?.score?.toFixed(0)||'—'}
                {goal.achievements?.[q]?.score!=null?'%':''}
              </span>
              {goal.achievements?.[q]?.status && goal.achievements[q].status !== 'not_started' && (
                <div style={{ fontSize:10, color:STATUS_COLORS[goal.achievements[q].status], marginTop:1 }}>
                  {goal.achievements[q].status.replace(/_/g,' ')}
                </div>
              )}
            </div>
          </td>
        ))}
        <td style={{ textAlign:'center' }}>
          {open ? <ChevronUp size={15} color="var(--text-3)"/> : <ChevronDown size={15} color="var(--text-3)"/>}
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={10} style={{ background:'var(--surface-2)', padding:'14px 20px' }}>
            <div style={{ fontSize:13, color:'var(--text-2)' }}>
              <strong>Description:</strong> {goal.description || <em>No description</em>}
            </div>
            {goal.isShared && (
              <div style={{ marginTop:6 }}>
                <span className="badge badge-primary">🔗 Shared Goal — Achievement synced from primary owner</span>
              </div>
            )}
            <div style={{ display:'flex', gap:20, marginTop:8 }}>
              {['q1','q2','q3','q4'].map(q=>(
                <div key={q} style={{ fontSize:12 }}>
                  <strong>{QUARTER_LABELS[q]}:</strong>{' '}
                  Target: <strong>{goal.target}</strong> |
                  Actual: <strong>{goal.achievements?.[q]?.actual ?? '—'}</strong> |
                  Score: <strong style={{ color:'var(--primary)' }}>{goal.achievements?.[q]?.score?.toFixed(1)||0}%</strong>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function ManagerGoalReview() {
  const { sheetId } = useParams();
  const navigate    = useNavigate();
  const [sheet,     setSheet]     = useState(null);
  const [goals,     setGoals]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [comment,   setComment]   = useState('');
  const [acting,    setActing]    = useState(false);
  const [activeQ,   setActiveQ]   = useState('q1');
  const [ciComment, setCiComment] = useState('');
  const [submittingCi, setSubmittingCi] = useState(false);
  const [insight,   setInsight]   = useState('');
  const [loadingInsight, setLoadingInsight] = useState(false);

  useEffect(() => {
    getGoalSheet(sheetId)
      .then(({ data }) => { setSheet(data.sheet); setGoals(data.sheet.goals || []); })
      .finally(() => setLoading(false));
  }, [sheetId]);

  const canApprove = ['submitted','under_review'].includes(sheet?.status);
  const canCheckin = sheet?.status === 'approved';
  const editable   = canApprove;

  const editGoal = (index, field, value) => {
    setGoals(gs => { const g=[...gs]; g[index]={...g[index],[field]:value}; return g; });
  };

  const totalWt = goals.reduce((s,g)=>s+Number(g.weightage||0),0);

  const handleAction = async (action) => {
    if (action === 'approve' && Math.abs(totalWt - 100) > 0.01) {
      return toast.error(`Total weightage is ${totalWt}% — must be 100% before approving`);
    }
    if (action !== 'approve' && !comment.trim()) {
      return toast.error('Please add a comment explaining your feedback');
    }
    setActing(true);
    try {
      const { data } = await approveGoalSheet(sheetId, {
        action,
        comment,
        editedGoals: action === 'approve' ? goals : undefined,
      });
      setSheet(data.sheet);
      toast.success(action === 'approve' ? '✅ Goals approved and locked!' : action === 'rework' ? '🔄 Sent back for rework' : 'Done');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally { setActing(false); }
  };

  const handleCheckin = async () => {
    if (!ciComment.trim() || ciComment.trim().length < 5) return toast.error('Check-in comment is required (min 5 chars)');
    setSubmittingCi(true);
    try {
      const { data } = await submitCheckin(sheetId, { quarter: activeQ, comment: ciComment });
      setSheet(data.sheet);
      setCiComment('');
      toast.success(`${activeQ.toUpperCase()} check-in recorded!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-in failed');
    } finally { setSubmittingCi(false); }
  };

  const handleInsight = async () => {
    setLoadingInsight(true);
    try {
      const { data } = await getProgressInsight(sheetId, activeQ);
      setInsight(data.insight);
    } catch { toast.error('AI insight failed'); }
    finally { setLoadingInsight(false); }
  };

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:80 }}><div className="spinner"/></div>;
  if (!sheet)  return <div className="card card-body">Goal sheet not found.</div>;

  const checkinForQ = sheet.checkins?.find(c=>c.quarter===activeQ);

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <button className="btn btn-secondary btn-sm" onClick={()=>navigate(-1)}><ArrowLeft size={14}/> Back</button>
        <div style={{ flex:1 }}>
          <h1 style={{ fontSize:22, fontWeight:800 }}>
            {sheet.employee?.name}'s Goal Sheet
          </h1>
          <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:6, flexWrap:'wrap' }}>
            <span style={{ fontSize:13, color:'var(--text-2)' }}>{sheet.employee?.employeeId} · {sheet.employee?.department} · {sheet.cycle}</span>
            {sheet.isLocked && <><Lock size={13} color="var(--text-3)"/><span style={{ fontSize:12, color:'var(--text-2)' }}>Locked</span></>}
            <span className={`badge ${sheet.status==='approved'?'badge-approved':sheet.status==='rework_requested'?'badge-rework':'badge-submitted'}`}>
              {sheet.status?.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
            </span>
          </div>
        </div>
        {editable && (
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:13, fontWeight:700, color: totalWt===100?'var(--success)':'var(--danger)' }}>
              {totalWt}% total
            </span>
          </div>
        )}
      </div>

      {/* Goals Table */}
      <div className="card" style={{ marginBottom:20 }}>
        <div className="card-header">
          <h3 style={{ fontWeight:700, fontSize:15 }}>Goals ({goals.length}/8)</h3>
          {editable && <span style={{ fontSize:12, color:'var(--text-2)' }}>✏️ You can edit targets & weightages inline before approving</span>}
        </div>
        <div style={{ overflowX:'auto' }}>
          <table>
            <thead>
              <tr>
                <th style={{ width:40 }}>#</th>
                <th>Goal</th>
                <th>UoM</th>
                <th>Target</th>
                <th>Wt%</th>
                <th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th>
                <th style={{ width:30 }}/>
              </tr>
            </thead>
            <tbody>
              {goals.map((g,i)=>(
                <GoalRow key={i} goal={g} index={i} editable={editable} onEdit={editGoal}/>
              ))}
            </tbody>
            {sheet.status==='approved' && (
              <tfoot>
                <tr style={{ background:'var(--surface-2)' }}>
                  <td colSpan={5} style={{ padding:'10px 16px', fontWeight:700, fontSize:13 }}>Weighted Overall Score</td>
                  {['q1','q2','q3','q4'].map(q=>(
                    <td key={q} style={{ textAlign:'center', fontWeight:800, color:'var(--primary)', fontSize:14 }}>
                      {sheet.overallScores?.[q]||0}%
                    </td>
                  ))}
                  <td/>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Approval Actions */}
      {canApprove && (
        <div className="card" style={{ marginBottom:20 }}>
          <div className="card-header">
            <h3 style={{ fontWeight:700, fontSize:15 }}>Review Decision</h3>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Comment / Feedback</label>
              <textarea className="form-control" rows={3} value={comment} onChange={e=>setComment(e.target.value)}
                placeholder="Add your feedback, comments, or approval note…"/>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn btn-success" onClick={()=>handleAction('approve')} disabled={acting||totalWt!==100}>
                <Check size={15}/> Approve & Lock
              </button>
              <button className="btn btn-warning" onClick={()=>handleAction('rework')} disabled={acting}>
                <RotateCcw size={15}/> Send for Rework
              </button>
            </div>
            {totalWt !== 100 && (
              <div style={{ marginTop:10, fontSize:13, color:'var(--danger)' }}>
                ⚠️ Total weightage is {totalWt}% — must be exactly 100% to approve
              </div>
            )}
          </div>
        </div>
      )}

      {/* Check-in Module */}
      {canCheckin && (
        <div className="card" style={{ marginBottom:20 }}>
          <div className="card-header">
            <h3 style={{ fontWeight:700, fontSize:15 }}>Quarterly Check-in</h3>
          </div>
          <div className="card-body">
            {/* Quarter selector */}
            <div className="quarter-tabs" style={{ marginBottom:16 }}>
              {['q1','q2','q3','q4'].map(q=>{
                const done = sheet.checkins?.some(c=>c.quarter===q);
                return (
                  <div key={q} className={`quarter-tab ${activeQ===q?'active':''} ${done?'completed':''}`}
                    onClick={()=>setActiveQ(q)}>
                    {QUARTER_LABELS[q]} {done&&'✓'}
                  </div>
                );
              })}
            </div>

            {/* Score for active quarter */}
            <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:16, padding:'12px 16px', background:'var(--surface-2)', borderRadius:'var(--radius-sm)' }}>
              <div>
                <div style={{ fontSize:28, fontWeight:800, color:'var(--primary)' }}>{sheet.overallScores?.[activeQ]||0}%</div>
                <div style={{ fontSize:12, color:'var(--text-2)' }}>{activeQ.toUpperCase()} Score</div>
              </div>
              <div style={{ flex:1 }}>
                <div className="progress-bar" style={{ height:10 }}>
                  <div className="progress-fill"
                    style={{ width:`${sheet.overallScores?.[activeQ]||0}%`,
                      background:(sheet.overallScores?.[activeQ]||0)>=80?'var(--success)':'var(--warning)' }}/>
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={handleInsight} disabled={loadingInsight}>
                <Sparkles size={13} color="#818cf8"/>{loadingInsight?'Loading…':'AI Insight'}
              </button>
            </div>

            {/* AI Insight */}
            {insight && (
              <div style={{ marginBottom:16, padding:'12px 16px', background:'rgba(99,102,241,.05)', border:'1px solid rgba(99,102,241,.2)', borderRadius:'var(--radius-sm)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                  <span className="ai-badge">✦ AI Coaching Insight</span>
                </div>
                <p style={{ fontSize:13, lineHeight:1.6, color:'var(--text)' }}>{insight}</p>
              </div>
            )}

            {/* Existing check-in */}
            {checkinForQ ? (
              <div style={{ marginBottom:16, padding:'12px 16px', background:'rgba(16,185,129,.06)', border:'1px solid #d1fae5', borderRadius:'var(--radius-sm)' }}>
                <div style={{ fontWeight:600, fontSize:13, color:'var(--success)', marginBottom:4 }}>✅ Check-in completed</div>
                <div style={{ fontSize:13 }}>"{checkinForQ.comment}"</div>
                <div style={{ fontSize:11, color:'var(--text-2)', marginTop:4 }}>{new Date(checkinForQ.completedAt).toLocaleDateString()}</div>
                <div style={{ fontSize:12, color:'var(--text-2)', marginTop:8 }}>Update check-in comment:</div>
              </div>
            ) : null}

            <div className="form-group">
              <label className="form-label">
                {checkinForQ ? 'Update' : 'Add'} Check-in Comment *
              </label>
              <textarea className="form-control" rows={3} value={ciComment} onChange={e=>setCiComment(e.target.value)}
                placeholder={`Document your ${activeQ.toUpperCase()} discussion — progress highlights, blockers, next steps…`}/>
            </div>
            <button className="btn btn-primary" onClick={handleCheckin} disabled={submittingCi}>
              <MessageSquare size={14}/> {submittingCi?'Saving…':'Record Check-in'}
            </button>
          </div>
        </div>
      )}

      {/* Audit Trail */}
      {sheet.auditLog?.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontWeight:700, fontSize:15 }}>Audit Trail</h3>
            <span className="badge badge-draft">{sheet.auditLog.length} events</span>
          </div>
          <table>
            <thead>
              <tr><th>Who</th><th>Field</th><th>Old Value</th><th>New Value</th><th>Reason</th><th>When</th></tr>
            </thead>
            <tbody>
              {sheet.auditLog.map((log,i)=>(
                <tr key={i}>
                  <td style={{ fontSize:13 }}>{log.changedBy?.name||'—'}</td>
                  <td><code style={{ fontSize:12 }}>{log.field}</code></td>
                  <td style={{ fontSize:13, color:'var(--danger)' }}>{String(log.oldValue??'—')}</td>
                  <td style={{ fontSize:13, color:'var(--success)' }}>{String(log.newValue??'—')}</td>
                  <td style={{ fontSize:12, color:'var(--text-2)' }}>{log.reason||'—'}</td>
                  <td style={{ fontSize:12, color:'var(--text-2)' }}>{new Date(log.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
