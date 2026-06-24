import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";
import logger from "@/utils/logger";

const API_URL = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api`;

const ChatContext = createContext(null);

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within ChatProvider");
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const { user, getAuthHeader } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isReady, setIsReady] = useState(false);

  const requestConfig = useMemo(
    () => ({
      withCredentials: true,
      headers: getAuthHeader(),
    }),
    [getAuthHeader]
  );

  const refreshUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      setIsReady(false);
      return 0;
    }

    try {
      const response = await axios.get(`${API_URL}/chat/unread-count`, requestConfig);
      const count = Number(response.data?.count || 0);
      setUnreadCount(count);
      setIsReady(true);
      return count;
    } catch (error) {
      logger.error("Failed to refresh chat unread count:", error);
      setUnreadCount(0);
      setIsReady(true);
      return 0;
    }
  }, [requestConfig, user]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setIsReady(false);
      return;
    }

    // The unread-count endpoint is not needed to render non-chat routes.
    // Keep the provider ready for the messages page without forcing an extra
    // startup request into every authenticated page load.
    setIsReady(true);
  }, [user]);

  const ensureDirectConversation = useCallback(async (partnerId) => {
    const response = await axios.post(`${API_URL}/chat/direct/${partnerId}`, {}, requestConfig);
    return response.data;
  }, [requestConfig]);

  const listConversations = useCallback(async () => {
    const response = await axios.get(`${API_URL}/chat/conversations`, requestConfig);
    return response.data || [];
  }, [requestConfig]);

  const listMessages = useCallback(async (conversationId) => {
    const response = await axios.get(`${API_URL}/chat/conversations/${conversationId}/messages`, requestConfig);
    return response.data || [];
  }, [requestConfig]);

  const sendMessage = useCallback(async (conversationId, payload) => {
    const response = await axios.post(`${API_URL}/chat/conversations/${conversationId}/messages`, payload, requestConfig);
    return response.data;
  }, [requestConfig]);

  const markConversationRead = useCallback(async (conversationId) => {
    await axios.post(`${API_URL}/chat/conversations/${conversationId}/read`, {}, requestConfig);
  }, [requestConfig]);

  const reportMessage = useCallback(async (messageId, payload) => {
    const response = await axios.post(`${API_URL}/chat/messages/${messageId}/report`, payload, requestConfig);
    return response.data;
  }, [requestConfig]);

  const getBlockStatus = useCallback(async (userId) => {
    const response = await axios.get(`${API_URL}/chat/users/${userId}/block-status`, requestConfig);
    return response.data;
  }, [requestConfig]);

  const blockUser = useCallback(async (userId) => {
    const response = await axios.post(`${API_URL}/chat/users/${userId}/block`, {}, requestConfig);
    return response.data;
  }, [requestConfig]);

  const unblockUser = useCallback(async (userId) => {
    const response = await axios.delete(`${API_URL}/chat/users/${userId}/block`, requestConfig);
    return response.data;
  }, [requestConfig]);

  const deleteMessage = useCallback(async (messageId) => {
    const response = await axios.delete(`${API_URL}/chat/messages/${messageId}`, requestConfig);
    return response.data;
  }, [requestConfig]);

  const value = useMemo(() => ({
    unreadCount,
    isReady,
    refreshUnreadCount,
    ensureDirectConversation,
    listConversations,
    listMessages,
    sendMessage,
    markConversationRead,
    reportMessage,
    getBlockStatus,
    blockUser,
    unblockUser,
    deleteMessage,
  }), [blockUser, deleteMessage, ensureDirectConversation, getBlockStatus, isReady, listConversations, listMessages, markConversationRead, refreshUnreadCount, reportMessage, sendMessage, unblockUser, unreadCount]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};