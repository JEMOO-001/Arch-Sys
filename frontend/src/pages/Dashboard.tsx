import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Plus, LayoutDashboard, Database, Settings, LogOut } from 'lucide-react';
import { MapTable } from '../components/MapTable';
import { SummaryCards } from '../components/SummaryCards';
import { AnalystStats } from '../components/AnalystStats';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

export const Dashboard: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Mock data for UI tuning
  const stats = { total: 124, inProgress: 12, complete: 98, onHold: 14 };
  const analysts = [
    { analyst_id: 1, full_name: "John Doe", total_count: 45, completed_count: 40, last_archive: "2026-04-20" },
    { analyst_id: 2, full_name: "Jane Smith", total_count: 79, completed_count: 58, last_archive: "2026-04-21" }
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 80 }}
        className="flex flex-col border-r border-gray-200 bg-white shadow-sm"
      >
        <div className="flex h-16 items-center border-b border-gray-200 px-6">
          <Database className="h-8 w-8 text-blue-600" />
          {isSidebarOpen && <span className="ml-3 font-bold text-gray-900 tracking-tight text-xl">Sentinel</span>}
        </div>
        
        <nav className="flex-1 space-y-2 p-4">
          <NavItem icon={LayoutDashboard} label="Dashboard" active isOpen={isSidebarOpen} />
          <NavItem icon={Database} label="Records" isOpen={isSidebarOpen} />
          <NavItem icon={Settings} label="Settings" isOpen={isSidebarOpen} />
        </nav>

        <div className="border-t border-gray-200 p-4">
          <NavItem icon={LogOut} label="Logout" isOpen={isSidebarOpen} />
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Monitoring Overview</h1>
              <p className="mt-1 text-gray-500">Real-time status of all GIS layout production.</p>
            </div>
            <Button onClick={() => setIsSidebarOpen(!isSidebarOpen)} variant="secondary">
              Toggle Sidebar
            </Button>
          </div>

          <SummaryCards stats={stats} />

          <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
               <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Recent Archives</h2>
                  <div className="flex gap-4">
                     <Input placeholder="Search..." className="w-64" />
                     <Button variant="outline"><Filter className="h-4 w-4" /></Button>
                  </div>
               </div>
               <MapTable data={[]} currentUserId={1} userRole="admin" onView={()=>{}} onEdit={()=>{}} />
            </div>
            
            <div>
              <AnalystStats stats={analysts} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const NavItem = ({ icon: Icon, label, active = false, isOpen = true }) => (
  <button className={`flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
  }`}>
    <Icon className="h-5 w-5 shrink-0" />
    {isOpen && <span className="ml-3 truncate">{label}</span>}
  </button>
);
