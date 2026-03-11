// ─────────────────────────────────────────────────
// AdminPage — User Management Panel
// ─────────────────────────────────────────────────

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { fetchAllUsers, updateUserRole, type UserRecord, type UserRole } from '@/services/supabaseClient';
import './landing.css';

export function AdminPage() {
    const navigate = useNavigate();
    const { user, isAdmin, signOut } = useAuthStore();
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [loading, setLoading] = useState(true);

    const loadUsers = useCallback(async () => {
        setLoading(true);
        const data = await fetchAllUsers();
        setUsers(data);
        setLoading(false);
    }, []);

    useEffect(() => { loadUsers(); }, [loadUsers]);

    const handleRoleChange = async (userId: string, newRole: UserRole) => {
        if (!user) return;
        const { error } = await updateUserRole(userId, newRole, user.id);
        if (error) {
            console.error('[admin] Role update failed:', error);
            return;
        }
        await loadUsers();
    };

    if (!isAdmin()) {
        navigate('/dashboard', { replace: true });
        return null;
    }

    const pendingCount = users.filter(u => u.role === 'pending').length;

    return (
        <div style={{
            minHeight: '100vh',
            background: '#000',
            color: '#f5f5f7',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 32px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(0,0,0,0.72)',
                backdropFilter: 'blur(20px)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                        fontSize: 20, fontWeight: 700, letterSpacing: -0.5,
                        background: 'linear-gradient(135deg, #6c5ce7, #00cec9)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        cursor: 'pointer',
                    }} onClick={() => navigate('/dashboard')}>
                        ACE
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
                    <span style={{ fontSize: 14, color: '#86868b', fontWeight: 500 }}>Admin</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <button
                        onClick={() => navigate('/dashboard')}
                        style={{ background: 'none', border: 'none', color: '#86868b', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}
                    >
                        Dashboard
                    </button>
                    <button
                        onClick={() => { signOut(); navigate('/'); }}
                        style={{ background: 'none', border: 'none', color: '#86868b', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}
                    >
                        Sign Out
                    </button>
                </div>
            </div>

            {/* Content */}
            <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
                    <div>
                        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1, margin: 0 }}>User Management</h1>
                        <p style={{ fontSize: 14, color: '#86868b', marginTop: 4 }}>
                            {users.length} total users
                            {pendingCount > 0 && <span style={{ color: '#fdcb6e', marginLeft: 8 }}> · {pendingCount} pending approval</span>}
                        </p>
                    </div>
                    <button onClick={loadUsers} style={{
                        padding: '8px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)', color: '#f5f5f7', fontSize: 13,
                        cursor: 'pointer', fontWeight: 500,
                    }}>
                        Refresh
                    </button>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: 60, color: '#86868b' }}>Loading users...</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {/* Table header */}
                        <div style={{
                            display: 'grid', gridTemplateColumns: '1fr 1fr 120px 160px',
                            padding: '12px 20px', fontSize: 12, color: '#86868b',
                            fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1,
                        }}>
                            <span>User</span>
                            <span>Email</span>
                            <span>Role</span>
                            <span style={{ textAlign: 'right' }}>Actions</span>
                        </div>

                        {users.map(u => (
                            <div
                                key={u.user_id}
                                style={{
                                    display: 'grid', gridTemplateColumns: '1fr 1fr 120px 160px',
                                    alignItems: 'center', padding: '14px 20px',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    borderRadius: 12,
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    {u.avatar_url ? (
                                        <img src={u.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                                    ) : (
                                        <div style={{
                                            width: 32, height: 32, borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 13, fontWeight: 600,
                                        }}>
                                            {(u.display_name ?? u.email ?? '?')[0]?.toUpperCase()}
                                        </div>
                                    )}
                                    <span style={{ fontSize: 14, fontWeight: 500 }}>{u.display_name ?? 'Unknown'}</span>
                                </div>

                                <span style={{ fontSize: 13, color: '#86868b' }}>{u.email ?? '-'}</span>

                                <span style={{
                                    fontSize: 12, fontWeight: 600,
                                    padding: '4px 10px', borderRadius: 6, display: 'inline-block', width: 'fit-content',
                                    ...(u.role === 'admin' ? { background: 'rgba(108,92,231,0.15)', color: '#a29bfe' } :
                                        u.role === 'user' ? { background: 'rgba(0,206,201,0.15)', color: '#00cec9' } :
                                        u.role === 'pending' ? { background: 'rgba(253,203,110,0.15)', color: '#fdcb6e' } :
                                        { background: 'rgba(255,107,107,0.15)', color: '#ff6b6b' }),
                                }}>
                                    {u.role}
                                </span>

                                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                    {u.role === 'pending' && (
                                        <>
                                            <ActionBtn label="Approve" color="#00cec9" onClick={() => handleRoleChange(u.user_id, 'user')} />
                                            <ActionBtn label="Reject" color="#ff6b6b" onClick={() => handleRoleChange(u.user_id, 'rejected')} />
                                        </>
                                    )}
                                    {u.role === 'user' && (
                                        <>
                                            <ActionBtn label="Admin" color="#a29bfe" onClick={() => handleRoleChange(u.user_id, 'admin')} />
                                            <ActionBtn label="Revoke" color="#ff6b6b" onClick={() => handleRoleChange(u.user_id, 'rejected')} />
                                        </>
                                    )}
                                    {u.role === 'rejected' && (
                                        <ActionBtn label="Restore" color="#00cec9" onClick={() => handleRoleChange(u.user_id, 'user')} />
                                    )}
                                    {u.role === 'admin' && u.user_id !== user?.id && (
                                        <ActionBtn label="Demote" color="#fdcb6e" onClick={() => handleRoleChange(u.user_id, 'user')} />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function ActionBtn({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: '5px 12px', borderRadius: 6,
                background: 'transparent',
                border: `1px solid ${color}30`,
                color, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.2s',
            }}
        >
            {label}
        </button>
    );
}
