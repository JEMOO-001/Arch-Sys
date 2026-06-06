import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Database, LogOut, LayoutGrid, BarChart3, Clock, MessageSquare } from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { MapTable } from '../components/MapTable';
import { SummaryCards } from '../components/SummaryCards';
import { AnalystStats } from '../components/AnalystStats';
import { NotificationBell } from '../components/NotificationBell';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { EditModal } from '../components/EditModal';
import { AuditLogModal } from '../components/AuditLogModal';
import { MapDetailModal } from '../components/MapDetailModal';
import { ChatBot } from '../components/ChatBot';
import { ReviewMode } from '../components/ReviewMode';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import axios from 'axios';

const API_URL = (import.meta.env.VITE_API_URL || 'http://172.20.0.149:8000') + '/api/v1';

const b64ToBlob = (b64: string, contentType: string) => {
  const byteCharacters = atob(b64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: contentType });
};

interface Stats {
  total: number;
  inProgress: number;
  complete: number;
}

interface Analyst {
  user_id: number;
  full_name: string;
  total_count: number;
  completed_count: number;
  last_archive: string;
}

interface MapRecord {
  map_id: number;
  unique_id: string;
  layout_name: string;
  project_path: string;
  project_name: string;
  category?: string;
  status: string;
  approval_status?: string | null;
  approval_comment?: string | null;
  created_at: string;
  analyst_id: number;
  file_path?: string;
  comment?: string;
  income_num?: string;
  outcome_num?: string;
  to_whom?: string;
}

interface MapComment {
  comment_id: number;
  map_id: number;
  user_id: number;
  username?: string;
  message: string;
  attachment_path?: string | null;
  created_at: string;
}

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogoClick = () => {
    const event = new CustomEvent('toggle-sentinel-chatbot');
    window.dispatchEvent(event);
  };
  const { mapId } = useParams();
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState<'monitor' | 'summary' | 'review'>('monitor');
  const [stats, setStats] = useState<Stats>({ total: 0, inProgress: 0, complete: 0 });
  const [analysts, setAnalysts] = useState<Analyst[]>([]);
  const [maps, setMaps] = useState<MapRecord[]>([]);
  const [search, setSearch] = useState('');
  const [searchField, setSearchField] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerMapId, setViewerMapId] = useState<number | null>(null);
  const [viewerUniqueId, setViewerUniqueId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<MapRecord | null>(null);
  const [editRecordForModal, setEditRecordForModal] = useState<MapRecord | null>(null);
  const [auditMapIds, setAuditMapIds] = useState<Set<number>>(new Set());
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditRecord, setAuditRecord] = useState<MapRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<MapRecord | null>(null);
  const [selectedMap, setSelectedMap] = useState<MapRecord | null>(null);
  const [detailComments, setDetailComments] = useState<MapComment[]>([]);
  const [loadingDetailComments, setLoadingDetailComments] = useState(false);

  const token = localStorage.getItem('token');
  const isAdmin = user?.role === 'admin';

  // Hook must be called at the top level of the component
  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage && lastMessage.type === 'CHAT_MESSAGE') {
      const msg = lastMessage.data;
      const isViewingMap = (detailRecord && msg.map_id === detailRecord.map_id) || 
                          (selectedMap && msg.map_id === selectedMap.map_id);
      
      if (isViewingMap) {
        setDetailComments(prev => {
          // Prevent duplicates
          if (prev.find(c => c.comment_id === msg.comment_id)) return prev;
          return [...prev, msg];
        });
      }
    }
  }, [lastMessage, detailRecord, selectedMap]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        
        const [statsRes, mapsRes] = await Promise.all([
          axios.get(`${API_URL}/stats/summary`, { headers }),
          axios.get(`${API_URL}/maps/`, { headers })
        ]);
        
        setStats(statsRes.data);
        setMaps(mapsRes.data);
        
        // Handle direct deep links / refreshes / route changes
        if (mapId) {
          const mId = parseInt(mapId);
          const targetMap = mapsRes.data.find((m: MapRecord) => m.map_id === mId);
          if (targetMap) {
            setSelectedMap(targetMap);
            loadMapComments(mId);
            setCurrentView('review');
          } else {
            // Map not found or no access, go back to monitor
            navigate('/', { replace: true });
            setCurrentView('monitor');
            setSelectedMap(null);
          }
        } else {
          // No mapId provided, ensure we are in monitor view
          setCurrentView('monitor');
          setSelectedMap(null);
        }

        const mapIds = mapsRes.data.map((m: MapRecord) => m.map_id);
        if (mapIds.length > 0) {
          try {
            const auditBatchRes = await axios.post(`${API_URL}/maps/audit/batch`, mapIds, { headers });
            const auditIds = new Set<number>((auditBatchRes.data.maps_with_audit || []).map((id: number) => id));
            setAuditMapIds(auditIds);
          } catch (err) {
            console.error('Failed to fetch audit status:', err);
          }
        }
        
        if (isAdmin) {
          const analystsRes = await axios.get(`${API_URL}/stats/analysts`, { headers });
          setAnalysts(analystsRes.data);
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [token, isAdmin, mapId, location.pathname]);
  
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      const headers = { Authorization: `Bearer ${token}` };
      axios.get(`${API_URL}/maps/`, { headers })
        .then(res => {
          if (res.data && Array.isArray(res.data)) {
            setMaps(res.data);
            const mapIds = res.data.map((m: MapRecord) => m.map_id);
            if (mapIds.length > 0) {
              axios.post(`${API_URL}/maps/audit/batch`, mapIds, { headers })
                .then(auditRes => {
                  const auditIds = new Set<number>((auditRes.data.maps_with_audit || []).map((id: number) => id));
                  setAuditMapIds(auditIds);
                })
                .catch(() => {});
            }
          }
        })
        .catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, [token]);

const handleSearch = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/maps/`, { 
        headers,
        params: { 
          search: search || undefined,
          search_field: searchField || 'all'
        }
      });
      setMaps(res.data);
    } catch (err) {
      console.error('Search failed:', err);
    }
  };

  const handleViewNewTab = async (record: MapRecord) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/proxy/preview/${record.map_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json();
      const contentType = payload.media_type || 'application/pdf';
      const isImage = String(contentType).includes('image/');

      const tab = window.open('', '_blank');
      if (!tab) return;

      const title = record.unique_id ? `Preview: ${record.unique_id}` : 'Preview';
      let url: string;
      if (isImage) {
        url = `data:${contentType};base64,${payload.data_base64}`;
      } else {
        const blob = b64ToBlob(payload.data_base64, contentType);
        url = window.URL.createObjectURL(blob);
      }

      tab.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    body { background: #111827; display: flex; align-items: center; justify-content: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .error { color: #f87171; padding: 24px; text-align: center; font-size: 14px; }
    img { max-width: 95vw; max-height: 95vh; object-fit: contain; }
    iframe { width: 100vw; height: 100vh; border: 0; }
  </style>
</head>
<body>
  ${isImage
    ? `<img src="${url}" alt="preview" onerror="document.body.innerHTML='<div class=\\'error\\'>Failed to load image. The file may be corrupted or unsupported.</div>'" />`
    : `<iframe src="${url}" onerror="document.body.innerHTML='<div class=\\'error\\'>Failed to load PDF. The file may be corrupted or unsupported.</div>'"></iframe>`
  }
  <script>
    (function() {
      var blobUrl = '${url}';
      window.addEventListener('beforeunload', function() {
        if (blobUrl) { URL.revokeObjectURL(blobUrl); blobUrl = null; }
      });
    })();
  </script>
</body>
</html>`);
      tab.document.close();
    } catch (err) {
      const errTab = window.open('', '_blank');
      if (errTab) {
        errTab.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Preview Error</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; background: #111827; color: #f87171; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .error-box { text-align: center; }
    .error-box h2 { margin-bottom: 8px; font-size: 18px; }
    .error-box p { font-size: 14px; opacity: 0.8; }
  </style>
</head>
<body>
  <div class="error-box">
    <h2>Failed to load preview</h2>
    <p>${err instanceof Error ? err.message : 'Unknown error occurred'}</p>
  </div>
</body>
</html>`);
        errTab.document.close();
      }
    }
  };

  const handleDownload = async (record: MapRecord) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/proxy/file/${record.map_id}?mode=attachment`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to download');
      }
      
      const contentType = response.headers.get('content-type') || 'application/pdf';
      const blob = await response.blob();
      const ext = contentType.includes('jpeg') || contentType.includes('image') ? 'jpeg' : 'pdf';
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${record.unique_id}.${ext}`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(url), 500);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Download failed. Please try Preview instead.');
    }
  };

  const handleEdit = (record: MapRecord) => {
    setEditRecord(record);
    setEditRecordForModal(record);
    setEditOpen(true);
  };
  
  const handleViewAuditLog = (record: MapRecord) => {
    setAuditRecord(record);
    setAuditOpen(true);
  };
  
  const handleDetail = (record: MapRecord) => {
    setDetailRecord(record);
    setDetailOpen(true);
  };

  const loadMapComments = async (mapId: number, showLoader = true) => {
    try {
      if (showLoader) setLoadingDetailComments(true);
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/maps/${mapId}/comments`, { headers });
      setDetailComments(res.data || []);
    } catch (err) {
      console.error('Failed to load comments:', err);
      setDetailComments([]);
    } finally {
      if (showLoader) setLoadingDetailComments(false);
    }
  };

  const postMapComment = async (mapId: number, message: string, file?: File) => {
    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      };
      const formData = new FormData();
      formData.append('message', message);
      if (file) formData.append('file', file);

      await axios.post(`${API_URL}/maps/${mapId}/comments`, formData, { headers });
      // Refresh comments in background to avoid resetting scroll
      await loadMapComments(mapId, false);
    } catch (err) {
      console.error('Failed to post comment:', err);
      alert('Failed to send message. Please try again.');
    }
  };
  const updateApproval = async (mapId: number, approvalStatus: string, approvalComment: string) => {
    const headers = { Authorization: `Bearer ${token}` };
    await axios.patch(`${API_URL}/maps/${mapId}/approval`, {
      approval_status: approvalStatus,
      approval_comment: approvalComment || null,
    }, { headers });

    const mapsRes = await axios.get(`${API_URL}/maps/`, { headers });
    setMaps(mapsRes.data);
    if (detailRecord) {
      const updated = mapsRes.data.find((m: MapRecord) => m.map_id === detailRecord.map_id) || null;
      setDetailRecord(updated);
    }
  };
  
  const handleRecordChange = (updated: MapRecord | null) => {
    console.log('Record changed:', updated);
    setEditRecordForModal(updated);
  };

  const handleSaveEdit = async (updatedRecord?: MapRecord) => {
    const record = updatedRecord || editRecordForModal;
    if (!record) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const res = await axios.patch(`${API_URL}/maps/${record.map_id}`, {
        comment: record.comment,
        income_num: record.income_num,
        outcome_num: record.outcome_num,
        to_whom: record.to_whom,
      }, { headers });
      
      setEditOpen(false);
      
      setSearch('');
      const mapsRes = await axios.get(`${API_URL}/maps/`, { headers });
      setMaps(mapsRes.data);
      
      const statsRes = await axios.get(`${API_URL}/stats/summary`, { headers });
      setStats(statsRes.data);

      const mapIds = mapsRes.data.map((m: MapRecord) => m.map_id);
      if (mapIds.length > 0) {
        try {
          const auditBatchRes = await axios.post(`${API_URL}/maps/audit/batch`, mapIds, { headers });
          const auditIds = new Set<number>((auditBatchRes.data.maps_with_audit || []).map((id: number) => id));
          setAuditMapIds(auditIds);
        } catch { }
      }
    } catch (err: any) {
      alert('Save failed: ' + (err?.response?.data?.detail || err.message));
    }
  };

  const refreshData = () => {
    handleSearch();
  };

  const navigateToMap = (mapId: number) => {
    const targetMap = maps.find(m => m.map_id === mapId);
    if (targetMap) {
      setSelectedMap(targetMap);
      loadMapComments(mapId);
      navigate(`/approval/${mapId}`);
      setCurrentView('review');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 80 }}
        className="flex flex-col border-r border-gray-200 bg-white shadow-sm"
      >
        <div 
          onClick={handleLogoClick}
          className={`flex h-16 items-center border-b border-gray-200 cursor-pointer hover:bg-slate-50 transition-colors select-none group ${
            isSidebarOpen ? 'px-6 justify-start' : 'justify-center'
          }`}
          title="Toggle AI Assistant"
        >
          <Database className="h-8 w-8 text-blue-600 shrink-0 transition-transform group-hover:scale-108 duration-200" />
          {isSidebarOpen && (
            <span className="ml-3 font-bold text-gray-900 tracking-tight text-xl group-hover:text-blue-600 transition-colors duration-200">
              Sentinel
            </span>
          )}
        </div>
        
        <nav className="flex-1 space-y-2 p-4">
          <NavItem 
            icon={LayoutGrid} 
            label="Monitor" 
            active={currentView === 'monitor'} 
            isOpen={isSidebarOpen}
            onClick={() => setCurrentView('monitor')}
          />
          {isAdmin && (
            <NavItem 
              icon={BarChart3} 
              label="Summary" 
              active={currentView === 'summary'} 
              isOpen={isSidebarOpen}
              onClick={() => setCurrentView('summary')}
            />
          )}
          <NavItem 
            icon={MessageSquare} 
            label="AI Chat" 
            active={false} 
            isOpen={isSidebarOpen}
            onClick={() => navigate('/chat')}
          />
        </nav>

        <div className="border-t border-gray-200 p-4">
          <button 
            onClick={logout}
            className={`flex w-full items-center rounded-lg py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors ${
              isSidebarOpen ? 'px-3 justify-start' : 'justify-center'
            }`}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {isSidebarOpen && <span className="ml-3 truncate">Logout</span>}
          </button>
        </div>
      </motion.aside>

      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="mx-auto max-w-[1920px] px-2 md:px-4">
          {/* Header */}
          <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
                {currentView === 'monitor' ? 'Monitor' : 'Summary'}
              </h1>
              <p className="mt-1 text-gray-500 text-sm md:text-base">Welcome back, {user?.username}</p>
            </div>
            <div className="flex items-center gap-4">
              <NotificationBell 
                onNavigate={navigateToMap} 
                currentlyViewingMapId={selectedMap?.map_id || detailRecord?.map_id || null}
              />
              <div className="hidden md:flex items-center gap-2 text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium font-mono">
                  {currentTime.toLocaleTimeString()}
                </span>
              </div>
              <Button onClick={() => setIsSidebarOpen(!isSidebarOpen)} variant="secondary" className="md:hidden">
                Menu
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <SummaryCards stats={stats} />

          {/* Main Content Area */}
          <div className="mt-8 md:mt-12">
            {currentView === 'monitor' ? (
              /* Monitor View - Map Table */
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <h2 className="text-xl font-semibold text-gray-900">All Maps</h2>
                    {selectedMap && (isAdmin || selectedMap.analyst_id === user?.user_id || selectedMap.approval_status === 'Editing Required') && (
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                      >
                        <Button
                          onClick={() => {
                            loadMapComments(selectedMap.map_id);
                            navigate(`/approval/${selectedMap.map_id}`);
                            setCurrentView('review');
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center gap-2 animate-pulse"
                        >

                          <Database className="h-4 w-4" />
                          {isAdmin ? `Decision Making for ${selectedMap.unique_id}` : `View Feedback for ${selectedMap.unique_id}`}
                        </Button>
                      </motion.div>
                    )}
                  </div>
                  <div className="flex gap-2 md:gap-4 w-full md:w-auto">
                      <select
                        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchField}
                        onChange={(e) => setSearchField(e.target.value)}
                      >
                        <option value="all" hidden>All Fields</option>
                        <option value="unique_id">ID</option>
                        <option value="layout_name">Layout</option>
                        <option value="income_num">رقم الوارد</option>
                        <option value="outcome_num">رقم الصادر</option>
                        <option value="to_whom">جهه الولاية</option>
                        <option value="status">حالة الدراسة</option>
                        <option value="comment">ملاحظات</option>
                        <option value="approval_status">Approval Status</option>
                      </select>
                      <Input 
                        placeholder="Search..." 
                        className="w-full md:w-64"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      />
                      <Button variant="outline" onClick={handleSearch} className="shrink-0">
                        Search
                      </Button>
                    </div>
                </div>
                <MapTable 
                  data={maps} 
                  currentUserId={user?.user_id || 0} 
                  userRole={user?.role || 'edit'} 
                  onViewNewTab={handleViewNewTab}
                  onEdit={handleEdit}
                  onDownload={handleDownload}
                  onDetail={handleDetail}
                  onAuditLog={handleViewAuditLog}
                  hasAuditLog={(mapId) => auditMapIds.has(mapId)}
                  selectedMapId={selectedMap?.map_id || null}
                  onSelectMap={setSelectedMap}
                />
              </div>
            ) : currentView === 'summary' ? (
              /* Summary View - Full Analyst Stats */
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">All Users Performance</h2>
                {analysts.length > 0 ? (
                  <AnalystStats stats={analysts} />
                ) : (
                  <p className="text-gray-500">No user data available.</p>
                )}
              </div>
            ) : (
              /* Review Mode */
              selectedMap && (
                <ReviewMode 
                  record={selectedMap}
                  onBack={() => {
                    navigate('/');
                    setCurrentView('monitor');
                  }}
                  currentUserId={user?.user_id || 0}
                  userRole={user?.role || 'edit'}
                  comments={detailComments}
                  loadingComments={loadingDetailComments}
                  onPostComment={postMapComment}
                  onUpdateApproval={updateApproval}
                />
              )
            )}
          </div>
        </div>
      </main>

      <EditModal 
        isOpen={editOpen} 
        onClose={() => setEditOpen(false)} 
        record={editRecordForModal}
        onSave={handleSaveEdit}
        onRecordChange={handleRecordChange}
        onAuditLog={() => {
          if (editRecordForModal) {
            setEditOpen(false);
            setAuditRecord(editRecordForModal);
            setAuditOpen(true);
          }
        }}
      />
      
      {auditRecord && (
        <AuditLogModal 
          isOpen={auditOpen} 
          onClose={() => setAuditOpen(false)} 
          record={auditRecord}
        />
      )}
      
      <MapDetailModal
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        record={detailRecord}
        onViewNewTab={handleViewNewTab}
        onDownload={handleDownload}
        onEdit={handleEdit}
        onAuditLog={handleViewAuditLog}
        hasAuditLog={(mapId) => auditMapIds.has(mapId)}
        currentUserId={user?.user_id || 0}
        userRole={user?.role || 'edit'}
        comments={detailComments}
        loadingComments={loadingDetailComments}
        onLoadComments={loadMapComments}
        onPostComment={postMapComment}
        onUpdateApproval={updateApproval}
      />
      <ChatBot />
    </div>
  );
};

const NavItem = ({ icon: Icon, label, active = false, isOpen = true, onClick }: { icon: React.ElementType, label: string, active?: boolean, isOpen?: boolean, onClick?: () => void }) => (
  <button 
    onClick={onClick}
    className={`flex w-full items-center rounded-lg py-2 text-sm font-medium transition-colors ${
      isOpen ? 'px-3 justify-start' : 'justify-center'
    } ${
      active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`}
  >
    <Icon className="h-5 w-5 shrink-0" />
    {isOpen && <span className="ml-3 truncate">{label}</span>}
  </button>
);
