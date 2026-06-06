import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, MessageSquare, Clock, Send, ShieldCheck, Paperclip } from 'lucide-react';
import { Button } from './Button';
import { API_BASE } from '../config';
import { openAttachment } from '../utils/openAttachment';

interface MapRecord {
  map_id: number;
  unique_id: string;
  approval_status?: string | null;
  approval_comment?: string | null;
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

interface DecisionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  record: MapRecord | null;
  currentUserId: number;
  comments: MapComment[];
  loadingComments: boolean;
  onPostComment: (map_id: number, message: string, file?: File) => Promise<void>;
  onUpdateApproval: (map_id: number, status: string, comment: string) => Promise<void>;
}

export const DecisionDrawer: React.FC<DecisionDrawerProps> = ({
  isOpen,
  onClose,
  record,
  currentUserId,
  comments,
  loadingComments,
  onPostComment,
  onUpdateApproval,
}) => {
  const [approvalStatus, setApprovalStatus] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isSavingApproval, setIsSavingApproval] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [comments]);

  useEffect(() => {
    if (record && isOpen) {
      setApprovalStatus(record.approval_status || '');
    }
  }, [record, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement> | File) => {
    const file = (e as any).target ? (e as React.ChangeEvent<HTMLInputElement>).target.files?.[0] : (e as File);
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveApproval = async () => {
    if (!record || !approvalStatus) return;
    setIsSavingApproval(true);
    try {
      await onUpdateApproval(record.map_id, approvalStatus, "");
    } finally {
      setIsSavingApproval(false);
    }
  };

  const handleSendMessage = async () => {
    if (!record || (!newMessage.trim() && !selectedFile)) return;
    setIsSendingMessage(true);
    try {
      await onPostComment(record.map_id, newMessage.trim(), selectedFile || undefined);
      setNewMessage('');
      removeFile();
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) handleFileChange(file);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      handleFileChange(files[0]);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
          />
          
          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 z-50 h-full w-full max-w-md bg-white shadow-2xl flex flex-col"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 p-6 bg-blue-600 text-white">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-white/20 p-2">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold leading-none">Decision Making</h2>
                  <p className="mt-1 text-sm text-blue-100 font-mono">{record?.unique_id}</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="rounded-full p-2 hover:bg-white/10 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Approval Section */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-blue-600">
                  <CheckCircle className="h-5 w-5" />
                  <h3 className="font-bold uppercase tracking-wider text-xs">Official Decision</h3>
                </div>
                
                <div className="space-y-4 rounded-xl border border-blue-100 bg-blue-50/30 p-5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-500 uppercase">Set Status</label>
                    <select
                      value={approvalStatus}
                      onChange={(e) => setApprovalStatus(e.target.value)}
                      className="w-full rounded-lg border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="" hidden>Pending Review</option>
                      <option value="Approve">✅ Approve Layout</option>
                      <option value="Editing Required">⚠️ Editing Required</option>
                      <option value="On Hold">⏸️ Place on Hold</option>
                    </select>
                  </div>

                  <Button 
                    onClick={handleSaveApproval} 
                    isLoading={isSavingApproval}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-lg shadow-blue-200"
                  >
                    Submit Official Decision
                  </Button>
                </div>
              </section>

              {/* Discussion Section */}
              <section className="space-y-4 flex flex-col h-[500px]">
                <div className="flex items-center gap-2 text-gray-600">
                  <MessageSquare className="h-5 w-5" />
                  <h3 className="font-bold uppercase tracking-wider text-xs">Internal Discussion</h3>
                </div>

                <div className="flex-1 flex flex-col bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                  {/* Message List */}
                  <div 
                    className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
                  >
                    {loadingComments ? (
                      <div className="flex items-center justify-center h-full text-sm text-gray-400">
                        <Clock className="h-4 w-4 animate-spin mr-2" />
                        Loading thread...
                      </div>
                    ) : comments.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center p-6">
                        <div className="rounded-full bg-white p-3 mb-2 shadow-sm">
                          <MessageSquare className="h-6 w-6 text-gray-300" />
                        </div>
                        <p className="text-sm text-gray-400 italic">No messages yet. Be the first to comment.</p>
                      </div>
                    ) : (
                      <>
                        {comments.map((c) => {
                          const isSystemAction = c.message.includes('required Editing') || 
                                               c.message.includes('Approve The Map') || 
                                               c.message.includes('Set Current Map');
                          
                          if (isSystemAction) {
                            const isApprove = c.message.includes('Approve');
                            const isOnHold = c.message.includes('On Hold');
                            return (
                              <div key={c.comment_id} className="flex justify-center py-1">
                                 <div className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase border shadow-sm flex items-center gap-1.5 ${
                                   isApprove ? 'bg-green-100 text-green-700 border-green-200' :
                                   isOnHold ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                   'bg-blue-100 text-blue-700 border-blue-200'
                                 }`}>
                                   <ShieldCheck className="h-3 w-3" />
                                   {c.message}
                                 </div>
                              </div>
                            );
                          }

                          return (
                            <div 
                              key={c.comment_id} 
                              className={`flex flex-col ${c.user_id === currentUserId ? 'items-end' : 'items-start'}`}
                            >
                              <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                                c.user_id === currentUserId 
                                  ? 'bg-blue-600 text-white rounded-tr-none' 
                                  : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'
                              }`}>
                                {c.message}
                                {c.attachment_path && (
                                  <div className="mt-2 rounded-lg overflow-hidden border border-white/20">
                                    <img 
                                      src={API_BASE + c.attachment_path} 
                                      alt="attachment" 
                                      className="w-full h-auto cursor-pointer hover:opacity-90"
                                      onClick={() => openAttachment(c.attachment_path)}
                                    />
                                  </div>
                                )}
                              </div>
                              <span className="mt-1 text-[10px] text-gray-400 px-1">
                                {c.user_id === currentUserId ? 'You' : (c.username || `User #${c.user_id}`)} • {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </>
                    )}
                  </div>

                  {/* Input Area */}
                  <div className="p-4 bg-white border-t border-gray-200 space-y-3">
                    {filePreview && (
                      <div className="relative inline-block">
                        <img src={filePreview} alt="preview" className="h-16 w-16 object-cover rounded-lg border border-gray-200" />
                        <button 
                          onClick={removeFile}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-lg hover:bg-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        onPaste={handlePaste}
                        placeholder="Type a message..."
                        className="w-full rounded-full border-gray-200 bg-gray-50 pl-4 pr-20 py-3 text-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      <div className="absolute right-2 flex items-center gap-1">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Paperclip className="h-4 w-4" />
                        </button>
                        <button
                          onClick={handleSendMessage}
                          disabled={isSendingMessage || (!newMessage.trim() && !selectedFile)}
                          className="p-2 rounded-full bg-blue-600 text-white disabled:bg-gray-300 transition-colors"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      </div>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        onChange={(e) => handleFileChange(e)}
                      />
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
