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

    // Using the same URL logic as API_URL but for ws://
    // Default to localhost for now as per current setup
    const wsUrl = `ws://172.20.1.24:8000/api/v1/ws/${token}`;
    
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      console.log('Attempting to connect to WebSocket...');
      const socket = new WebSocket(wsUrl);
      
      socket.onopen = () => {
        console.log('Connected to WebSocket');
        setIsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
        } catch (err) {
          console.warn('Received non-JSON message:', event.data);
          setLastMessage(event.data);
        }
      };

      socket.onclose = (event) => {
        console.log(`WebSocket closed (code: ${event.code}). Retrying in 5s...`);
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
