'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Task } from '@/types';
import { format } from 'date-fns';
import { Users, Plus, Trash2, ChevronDown, ChevronUp, CheckCircle2, Circle, Clock, Calendar, Loader2 } from 'lucide-react';
import Navbar from '@/components/Navbar';

interface Member {
  id: string;
  name: string;
  email: string;
}

interface MemberTasks {
  member: Member;
  tasks: Task[];
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'rgba(99,102,241,0.15)',
  IN_PROGRESS: 'rgba(245,158,11,0.15)',
  COMPLETED: 'rgba(16,185,129,0.15)',
};
const STATUS_TEXT: Record<string, string> = {
  PENDING: '#818cf8',
  IN_PROGRESS: '#f59e0b',
  COMPLETED: '#10b981',
};

export default function TeamPage() {
  const [viewers, setViewers] = useState<Member[]>([]);
  const [owners, setOwners] = useState<Member[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [memberTasks, setMemberTasks] = useState<Record<string, MemberTasks>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loadingMember, setLoadingMember] = useState<string | null>(null);

  const fetchTeam = useCallback(async () => {
    const [vRes, oRes] = await Promise.all([
      api.get('/team/my-viewers'),
      api.get('/team/my-owners'),
    ]);
    setViewers(vRes.data);
    setOwners(oRes.data);
  }, []);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await api.post('/team/grant', { viewerEmail: inviteEmail.trim() });
      toast.success(`Access granted to ${inviteEmail}`);
      setInviteEmail('');
      fetchTeam();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to grant access';
      toast.error(msg);
    } finally {
      setInviting(false);
    }
  };

  const handleRevoke = async (viewerId: string, name: string) => {
    if (!confirm(`Revoke access for ${name}?`)) return;
    await api.delete(`/team/revoke/${viewerId}`);
    toast.success('Access revoked');
    fetchTeam();
  };

  const toggleMember = async (member: Member) => {
    const isOpen = expanded[member.id];
    setExpanded(prev => ({ ...prev, [member.id]: !isOpen }));
    if (!isOpen && !memberTasks[member.id]) {
      setLoadingMember(member.id);
      try {
        const { data } = await api.get(`/team/member/${member.id}/tasks`);
        setMemberTasks(prev => ({ ...prev, [member.id]: data }));
      } catch {
        toast.error('Failed to load tasks');
      } finally {
        setLoadingMember(null);
      }
    }
  };

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 md:px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.15)' }}>
            <Users size={20} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              Team View
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Grant your manager access to view your tasks
            </p>
          </div>
        </div>

        {/* Grant Access */}
        <div className="card p-6 mb-6">
          <h2 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Grant Access</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Enter your manager&apos;s registered email to let them view your tasks
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              className="input flex-1"
              placeholder="manager@nrsc.gov.in"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleInvite()}
            />
            <button onClick={handleInvite} disabled={inviting || !inviteEmail} className="btn-primary px-4">
              {inviting ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              Grant
            </button>
          </div>
        </div>

        {/* People who can see my tasks */}
        <div className="card p-6 mb-6">
          <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Who can see my tasks ({viewers.length})
          </h2>
          {viewers.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No one has access yet</p>
          ) : (
            <div className="space-y-2">
              {viewers.map(v => (
                <div key={v.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--bg-input)' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{v.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{v.email}</p>
                  </div>
                  <button onClick={() => handleRevoke(v.id, v.name)} className="btn-danger py-1 px-2 text-xs">
                    <Trash2 size={12} /> Revoke
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Team members whose tasks I can see */}
        <div className="card p-6">
          <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Team Members&apos; Tasks ({owners.length})
          </h2>
          {owners.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              No one has granted you access yet. Ask your team members to grant access from their Team page.
            </p>
          ) : (
            <div className="space-y-3">
              {owners.map(member => (
                <div key={member.id} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  <button
                    onClick={() => toggleMember(member)}
                    className="w-full flex items-center justify-between p-4 transition-colors"
                    style={{ background: 'var(--bg-input)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{ background: 'var(--accent)', color: 'white' }}>
                        {member.name[0].toUpperCase()}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{member.name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {loadingMember === member.id && <Loader2 size={14} className="animate-spin" style={{ color: 'var(--accent)' }} />}
                      {expanded[member.id] ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
                    </div>
                  </button>

                  {expanded[member.id] && memberTasks[member.id] && (
                    <div className="p-4 space-y-2" style={{ background: 'var(--bg-card)' }}>
                      {memberTasks[member.id].tasks.length === 0 ? (
                        <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No tasks yet</p>
                      ) : (
                        memberTasks[member.id].tasks.map(task => (
                          <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: 'var(--bg-input)' }}>
                            <div className="mt-0.5" style={{ color: task.status === 'COMPLETED' ? '#10b981' : 'var(--text-muted)' }}>
                              {task.status === 'COMPLETED' ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium" style={{
                                  color: 'var(--text-primary)',
                                  textDecoration: task.status === 'COMPLETED' ? 'line-through' : 'none'
                                }}>{task.title}</span>
                                <span className="badge text-xs" style={{ background: STATUS_COLORS[task.status], color: STATUS_TEXT[task.status] }}>
                                  {task.status.replace('_', ' ')}
                                </span>
                              </div>
                              {task.description && (
                                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{task.description}</p>
                              )}
                              <div className="flex items-center gap-3 mt-1">
                                {task.dueDate && (
                                  <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                                    <Calendar size={10} />{format(new Date(task.dueDate), 'MMM d, yyyy')}
                                  </span>
                                )}
                                <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                                  <Clock size={10} />{format(new Date(task.updatedAt), 'MMM d, h:mm a')}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}