import { useState, useEffect } from 'react';
import { Sparkles, Bookmark, CheckSquare, Sparkle, Search, X, Trash2, Calendar, Tag, AlertCircle, Plus, CheckCircle, Clock, ShieldCheck, Check, Ban, LayoutDashboard } from 'lucide-react';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';

const CATEGORY_MAP = {
  important: { label: 'Important', icon: '⭐', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  task: { label: 'Task', icon: '📝', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  payment: { label: 'Payment', icon: '💳', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  event: { label: 'Event', icon: '📅', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
  study: { label: 'Study', icon: '📚', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)' }
};

const RaabtaIntelligenceModal = ({ conversation, currentUser, initialTab = 'dashboard', onClose, onJumpToMessage }) => {
  const [activeTab, setActiveTab] = useState(initialTab); // 'dashboard' | 'decisions' | 'summary' | 'memories' | 'categories' | 'followups' | 'search'
  const isGroup = conversation?.type === 'group';
  const { socket } = useSocket();

  // Dashboard State
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  // Decisions Lock State
  const [decisions, setDecisions] = useState([]);
  const [loadingDecisions, setLoadingDecisions] = useState(false);

  // Summary State
  const [summaryData, setSummaryData] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryMode, setSummaryMode] = useState('summary');

  // Memories State
  const [memories, setMemories] = useState([]);
  const [loadingMemories, setLoadingMemories] = useState(false);
  const [newMemoryText, setNewMemoryText] = useState('');
  const [isAddingMemory, setIsAddingMemory] = useState(false);

  // Categorized Messages State
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categorizedMessages, setCategorizedMessages] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Follow-ups / Tasks State
  const [followUps, setFollowUps] = useState([]);
  const [loadingFollowUps, setLoadingFollowUps] = useState(false);

  // Smart Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ messages: [], tasks: [], decisions: [], plans: [] });
  const [isSearching, setIsSearching] = useState(false);

  // Fetch Dashboard Data
  const fetchDashboard = async () => {
    setLoadingDashboard(true);
    try {
      const { data } = await api.get(`/intelligence/dashboard/${conversation._id}`);
      setDashboardData(data);
    } catch (err) {
      console.error('[Fetch Dashboard Error]:', err.message);
    } finally {
      setLoadingDashboard(false);
    }
  };

  // Fetch Decisions
  const fetchDecisions = async () => {
    setLoadingDecisions(true);
    try {
      const { data } = await api.get(`/intelligence/decisions/${conversation._id}`);
      setDecisions(data.decisions || []);
    } catch (err) {
      console.error('[Fetch Decisions Error]:', err.message);
    } finally {
      setLoadingDecisions(false);
    }
  };

  // Update Decision Status (Confirm / Reject / Propose)
  const handleUpdateDecisionStatus = async (id, status) => {
    try {
      const { data } = await api.patch(`/intelligence/decisions/${id}`, { status });
      setDecisions((prev) => prev.map((d) => (d._id === id ? data : d)));
      if (activeTab === 'dashboard') fetchDashboard();
    } catch (err) {
      console.error('[Update Decision Error]:', err.message);
    }
  };

  // Delete Decision
  const handleDeleteDecision = async (id) => {
    try {
      await api.delete(`/intelligence/decisions/${id}`);
      setDecisions((prev) => prev.filter((d) => d._id !== id));
      if (activeTab === 'dashboard') fetchDashboard();
    } catch (err) {
      console.error('[Delete Decision Error]:', err.message);
    }
  };

  // Fetch AI Summary
  const fetchSummary = async (mode = 'summary') => {
    setLoadingSummary(true);
    setSummaryMode(mode);
    setSummaryData(null);
    try {
      const { data } = await api.post('/intelligence/summary', {
        conversationId: conversation._id,
        mode
      });
      setSummaryData(data);
    } catch (err) {
      setSummaryData({
        available: false,
        summary: null,
        message: err.response?.data?.message || 'Failed to generate summary'
      });
    } finally {
      setLoadingSummary(false);
    }
  };

  // Fetch Memories
  const fetchMemories = async () => {
    setLoadingMemories(true);
    try {
      const { data } = await api.get(`/intelligence/memories/${conversation._id}`);
      setMemories(data.memories || []);
    } catch (err) {
      console.error('[Fetch Memories Error]:', err.message);
    } finally {
      setLoadingMemories(false);
    }
  };

  // Add Memory
  const handleAddMemory = async (e) => {
    e.preventDefault();
    if (!newMemoryText.trim()) return;
    setIsAddingMemory(true);
    try {
      const { data } = await api.post('/intelligence/memories', {
        conversationId: conversation._id,
        text: newMemoryText.trim()
      });
      setMemories((prev) => [data, ...prev]);
      setNewMemoryText('');
    } catch (err) {
      console.error('[Add Memory Error]:', err.message);
    } finally {
      setIsAddingMemory(false);
    }
  };

  // Delete Memory
  const handleDeleteMemory = async (id) => {
    try {
      await api.delete(`/intelligence/memories/${id}`);
      setMemories((prev) => prev.filter((m) => m._id !== id));
    } catch (err) {
      console.error('[Delete Memory Error]:', err.message);
    }
  };

  // Fetch Categorized Messages
  const fetchCategorizedMessages = async (cat = '') => {
    setLoadingCategories(true);
    try {
      const url = cat
        ? `/intelligence/messages/category/${conversation._id}?category=${cat}`
        : `/intelligence/messages/category/${conversation._id}`;
      const { data } = await api.get(url);
      setCategorizedMessages(data.messages || []);
    } catch (err) {
      console.error('[Fetch Categorized Messages Error]:', err.message);
    } finally {
      setLoadingCategories(false);
    }
  };

  // Fetch Follow-ups
  const fetchFollowUps = async () => {
    setLoadingFollowUps(true);
    try {
      const { data } = await api.get(`/intelligence/followups/${conversation._id}`);
      setFollowUps(data.followUps || []);
    } catch (err) {
      console.error('[Fetch Follow-ups Error]:', err.message);
    } finally {
      setLoadingFollowUps(false);
    }
  };

  // Toggle Follow-up Status
  const handleToggleFollowUp = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      const { data } = await api.patch(`/intelligence/followups/${id}`, { status: nextStatus });
      setFollowUps((prev) => prev.map((item) => (item._id === id ? data : item)));
      if (activeTab === 'dashboard') fetchDashboard();
    } catch (err) {
      console.error('[Toggle FollowUp Error]:', err.message);
    }
  };

  // Delete Follow-up
  const handleDeleteFollowUp = async (id) => {
    try {
      await api.delete(`/intelligence/followups/${id}`);
      setFollowUps((prev) => prev.filter((item) => item._id !== id));
      if (activeTab === 'dashboard') fetchDashboard();
    } catch (err) {
      console.error('[Delete FollowUp Error]:', err.message);
    }
  };

  // Handle Smart Search
  const handleSearchSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const { data } = await api.get(`/messages/search?q=${encodeURIComponent(searchQuery.trim())}`);
      if (Array.isArray(data)) {
        setSearchResults({ messages: data, tasks: [], decisions: [], plans: [] });
      } else {
        setSearchResults({
          messages: data.messages || [],
          tasks: data.tasks || [],
          decisions: data.decisions || [],
          plans: data.plans || []
        });
      }
    } catch (err) {
      console.error('[Smart Search Error]:', err.message);
    } finally {
      setIsSearching(false);
    }
  };

  // Listen for real-time socket updates for Dashboard & Decision Lock
  useEffect(() => {
    if (!socket) return;

    const handleActionUpdated = () => {
      if (activeTab === 'dashboard') fetchDashboard();
      if (activeTab === 'followups') fetchFollowUps();
    };

    const handleDecisionUpdated = (data) => {
      if ((data.conversation?._id || data.conversation)?.toString() === conversation._id.toString()) {
        setDecisions((prev) => {
          const idx = prev.findIndex((d) => d._id === data._id);
          if (idx > -1) {
            const copy = [...prev];
            copy[idx] = data;
            return copy;
          }
          return [data, ...prev];
        });
        if (activeTab === 'dashboard') fetchDashboard();
      }
    };

    const handleDecisionDeleted = (data) => {
      setDecisions((prev) => prev.filter((d) => d._id !== data.id));
      if (activeTab === 'dashboard') fetchDashboard();
    };

    socket.on('action_updated', handleActionUpdated);
    socket.on('decision_updated', handleDecisionUpdated);
    socket.on('decision_deleted', handleDecisionDeleted);

    return () => {
      socket.off('action_updated', handleActionUpdated);
      socket.off('decision_updated', handleDecisionUpdated);
      socket.off('decision_deleted', handleDecisionDeleted);
    };
  }, [socket, conversation._id, activeTab]);

  // Tab change handler
  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboard();
    } else if (activeTab === 'decisions') {
      fetchDecisions();
    } else if (activeTab === 'summary' && !summaryData && !loadingSummary) {
      fetchSummary('summary');
    } else if (activeTab === 'memories') {
      fetchMemories();
    } else if (activeTab === 'categories') {
      fetchCategorizedMessages(categoryFilter);
    } else if (activeTab === 'followups') {
      fetchFollowUps();
    }
  }, [activeTab]);

  return (
    <div className="raabta-intelligence-overlay" style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(8px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-secondary, #1e293b)',
        border: '1px solid var(--border-color, #334155)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '720px',
        maxHeight: '88vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden',
        color: 'var(--text-primary, #f8fafc)'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-color, #334155)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.12) 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
            }}>
              <Sparkles size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>Raabta Intelligence & Dashboard</h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary, #94a3b8)' }}>
                Turn chat messages into Tasks, Decision Locks, Plans & Search
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary, #94a3b8)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '4px',
          padding: '8px 12px',
          backgroundColor: 'var(--bg-primary, #0f172a)',
          borderBottom: '1px solid var(--border-color, #334155)',
          overflowX: 'auto'
        }}>
          <button
            onClick={() => setActiveTab('dashboard')}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: activeTab === 'dashboard' ? 'var(--accent-primary, #6366f1)' : 'transparent',
              color: activeTab === 'dashboard' ? '#ffffff' : 'var(--text-secondary, #94a3b8)'
            }}
          >
            <LayoutDashboard size={15} /> Dashboard
          </button>

          <button
            onClick={() => setActiveTab('decisions')}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: activeTab === 'decisions' ? '#10b981' : 'transparent',
              color: activeTab === 'decisions' ? '#ffffff' : 'var(--text-secondary, #94a3b8)'
            }}
          >
            <ShieldCheck size={15} /> Decision Lock
          </button>

          <button
            onClick={() => setActiveTab('summary')}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: activeTab === 'summary' ? 'var(--accent-primary, #6366f1)' : 'transparent',
              color: activeTab === 'summary' ? '#ffffff' : 'var(--text-secondary, #94a3b8)'
            }}
          >
            <Sparkle size={15} /> AI Summary
          </button>

          <button
            onClick={() => setActiveTab('memories')}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: activeTab === 'memories' ? 'var(--accent-primary, #6366f1)' : 'transparent',
              color: activeTab === 'memories' ? '#ffffff' : 'var(--text-secondary, #94a3b8)'
            }}
          >
            <Bookmark size={15} /> Memories
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: activeTab === 'categories' ? 'var(--accent-primary, #6366f1)' : 'transparent',
              color: activeTab === 'categories' ? '#ffffff' : 'var(--text-secondary, #94a3b8)'
            }}
          >
            <Tag size={15} /> Categories
          </button>

          <button
            onClick={() => setActiveTab('followups')}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: activeTab === 'followups' ? 'var(--accent-primary, #6366f1)' : 'transparent',
              color: activeTab === 'followups' ? '#ffffff' : 'var(--text-secondary, #94a3b8)'
            }}
          >
            <CheckSquare size={15} /> Tasks
          </button>

          <button
            onClick={() => setActiveTab('search')}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: activeTab === 'search' ? 'var(--accent-primary, #6366f1)' : 'transparent',
              color: activeTab === 'search' ? '#ffffff' : 'var(--text-secondary, #94a3b8)'
            }}
          >
            <Search size={15} /> Smart Search
          </button>
        </div>

        {/* Tab Contents */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {/* TAB 0: CONTEXT ACTIONS DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div>
              {loadingDashboard ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading Dashboard...</div>
              ) : dashboardData ? (
                <div>
                  {/* Summary Stat Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                    <div style={{ backgroundColor: 'var(--bg-primary)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#60a5fa' }}>{dashboardData.stats?.pendingTasks || 0}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Pending Tasks</div>
                    </div>
                    <div style={{ backgroundColor: 'var(--bg-primary)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#34d399' }}>{dashboardData.stats?.confirmedDecisions || 0}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Confirmed Decisions</div>
                    </div>
                    <div style={{ backgroundColor: 'var(--bg-primary)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#c084fc' }}>{dashboardData.stats?.totalPlans || 0}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Active Plans</div>
                    </div>
                  </div>

                  {/* Confirmed Decisions Section */}
                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399' }}>
                      <ShieldCheck size={18} /> Confirmed Group Decisions
                    </h4>
                    {dashboardData.decisions?.filter((d) => d.status === 'confirmed').length === 0 ? (
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>No confirmed decisions yet.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {dashboardData.decisions?.filter((d) => d.status === 'confirmed').map((dec) => (
                          <div key={dec._id} style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                              <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#ffffff' }}>🔒 {dec.decisionText}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                Confirmed by {dec.confirmer?.name || 'Admin'} • Proposer: {dec.proposer?.name || 'User'}
                              </div>
                            </div>
                            {onJumpToMessage && dec.message && (
                              <button onClick={() => onJumpToMessage(dec.message._id || dec.message)} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.4)', backgroundColor: 'transparent', color: '#34d399', fontSize: '0.75rem', cursor: 'pointer' }}>Jump</button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Tasks & Deadlines Section */}
                  <div>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', color: '#60a5fa' }}>
                      <CheckSquare size={18} /> Tasks & Upcoming Deadlines
                    </h4>
                    {dashboardData.tasks?.length === 0 ? (
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>No tasks created yet.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {dashboardData.tasks?.map((t) => (
                          <div key={t._id} style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                              <div style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                                {t.status === 'completed' ? '✅ ' : '📝 '}{t.title || t.note}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                {t.dueDate ? `Deadline: ${new Date(t.dueDate).toLocaleDateString()}` : 'No deadline'} • Status: {t.status}
                              </div>
                            </div>
                            {onJumpToMessage && t.message && (
                              <button onClick={() => onJumpToMessage(t.message._id || t.message)} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'var(--accent-primary)', fontSize: '0.75rem', cursor: 'pointer' }}>Jump</button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* TAB 1: DECISION LOCK MANAGER */}
          {activeTab === 'decisions' && (
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                Propose group decisions from chat messages. Authorized members can lock & confirm them.
              </p>

              {loadingDecisions ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading Decisions...</div>
              ) : decisions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  <ShieldCheck size={36} style={{ opacity: 0.4, marginBottom: '8px' }} />
                  <p style={{ margin: 0 }}>No decisions proposed or locked in this chat yet.</p>
                  <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>Hover over any message and tap "Propose Decision" to start.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {decisions.map((d) => {
                    const isConfirmed = d.status === 'confirmed';
                    const isRejected = d.status === 'rejected';
                    return (
                      <div
                        key={d._id}
                        style={{
                          padding: '14px 16px',
                          borderRadius: '10px',
                          backgroundColor: isConfirmed ? 'rgba(16, 185, 129, 0.1)' : isRejected ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-primary)',
                          border: `1px solid ${isConfirmed ? 'rgba(16, 185, 129, 0.4)' : isRejected ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-color)'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px'
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: '700',
                              backgroundColor: isConfirmed ? '#10b981' : isRejected ? '#ef4444' : '#f59e0b',
                              color: '#ffffff'
                            }}>
                              {isConfirmed ? 'CONFIRMED DECISION 🔒' : isRejected ? 'REJECTED ❌' : 'PROPOSED ⏳'}
                            </span>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                              Proposer: {d.proposer?.name || 'User'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.92rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                            {d.decisionText}
                          </div>
                          {isConfirmed && (
                            <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '4px' }}>
                              Confirmed by {d.confirmer?.name || 'Admin'} on {new Date(d.confirmedAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {!isConfirmed && (
                            <button
                              onClick={() => handleUpdateDecisionStatus(d._id, 'confirmed')}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: '#10b981',
                                color: '#ffffff',
                                fontSize: '0.78rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Check size={14} /> Lock & Confirm
                            </button>
                          )}
                          {isConfirmed && (
                            <button
                              onClick={() => handleUpdateDecisionStatus(d._id, 'proposed')}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'transparent',
                                color: 'var(--text-secondary)',
                                fontSize: '0.75rem',
                                cursor: 'pointer'
                              }}
                            >
                              Unlock
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteDecision(d._id)}
                            style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '4px' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: AI SUMMARY & WHAT DID I MISS */}
          {activeTab === 'summary' && (
            <div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                <button
                  onClick={() => fetchSummary('summary')}
                  disabled={loadingSummary}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #334155)',
                    backgroundColor: summaryMode === 'summary' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Sparkles size={14} /> Refresh Chat Summary
                </button>

                {isGroup && (
                  <button
                    onClick={() => fetchSummary('missed')}
                    disabled={loadingSummary}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #334155)',
                      backgroundColor: summaryMode === 'missed' ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
                      color: '#a855f7',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    👥 What did I miss?
                  </button>
                )}
              </div>

              {loadingSummary ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <div className="animate-spin" style={{
                    width: '32px',
                    height: '32px',
                    border: '3px solid rgba(99, 102, 241, 0.3)',
                    borderTopColor: '#6366f1',
                    borderRadius: '50%',
                    margin: '0 auto 12px'
                  }} />
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>Generating AI chat summary...</p>
                </div>
              ) : summaryData ? (
                summaryData.available ? (
                  <div style={{
                    backgroundColor: 'var(--bg-primary, #0f172a)',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color, #334155)',
                    lineHeight: '1.6',
                    fontSize: '0.92rem',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {summaryData.summary}
                  </div>
                ) : (
                  <div style={{
                    padding: '30px',
                    textAlign: 'center',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '12px',
                    color: '#f87171'
                  }}>
                    <AlertCircle size={32} style={{ marginBottom: '8px' }} />
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem' }}>AI Summary Unavailable</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {summaryData.message || 'AI service is currently not configured or reachable.'}
                    </p>
                  </div>
                )
              ) : null}
            </div>
          )}

          {/* TAB 3: CHAT MEMORIES */}
          {activeTab === 'memories' && (
            <div>
              <form onSubmit={handleAddMemory} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <input
                  type="text"
                  placeholder="Add a new memory (e.g. Project submission is on Monday)..."
                  value={newMemoryText}
                  onChange={(e) => setNewMemoryText(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #334155)',
                    backgroundColor: 'var(--bg-primary, #0f172a)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    fontSize: '0.88rem'
                  }}
                />
                <button
                  type="submit"
                  disabled={isAddingMemory || !newMemoryText.trim()}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: 'var(--accent-primary, #6366f1)',
                    color: '#ffffff',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Plus size={16} /> Save Memory
                </button>
              </form>

              {loadingMemories ? (
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>Loading memories...</p>
              ) : memories.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  <Bookmark size={36} style={{ opacity: 0.4, marginBottom: '8px' }} />
                  <p style={{ margin: 0 }}>No memories saved for this chat yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {memories.map((mem) => (
                    <div
                      key={mem._id}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '10px',
                        backgroundColor: 'var(--bg-primary, #0f172a)',
                        border: '1px solid var(--border-color, #334155)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.92rem', fontWeight: '500', color: 'var(--text-primary)' }}>
                          {mem.text}
                        </div>
                        {mem.message && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', marginTop: '4px', cursor: 'pointer' }} onClick={() => onJumpToMessage && onJumpToMessage(mem.message._id || mem.message)}>
                            🔗 View original message: "{mem.message.content?.substring(0, 40)}..."
                          </div>
                        )}
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          Saved by {mem.user?.name || 'User'} • {new Date(mem.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteMemory(mem._id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#f87171',
                          cursor: 'pointer',
                          padding: '6px'
                        }}
                        title="Delete Memory"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CATEGORIZED MESSAGES */}
          {activeTab === 'categories' && (
            <div>
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '16px', paddingBottom: '4px' }}>
                <button
                  onClick={() => {
                    setCategoryFilter('');
                    fetchCategorizedMessages('');
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    border: '1px solid var(--border-color, #334155)',
                    backgroundColor: categoryFilter === '' ? 'var(--accent-primary, #6366f1)' : 'transparent',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  All Categories
                </button>
                {Object.entries(CATEGORY_MAP).map(([key, cat]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setCategoryFilter(key);
                      fetchCategorizedMessages(key);
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '20px',
                      border: '1px solid var(--border-color, #334155)',
                      backgroundColor: categoryFilter === key ? cat.color : 'transparent',
                      color: '#ffffff',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>{cat.icon}</span> {cat.label}
                  </button>
                ))}
              </div>

              {loadingCategories ? (
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>Loading categorized messages...</p>
              ) : categorizedMessages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  <Tag size={36} style={{ opacity: 0.4, marginBottom: '8px' }} />
                  <p style={{ margin: 0 }}>No categorized messages found in this chat.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {categorizedMessages.map((msg) => {
                    const catInfo = CATEGORY_MAP[msg.category] || { label: msg.category, icon: '🏷️', color: '#6366f1', bg: 'rgba(99,102,241,0.15)' };
                    return (
                      <div
                        key={msg._id}
                        style={{
                          padding: '12px 16px',
                          borderRadius: '10px',
                          backgroundColor: 'var(--bg-primary, #0f172a)',
                          border: '1px solid var(--border-color, #334155)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px'
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{
                              backgroundColor: catInfo.bg,
                              color: catInfo.color,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <span>{catInfo.icon}</span> {catInfo.label}
                            </span>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                              {msg.sender?.name || 'User'} • {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                            {msg.content || `[${msg.messageType}]`}
                          </div>
                        </div>
                        {onJumpToMessage && (
                          <button
                            onClick={() => onJumpToMessage(msg._id)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid var(--border-color, #334155)',
                              backgroundColor: 'transparent',
                              color: 'var(--accent-primary)',
                              fontSize: '0.78rem',
                              cursor: 'pointer'
                            }}
                          >
                            Jump
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: TASKS & FOLLOW-UPS */}
          {activeTab === 'followups' && (
            <div>
              {loadingFollowUps ? (
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>Loading tasks...</p>
              ) : followUps.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  <CheckSquare size={36} style={{ opacity: 0.4, marginBottom: '8px' }} />
                  <p style={{ margin: 0 }}>No tasks or follow-ups created for this chat yet.</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Tip: Hover over any message and click "Convert to Action" to create a task!
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {followUps.map((item) => {
                    const isCompleted = item.status === 'completed';
                    return (
                      <div
                        key={item._id}
                        style={{
                          padding: '12px 16px',
                          borderRadius: '10px',
                          backgroundColor: 'var(--bg-primary, #0f172a)',
                          border: '1px solid var(--border-color, #334155)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          opacity: isCompleted ? 0.65 : 1
                        }}
                      >
                        <button
                          onClick={() => handleToggleFollowUp(item._id, item.status)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: isCompleted ? '#10b981' : 'var(--text-secondary)'
                          }}
                        >
                          <CheckCircle size={20} />
                        </button>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            textDecoration: isCompleted ? 'line-through' : 'none',
                            color: 'var(--text-primary)'
                          }}>
                            {item.title || item.note || 'Task Item'}
                          </div>
                          {item.message && (
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              Original message: "{item.message.content?.substring(0, 40)}..."
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteFollowUp(item._id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#f87171',
                            cursor: 'pointer',
                            padding: '6px'
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: CONTEXT SEARCH */}
          {activeTab === 'search' && (
            <div>
              <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <input
                  type="text"
                  placeholder="Context Search (messages, tasks, plans, confirmed decisions)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #334155)',
                    backgroundColor: 'var(--bg-primary, #0f172a)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    fontSize: '0.88rem'
                  }}
                />
                <button
                  type="submit"
                  disabled={isSearching || !searchQuery.trim()}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: 'var(--accent-primary, #6366f1)',
                    color: '#ffffff',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Search size={16} /> Search
                </button>
              </form>

              {isSearching ? (
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>Searching context...</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Matching Decisions */}
                  {searchResults.decisions?.length > 0 && (
                    <div>
                      <h5 style={{ margin: '0 0 8px 0', color: '#34d399', fontSize: '0.85rem' }}>🔒 Matching Decisions</h5>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {searchResults.decisions.map((d) => (
                          <div key={d._id} style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: 'rgba(16,185,129,0.1)', fontSize: '0.85rem' }}>
                            {d.decisionText}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matching Tasks */}
                  {searchResults.tasks?.length > 0 && (
                    <div>
                      <h5 style={{ margin: '0 0 8px 0', color: '#60a5fa', fontSize: '0.85rem' }}>📝 Matching Tasks</h5>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {searchResults.tasks.map((t) => (
                          <div key={t._id} style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', fontSize: '0.85rem' }}>
                            {t.title || t.note}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matching Messages */}
                  {searchResults.messages?.length > 0 && (
                    <div>
                      <h5 style={{ margin: '0 0 8px 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>💬 Matching Messages</h5>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {searchResults.messages.map((msg) => (
                          <div key={msg._id} style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                {msg.sender?.name || 'User'} • {new Date(msg.createdAt).toLocaleDateString()}
                              </div>
                              <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{msg.content}</div>
                            </div>
                            {onJumpToMessage && (
                              <button onClick={() => onJumpToMessage(msg._id)} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'var(--accent-primary)', fontSize: '0.75rem', cursor: 'pointer' }}>Jump</button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RaabtaIntelligenceModal;
