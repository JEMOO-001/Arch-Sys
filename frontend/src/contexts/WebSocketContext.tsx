import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';

interface WebSocketContextType {
  lastMessage: any;
  isConnected: boolean;
  sendMessage: (msg: any) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.close();
      }
      return;
    }

    const getWsUrl = () => {
      const apiEndpoint = import.meta.env.VITE_API_URL || 'http://172.20.0.149:8000';
      const wsProtocol = apiEndpoint.startsWith('https') ? 'wss:' : 'ws:';
      const host = apiEndpoint.replace(/^https?:\/\//, '');
      return `${wsProtocol}//${host}/api/v1/ws?token=${encodeURIComponent(token)}`;
    };
    const wsUrl = getWsUrl();
    
    let reconnectTimeout: any;

    const connect = () => {
      
      const socket = new WebSocket(wsUrl);
      
      socket.onopen = () => {
        
        setIsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
        } catch (err) {
          
          setLastMessage(event.data);
        }
      };

      socket.onclose = (event) => {
        
        setIsConnected(false);
        // Only reconnect if we still have a token
        if (token) {
          reconnectTimeout = setTimeout(connect, 5000);
        }
      };

      socket.onerror = (err) => {
        console.error('WebSocket error:', err);
        socket.close();
      };

      socketRef.current = socket;
    };

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (socketRef.current) {
        socketRef.current.onclose = null; // Prevent reconnect loop on unmount
        socketRef.current.close();
      }
    };
  }, [token]);

  const sendMessage = (msg: any) => {
    if (socketRef.current && isConnected) {
      const payload = typeof msg === 'string' ? msg : JSON.stringify(msg);
      socketRef.current.send(payload);
    }
  };

  return (
    <WebSocketContext.Provider value={{ lastMessage, isConnected, sendMessage }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) throw new Error('useWebSocket must be used within WebSocketProvider');
  return context;
};
