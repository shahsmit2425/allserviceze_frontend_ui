import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import logger from "@/utils/logger";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  Archive,
  ArrowLeft,
  Award,
  Calendar,
  Check,
  CheckCheck,
  Clock3,
  Eye,
  FileText,
  Loader2,
  MapPin,
  MessageSquare,
  Paperclip,
  Search,
  Send,
  ShieldCheck,
  Star,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "../components/AppShell";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { useAuth } from "../context/AuthContext";
import { useChatContext } from "../context/ChatContext";
import { usePlatform } from "@/mobile/hooks/usePlatform";

const API_URL = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api`;
const ARCHIVE_STORAGE_KEY = "messages.archivedConversationIds";

const scheduleAfterInitialPaint = (callback, timeout = 1500) => {
  if (typeof window === "undefined") {
    return () => {};
  }

  if ("requestIdleCallback" in window) {
    const idleId = window.requestIdleCallback(callback, { timeout });
    return () => window.cancelIdleCallback(idleId);
  }

  const timerId = window.setTimeout(callback, 350);
  return () => window.clearTimeout(timerId);
};

const formatMessageTime = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

const formatActivityLabel = (value) => {
  if (!value) return "No activity";
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "No activity";

  const diffMinutes = Math.round((Date.now() - timestamp) / 60000);
  if (diffMinutes < 1) return "Now";
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const formatBudgetRange = (project) => {
  const min = Number(project?.budget_min) || 0;
  const max = Number(project?.budget_max) || 0;
  if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
  if (max) return `Up to $${max.toLocaleString()}`;
  if (min) return `From $${min.toLocaleString()}`;
  return "Custom budget";
};

const formatReviewCount = (count) => `${count || 0} review${Number(count) === 1 ? "" : "s"}`;

const formatResponseTime = (provider) => {
  const minutes = Number(provider?.avg_response_time_minutes);
  if (Number.isFinite(minutes) && minutes > 0) {
    if (minutes < 60) return `${minutes}m avg response`;
    const hours = Math.round(minutes / 60);
    return `${hours}h avg response`;
  }
  return provider?.provider_profile?.response_time || provider?.response_time || "Response time on request";
};

const formatBidAmount = (bid) => `$${Number(bid?.amount || 0).toLocaleString()}`;

const getOtherParticipant = (conversation, currentUserId) => {
  const participants = conversation?.participants || [];
  return participants.find((participant) => String(participant.user_id) !== String(currentUserId)) || participants[0] || null;
};

const sortConversations = (items) => [...items].sort((left, right) => {
  const leftTs = left?.last_message_at ? new Date(left.last_message_at).getTime() : 0;
  const rightTs = right?.last_message_at ? new Date(right.last_message_at).getTime() : 0;
  return rightTs - leftTs;
});

const loadArchivedConversationIds = (userId) => {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const raw = window.localStorage.getItem(`${ARCHIVE_STORAGE_KEY}.${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const persistArchivedConversationIds = (userId, ids) => {
  if (typeof window === "undefined" || !userId) return;
  window.localStorage.setItem(`${ARCHIVE_STORAGE_KEY}.${userId}`, JSON.stringify(ids));
};

const projectStatusMeta = {
  draft: { label: "Draft", className: "status-badge-neutral" },
  pending: { label: "Pending", className: "status-badge-warning" },
  approved: { label: "Approved", className: "status-badge-info" },
  live: { label: "Live", className: "status-badge-success" },
  awarded: { label: "Awarded", className: "status-badge-warning" },
  sold: { label: "Sold", className: "status-badge-accent" },
  in_progress: { label: "In Progress", className: "status-badge-violet" },
  completed: { label: "Completed", className: "status-badge-success" },
  paused: { label: "Paused", className: "status-badge-warning" },
  rejected: { label: "Rejected", className: "status-badge-danger" },
};

export default function Messages() {
  const { partnerId } = useParams();
  const navigate = useNavigate();
  const { user, getAuthHeader } = useAuth();
  const {
    isReady,
    ensureDirectConversation,
    listConversations,
    listMessages,
    sendMessage,
    markConversationRead,
    getBlockStatus,
    blockUser,
    unblockUser,
    deleteMessage,
  } = useChatContext();
  const { isNativePhone, prefersSplitView } = usePlatform();

  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [errorDetails, setErrorDetails] = useState(null);
  const [blockStatus, setBlockStatus] = useState({ blocked_by_me: false, blocked_me: false, can_message: true });
  const [loadingBlockStatus, setLoadingBlockStatus] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [archivedConversationIds, setArchivedConversationIds] = useState(() => loadArchivedConversationIds(user?.id));
  const [selectedAttachmentFiles, setSelectedAttachmentFiles] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [providerReviews, setProviderReviews] = useState([]);
  const [projectBids, setProjectBids] = useState([]);
  const [loadingContextPanel, setLoadingContextPanel] = useState(false);
  const [awardingBidId, setAwardingBidId] = useState(null);
  const [showDetailsPanel, setShowDetailsPanel] = useState(!isNativePhone);

  const messageEndRef = useRef(null);
  const attachmentInputRef = useRef(null);
  const rightPanelRef = useRef(null);
  const selectedConversationId = selectedConversation?.id || null;
  const pageTheme = user?.role === "provider" ? "provider" : "customer";
  const selectedParticipant = useMemo(
    () => getOtherParticipant(selectedConversation, user?.id),
    [selectedConversation, user?.id]
  );

  useEffect(() => {
    setArchivedConversationIds(loadArchivedConversationIds(user?.id));
  }, [user?.id]);

  useEffect(() => {
    persistArchivedConversationIds(user?.id, archivedConversationIds);
  }, [archivedConversationIds, user?.id]);

  useEffect(() => {
    if (!isNativePhone) {
      setShowDetailsPanel(true);
    }
  }, [isNativePhone]);

  const syncSelectedConversation = useCallback((incomingConversations) => {
    if (!selectedConversationId) return;
    const updated = incomingConversations.find((conversation) => conversation.id === selectedConversationId);
    if (updated) setSelectedConversation(updated);
  }, [selectedConversationId]);

  const fetchConversations = useCallback(async ({ silent = false } = {}) => {
    if (!user) {
      setConversations([]);
      setLoadingConversations(false);
      return [];
    }

    if (!silent) setLoadingConversations(true);

    try {
      const data = sortConversations(await listConversations());
      setConversations(data);
      syncSelectedConversation(data);
      setConnectionError(false);
      setErrorDetails(null);
      return data;
    } catch (error) {
      logger.error("Failed to load chat conversations:", error);
      setConnectionError(true);
      setErrorDetails(error?.response?.data?.detail || error?.message || "Unable to load conversations");
      return [];
    } finally {
      if (!silent) setLoadingConversations(false);
    }
  }, [listConversations, syncSelectedConversation, user]);

  const fetchMessages = useCallback(async (conversationId, { silent = false, markRead = true } = {}) => {
    if (!conversationId) {
      setMessages([]);
      return [];
    }

    if (!silent) setLoadingMessages(true);
    try {
      const nextMessages = await listMessages(conversationId);
      setMessages(nextMessages);
      if (markRead) {
        await markConversationRead(conversationId);
      }
      setConversations((current) => current.map((conversation) => (
        conversation.id === conversationId ? { ...conversation, unread_count: 0 } : conversation
      )));
      return nextMessages;
    } catch (error) {
      logger.error("Failed to load chat messages:", error);
      toast.error("Failed to load messages");
      return [];
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  }, [listMessages, markConversationRead]);

  const fetchRightPanelContext = useCallback(async (conversation) => {
    if (!conversation) {
      setSelectedProject(null);
      setSelectedProvider(null);
      setProviderReviews([]);
      setProjectBids([]);
      return;
    }

    setLoadingContextPanel(true);
    try {
      const participant = getOtherParticipant(conversation, user?.id);
      const headers = { headers: getAuthHeader() };
      const requests = [];

      if (conversation.project_id) {
        requests.push(axios.get(`${API_URL}/projects/${conversation.project_id}`, headers));
        requests.push(axios.get(`${API_URL}/bids/project/${conversation.project_id}`, headers));
      } else {
        requests.push(Promise.resolve({ data: null }));
        requests.push(Promise.resolve({ data: [] }));
      }

      if (participant?.role === "provider") {
        requests.push(axios.get(`${API_URL}/providers/${participant.user_id}`));
        requests.push(axios.get(`${API_URL}/reviews/provider/${participant.user_id}?limit=3`));
      } else {
        requests.push(Promise.resolve({ data: null }));
        requests.push(Promise.resolve({ data: [] }));
      }

      const [projectRes, bidsRes, providerRes, reviewsRes] = await Promise.allSettled(requests);

      setSelectedProject(projectRes.status === "fulfilled" ? projectRes.value.data : null);
      setProjectBids(bidsRes.status === "fulfilled" && Array.isArray(bidsRes.value.data) ? bidsRes.value.data : []);
      setSelectedProvider(providerRes.status === "fulfilled" ? providerRes.value.data : null);
      setProviderReviews(reviewsRes.status === "fulfilled" && Array.isArray(reviewsRes.value.data) ? reviewsRes.value.data : []);
    } catch (error) {
      logger.error("Failed to load conversation side context:", error);
      setSelectedProject(null);
      setSelectedProvider(null);
      setProviderReviews([]);
      setProjectBids([]);
    } finally {
      setLoadingContextPanel(false);
    }
  }, [getAuthHeader, user?.id]);

  const openConversation = useCallback(async (conversation, { navigateToThread = true } = {}) => {
    setSelectedConversation(conversation);
    setReplyingTo(null);
    setSelectedAttachmentFiles([]);
    const participant = getOtherParticipant(conversation, user?.id);
    if (navigateToThread && participant?.user_id) {
      navigate(`/messages/${participant.user_id}`);
    }
    if (isNativePhone) {
      setShowDetailsPanel(false);
    }
    await Promise.all([
      fetchMessages(conversation.id, { markRead: Number(conversation.unread_count || 0) > 0 }),
      fetchRightPanelContext(conversation),
    ]);
  }, [fetchMessages, fetchRightPanelContext, isNativePhone, navigate, user?.id]);

  const refreshSelectedBlockStatus = useCallback(async () => {
    if (!selectedParticipant?.user_id) {
      setBlockStatus({ blocked_by_me: false, blocked_me: false, can_message: true });
      return null;
    }

    setLoadingBlockStatus(true);
    try {
      const nextStatus = await getBlockStatus(selectedParticipant.user_id);
      setBlockStatus(nextStatus);
      return nextStatus;
    } catch (error) {
      logger.error("Failed to load block status:", error);
      setBlockStatus({ blocked_by_me: false, blocked_me: false, can_message: true });
      return null;
    } finally {
      setLoadingBlockStatus(false);
    }
  }, [getBlockStatus, selectedParticipant?.user_id]);

  useEffect(() => {
    if (!partnerId) {
      fetchConversations();
    }
  }, [fetchConversations, partnerId]);

  useEffect(() => {
    if (!user || !partnerId || !isReady) return;

    let cancelled = false;
    let cancelDeferredConversations = () => {};

    const bootstrapConversation = async () => {
      try {
        const conversation = await ensureDirectConversation(partnerId);
        if (cancelled) return;
        setSelectedConversation(conversation);
        await Promise.all([
          fetchMessages(conversation.id, { markRead: Number(conversation.unread_count || 0) > 0 }),
          fetchRightPanelContext(conversation),
        ]);
        cancelDeferredConversations = scheduleAfterInitialPaint(() => {
          if (!cancelled) {
            fetchConversations({ silent: true });
          }
        });
      } catch (error) {
        logger.error("Failed to bootstrap direct conversation:", error);
        setConnectionError(true);
        setErrorDetails(error?.response?.data?.detail || error?.message || "Unable to open conversation");
      }
    };

    bootstrapConversation();

    return () => {
      cancelled = true;
      cancelDeferredConversations();
    };
  }, [ensureDirectConversation, fetchConversations, fetchMessages, fetchRightPanelContext, isReady, partnerId, user]);

  useEffect(() => {
    if (!user) return;
    const interval = window.setInterval(() => {
      fetchConversations({ silent: true });
    }, 12000);
    return () => window.clearInterval(interval);
  }, [fetchConversations, user]);

  useEffect(() => {
    if (!selectedConversationId) return;
    const interval = window.setInterval(() => {
      fetchMessages(selectedConversationId, {
        silent: true,
        markRead: Number(selectedConversation?.unread_count || 0) > 0,
      });
    }, 5000);
    return () => window.clearInterval(interval);
  }, [fetchMessages, selectedConversation?.unread_count, selectedConversationId]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  useEffect(() => {
    refreshSelectedBlockStatus();
  }, [refreshSelectedBlockStatus]);

  const handleBack = () => {
    setSelectedConversation(null);
    setMessages([]);
    setSelectedProject(null);
    setSelectedProvider(null);
    setProviderReviews([]);
    setProjectBids([]);
    setReplyingTo(null);
    navigate("/messages");
  };

  const handleRetryConnection = async () => {
    setConnectionError(false);
    setErrorDetails(null);
    await fetchConversations();
  };

  const handleSendMessage = async () => {
    const trimmedDraft = draftMessage.trim();
    const attachmentSummary = selectedAttachmentFiles.length
      ? `\n\nAttachments referenced: ${selectedAttachmentFiles.map((file) => file.name).join(", ")}`
      : "";
    const content = `${trimmedDraft || (selectedAttachmentFiles.length ? "Sharing file references for this conversation." : "")}${attachmentSummary}`.trim();

    if (!content || !selectedConversationId || sendingMessage || !blockStatus.can_message) {
      return;
    }

    setSendingMessage(true);
    try {
      const sentMessage = await sendMessage(selectedConversationId, {
        content,
        client_message_id: `${Date.now()}`,
        reply_to_message_id: replyingTo?.id || null,
      });
      setMessages((current) => [...current, sentMessage]);
      setDraftMessage("");
      setReplyingTo(null);
      setSelectedAttachmentFiles([]);
      setSelectedConversation((current) => current ? {
        ...current,
        last_message: sentMessage,
        last_message_at: sentMessage.created_at,
      } : current);
      setConversations((current) => sortConversations(current.map((conversation) => (
        conversation.id === selectedConversationId
          ? { ...conversation, last_message: sentMessage, last_message_at: sentMessage.created_at }
          : conversation
      ))));
    } catch (error) {
      logger.error("Failed to send chat message:", error);
      toast.error(error?.response?.data?.detail || "Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await deleteMessage(messageId);
      const deletedAt = new Date().toISOString();
      setMessages((current) => current.map((message) => (
        message.id === messageId
          ? { ...message, content: "Message deleted", deleted_at: deletedAt, is_deleted: true }
          : message
      )));
      toast.success("Message deleted");
      await fetchConversations({ silent: true });
    } catch (error) {
      logger.error("Failed to delete chat message:", error);
      toast.error(error?.response?.data?.detail || "Failed to delete message");
    }
  };

  const handleToggleBlock = async () => {
    if (!selectedParticipant?.user_id) return;
    try {
      if (blockStatus.blocked_by_me) {
        const next = await unblockUser(selectedParticipant.user_id);
        setBlockStatus((current) => ({ ...current, ...next, blocked_me: current.blocked_me }));
        toast.success("User unblocked");
      } else {
        const next = await blockUser(selectedParticipant.user_id);
        setBlockStatus((current) => ({ ...current, ...next, blocked_me: current.blocked_me }));
        setReplyingTo(null);
        toast.success("User blocked");
      }
    } catch (error) {
      logger.error("Failed to update block state:", error);
      toast.error(error?.response?.data?.detail || "Failed to update block status");
    }
  };

  const handleArchiveConversation = () => {
    if (!selectedConversationId) return;
    setArchivedConversationIds((current) => [...new Set([...current, selectedConversationId])]);
    toast.success("Conversation archived locally");
    handleBack();
  };

  const handleReplySelect = (message) => {
    if (!message.is_deleted) {
      setReplyingTo(message);
    }
  };

  const handleAttachmentSelect = (event) => {
    const files = Array.from(event.target.files || []).slice(0, 5);
    setSelectedAttachmentFiles(files);
    if (files.length) {
      toast.message("Attachments are shared as filename references until uploads are enabled in chat.");
    }
  };

  const handlePresetAction = (type) => {
    const presets = {
      schedule: "Would you be available for a call to review the project details and next steps?",
      visit: "Can we schedule an on-site visit so you can confirm scope and finalize pricing?",
      followup: "I reviewed your quote and want to discuss the next steps before making a decision.",
    };
    setDraftMessage((current) => current ? `${current}\n\n${presets[type]}` : presets[type]);
  };

  const handleAwardProject = async (bidId) => {
    if (!bidId || !selectedProject) return;
    if (!window.confirm("Award this project to the selected provider?")) return;
    setAwardingBidId(bidId);
    try {
      await axios.post(`${API_URL}/bids/${bidId}/award`, {}, { headers: getAuthHeader() });
      toast.success("Project awarded successfully");
      const updatedProject = { ...selectedProject, status: "awarded" };
      setSelectedProject(updatedProject);
      await fetchRightPanelContext(selectedConversation);
    } catch (error) {
      logger.error("Failed to award bid:", error);
      toast.error(error?.response?.data?.detail || "Failed to award project");
    } finally {
      setAwardingBidId(null);
    }
  };

  const visibleConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return conversations
      .filter((conversation) => !archivedConversationIds.includes(conversation.id))
      .filter((conversation) => {
        const participant = getOtherParticipant(conversation, user?.id);
        const haystack = [
          participant?.name,
          conversation.title,
          conversation.last_message?.content,
          conversation.type,
        ].filter(Boolean).join(" ").toLowerCase();
        return !query || haystack.includes(query);
      });
  }, [archivedConversationIds, conversations, searchQuery, user?.id]);

  const selectedBid = useMemo(() => {
    if (!selectedParticipant?.user_id || !projectBids.length) return null;
    return projectBids.find((bid) => String(bid.provider_id) === String(selectedParticipant.user_id)) || projectBids[0] || null;
  }, [projectBids, selectedParticipant?.user_id]);

  const conversationTypeLabel = selectedConversation?.type === "booking"
    ? "Booking thread"
    : selectedConversation?.type === "project"
      ? "Project thread"
      : "Direct message";

  const renderConversationList = () => {
    if (loadingConversations) {
      return (
        <div className="flex justify-center px-4 py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (!visibleConversations.length) {
      return (
        <div className="px-4 py-6 text-sm text-muted-foreground">
          {searchQuery ? "No conversations match this search." : "No conversations yet."}
        </div>
      );
    }

    return visibleConversations.map((conversation) => {
      const participant = getOtherParticipant(conversation, user?.id);
      const isActive = conversation.id === selectedConversationId;
      const preview = conversation.last_message?.content || "Start the conversation";

      return (
        <button
          key={conversation.id}
          type="button"
          onClick={() => openConversation(conversation)}
          className={`w-full rounded-lg border px-4 py-3 text-left transition ${isActive ? "border-primary/20 bg-primary/6 shadow-[0_18px_40px_-34px_rgba(59,130,246,0.28)]" : "border-border/60 bg-white hover:border-primary/18 hover:bg-slate-50"}`}
        >
          <div className="flex items-start gap-3">
            {participant?.avatar ? (
              <img src={participant.avatar} alt={participant?.name || "Participant"} className="h-11 w-11 rounded-full object-cover" />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-foreground">
                {(participant?.name || "U").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{participant?.name || "Unknown user"}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{conversation.title || conversationTypeLabel}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">{formatActivityLabel(conversation.last_message_at)}</span>
                  {conversation.unread_count > 0 && (
                    <span className="inline-flex min-w-5 items-center justify-center rounded-lg bg-primary px-1.5 py-0.5 text-[11px] font-semibold text-primary-foreground">
                      {conversation.unread_count}
                    </span>
                  )}
                </div>
              </div>
              <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted-foreground">{preview}</p>
            </div>
          </div>
        </button>
      );
    });
  };

  const showThread = selectedConversation || prefersSplitView;
  const showSidebar = !selectedConversation || prefersSplitView || !isNativePhone;

  if (!isReady && !connectionError) {
    return (
      <AppShell theme={pageTheme} className="pb-12" contentClassName="pb-12">
        <div className="page-shell py-6 sm:py-8">
          <div className="rounded-xl border border-border/60 bg-white px-5 py-5 shadow-[0_18px_48px_-40px_rgba(15,23,42,0.16)]">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              Preparing your messaging workspace...
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (connectionError && conversations.length === 0) {
    return (
      <AppShell theme={pageTheme} className="pb-12" contentClassName="pb-12">
        <div className="page-shell py-6 sm:py-8">
          <div className="rounded-xl border border-red-200 bg-red-50/80 px-6 py-6 shadow-[0_18px_48px_-40px_rgba(15,23,42,0.16)]">
            <div className="flex items-start gap-4">
              <AlertCircle className="mt-0.5 h-6 w-6 text-red-500" />
              <div>
                <p className="text-base font-semibold text-foreground">Messaging service unavailable</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Unable to load conversations right now. Try again in a moment.</p>
                {errorDetails ? <p className="mt-3 break-all font-mono text-[11px] text-muted-foreground">{errorDetails}</p> : null}
                <Button onClick={handleRetryConnection} className="mt-4 rounded-lg">Try Again</Button>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell theme={pageTheme} className="pb-12" contentClassName="pb-12">
      <div className="page-shell py-5 sm:py-6">
        <div className="grid gap-4 xl:grid-cols-[22rem_minmax(0,1fr)_22rem]">
          <aside className={`${showSidebar ? "block" : "hidden"} form-shell min-w-0`}>
            <div className="border-b border-border/60 px-4 py-4 sm:px-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="detail-kicker">Inbox</p>
                  <h1 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-foreground">Messages</h1>
                </div>
                <Badge variant="outline" className="rounded-lg">{visibleConversations.length}</Badge>
              </div>
              <div className="relative mt-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search conversations"
                  className="h-11 w-full rounded-lg border border-border/60 bg-background pl-10 pr-4 text-sm text-foreground outline-none transition focus:border-primary/30"
                />
              </div>
            </div>
            <div className="max-h-[calc(100vh-14rem)] space-y-2 overflow-y-auto px-3 py-3 sm:px-4">
              {renderConversationList()}
            </div>
          </aside>

          <section className={`${showThread ? "flex" : "hidden xl:flex"} form-shell min-w-0 flex-col`}>
            {selectedConversation && selectedParticipant ? (
              <>
                <div className="flex items-center gap-3 border-b border-border/60 px-4 py-4 sm:px-5">
                  <button type="button" onClick={handleBack} className="xl:hidden">
                    <ArrowLeft className="h-5 w-5 text-foreground" />
                  </button>
                  {selectedParticipant.avatar ? (
                    <img src={selectedParticipant.avatar} alt={selectedParticipant.name} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-foreground">
                      {(selectedParticipant.name || "U").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{selectedParticipant.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{conversationTypeLabel}</p>
                  </div>
                  <div className="hidden items-center gap-2 lg:flex">
                    <Button size="sm" variant="outline" className="rounded-lg" onClick={() => handlePresetAction("schedule")}>
                      <Calendar className="mr-2 h-4 w-4" />Schedule Call
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-lg" onClick={() => handlePresetAction("visit")}>
                      <MapPin className="mr-2 h-4 w-4" />Request Visit
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setShowDetailsPanel((current) => !current)}>
                      <Eye className="mr-2 h-4 w-4" />Details
                    </Button>
                  </div>
                </div>

                <div className="market-signal-strip">
                  {selectedProvider ? (
                    <>
                      <span className="market-signal-pill"><Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />{selectedProvider.avg_rating > 0 ? selectedProvider.avg_rating.toFixed(1) : "New"}</span>
                      <span className="market-signal-pill">{formatReviewCount(selectedProvider.total_reviews)}</span>
                      {(selectedProvider.provider_profile?.is_verified || selectedProvider.document_verified) ? (
                        <span className="market-signal-pill"><ShieldCheck className="h-3.5 w-3.5 text-primary" />Verified</span>
                      ) : null}
                      <span className="market-signal-pill">{formatResponseTime(selectedProvider)}</span>
                    </>
                  ) : null}
                  {selectedProject ? (
                    <>
                      <span className="market-signal-pill">{projectStatusMeta[selectedProject.status]?.label || selectedProject.status}</span>
                      <span className="market-signal-pill">{formatBudgetRange(selectedProject)}</span>
                    </>
                  ) : null}
                  {selectedBid ? (
                    <>
                      <span className="market-signal-pill">Quote {formatBidAmount(selectedBid)}</span>
                      <span className="market-signal-pill">{selectedBid.estimated_days} day estimate</span>
                      {selectedBid.is_shortlisted ? <span className="market-signal-pill">Shortlisted</span> : null}
                    </>
                  ) : null}
                </div>

                {selectedConversation && selectedParticipant && (blockStatus.blocked_by_me || blockStatus.blocked_me) ? (
                  <div className="border-b border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-800">
                    {blockStatus.blocked_by_me
                      ? `You blocked ${selectedParticipant.name}. Unblock to continue messaging.`
                      : `${selectedParticipant.name} is unavailable for chat.`}
                  </div>
                ) : null}

                <div className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,#fbfdff_0%,#f7fafc_100%)] px-4 py-5 sm:px-5">
                  {loadingMessages ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">No messages yet. Start the conversation.</div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((message, index) => {
                        const isOwnMessage = String(message.sender_id) === String(user?.id);
                        const canDeleteMessage = isOwnMessage && !message.is_deleted;
                        const isLastOwnMessage = isOwnMessage && index === messages.length - 1;

                        return (
                          <div key={message.id} className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[84%] rounded-lg px-4 py-3 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.12)] ${isOwnMessage ? "bg-[linear-gradient(135deg,hsl(var(--primary))_0%,hsl(var(--secondary))_100%)] text-primary-foreground" : "border border-border/60 bg-white text-foreground"}`}>
                              {message.reply_to_preview ? (
                                <div className={`mb-2 rounded-[0.9rem] px-3 py-2 text-xs ${isOwnMessage ? "bg-white/12 text-primary-foreground/88" : "bg-slate-50 text-muted-foreground"}`}>
                                  {message.reply_to_preview}
                                </div>
                              ) : null}
                              <p className={`whitespace-pre-wrap break-words text-sm leading-6 ${message.is_deleted ? "italic opacity-75" : ""}`}>{message.content}</p>
                              <div className="mt-2 flex items-center justify-between gap-4 text-[11px] opacity-80">
                                <div className="flex items-center gap-2">
                                  <span>{formatMessageTime(message.created_at)}</span>
                                  {isLastOwnMessage && !message.is_deleted ? (
                                    <span className="inline-flex items-center gap-1">
                                      {message.read_at ? <CheckCheck className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                                      {message.read_at ? `Read ${formatMessageTime(message.read_at)}` : "Sent"}
                                    </span>
                                  ) : null}
                                </div>
                                {!message.is_deleted ? (
                                  <div className="flex items-center gap-3">
                                    <button type="button" onClick={() => handleReplySelect(message)} className="text-[11px] font-medium">Reply</button>
                                    {canDeleteMessage ? <button type="button" onClick={() => handleDeleteMessage(message.id)} className="text-[11px] font-medium">Delete</button> : null}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div ref={messageEndRef} />
                </div>

                <div className="sticky bottom-0 border-t border-border/60 bg-white/95 px-4 py-4 backdrop-blur sm:px-5">
                  {replyingTo ? (
                    <div className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-slate-50/85 px-3 py-3 text-sm">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground">Replying to {replyingTo.sender_name || "message"}</p>
                        <p className="mt-1 truncate text-muted-foreground">{replyingTo.content}</p>
                      </div>
                      <button type="button" onClick={() => setReplyingTo(null)} className="text-xs font-semibold text-muted-foreground">Cancel</button>
                    </div>
                  ) : null}

                  {selectedAttachmentFiles.length > 0 ? (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {selectedAttachmentFiles.map((file) => (
                        <span key={`${file.name}-${file.size}`} className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-foreground">
                          <Paperclip className="h-3.5 w-3.5" />
                          {file.name}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <input ref={attachmentInputRef} type="file" multiple className="hidden" onChange={handleAttachmentSelect} />
                  <div className="flex items-end gap-3">
                    <button
                      type="button"
                      onClick={() => attachmentInputRef.current?.click()}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-slate-50 text-foreground transition hover:border-primary/20 hover:bg-primary/5"
                      aria-label="Add attachment references"
                    >
                      <Paperclip className="h-4 w-4" />
                    </button>
                    <textarea
                      value={draftMessage}
                      onChange={(event) => setDraftMessage(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey && blockStatus.can_message) {
                          event.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      rows={1}
                      disabled={!blockStatus.can_message}
                      placeholder={blockStatus.can_message ? "Write a message, ask a question, or move the project forward" : "Messaging unavailable"}
                      className="min-h-[48px] flex-1 resize-none rounded-lg border border-border/60 bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/30"
                    />
                    <Button onClick={handleSendMessage} disabled={sendingMessage || (!draftMessage.trim() && !selectedAttachmentFiles.length) || !blockStatus.can_message} className="h-11 rounded-lg px-4">
                      {sendingMessage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                      Send
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center px-6 py-12 text-sm text-muted-foreground">
                Select a conversation to view messages, bid context, and provider details.
              </div>
            )}
          </section>

          <aside ref={rightPanelRef} className={`${selectedConversation && (showDetailsPanel || !isNativePhone) ? "block" : "hidden xl:block"} form-shell min-w-0 space-y-4 p-4 sm:p-5`}>
            {selectedConversation ? (
              loadingContextPanel ? (
                <div className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading conversation context...
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="detail-kicker">Conversation Actions</p>
                    <div className="mt-3 grid gap-2">
                      <Button size="sm" variant="outline" className="justify-start rounded-lg" onClick={() => handlePresetAction("schedule")}>
                        <Calendar className="mr-2 h-4 w-4" />Schedule Call
                      </Button>
                      <Button size="sm" variant="outline" className="justify-start rounded-lg" onClick={() => handlePresetAction("visit")}>
                        <MapPin className="mr-2 h-4 w-4" />Request Visit
                      </Button>
                      {selectedBid ? (
                        <Button size="sm" variant="outline" className="justify-start rounded-lg" onClick={() => rightPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                          <Eye className="mr-2 h-4 w-4" />View Bid
                        </Button>
                      ) : null}
                      {selectedBid && user?.role === "customer" && selectedProject?.status === "live" && ["active", "shortlisted"].includes(selectedBid.status) ? (
                        <Button size="sm" className="justify-start rounded-lg" onClick={() => handleAwardProject(selectedBid.id)} disabled={awardingBidId === selectedBid.id}>
                          {awardingBidId === selectedBid.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Award className="mr-2 h-4 w-4" />}
                          Award Project
                        </Button>
                      ) : null}
                      <Button size="sm" variant="outline" className="justify-start rounded-lg" onClick={handleArchiveConversation}>
                        <Archive className="mr-2 h-4 w-4" />Archive Conversation
                      </Button>
                    </div>
                  </div>

                  {selectedProvider ? (
                    <div className="border-t border-border/60 pt-4">
                      <p className="detail-kicker">Provider Summary</p>
                      <div className="mt-3 space-y-4">
                        <div className="flex items-start gap-3">
                          {selectedProvider.profile_image ? (
                            <img src={selectedProvider.profile_image} alt={selectedProvider.full_name} className="h-12 w-12 rounded-full object-cover" />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white text-sm font-semibold text-foreground">
                              {(selectedProvider.full_name || "P").charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">{selectedProvider.full_name}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{selectedProvider.provider_profile?.business_name || selectedProvider.provider_profile?.skills?.[0] || "Home services provider"}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span className="market-card-chip"><Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />{selectedProvider.avg_rating > 0 ? selectedProvider.avg_rating.toFixed(1) : "New"}</span>
                          <span className="market-card-chip">{formatReviewCount(selectedProvider.total_reviews)}</span>
                          {(selectedProvider.provider_profile?.is_verified || selectedProvider.document_verified) && (
                            <span className="market-card-chip"><ShieldCheck className="h-3.5 w-3.5 text-primary" />Verified</span>
                          )}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="info-tile">
                            <p className="detail-kicker">Response time</p>
                            <p className="mt-2 text-sm font-semibold text-foreground">{formatResponseTime(selectedProvider)}</p>
                          </div>
                          <div className="info-tile">
                            <p className="detail-kicker">Completed</p>
                            <p className="mt-2 text-sm font-semibold text-foreground">{selectedProvider.completed_projects || 0} jobs</p>
                          </div>
                        </div>
                      </div>

                      {providerReviews.length > 0 ? (
                        <div className="mt-4 space-y-3">
                          <p className="text-sm font-semibold text-foreground">Recent reviews</p>
                          {providerReviews.slice(0, 2).map((review) => (
                            <div key={review.id} className="rounded-[1rem] bg-slate-50/85 px-4 py-3 text-sm">
                              <div className="flex items-center gap-2 text-amber-500">
                                {Array.from({ length: review.rating }).map((_, index) => <Star key={`${review.id}-${index}`} className="h-3.5 w-3.5 fill-current" />)}
                              </div>
                              <p className="mt-2 leading-6 text-foreground/88">{review.comment}</p>
                              <p className="mt-2 text-xs text-muted-foreground">{review.reviewer_name}</p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="border-t border-border/60 pt-4">
                      <p className="detail-kicker">Participant</p>
                      <div className="mt-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-3">
                          <UserRound className="h-4 w-4 text-foreground" />
                          <span>{selectedParticipant?.name || "Conversation participant"}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedProject ? (
                    <div className="border-t border-border/60 pt-4">
                      <p className="detail-kicker">Project Details</p>
                      <div className="mt-3 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{selectedProject.title}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{selectedProject.category}</p>
                          </div>
                          <Badge className={projectStatusMeta[selectedProject.status]?.className || "status-badge-neutral"}>
                            {projectStatusMeta[selectedProject.status]?.label || selectedProject.status}
                          </Badge>
                        </div>
                        <div className="grid gap-3">
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-muted-foreground">Budget</span>
                            <span className="font-semibold text-foreground">{formatBudgetRange(selectedProject)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-muted-foreground">Timeline</span>
                            <span className="font-semibold text-foreground">{formatTimelineSummary(selectedProject.deadline)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-muted-foreground">Location</span>
                            <span className="font-semibold text-foreground">{selectedProject.location || selectedProject.zip_code || "Flexible"}</span>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" className="w-full rounded-lg" onClick={() => navigate(`/projects/${selectedProject.id}`)}>
                          <FileText className="mr-2 h-4 w-4" />Open Project
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {selectedBid ? (
                    <div className="border-t border-border/60 pt-4">
                      <p className="detail-kicker">Bid Information</p>
                      <div className="mt-3 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{formatBidAmount(selectedBid)}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{selectedBid.estimated_days} day estimate</p>
                          </div>
                          <Badge className={selectedBid.status === "awarded" ? "status-badge-success" : selectedBid.is_shortlisted ? "status-badge-warning" : "status-badge-neutral"}>
                            {selectedBid.status}
                          </Badge>
                        </div>
                        <p className="text-sm leading-6 text-foreground/88">{selectedBid.proposal}</p>
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-muted-foreground">Submitted</span>
                          <span className="font-semibold text-foreground">{formatActivityLabel(selectedBid.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              )
            ) : (
              <div className="py-8 text-sm text-muted-foreground">Open a conversation to view provider, project, and bid context here.</div>
            )}
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
