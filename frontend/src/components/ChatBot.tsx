import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Bot, X, Send, Sparkles, Maximize2, Database, BrainCircuit, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  '📊 Show statistics',
  '🗺️ Recent maps',
  '👥 Analyst performance',
  '📋 List categories',
];

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'bot',
  text: "Hi! I'm Sentinel AI 👋 Ask me anything about your archived maps, statistics, or audit history.",
  timestamp: new Date(),
};

// ---------------------------------------------------------------------------
// Premium Markdown & Table Renderer (Clean Slate Eye-Comfort Theme)
// ---------------------------------------------------------------------------
export const MarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;

  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  let currentTableLines: string[] = [];

  const parseInlineMarkdown = (line: string) => {
    if (!line) return '';
    const rawParts = line.split(/(\*\*.*?\*\*|`.*?`)/);
    return rawParts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={idx} className="px-1.5 py-0.5 rounded bg-gray-100 text-blue-600 font-mono text-[11px] border border-gray-200">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  const renderTable = (tableLines: string[], index: number) => {
    if (tableLines.length < 2) return null;
    
    // Parse headers
    const headerCols = tableLines[0]
      .split('|')
      .map(c => c.trim())
      .filter((c, i, arr) => i > 0 && i < arr.length - 1);
      
    // Parse rows (skipping divider line at index 1)
    const rows = tableLines.slice(2).map(rowLine => {
      return rowLine
        .split('|')
        .map(c => c.trim())
        .filter((c, i, arr) => i > 0 && i < arr.length - 1);
    }).filter(row => row.length > 0);

    return (
      <div key={`table-${index}`} className="my-3 overflow-x-auto rounded-lg border border-gray-200 shadow-sm bg-white">
        <table className="w-full text-left border-collapse text-[12px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {headerCols.map((h, i) => (
                <th key={i} className="px-4 py-2.5 font-semibold text-gray-700 tracking-wide">
                  {parseInlineMarkdown(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rIdx) => (
              <tr 
                key={rIdx} 
                className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors bg-white"
              >
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-4 py-2 text-gray-600 font-medium">
                    {parseInlineMarkdown(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('|')) {
      currentTableLines.push(lines[i]);
    } else {
      if (currentTableLines.length > 0) {
        blocks.push(renderTable(currentTableLines, i));
        currentTableLines = [];
      }
      
      if (!line) {
        blocks.push(<div key={`br-${i}`} className="h-1.5" />);
        continue;
      }

      // Parse headers (# , ## , ###)
      if (line.startsWith('#')) {
        const match = line.match(/^(#{1,6})\s+(.*)/);
        if (match) {
          const level = match[1].length;
          const headerText = match[2];
          const parsedContent = parseInlineMarkdown(headerText);
          
          if (level === 1) {
            blocks.push(<h1 key={`h-${i}`} className="text-base font-bold text-gray-900 mt-3.5 mb-2 border-b border-gray-200 pb-1">{parsedContent}</h1>);
          } else if (level === 2) {
            blocks.push(<h2 key={`h-${i}`} className="text-sm font-bold text-gray-800 mt-3 mb-1.5">{parsedContent}</h2>);
          } else if (level === 3) {
            blocks.push(<h3 key={`h-${i}`} className="text-xs font-bold text-gray-700 mt-2.5 mb-1">{parsedContent}</h3>);
          } else {
            blocks.push(<h4 key={`h-${i}`} className="text-[11px] font-bold text-gray-500 mt-2 mb-1 uppercase tracking-wider">{parsedContent}</h4>);
          }
          continue;
        }
      }

      if (line.startsWith('* ') || line.startsWith('- ')) {
        blocks.push(
          <li key={`li-${i}`} className="ml-5 list-disc text-gray-750 py-0.5 pl-1 leading-relaxed text-[12.5px]">
            {parseInlineMarkdown(line.slice(2))}
          </li>
        );
      } else if (/^\d+\.\s/.test(line)) {
        const match = line.match(/^(\d+)\.\s(.*)/);
        if (match) {
          blocks.push(
            <li key={`ol-${i}`} className="ml-5 list-decimal text-gray-755 py-0.5 pl-1 leading-relaxed text-[12.5px]">
              {parseInlineMarkdown(match[2])}
            </li>
          );
        }
      } else {
        blocks.push(
          <p key={`p-${i}`} className="leading-relaxed mb-0.5 text-[12.5px] text-gray-700">
            {parseInlineMarkdown(lines[i])}
          </p>
        );
      }
    }
  }

  if (currentTableLines.length > 0) {
    blocks.push(renderTable(currentTableLines, lines.length));
  }

  return <div className="space-y-0.5">{blocks}</div>;
};

// ---------------------------------------------------------------------------
// Typing Indicator
// ---------------------------------------------------------------------------
const TypingIndicator: React.FC = () => (
  <div className="flex items-start gap-2.5 mb-3">
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 shadow-sm border border-blue-100">
      <Sparkles className="h-3.5 w-3.5" />
    </div>
    <div className="rounded-2xl rounded-tl-sm bg-white border border-gray-200 px-4 py-3 shadow-sm">
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="block h-1.5 w-1.5 rounded-full bg-gray-400"
            animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
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
);

// ---------------------------------------------------------------------------
// ChatBot Floating Widget
// ---------------------------------------------------------------------------
export const ChatBot: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showBadge, setShowBadge] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Listen to left logo toggle event
  useEffect(() => {
    const handleToggle = () => {
      setIsOpen(prev => !prev);
    };
    window.addEventListener('toggle-sentinel-chatbot', handleToggle);
    return () => window.removeEventListener('toggle-sentinel-chatbot', handleToggle);
  }, []);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setShowBadge(false);
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [isOpen]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const { data } = await api.post(
        '/chat',
        { message: text.trim() }
      );

      const botMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'bot',
        text: data.reply || 'Sorry, I could not process that.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorText =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        'Something went wrong. Please try again.';

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'bot',
          text: `⚠️ ${errorText}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  const showSuggestions = messages.length === 1 && messages[0].id === 'welcome';

  return (
    <>
      {/* ───── Chat Panel ───── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chat-panel"
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="fixed z-50 flex flex-col overflow-hidden rounded-xl shadow-xl border border-gray-250 transition-all duration-300 bottom-24 right-6 w-[380px] h-[500px]"
          >
            {/* Soft Light Slate Background */}
            <div className="absolute inset-0 bg-[#f8fafc] rounded-xl pointer-events-none" />

            {/* ── Header (Corporate Blue Navbar) ── */}
            <div className="relative z-10 flex items-center gap-3 px-5 py-3.5 bg-blue-600 border-b border-blue-700 shadow-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-700 border border-blue-500 shadow-sm">
                <Database className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-bold text-white tracking-wide uppercase">
                  Sentinel AI
                </h3>
                <p className="text-[10px] text-blue-100 font-semibold tracking-wider uppercase mt-0.5">
                  Database Assistant
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Expand / Redirect to Full Chat Page */}
                <button
                  onClick={() => navigate('/chat')}
                  title="Expand to Full Workspace"
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-700/50 border border-blue-500/50 text-blue-100 hover:bg-blue-700 hover:text-white transition-all active:scale-95"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
                {/* Close Button */}
                <button
                  onClick={() => setIsOpen(false)}
                  title="Close"
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-700/50 border border-blue-500/50 text-blue-100 hover:bg-blue-700 hover:text-white transition-all active:scale-95"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* ── Messages ── */}
            <div className="relative z-10 flex-1 overflow-y-auto px-4 py-4 space-y-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
              <div>
                {messages.map((msg) => (
                  <div
                     key={msg.id}
                     className={`flex items-start gap-2.5 mb-4 ${
                       msg.role === 'user' ? 'flex-row-reverse' : ''
                     }`}
                  >
                    {/* Avatar */}
                    {msg.role === 'bot' && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 border border-blue-100 text-blue-600 shadow-sm">
                        <Bot className="h-3.5 w-3.5" />
                      </div>
                    )}

                    {/* Bubble */}
                    <div
                      dir="auto"
                      className={`px-4 py-2.5 text-[12.5px] leading-relaxed whitespace-pre-wrap shadow-sm ${
                        msg.role === 'user'
                          ? 'max-w-[75%] rounded-xl bg-blue-600 text-white border border-blue-500 shadow-sm'
                          : 'max-w-[90%] rounded-xl bg-white border border-gray-200 text-gray-800'
                      }`}
                    >
                      {msg.role === 'bot' ? (
                        <MarkdownRenderer text={msg.text} />
                      ) : (
                        msg.text
                      )}
                    </div>
                  </div>
                ))}

                {/* Suggestion chips */}
                {showSuggestions && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35, duration: 0.4 }}
                    className="flex flex-wrap gap-2 pt-1 pb-2 pl-9"
                  >
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => sendMessage(s)}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[11.5px] text-gray-600 transition-all hover:bg-blue-50 hover:border-blue-350 hover:text-blue-600 active:scale-95 shadow-sm font-semibold"
                      >
                        {s}
                      </button>
                    ))}
                  </motion.div>
                )}

                {isLoading && <TypingIndicator />}
              </div>

              <div ref={messagesEndRef} />
            </div>

            {/* ── Input ── */}
            <div className="relative z-10 border-t border-gray-200 bg-white px-4 py-3">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  dir="auto"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  placeholder="Ask about maps, stats, users, comments..."
                  className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2 text-[12.5px] text-gray-900 placeholder-gray-400 outline-none transition-all focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 disabled:opacity-50"
                />
                <button
                  onClick={() => sendMessage(inputValue)}
                  disabled={isLoading || !inputValue.trim()}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-40"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ───── Floating Action Button ───── */}
      <motion.button
        onClick={() => setIsOpen((prev) => !prev)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-50 flex h-[60px] w-[60px] items-center justify-center rounded-full bg-blue-600 text-white shadow-xl border border-blue-500 transition-colors hover:bg-blue-700 hover:border-blue-600 group"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.span
              key="close"
              initial={{ rotate: -45, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 45, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="h-5.5 w-5.5" />
            </motion.span>
          ) : (
            <motion.span
              key="open"
              initial={{ rotate: 45, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -45, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <MessageCircle className="h-6 w-6" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  );
};
