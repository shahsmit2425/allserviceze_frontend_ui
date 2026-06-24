import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import logger from '@/utils/logger';
import { usePlatform } from '@/mobile/hooks/usePlatform';

let pushNotificationManagerPromise;
const getPushNotificationManager = async () => {
  if (!pushNotificationManagerPromise) {
    pushNotificationManagerPromise = import('@/mobile/utils/pushNotifications').then((module) => module.pushNotificationManager);
  }

  return pushNotificationManagerPromise;
};

const scheduleAfterInitialPaint = (callback, timeout = 1500) => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  if ('requestIdleCallback' in window) {
    const idleId = window.requestIdleCallback(callback, { timeout });
    return () => window.cancelIdleCallback(idleId);
  }

  const timerId = window.setTimeout(callback, 350);
  return () => window.clearTimeout(timerId);
};

const API_URL = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api`;

const NotificationContext = createContext(null);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user, getAuthHeader } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const { isNative } = usePlatform();
  
  const wsRef = useRef(null);
  const heartbeatRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const shouldReconnectRef = useRef(false);
  const suspendedForPageHideRef = useRef(false);

  const clearRealtimeResources = useCallback(() => {
    shouldReconnectRef.current = false;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await axios.get(`${API_URL}/notifications`, {
        withCredentials: true,
        headers: getAuthHeader()
      });
      const notifs = response.data;
      setNotifications(notifs);
      
      // Calculate unread count
      const unread = notifs.filter(n => !n.read).length;
      setUnreadCount(unread);
      logger.log("📥 Fetched notifications - Total:", notifs.length, "Unread:", unread);
    } catch (error) {
      logger.error("Error fetching notifications:", error);
    }
  }, [user, getAuthHeader]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await axios.patch(`${API_URL}/notifications/${notificationId}/read`, {}, {
        withCredentials: true,
        headers: getAuthHeader()
      });
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? {...n, read: true} : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      logger.error("Error marking notification as read:", error);
    }
  }, [getAuthHeader]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await axios.patch(`${API_URL}/notifications/read-all`, {}, {
        withCredentials: true,
        headers: getAuthHeader()
      });

      setNotifications(prev => prev.map(notification => ({
        ...notification,
        read: true,
      })));
      setUnreadCount(0);

      if (isNative) {
        const pushNotificationManager = await getPushNotificationManager();
        await pushNotificationManager.removeAllDeliveredNotifications();
      }
    } catch (error) {
      logger.error("Error marking all notifications as read:", error);
    }
  }, [getAuthHeader, isNative]);

  const clearAllNotifications = useCallback(async () => {
    try {
      await axios.delete(`${API_URL}/notifications/delete-all`, {
        withCredentials: true,
        headers: getAuthHeader()
      });

      setNotifications([]);
      setUnreadCount(0);

      if (isNative) {
        const pushNotificationManager = await getPushNotificationManager();
        await pushNotificationManager.removeAllDeliveredNotifications();
      }
    } catch (error) {
      logger.error('Error clearing notifications:', error);
    }
  }, [getAuthHeader, isNative]);

  // Add notification (called by WebSocket)
  const addNotification = useCallback((notification) => {
    logger.log("➕ Adding notification to context:", notification);
    
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => {
      const newCount = prev + 1;
      logger.log("🔢 Context: Unread count updated:", prev, "→", newCount);
      return newCount;
    });

    // Show toast notification
    const getToastType = (type) => {
      if (type.includes('awarded') || type.includes('approved') || type.includes('activated')) {
        return toast.success;
      } else if (type.includes('rejected') || type.includes('cancelled') || type.includes('withdrawn')) {
        return toast.error;
      }
      return toast.info;
    };

    const toastFn = getToastType(notification.type);
    toastFn(notification.title, {
      description: notification.message,
      duration: 5000,
    });
  }, []);

  // Connect to WebSocket
  const connectWebSocket = useCallback(() => {
    if (!user || isNative) {
      return;
    }

    if (wsRef.current && [WebSocket.OPEN, WebSocket.CONNECTING].includes(wsRef.current.readyState)) {
      return;
    }

    shouldReconnectRef.current = true;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
    const wsUrl = backendUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    const fullWsUrl = `${wsUrl}/ws/${user.id}`; // WebSocket endpoint is /ws/{user_id}, not /api/ws/{user_id}
    
    logger.log("🔌 Connecting to WebSocket:", fullWsUrl);

    const ws = new WebSocket(fullWsUrl);

    ws.onopen = () => {
      logger.log("✅ WebSocket connected");
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;

      // Start heartbeat
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      heartbeatRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          logger.log("💓 Sending heartbeat ping...");
          ws.send("ping");
        }
      }, 30000);
    };

    ws.onmessage = (event) => {
      if (event.data === "pong") {
        logger.log("💓 Received heartbeat pong");
        return;
      }

      try {
        const data = JSON.parse(event.data);
        logger.log("📬 WebSocket message received:", data);

        if (data.type === "notification" && data.data) {
          addNotification(data.data);
        }
      } catch (error) {
        logger.error("❌ Error parsing WebSocket message:", error);
      }
    };

    ws.onerror = (error) => {
      logger.error("❌ WebSocket error:", error);
      setIsConnected(false);
    };

    ws.onclose = (event) => {
      if (wsRef.current === ws) {
        wsRef.current = null;
      }

      logger.log("🔌 WebSocket disconnected - Code:", event.code);
      setIsConnected(false);

      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }

      if (!shouldReconnectRef.current || !user) {
        return;
      }

      // Reconnect with exponential backoff
      const delay = Math.min(5000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
      reconnectAttemptsRef.current++;

      logger.log(`🔄 Reconnecting in ${delay/1000}s...`);
      reconnectTimeoutRef.current = setTimeout(() => {
        if (shouldReconnectRef.current) {
          connectWebSocket();
        }
      }, delay);
    };

    wsRef.current = ws;
  }, [user, addNotification, isNative]);

  // Initialize on mount and clear on user change
  useEffect(() => {
    if (!user) {
      // User logged out - clear all notification data
      logger.log("🧹 User logged out - clearing notification state");
      clearRealtimeResources();
      setNotifications([]);
      setUnreadCount(0);
      setIsConnected(false);
      return;
    }

    if (isNative) {
      logger.log("👤 User logged in, fetching notifications for user:", user.id);
      clearRealtimeResources();
      fetchNotifications();
      setIsConnected(true);

      const pollingInterval = window.setInterval(() => {
        fetchNotifications();
      }, 15000);

      return () => {
        window.clearInterval(pollingInterval);
        clearRealtimeResources();
      };
    }

    logger.log("👤 User logged in, scheduling notifications bootstrap for user:", user.id);

    const cancelBootstrap = scheduleAfterInitialPaint(() => {
      fetchNotifications();
      connectWebSocket();
    });

    return () => {
      cancelBootstrap();
      clearRealtimeResources();
    };
  }, [user, fetchNotifications, connectWebSocket, clearRealtimeResources, isNative]);

  useEffect(() => {
    if (isNative || !user) {
      return undefined;
    }

    const handlePageHide = () => {
      suspendedForPageHideRef.current = true;
      clearRealtimeResources();
      setIsConnected(false);
    };

    const handlePageShow = () => {
      if (!suspendedForPageHideRef.current) {
        return;
      }

      suspendedForPageHideRef.current = false;
      fetchNotifications();
      connectWebSocket();
    };

    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [user, isNative, clearRealtimeResources, connectWebSocket, fetchNotifications]);

  // MOBILE FIX: Reconnect WebSocket when app resumes from background
  useEffect(() => {
    // Only add listener for native mobile apps
    if (!isNative) {
      return;
    }

    let appStateListener;

    const setupAppStateListener = async () => {
      try {
        const { App } = await import('@capacitor/app');
        
        // Listen for app state changes
        appStateListener = await App.addListener('appStateChange', async ({ isActive }) => {
          if (isActive && user) {
            logger.log('📱 App resumed - refreshing notifications');
            await fetchNotifications();
          } else if (!isActive) {
            logger.log('📱 App going to background');
          }
        });
      } catch (error) {
        logger.error('Failed to setup app state listener for WebSocket:', error);
      }
    };

    setupAppStateListener();

    // Cleanup listener on unmount
    return () => {
      if (appStateListener) {
        appStateListener.remove();
      }
    };
  }, [user, fetchNotifications, isNative]);

  const value = {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
    fetchNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
