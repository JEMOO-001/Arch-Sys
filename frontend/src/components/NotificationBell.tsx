import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, MessageSquare, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import axios from 'axios';
import { useWebSocket } from '../contexts/WebSocketContext';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api/v1';

interface Notification {
  id: number;
  map_id: number;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationBellProps {
  onNavigate: (mapId: number) => void;
  currentlyViewingMapId?: number | null;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onNavigate, currentlyViewingMapId }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { lastMessage } = useWebSocket();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const token = localStorage.getItem('token');

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // Auto-read notifications for the map currently being viewed
      if (currentlyViewingMapId) {
        await axios.patch(`${API_URL}/notifications/read-map/${currentlyViewingMapId}`, {}, { headers });
      }

      const res = await axios.get(`${API_URL}/notifications/`, { headers });
      setNotifications(res.data || []);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [token, currentlyViewingMapId]);

  useEffect(() => {
    if (lastMessage && lastMessage.type === 'NOTIFICATION') {
      // Logic for "Instant" update: 
      // If message is for currently viewing map, don't even add to list, just sync
      if (currentlyViewingMapId && lastMessage.data.map_id === currentlyViewingMapId) {
        const headers = { Authorization: `Bearer ${token}` };
        axios.patch(`${API_URL}/notifications/read-map/${currentlyViewingMapId}`, {}, { headers });
      } else {
        fetchNotifications();
      }
    }
  }, [lastMessage, currentlyViewingMapId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id: number) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.patch(`${API_URL}/notifications/${id}/read`, {}, { headers });
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.patch(`${API_URL}/notifications/read-all`, {}, { headers });
      setNotifications([]);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleNotificationClick = (n: Notification) => {
    markAsRead(n.id);
    onNavigate(n.map_id);
    setIsOpen(false);
  };

  const unreadCount = notifications.length;

  const getIcon = (type: string, message: string) => {
    if (type === 'comment') return <MessageSquare className="h-4 w-4" />;
    if (message.includes('Approve')) return <CheckCircle className="h-4 w-4" />;
    if (message.includes('Hold')) return <Clock className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  const getColorClass = (type: string, message: string) => {
    if (type === 'comment') return 'bg-blue-100 text-blue-600';
    if (message.includes('Approve')) return 'bg-green-100 text-green-600';
    if (message.includes('Hold')) return 'bg-amber-100 text-amber-600';
    if (message.includes('Editing')) return 'bg-blue-100 text-blue-600';
    return 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative rounded-full p-2 transition-colors ${
          isOpen ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'
        }`}
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl z-50"
          >
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-3">
              <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  Mark all as read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                  <div className="rounded-full bg-gray-50 p-3 mb-3">
                    <Bell className="h-6 w-6 text-gray-300" />
                  </div>
                  <p className="text-sm text-gray-500">No new notifications</p>
                  <p className="text-xs text-gray-400 mt-1">You're all caught up!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className="group relative flex gap-3 p-4 hover:bg-blue-50/50 transition-colors cursor-pointer"
                    >
                      <div className={`mt-1 h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${getColorClass(n.type, n.message)}`}>
                        {getIcon(n.type, n.message)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-800 font-medium leading-snug">{n.message}</p>
                        <p className="mt-1 text-[10px] text-gray-400">
                          {new Date(n.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(n.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-blue-100 text-blue-600 transition-all"
                        title="Mark as read"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="border-t border-gray-100 p-3 text-center">
              <button 
                onClick={() => setIsOpen(false)}
                className="text-xs font-semibold text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
