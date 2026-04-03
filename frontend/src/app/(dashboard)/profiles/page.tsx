'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Profile } from '@/types';
import { useProfile } from '@/context/ProfileContext';
import { Plus, Trash2, Edit2, CheckSquare, Loader2 } from 'lucide-react';

export default function ProfilesPage() {
  const { setActiveProfile } = useProfile();
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    api.get('/profiles').then(r => { setProfiles(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post('/profiles', { name: newName.trim() });
      setProfiles(prev => [...prev, data]);
      setNewName('');
      setShowCreate(false);
      toast.success('Profile created!');
    } catch { toast.error('Failed to create profile'); }
    finally { setCreating(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete profile "${name}" and all its tasks?`)) return;
    await api.delete(`/profiles/${id}`);
    setProfiles(prev => prev.filter(p => p.id !== id));
    toast.success('Profile deleted');
  };

  const handleEdit = async (id: string) => {
    if (!editName.trim()) return;
    const { data } = await api.patch(`/profiles/${id}`, { name: editName.trim() });
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, name: data.name } : p));
    setEditingId(null);
    toast.success('Profile updated');
  };

  const selectProfile = (profile: Profile) => {
    setActiveProfile(profile);
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: 'var(--bg-base)' }}>
      <div className="flex items-center gap-2 mb-10">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)' }}>
          <CheckSquare size={16} color="white" />
        </div>
        <span className="font-bold text-xl" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>TaskFlow</span>
      </div>

      <h1 className="text-3xl font-bold mb-2 text-center" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
        Who&apos;s working today?
      </h1>
      <p className="text-sm mb-10 text-center" style={{ color: 'var(--text-secondary)' }}>
        Select your profile to view and manage your tasks
      </p>

      {loading ? (
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent)' }} />
      ) : (
        <div className="flex flex-wrap justify-center gap-4 max-w-2xl">
          {profiles.map(profile => (
            <div key={profile.id} className="relative group">
              <button
                onClick={() => {
                  if (editingId === profile.id) return;
                  selectProfile(profile);
                }}
                className="flex flex-col items-center gap-3 p-6 rounded-2xl transition-all duration-200 w-36"
                style={{ background: 'var(--bg-card)', border: '2px solid var(--border)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = profile.avatarColor; (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
              >
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                  style={{ background: profile.avatarColor }}>
                  {profile.name[0].toUpperCase()}
                </div>
                {editingId === profile.id ? (
                  <input
                    className="input text-center text-sm py-1 px-2 w-full"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleEdit(profile.id); if (e.key === 'Escape') setEditingId(null); }}
                    autoFocus
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <span className="text-sm font-medium text-center" style={{ color: 'var(--text-primary)' }}>{profile.name}</span>
                )}
                {profile._count && (
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{profile._count.tasks} tasks</span>
                )}
              </button>

              {/* Edit/Delete icons */}
              {editingId !== profile.id && (
                <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => { setEditingId(profile.id); setEditName(profile.name); }}
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                  >
                    <Edit2 size={10} style={{ color: 'var(--text-secondary)' }} />
                  </button>
                  <button
                    onClick={() => handleDelete(profile.id, profile.name)}
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                  >
                    <Trash2 size={10} style={{ color: 'var(--danger)' }} />
                  </button>
                </div>
              )}
              {editingId === profile.id && (
                <button
                  onClick={() => handleEdit(profile.id)}
                  className="btn-primary w-full py-1 text-xs mt-1"
                >Save</button>
              )}
            </div>
          ))}

          {/* Add profile card */}
          {!showCreate ? (
            <button
              onClick={() => setShowCreate(true)}
              className="flex flex-col items-center gap-3 p-6 rounded-2xl w-36 transition-all duration-200"
              style={{ background: 'var(--bg-card)', border: '2px dashed var(--border)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
            >
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-input)' }}>
                <Plus size={24} style={{ color: 'var(--text-muted)' }} />
              </div>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Add profile</span>
            </button>
          ) : (
            <div className="flex flex-col items-center gap-3 p-6 rounded-2xl w-36"
              style={{ background: 'var(--bg-card)', border: '2px solid var(--accent)' }}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.15)' }}>
                <Plus size={24} style={{ color: 'var(--accent)' }} />
              </div>
              <input
                className="input text-center text-sm py-1 px-2 w-full"
                placeholder="Name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowCreate(false); }}
                autoFocus
              />
              <button onClick={handleCreate} disabled={creating || !newName.trim()} className="btn-primary w-full py-1 text-xs">
                {creating ? <Loader2 size={12} className="animate-spin" /> : 'Create'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}