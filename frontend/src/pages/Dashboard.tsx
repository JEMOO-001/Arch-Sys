import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Database, LogOut, LayoutGrid, BarChart3, Clock } from 'lucide-react';
import { MapTable } from '../components/MapTable';
import { SummaryCards } from '../components/SummaryCards';
import { AnalystStats } from '../components/AnalystStats';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { EditModal } from '../components/EditModal';
import { AuditLogModal } from '../components/AuditLogModal';
import { MapDetailModal } from '../components/MapDetailModal';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api/v1';

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
  notStarted: number;
  inProgress: number;
  complete: number;
  onHold: number;
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
  created_at: string;
  analyst_id: number;
  file_path?: string;
  comment?: string;
  income_num?: string;
  outcome_num?: string;
  to_whom?: string;
}

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState<'monitor' | 'summary'>('monitor');
  const [stats, setStats] = useState<Stats>({ total: 0, notStarted: 0, inProgress: 0, complete: 0, onHold: 0 });
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

  const token = localStorage.getItem('token');
  const isAdmin = user?.role === 'admin' || user?.role === 'owner';

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
  }, [token, isAdmin]);
  
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
    const tab = window.open('', '_blank');
    if (!tab) return;
    tab.document.write('<html><body style="font-family:sans-serif;padding:16px">Loading preview...</body></html>');
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
      const blob = b64ToBlob(payload.data_base64, contentType);
      const url = window.URL.createObjectURL(blob);
      const isImage = String(contentType).includes('image/');
      tab.document.write(`
        <html>
          <body style="margin:0;background:#111827;display:flex;align-items:center;justify-content:center;min-height:100vh">
            ${isImage
              ? `<img src="${url}" style="max-width:95vw;max-height:95vh;object-fit:contain" alt="preview" />`
              : `<iframe src="${url}" style="width:100vw;height:100vh;border:0"></iframe>`
            }
          </body>
        </html>
      `);
      tab.document.close();
    } catch {
      tab.document.write('<html><body style="font-family:sans-serif;padding:16px;color:#b91c1c">Failed to load preview.</body></html>');
      tab.document.close();
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
        status: record.status,
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
        <div className="flex h-16 items-center border-b border-gray-200 px-6">
          <Database className="h-8 w-8 text-blue-600 shrink-0" />
          {isSidebarOpen && <span className="ml-3 font-bold text-gray-900 tracking-tight text-xl">Sentinel</span>}
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
        </nav>

        <div className="border-t border-gray-200 p-4">
          <button 
            onClick={logout}
            className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
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
                  <h2 className="text-xl font-semibold text-gray-900">All Maps</h2>
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
                  userRole={user?.role || 'analyst'} 
                  onViewNewTab={handleViewNewTab}
                  onEdit={handleEdit}
                  onDownload={handleDownload}
                  onDetail={handleDetail}
                  onAuditLog={handleViewAuditLog}
                  hasAuditLog={(mapId) => auditMapIds.has(mapId)}
                />
              </div>
            ) : (
              /* Summary View - Full Analyst Stats */
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">All Users Performance</h2>
                {analysts.length > 0 ? (
                  <AnalystStats stats={analysts} />
                ) : (
                  <p className="text-gray-500">No user data available.</p>
                )}
              </div>
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
        userRole={user?.role || 'analyst'}
      />
    </div>
  );
};

const NavItem = ({ icon: Icon, label, active = false, isOpen = true, onClick }: { icon: React.ElementType, label: string, active?: boolean, isOpen?: boolean, onClick?: () => void }) => (
  <button 
    onClick={onClick}
    className={`flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`}
  >
    <Icon className="h-5 w-5 shrink-0" />
    {isOpen && <span className="ml-3 truncate">{label}</span>}
  </button>
);
