import React, { useState, useEffect } from 'react';
import { getAuditLog, getUsers, unlockGoalSheet } from '../../services/api';
import toast from 'react-hot-toast';
import { Search, Unlock, Filter } from 'lucide-react';

function UnlockModal({ sheet, onClose, onUnlock }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    if (!reason.trim()) return toast.error('Reason required');
    setLoading(true);
    try { await onUnlock(sheet._id||sheet, reason); onClose(); }
    catch { toast.error('Unlock failed'); }
    finally { setLoading(false); }
  };
  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth:440 }}>
        <div className="modal-header">
          <h3 style={{ fontWeight:700 }}>Unlock Goal Sheet</h3>
          <button onClick={onClose} style={{ background:'none',border:'none',fontSize:20,cursor:'pointer' }}>×</button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize:13, color:'var(--text-2)', marginBottom:12 }}>
            Unlocking will allow the employee to edit their approved goals. This action is logged in the audit trail.
          </p>
          <div className="form-group">
            <label className="form-label">Reason for Unlock *</label>
            <textarea className="form-control" rows={3} value={reason} onChange={e=>setReason(e.target.value)} placeholder="e.g., Target amended after business realignment"/>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-warning" onClick={handle} disabled={loading}>
            <Unlock size={14}/> {loading?'Unlocking…':'Confirm Unlock'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminAuditLog() {
  const [logs,    setLogs]    = useState([]);
  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(true);
  const [unlockModal, setUnlockModal] = useState(null);

  useEffect(() => {
    getAuditLog().then(({ data }) => setLogs(data.logs||[])).finally(()=>setLoading(false));
  }, []);

  const handleUnlock = async (sheetId, reason) => {
    await unlockGoalSheet(sheetId, reason);
    toast.success('Goal sheet unlocked and employee notified');
    const { data } = await getAuditLog();
    setLogs(data.logs||[]);
  };

  const filtered = logs.filter(l =>
    !search ||
    l.employee?.name?.toLowerCase().includes(search.toLowerCase()) ||
    l.changedBy?.name?.toLowerCase().includes(search.toLowerCase()) ||
    l.field?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:80 }}><div className="spinner"/></div>;

  return (
    <div>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800 }}>Audit Log</h1>
          <p style={{ color:'var(--text-2)', marginTop:4 }}>{logs.length} post-lock changes recorded</p>
        </div>
      </div>

      {/* Info banner */}
      <div style={{ background:'rgba(99,102,241,.06)', border:'1px solid rgba(99,102,241,.2)', borderRadius:'var(--radius)', padding:'12px 16px', marginBottom:20, fontSize:13, color:'var(--text-2)' }}>
        🔍 This log captures all changes made to goal sheets <strong>after approval lock</strong> — who changed what, when, and why. Required for compliance and governance.
      </div>

      {/* Search */}
      <div style={{ position:'relative', maxWidth:340, marginBottom:20 }}>
        <Search size={15} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-3)' }}/>
        <input className="form-control" style={{ paddingLeft:32 }} placeholder="Search by employee, changed by, field…" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty-state card-body" style={{ padding:48 }}>
            <div style={{ fontSize:40, marginBottom:8 }}>🔍</div>
            <div style={{ fontWeight:600 }}>No audit entries found</div>
            <div style={{ fontSize:13, color:'var(--text-2)', marginTop:4 }}>Changes to locked goal sheets will appear here</div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Employee</th>
                <th>Changed By</th>
                <th>Field Modified</th>
                <th>Old Value</th>
                <th>New Value</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log,i) => (
                <tr key={i}>
                  <td style={{ fontSize:12, color:'var(--text-2)', whiteSpace:'nowrap' }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td>
                    <div style={{ fontWeight:600, fontSize:13 }}>{log.employee?.name||'—'}</div>
                    <div style={{ fontSize:11, color:'var(--text-2)' }}>{log.employee?.employeeId}</div>
                  </td>
                  <td>
                    <div style={{ fontSize:13 }}>{log.changedBy?.name||'System'}</div>
                    <span className={`badge ${log.changedBy?.role==='admin'?'badge-warning':log.changedBy?.role==='manager'?'badge-primary':'badge-draft'}`} style={{ fontSize:10, marginTop:2 }}>
                      {log.changedBy?.role||'system'}
                    </span>
                  </td>
                  <td><code style={{ fontSize:12, background:'var(--surface-2)', padding:'2px 6px', borderRadius:4 }}>{log.field||'—'}</code></td>
                  <td style={{ fontSize:13, color:'var(--danger)' }}>{String(log.oldValue??'—')}</td>
                  <td style={{ fontSize:13, color:'var(--success)' }}>{String(log.newValue??'—')}</td>
                  <td style={{ fontSize:12, color:'var(--text-2)', maxWidth:200 }}>{log.reason||'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Unlock section */}
      <div className="card" style={{ marginTop:24 }}>
        <div className="card-header">
          <div>
            <h3 style={{ fontWeight:700, fontSize:15 }}>Exception Handling — Unlock Goal Sheets</h3>
            <p style={{ fontSize:12, color:'var(--text-2)', marginTop:2 }}>Use with caution — unlock allows post-approval edits and is logged</p>
          </div>
        </div>
        <div className="card-body">
          <div style={{ display:'flex', gap:10, alignItems:'flex-end' }}>
            <div className="form-group" style={{ flex:1, marginBottom:0 }}>
              <label className="form-label">Goal Sheet ID to Unlock</label>
              <input id="unlockId" className="form-control" placeholder="Paste the MongoDB ObjectID of the goal sheet…"/>
            </div>
            <button className="btn btn-warning" onClick={() => {
              const id = document.getElementById('unlockId').value.trim();
              if (!id) return toast.error('Enter a goal sheet ID');
              setUnlockModal(id);
            }}>
              <Unlock size={14}/> Unlock Sheet
            </button>
          </div>
          <div style={{ fontSize:12, color:'var(--text-2)', marginTop:8 }}>
            💡 Tip: Find the goal sheet ID from the URL when reviewing a team member's goals (/manager/goals/<strong>ID</strong>)
          </div>
        </div>
      </div>

      {unlockModal && <UnlockModal sheet={unlockModal} onClose={()=>setUnlockModal(null)} onUnlock={handleUnlock}/>}
    </div>
  );
}
