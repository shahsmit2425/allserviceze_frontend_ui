import { useState, useEffect } from "react";
import logger from "@/utils/logger";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import axios from "axios";
import { usePendingActions } from "../hooks/usePendingActions";
import { 
  Users, Briefcase, Calendar, DollarSign, Star, Search,
  CheckCircle, XCircle, Trash2, Shield, Loader2, TrendingUp,
  BarChart3, Package, Eye, FileText
} from "lucide-react";

const API_URL = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api`;

const statusColors = {
  pending: "status-badge-warning",
  confirmed: "status-badge-info",
  completed: "status-badge-success",
  cancelled: "status-badge-danger",
  approved: "status-badge-success",
  rejected: "status-badge-danger",
  live: "status-badge-info",
  in_progress: "status-badge-violet",
  draft: "status-badge-neutral",
  closed: "status-badge-neutral"
};

const panelClassName = "form-shell";

export default function AdminPanel() {
  const navigate = useNavigate();
  const { user, getAuthHeader } = useAuth();
  
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [projects, setProjects] = useState([]);
  const [pendingProjects, setPendingProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const { isPending, runPendingAction } = usePendingActions();

  const getUserActionKey = (action, userId) => `${action}:user:${userId}`;
  const getProjectActionKey = (action, projectId) => `${action}:project:${projectId}`;
  const getReviewActionKey = (reviewId) => `delete:review:${reviewId}`;
  const isUserActionPending = (userId) =>
    ["verify", "unverify", "make-admin", "delete"].some((action) => isPending(getUserActionKey(action, userId)));
  const isProjectActionPending = (projectId) =>
    ["approve", "feature", "reject"].some((action) => isPending(getProjectActionKey(action, projectId)));

  useEffect(() => {
    if (!user?.is_admin) {
      navigate("/");
      return;
    }
    fetchAdminData();
  }, [user]);

  const fetchAdminData = async () => {
    try {
      const [statsRes, usersRes, reviewsRes, projectsRes, pendingRes] = await Promise.all([
        axios.get(`${API_URL}/admin/stats`, { headers: getAuthHeader() }),
        axios.get(`${API_URL}/admin/users`, { headers: getAuthHeader() }),
        axios.get(`${API_URL}/admin/reviews`, { headers: getAuthHeader() }),
        axios.get(`${API_URL}/admin/projects`, { headers: getAuthHeader() }),
        axios.get(`${API_URL}/admin/projects/pending`, { headers: getAuthHeader() })
      ]);
      
      setStats(statsRes.data);
      setUsers(usersRes.data);
      setReviews(reviewsRes.data);
      setProjects(projectsRes.data);
      setPendingProjects(pendingRes.data);
    } catch (error) {
      logger.error("Error fetching admin data:", error);
      toast.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyProvider = async (userId) => {
    await runPendingAction(getUserActionKey("verify", userId), async () => {
      try {
        await axios.patch(`${API_URL}/admin/users/${userId}/verify`, {}, { headers: getAuthHeader() });
        toast.success("Provider verified");
        await fetchAdminData();
      } catch (error) {
        toast.error("Failed to verify provider");
      }
    });
  };

  const handleUnverifyProvider = async (userId) => {
    await runPendingAction(getUserActionKey("unverify", userId), async () => {
      try {
        await axios.patch(`${API_URL}/admin/users/${userId}/unverify`, {}, { headers: getAuthHeader() });
        toast.success("Provider unverified");
        await fetchAdminData();
      } catch (error) {
        toast.error("Failed to unverify provider");
      }
    });
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    
    await runPendingAction(getUserActionKey("delete", userId), async () => {
      try {
        await axios.delete(`${API_URL}/admin/users/${userId}`, { headers: getAuthHeader() });
        toast.success("User deleted");
        await fetchAdminData();
      } catch (error) {
        toast.error(error.response?.data?.detail || "Failed to delete user");
      }
    });
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;
    
    await runPendingAction(getReviewActionKey(reviewId), async () => {
      try {
        await axios.delete(`${API_URL}/admin/reviews/${reviewId}`, { headers: getAuthHeader() });
        toast.success("Review deleted");
        await fetchAdminData();
      } catch (error) {
        toast.error("Failed to delete review");
      }
    });
  };

  const handleMakeAdmin = async (userId) => {
    if (!window.confirm("Make this user an admin?")) return;
    
    await runPendingAction(getUserActionKey("make-admin", userId), async () => {
      try {
        await axios.patch(`${API_URL}/admin/users/${userId}/make-admin`, {}, { headers: getAuthHeader() });
        toast.success("User is now admin");
        await fetchAdminData();
      } catch (error) {
        toast.error("Failed to make admin");
      }
    });
  };

  const handleApproveProject = async (projectId) => {
    await runPendingAction(getProjectActionKey("approve", projectId), async () => {
      try {
        await axios.post(`${API_URL}/admin/projects/${projectId}/action`, 
          { action: "approve" },
          { headers: getAuthHeader() }
        );
        toast.success("Project approved!");
        await fetchAdminData();
      } catch (error) {
        toast.error("Failed to approve");
      }
    });
  };

  const handleFeatureProject = async (projectId) => {
    await runPendingAction(getProjectActionKey("feature", projectId), async () => {
      try {
        await axios.post(`${API_URL}/admin/projects/${projectId}/action`,
          { action: "feature" },
          { headers: getAuthHeader() }
        );
        toast.success("Project featured!");
        await fetchAdminData();
      } catch (error) {
        toast.error("Failed to feature");
      }
    });
  };

  const handleRejectProject = async () => {
    if (!selectedProject) return;
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason");
      return;
    }

    await runPendingAction(getProjectActionKey("reject", selectedProject.id), async () => {
      try {
        await axios.post(`${API_URL}/admin/projects/${selectedProject.id}/action`,
          { action: "reject", reason: rejectReason },
          { headers: getAuthHeader() }
        );
        toast.success("Project rejected");
        setRejectDialogOpen(false);
        setRejectReason("");
        setSelectedProject(null);
        await fetchAdminData();
      } catch (error) {
        toast.error("Failed to reject");
      }
    });
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const totalRevenue = stats?.total_revenue || 0;

  if (loading) {
    return (
      <AppShell theme="admin" className="bg-background" contentClassName="pb-0">
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell theme="admin" className="pb-12" contentClassName="pb-12" data-testid="admin-panel">
      <div className="page-shell space-y-8 py-8">
        <section className="page-hero">
          <div className="workspace-hero-grid">
            <div className="max-w-3xl">
              <span className="page-kicker">Admin workspace</span>
              <h1 className="heading-2 mt-4 text-foreground">Admin panel</h1>
              <p className="body-lg mt-3 max-w-2xl text-muted-foreground">
                Review platform activity, manage users, and clear approval queues from one moderation workspace.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="info-chip">
                  <Users className="h-4 w-4 text-primary" />
                  {stats?.total_users || 0} users
                </span>
                <span className="info-chip">
                  <Package className="h-4 w-4 text-emerald-600" />
                  {pendingProjects.length} pending approvals
                </span>
                <span className="info-chip">
                  <TrendingUp className="h-4 w-4 text-copper-600" />
                  ${totalRevenue} revenue tracked
                </span>
              </div>
            </div>

            <div className="workspace-hero-aside">
              <div className="relative space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/65">Operations view</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">Keep approvals, moderation, and growth signals in one place.</h2>
                  </div>
                  <div className="rounded-lg border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">Live</div>
                </div>

                <div className="workspace-hero-metrics">
                  <div className="workspace-hero-metric">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/62">Users</p>
                    <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">{stats?.total_users || 0}</p>
                  </div>
                  <div className="workspace-hero-metric">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/62">Projects</p>
                    <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">{stats?.total_projects || projects.length}</p>
                  </div>
                  <div className="workspace-hero-metric">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/62">Reviews</p>
                    <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">{stats?.total_reviews || reviews.length}</p>
                  </div>
                  <div className="workspace-hero-metric">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/62">Pending</p>
                    <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">{pendingProjects.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className={panelClassName}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-3xl font-bold mt-1">{stats?.total_users || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats?.total_providers || 0} providers, {stats?.total_customers || 0} customers
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={panelClassName}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Projects</p>
                  <p className="text-3xl font-bold mt-1">{stats?.total_projects || projects.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={panelClassName}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Reviews</p>
                  <p className="text-3xl font-bold mt-1">{stats?.total_reviews || reviews.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Star className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={panelClassName}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-3xl font-bold mt-1">${stats?.total_revenue || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="form-shell p-4 sm:p-6">
        <Tabs defaultValue="projects" className="space-y-6">
          <TabsList className="grid min-w-[24rem] grid-cols-3">
            <TabsTrigger value="projects" className="relative">
              Projects 
              {pendingProjects.length > 0 && (
                <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-lg bg-destructive text-xs text-destructive-foreground">
                  {pendingProjects.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
            <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="projects">
            {pendingProjects.length > 0 && (
              <Card className={`${panelClassName} mb-6`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <FileText className="w-5 h-5" />
                    Pending Approval ({pendingProjects.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {pendingProjects.map((project) => (
                      <div key={project.id} className="alert-warning">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold">{project.title}</h4>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {project.description}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-sm text-muted-foreground">
                              <span>By: {project.customer_name}</span>
                              <span>Budget: ${project.budget_min} - ${project.budget_max}</span>
                              <Badge>{project.category}</Badge>
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button
                              size="sm"
                              onClick={() => handleApproveProject(project.id)}
                              disabled={isProjectActionPending(project.id)}
                            >
                              {isPending(getProjectActionKey("approve", project.id)) ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  Approving...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Approve
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedProject(project);
                                setRejectDialogOpen(true);
                              }}
                              disabled={isProjectActionPending(project.id)}
                              className="text-destructive hover:bg-destructive/5"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate(`/projects/${project.id}`)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className={panelClassName}>
              <CardHeader>
                <CardTitle>All Projects ({projects.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Budget</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Bids</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.slice(0, 50).map((project) => (
                      <TableRow key={project.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{project.title}</p>
                            <Badge variant="secondary" className="text-xs">{project.category}</Badge>
                          </div>
                        </TableCell>
                        <TableCell>{project.customer_name}</TableCell>
                        <TableCell>${project.budget_min} - ${project.budget_max}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[project.status]}>
                            {project.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>{project.bid_count}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate(`/projects/${project.id}`)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {project.status === "live" && !project.is_featured && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleFeatureProject(project.id)}
                                disabled={isProjectActionPending(project.id)}
                              >
                                {isPending(getProjectActionKey("feature", project.id)) ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Star className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card className={panelClassName}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>User Management</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={u.profile_image} />
                              <AvatarFallback>{u.full_name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{u.full_name}</p>
                              <p className="text-sm text-muted-foreground">{u.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.role === "provider" ? "default" : "secondary"}>
                            {u.role}
                          </Badge>
                          {u.is_admin && <Badge className="ml-1 bg-destructive text-destructive-foreground">Admin</Badge>}
                        </TableCell>
                        <TableCell>
                          {u.role === "provider" && (
                            u.provider_profile?.is_verified ? (
                              <Badge className="status-badge-success">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="outline">Unverified</Badge>
                            )
                          )}
                        </TableCell>
                        <TableCell>
                          {u.role === "provider" && (
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span>{u.avg_rating?.toFixed(1) || "New"}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {u.role === "provider" && (
                              u.provider_profile?.is_verified ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUnverifyProvider(u.id)}
                                  disabled={isUserActionPending(u.id)}
                                >
                                  {isPending(getUserActionKey("unverify", u.id)) ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                      Unverifying...
                                    </>
                                  ) : (
                                    "Unverify"
                                  )}
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => handleVerifyProvider(u.id)}
                                  disabled={isUserActionPending(u.id)}
                                >
                                  {isPending(getUserActionKey("verify", u.id)) ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                      Verifying...
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="w-4 h-4 mr-1" />
                                      Verify
                                    </>
                                  )}
                                </Button>
                              )
                            )}
                            {!u.is_admin && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleMakeAdmin(u.id)}
                                  disabled={isUserActionPending(u.id)}
                                >
                                  {isPending(getUserActionKey("make-admin", u.id)) ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Shield className="w-4 h-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteUser(u.id)}
                                  disabled={isUserActionPending(u.id)}
                                  className="text-destructive hover:bg-destructive/5"
                                >
                                  {isPending(getUserActionKey("delete", u.id)) ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews">
            <Card className={panelClassName}>
              <CardHeader>
                <CardTitle>All Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reviewer</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Comment</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviews.slice(0, 50).map((review) => (
                      <TableRow key={review.id}>
                        <TableCell>{review.reviewer_name}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {[...Array(review.rating)].map((_, i) => (
                              <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-md truncate">{review.comment}</TableCell>
                        <TableCell>{new Date(review.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteReview(review.id)}
                            disabled={isPending(getReviewActionKey(review.id))}
                            className="text-destructive hover:bg-destructive/5"
                          >
                            {isPending(getReviewActionKey(review.id)) ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </section>
      </div>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Please provide a reason for rejecting this project. The customer will be notified.
            </p>
            <Textarea
              placeholder="Reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleRejectProject}
                disabled={!selectedProject || isPending(getProjectActionKey("reject", selectedProject?.id))}
                variant="destructive"
              >
                {selectedProject && isPending(getProjectActionKey("reject", selectedProject.id)) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  "Reject Project"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
