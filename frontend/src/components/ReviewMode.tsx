import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, MessageSquare, Clock, Send, ShieldCheck, User, Calendar, Paperclip, X, Lock } from 'lucide-react';
import { Button } from './Button';

interface MapRecord {
  map_id: number;
  unique_id: string;
  layout_name: string;
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

interface ReviewModeProps {
  record: MapRecord;
  onBack: () => void;
  currentUserId: number;
  userRole: string;
  comments: MapComment[];
  loadingComments: boolean;
  onPostComment: (map_id: number, message: string, file?: File) => Promise<void>;
  onUpdateApproval: (map_id: number, status: string, comment: string) => Promise<void>;
}

export const ReviewMode: React.FC<ReviewModeProps> = ({
  record,
  onBack,
  currentUserId,
  userRole,
  comments,
  loadingComments,
  onPostComment,
  onUpdateApproval,
}) => {
  const [approvalStatus, setApprovalStatus] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isAdmin = userRole.toLowerCase().trim() === 'admin';
  const isLocked = record.approval_status === 'Approve';

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [comments]);

  useEffect(() => {
    setApprovalStatus(record.approval_status || '');
  }, [record]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBack();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

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
    if (!approvalStatus) return;
    setIsSaving(true);
    try {
      await onUpdateApproval(record.map_id, approvalStatus, "");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !selectedFile) return;
    setIsSending(true);
    try {
      await onPostComment(record.map_id, newMessage.trim(), selectedFile || undefined);
      setNewMessage('');
      removeFile();
    } finally {
      setIsSending(false);
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
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Decision Center</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-blue-600 font-bold">{record.unique_id}</span>
              <span className="text-gray-400 text-sm">•</span>
              <span className="text-gray-500 text-sm">{record.layout_name}</span>
            </div>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-3">
           <div className="text-right">
             <p className="text-[10px] text-gray-400 uppercase font-bold">Current Status</p>
             <p className={`text-sm font-bold ${isLocked ? 'text-green-600' : 'text-blue-600'}`}>{record.approval_status || 'Pending Review'}</p>
           </div>
           <div className="h-8 w-px bg-gray-200 mx-2" />
           {isLocked ? <CheckCircle className="h-8 w-8 text-green-500" /> : <ShieldCheck className="h-8 w-8 text-blue-100" />}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Decision Control (1/3) */}
        <div className="lg:col-span-1 space-y-6">
          <div className={`bg-white rounded-xl border-2 p-6 shadow-sm ${isLocked ? 'border-green-50' : 'border-blue-50'}`}>
            <div className={`flex items-center gap-2 mb-6 ${isLocked ? 'text-green-700' : 'text-blue-700'}`}>
              <CheckCircle className="h-5 w-5" />
              <h3 className="font-bold uppercase tracking-wider text-xs">
                {isAdmin ? 'Official Decision' : 'Official Status'}
              </h3>
            </div>
            
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Approval Status</label>
                {isAdmin ? (
                  <select
                    value={approvalStatus}
                    onChange={(e) => setApprovalStatus(e.target.value)}
                    className="w-full rounded-lg border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold focus:bg-white focus:border-blue-500 transition-all"
                  >
                    <option value="" hidden>Select Decision...</option>
                    <option value="Approve">✅ Approve Layout</option>
                    <option value="Editing Required">⚠️ Editing Required</option>
                    <option value="On Hold">⏸️ Place on Hold</option>
                  </select>
                ) : (
                  <div className={`w-full rounded-lg px-4 py-3 text-sm font-bold border shadow-inner ${isLocked ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                    {record.approval_status || 'Pending Review'}
                  </div>
                )}
              </div>

              {isAdmin && (
                <Button 
                  onClick={handleSaveApproval} 
                  isLoading={isSaving}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-100"
                >
                  Submit Official Action
                </Button>
              )}

              {isLocked && (
                <div className="p-4 bg-green-50 border border-green-100 rounded-lg">
                  <p className="text-xs text-green-800 font-bold uppercase mb-1 flex items-center gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Finalized
                  </p>
                  <p className="text-xs text-green-700 leading-relaxed">
                    This layout has been approved and the record is now locked. No further edits or comments can be made.
                  </p>
                </div>
              )}

              {!isAdmin && record.approval_status === 'Editing Required' && (
                <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-lg animate-pulse">
                  <p className="text-xs text-yellow-800 font-bold uppercase mb-1">Action Required</p>
                  <p className="text-xs text-yellow-700 leading-relaxed">
                    The Admin has requested edits. Please review the note and timeline, then post a message once you've addressed the changes.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Comments/Timeline (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-[650px]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <div className="flex items-center gap-2 text-gray-700">
                <MessageSquare className="h-5 w-5" />
                <h3 className="font-bold uppercase tracking-wider text-xs">Discussion & Activity Log</h3>
              </div>
              <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded-full font-bold">
                {comments.length} MESSAGES
              </span>
            </div>

            {/* Timeline View */}
            <div 
              className="flex-1 overflow-y-auto p-8 space-y-8 bg-gray-50/30 scroll-smooth"
            >
              {loadingComments ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Clock className="h-8 w-8 animate-spin mb-2" />
                  <p className="text-sm font-medium">Fetching history...</p>
                </div>
              ) : comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full opacity-40">
                  <MessageSquare className="h-12 w-12 mb-2" />
                  <p className="text-sm italic">No activity recorded yet.</p>
                </div>
              ) : (
                <div className="relative border-l-2 border-gray-100 ml-3 pl-8 space-y-8">
                  {comments.map((c) => {
                    const isSystemAction = c.message.includes('required Editing') || 
                                         c.message.includes('Approve The Map') || 
                                         c.message.includes('Set Current Map');
                    
                    if (isSystemAction) {
                      const isApprove = c.message.includes('Approve');
                      const isOnHold = c.message.includes('On Hold');
                      
                      return (
                        <div key={c.comment_id} className="relative flex justify-center py-2">
                           <div className={`rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider border shadow-sm flex items-center gap-2 ${
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
                      <div key={c.comment_id} className="relative">
                        {/* Timeline Dot */}
                        <div className={`absolute -left-[41px] top-0 h-4 w-4 rounded-full border-2 border-white shadow-sm ${
                          c.user_id === currentUserId ? 'bg-blue-600' : 'bg-gray-400'
                        }`} />
                        
                        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center">
                                <User className="h-3 w-3 text-gray-500" />
                              </div>
                              <span className="text-xs font-bold text-gray-900">
                                {c.user_id === currentUserId ? 'You' : (c.username || `User #${c.user_id}`)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-400">
                              <Calendar className="h-3 w-3" />
                              <span className="text-[10px] font-medium">
                                {new Date(c.created_at).toLocaleString()}
                              </span>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {c.message}
                            </p>
                            {c.attachment_path && (
                              <div className="mt-2 rounded-lg overflow-hidden border border-gray-100 max-w-sm">
                                <img 
                                  src={(import.meta.env.VITE_API_URL || 'http://localhost:8000') + c.attachment_path} 
                                  alt="attachment" 
                                  className="w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => window.open((import.meta.env.VITE_API_URL || 'http://localhost:8000') + c.attachment_path, '_blank')}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Simplified Input Area */}
            <div className={`p-6 bg-white border-t border-gray-100 space-y-4 ${isLocked ? 'bg-gray-50/50' : ''}`}>
              {isLocked ? (
                <div className="flex items-center justify-center gap-2 py-4 text-gray-400 font-bold uppercase tracking-widest text-xs">
                  <Lock className="h-4 w-4" />
                  This thread is locked (Approved)
                </div>
              ) : (
                <>
                  {filePreview && (
                    <div className="relative inline-block">
                      <img src={filePreview} alt="preview" className="h-20 w-20 object-cover rounded-lg border border-gray-200" />
                      <button 
                        onClick={removeFile}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  
                  <div className="flex gap-4 items-center">
                    <div className="flex-1 relative">
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        onPaste={handlePaste}
                        placeholder="Post a message to the thread..."
                        rows={2}
                        className="w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:bg-white focus:border-blue-500 transition-all resize-none block"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Paperclip className="h-5 w-5" />
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        onChange={(e) => handleFileChange(e)}
                      />
                    </div>
                    <Button
                      onClick={handleSendMessage}
                      disabled={isSending || (!newMessage.trim() && !selectedFile)}
                      className="shrink-0 aspect-square h-12 bg-gray-900 hover:bg-black text-white rounded-xl flex items-center justify-center shadow-sm"
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
