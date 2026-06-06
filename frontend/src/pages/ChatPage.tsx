import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Sparkles, Plus, Trash2, Edit3, Download, 
  ArrowLeft, History, MessageSquare, Check, AlertCircle, Bot, Database 
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { MarkdownRenderer } from '../components/ChatBot';

const API_URL = (import.meta.env.VITE_API_URL || 'http://172.20.0.149:8000') + '/api/v1';

interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  timestamp: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
}

const WELCOME_MESSAGE = (name: string): ChatMessage => ({
  id: 'welcome',
  role: 'bot',
  text: `Hi ${name}! I'm Sentinel AI, your database intelligence hub. 🛡️\n\nI can read and query active layouts, map comments, users, categories, audit logs, and notifications. Ask me anything in English or Arabic!`,
  timestamp: new Date().toISOString(),
});

const SUGGESTIONS = [
  { text: '📊 Show overall map statistics', icon: '📊' },
  { text: '💬 Find comments for map AB-0023 containing "review"', icon: '💬' },
  { text: '👥 List all active users and their roles', icon: '👥' },
  { text: '📋 Show registered projects and clients', icon: '📋' },
];

export const ChatPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string>('');
  const [editTitleValue, setEditTitleValue] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  // Load chat sessions from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('sentinel_saved_chats');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ChatSession[];
        setSessions(parsed);
        if (parsed.length > 0) {
          setActiveSessionId(parsed[0].id);
        } else {
          createNewSession();
        }
      } catch (e) {
        createNewSession();
      }
    } else {
      createNewSession();
    }
  }, []);

  // Save sessions to localStorage whenever they change
  const saveSessions = (updated: ChatSession[]) => {
    setSessions(updated);
    localStorage.setItem('sentinel_saved_chats', JSON.stringify(updated));
  };

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages, isLoading]);

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title: `Chat Session ${new Date().toLocaleDateString()}`,
      messages: [WELCOME_MESSAGE(user?.username || 'User')],
      createdAt: new Date().toISOString(),
    };

    const updated = [newSession, ...sessions];
    saveSessions(updated);
    setActiveSessionId(newSession.id);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    const updated = sessions.filter(s => s.id !== id);
    saveSessions(updated);
    
    if (activeSessionId === id) {
      if (updated.length > 0) {
        setActiveSessionId(updated[0].id);
      } else {
        // If all deleted, create a fresh new one
        const newSession: ChatSession = {
          id: crypto.randomUUID(),
          title: `Chat Session ${new Date().toLocaleDateString()}`,
          messages: [WELCOME_MESSAGE(user?.username || 'User')],
          createdAt: new Date().toISOString(),
        };
        saveSessions([newSession]);
        setActiveSessionId(newSession.id);
      }
    }
  };

  const startEditingSession = (id: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setEditingSessionId(id);
    setEditTitleValue(currentTitle);
  };

  const saveSessionTitle = (id: string) => {
    if (!editTitleValue.trim()) return;
    const updated = sessions.map(s => {
      if (s.id === id) {
        return { ...s, title: editTitleValue.trim() };
      }
      return s;
    });
    saveSessions(updated);
    setEditingSessionId('');
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading || !activeSessionId) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: text.trim(),
      timestamp: new Date().toISOString(),
    };

    // Append user message
    let currentSession = sessions.find(s => s.id === activeSessionId);
    if (!currentSession) return;

    const sessionMessages = [...currentSession.messages, userMsg];
    let updatedTitle = currentSession.title;
    
    // Auto generate title on first user message
    const isFirstUserMsg = !currentSession.messages.some(m => m.role === 'user');
    if (isFirstUserMsg) {
      const words = text.trim().split(' ');
      updatedTitle = words.slice(0, 4).join(' ') + (words.length > 4 ? '...' : '');
    }

    const updatedSession: ChatSession = {
      ...currentSession,
      title: updatedTitle,
      messages: sessionMessages,
    };

    const updatedSessions = sessions.map(s => s.id === activeSessionId ? updatedSession : s);
    saveSessions(updatedSessions);
    setInputValue('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.post(
        `${API_URL}/chat`,
        { message: text.trim() },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const botMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'bot',
        text: data.reply || 'Sorry, I could not process that.',
        timestamp: new Date().toISOString(),
      };

      const finalSession = {
        ...updatedSession,
        messages: [...sessionMessages, botMsg],
      };

      saveSessions(sessions.map(s => s.id === activeSessionId ? finalSession : s));
    } catch (err: any) {
      const errorText =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        'Something went wrong. Please try again.';

      const finalSession = {
        ...updatedSession,
        messages: [
          ...sessionMessages,
          {
            id: crypto.randomUUID(),
            role: 'bot' as const,
            text: `⚠️ ${errorText}`,
            timestamp: new Date().toISOString(),
          },
        ],
      };

      saveSessions(sessions.map(s => s.id === activeSessionId ? finalSession : s));
    } finally {
      setIsLoading(false);
    }
  };

  const exportChat = () => {
    if (!activeSession) return;
    const textContent = activeSession.messages
      .map(m => `[${m.role === 'user' ? 'USER' : 'AI'}] - ${new Date(m.timestamp).toLocaleTimeString()}\n${m.text}\n`)
      .join('\n---\n\n');

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeSession.title.replace(/\s+/g, '_')}_transcript.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50 text-gray-800 font-sans">
      
      {/* ───── LEFT SIDEBAR (SAVED CHATS) ───── */}
      <div className="w-80 shrink-0 flex flex-col bg-white border-r border-gray-200 relative z-10 shadow-sm">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-150 flex items-center gap-3">
          <Link 
            to="/" 
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors shadow-sm"
            title="Back to Dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-sm font-bold text-gray-900 tracking-wide uppercase">Sentinel AI</h1>
            <p className="text-[9px] text-gray-400 uppercase tracking-wider font-bold">Saved Sessions</p>
          </div>
        </div>

        {/* Action Button */}
        <div className="px-4 py-3">
          <button
            onClick={createNewSession}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all hover:scale-[1.01] active:scale-99"
          >
            <Plus className="h-4 w-4" />
            New Thread
          </button>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1 scrollbar-thin scrollbar-thumb-gray-200">
          <div className="px-3 py-1.5 text-[9px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <History className="h-3 w-3 text-gray-400" />
            History ({sessions.length})
          </div>

          <AnimatePresence initial={false}>
            {sessions.map(s => {
              const isActive = s.id === activeSessionId;
              const isEditing = s.id === editingSessionId;
              return (
                <motion.div
                  key={s.id}
                  layoutId={s.id}
                  onClick={() => !isEditing && setActiveSessionId(s.id)}
                  className={`group relative flex items-center justify-between px-3 py-3 rounded-lg cursor-pointer transition-all border ${
                    isActive
                      ? 'bg-blue-50 border-blue-100 text-blue-700 shadow-sm'
                      : 'bg-transparent border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <MessageSquare className={`h-4 w-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-450'}`} />
                    
                    {isEditing ? (
                      <input
                        type="text"
                        value={editTitleValue}
                        onChange={(e) => setEditTitleValue(e.target.value)}
                        onBlur={() => saveSessionTitle(s.id)}
                        onKeyDown={(e) => e.key === 'Enter' && saveSessionTitle(s.id)}
                        autoFocus
                        className="flex-1 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 text-xs text-gray-900 outline-none focus:bg-white focus:border-blue-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-semibold truncate ${isActive ? 'text-blue-700' : 'text-gray-700'}`}>{s.title}</p>
                        <p className={`text-[9px] mt-0.5 font-medium ${isActive ? 'text-blue-500/80' : 'text-gray-400'}`}>
                          {new Date(s.createdAt).toLocaleDateString()} • {s.messages.length} msg
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions on hover */}
                  {!isEditing && (
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 ml-2 transition-opacity shrink-0">
                      <button
                        onClick={(e) => startEditingSession(s.id, s.title, e)}
                        title="Rename Thread"
                        className="p-1 rounded text-gray-400 hover:text-gray-750 hover:bg-gray-100 transition-colors"
                      >
                        <Edit3 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => deleteSession(s.id, e)}
                        title="Delete Thread"
                        className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  {isEditing && (
                    <button
                      onClick={() => saveSessionTitle(s.id)}
                      className="p-1 rounded text-blue-600 hover:text-blue-700 transition-colors ml-2"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* User profile footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center font-bold text-gray-755 text-sm shadow-sm">
            {user?.username?.substring(0, 2).toUpperCase() || 'US'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-900 truncate">{user?.username || 'Active Analyst'}</p>
            <p className="text-[9px] text-gray-500 capitalize tracking-wide font-medium">{user?.role || 'edit'} Account</p>
          </div>
        </div>
      </div>

      {/* ───── RIGHT CONTENT PANE (FULL SCREEN CHAT AREA) ───── */}
      <div className="flex-1 flex flex-col min-w-0 relative z-0">
        
        {/* Background mesh */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.03),transparent_60%)] bg-gray-50 pointer-events-none" />

        {/* Top Navbar */}
        <div className="relative z-10 px-6 py-4 bg-white border-b border-gray-200 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 border border-blue-100 shadow-sm text-blue-600">
              <Database className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 tracking-wide">
                {activeSession ? activeSession.title : 'Assistant Workspace'}
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Local LM Studio Server (Port 1234)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportChat}
              disabled={!activeSession || activeSession.messages.length <= 1}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs text-gray-600 transition-all hover:bg-gray-50 hover:text-gray-900 active:scale-98 shadow-sm disabled:opacity-40 disabled:hover:bg-white"
              title="Export Conversation History"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
          </div>
        </div>

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 scrollbar-thin scrollbar-thumb-gray-200 relative z-10">
          <div className="max-w-4xl mx-auto w-full space-y-4">
            
            {activeSession && activeSession.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                {msg.role === 'bot' && (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 border border-blue-100 text-blue-600 shadow-sm">
                    <Sparkles className="h-4.5 w-4.5" />
                  </div>
                )}

                {/* Bubble */}
                <div
                  dir="auto"
                  className={`px-5 py-3 text-[13px] leading-relaxed shadow-sm ${
                    msg.role === 'user'
                      ? 'max-w-[75%] rounded-xl bg-blue-600 text-white border border-blue-500 shadow-sm'
                      : 'max-w-[90%] rounded-xl bg-white border border-gray-205 text-gray-800'
                  }`}
                >
                  {msg.role === 'bot' ? (
                    <MarkdownRenderer text={msg.text} />
                  ) : (
                    msg.text
                  )}
                  
                  <span className={`block text-[9px] mt-2 text-right font-medium ${msg.role === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}

            {/* Empty state suggestions */}
            {activeSession && activeSession.messages.length === 1 && (
              <div className="pt-6 space-y-6">
                <div className="text-center max-w-lg mx-auto">
                  <Bot className="h-9 w-9 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-gray-900">Ask Sentinel AI Anything</h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed font-medium">
                    Instantly retrieve live maps, performance metrics, Categories, notifications or verbatim comment text from SQL Server.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                  {SUGGESTIONS.map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendMessage(chip.text)}
                      className="flex items-start gap-3 p-3.5 text-left rounded-lg border border-gray-200 bg-white hover:bg-blue-50/50 hover:border-blue-300 transition-all group active:scale-[0.99] shadow-sm"
                    >
                      <span className="text-lg">{chip.icon}</span>
                      <span className="text-[12px] text-gray-700 group-hover:text-blue-600 font-semibold leading-normal">
                        {chip.text}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Recommendations Banner */}
                <div className="p-4 rounded-lg border border-blue-100 bg-blue-50/30 max-w-2xl mx-auto flex items-start gap-3 shadow-sm animate-fade-in">
                  <AlertCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-blue-900">💡 Suggested Premium Upgrades</h4>
                    <ul className="text-[11px] text-gray-600 mt-1 space-y-1 list-disc pl-4 font-semibold">
                      <li><strong>Voice Dictation</strong>: dictate layout queries hands-free.</li>
                      <li><strong>Conversation Sharing</strong>: export links to share audits with other Admins.</li>
                      <li><strong>AI report downloads</strong>: auto-generate formal layout review sheets in PDF format.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {isLoading && (
              <div className="flex items-start gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 border border-blue-100 text-blue-500 shadow-sm animate-pulse">
                  <Sparkles className="h-4.5 w-4.5" />
                </div>
                <div className="rounded-xl bg-white border border-gray-200 px-5 py-4 shadow-sm">
                  <div className="flex items-center gap-1.5 py-1">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="block h-2 w-2 rounded-full bg-gray-400"
                        animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                          delay: i * 0.15,
                          ease: 'easeInOut',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Input Area */}
        <div className="relative z-10 border-t border-gray-200 bg-white px-6 py-4">
          <div className="max-w-4xl mx-auto w-full flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              dir="auto"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder="Query Sentinel database (e.g., stats, comments, users, categories...)"
              className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-5 py-3 text-[13.5px] text-gray-900 placeholder-gray-400 outline-none transition-all focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 disabled:opacity-50 shadow-sm"
            />
            <button
              onClick={() => sendMessage(inputValue)}
              disabled={isLoading || !inputValue.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-40"
            >
              <Send className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
