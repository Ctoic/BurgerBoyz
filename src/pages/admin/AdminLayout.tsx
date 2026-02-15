import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { NavLink, Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiFetch, ApiError } from "@/lib/api";
import type {
  ApiAdminNotificationItem,
  ApiAdminUser,
  ApiPaginatedResponse,
  ApiPaginatedSupportThreadsResponse,
  ApiOrder,
  SupportThreadSummary,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  Users,
  Settings,
  Globe,
  Menu as MenuIcon,
  ChevronDown,
  MessageCircle,
  Wallet,
  Bell,
  MapPin,
} from "lucide-react";

const ADMIN_ORDERS_LAST_SEEN_KEY = "burgerguys_admin_orders_last_seen_at";

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isProductNavOpen, setIsProductNavOpen] = useState(true);
  const [lastSeenOrderAt, setLastSeenOrderAt] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(ADMIN_ORDERS_LAST_SEEN_KEY);
  });
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-me"],
    queryFn: () => apiFetch<{ user: ApiAdminUser }>("/admin/me"),
    retry: false,
  });

  const supportThreadsQuery = useQuery({
    queryKey: ["admin-support-threads"],
    queryFn: () =>
      apiFetch<ApiPaginatedSupportThreadsResponse>(
        "/admin/support/threads?page=1&pageSize=10",
      ),
    enabled: Boolean(data?.user),
    refetchInterval: 5000,
  });
  const notificationsQuery = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: () =>
      apiFetch<ApiPaginatedResponse<ApiAdminNotificationItem>>(
        "/admin/notifications?page=1&pageSize=10",
      ),
    enabled: Boolean(data?.user),
    refetchInterval: 5000,
  });
  const ordersQuery = useQuery({
    queryKey: ["admin-orders-nav"],
    queryFn: () =>
      apiFetch<ApiPaginatedResponse<ApiOrder>>("/admin/orders?page=1&pageSize=1"),
    enabled: Boolean(data?.user),
    refetchInterval: 5000,
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiFetch("/admin/logout", { method: "POST" }),
    onSuccess: () => {
      navigate("/admin/login", { replace: true });
    },
  });

  const supportUnreadCount = supportThreadsQuery.data?.totalUnreadCount ?? 0;
  const notificationsCount = notificationsQuery.data?.totalItems ?? 0;
  const latestOrderCreatedAt = ordersQuery.data?.items[0]?.createdAt ?? null;

  const isProductRoute = location.pathname.startsWith("/admin/menu");
  const isOrdersRoute = location.pathname.startsWith("/admin/orders");

  const markOrdersSeen = (seenAt: string) => {
    setLastSeenOrderAt(seenAt);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ADMIN_ORDERS_LAST_SEEN_KEY, seenAt);
    }
  };

  const hasNewOrders =
    !isOrdersRoute &&
    Boolean(
      latestOrderCreatedAt &&
        lastSeenOrderAt &&
        Date.parse(latestOrderCreatedAt) > Date.parse(lastSeenOrderAt),
    );

  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) {
      navigate("/admin/login", { replace: true });
    }
  }, [error, navigate]);

  useEffect(() => {
    if (!latestOrderCreatedAt) return;
    if (!lastSeenOrderAt) {
      markOrdersSeen(latestOrderCreatedAt);
      return;
    }
    if (isOrdersRoute && Date.parse(latestOrderCreatedAt) > Date.parse(lastSeenOrderAt)) {
      markOrdersSeen(latestOrderCreatedAt);
    }
  }, [isOrdersRoute, latestOrderCreatedAt, lastSeenOrderAt]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading admin...
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="flex items-center justify-between px-6 py-4 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <MenuIcon className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-1">
              <span className="font-display text-2xl text-brand-black">BURGER</span>
              <span className="font-display text-2xl text-primary">GUYS</span>
            </div>
            <span className="text-xs text-muted-foreground">Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Globe className="h-4 w-4" />
            </Button>
            <div className="hidden items-center gap-3 rounded-full border border-border bg-muted/40 px-4 py-1.5 text-sm text-muted-foreground sm:flex">
              {data.user.email}
            </div>
            <Button
              variant="outline"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="rounded-full"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="grid min-h-[calc(100vh-76px)] gap-0 lg:grid-cols-[260px,1fr]">
        <aside className="border-r border-border bg-background">
          <div className="sticky top-[76px] flex h-[calc(100vh-76px)] flex-col gap-6 px-4 py-6 sm:px-6">
            <nav className="flex flex-col gap-2 text-sm">
              <AdminNavLink to="/admin" label="Dashboard" icon={<LayoutDashboard className="h-4 w-4" />} />
              <AdminNavLink
                to="/admin/orders"
                label="Orders"
                icon={<ClipboardList className="h-4 w-4" />}
                alertDot={hasNewOrders}
              />
              <AdminNavLink
                to="/admin/support"
                label="Customer Support"
                icon={<MessageCircle className="h-4 w-4" />}
                badge={supportUnreadCount}
              />

              <button
                type="button"
                onClick={() => setIsProductNavOpen((prev) => !prev)}
                className={[
                  "flex w-full items-center justify-between rounded-2xl px-4 py-2.5 text-left text-sm font-semibold transition-colors",
                  isProductRoute ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/60",
                ].join(" ")}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <Package className="h-4 w-4 shrink-0" />
                  <span className="block truncate leading-tight">Product Management</span>
                </span>
                <ChevronDown
                  className={[
                    "h-4 w-4 shrink-0 transition-transform",
                    isProductNavOpen ? "rotate-180" : "",
                  ].join(" ")}
                />
              </button>

              {isProductNavOpen && (
                <div className="ml-4 flex flex-col gap-1 border-l border-border pl-4">
                  <AdminSubLink to="/admin/menu/products" label="Products" />
                  <AdminSubLink to="/admin/menu/categories" label="Categories" />
                  <AdminSubLink to="/admin/menu/deals" label="Deals" />
                  <AdminSubLink to="/admin/menu/addons" label="Addons" />
                </div>
              )}

              <AdminNavLink to="/admin/users" label="Users" icon={<Users className="h-4 w-4" />} />
              <AdminNavLink to="/admin/zones" label="Zones" icon={<MapPin className="h-4 w-4" />} />
              <AdminNavLink to="/admin/wallet" label="PayPal Wallet" icon={<Wallet className="h-4 w-4" />} />
              <AdminNavLink
                to="/admin/notifications"
                label="Notifications"
                icon={<Bell className="h-4 w-4" />}
                badge={notificationsCount}
              />
            </nav>
            <div className="mt-auto border-t border-border pt-4 text-xs text-muted-foreground">
              <Link to="/">
                <Button variant="ghost" className="w-full justify-start px-3 text-muted-foreground">
                  Back to Site
                </Button>
              </Link>
            </div>
          </div>
        </aside>

        <main className="min-h-[60vh] px-6 py-8 lg:px-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const AdminNavLink = ({
  to,
  label,
  icon,
  badge,
  alertDot,
}: {
  to: string;
  label: string;
  icon: ReactNode;
  badge?: number;
  alertDot?: boolean;
}) => (
  <NavLink
    to={to}
    end={to === "/admin"}
    className={({ isActive }) =>
      [
        "flex items-center justify-between gap-3 rounded-2xl px-4 py-2.5 font-semibold transition-colors",
        isActive
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-muted/60",
      ].join(" ")
    }
  >
    <span className="flex min-w-0 items-center gap-3">
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0 truncate">{label}</span>
    </span>
    {badge && badge > 0 ? (
      <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
        {badge}
      </span>
    ) : alertDot ? (
      <span className="h-2.5 w-2.5 rounded-full bg-accent" aria-label="New orders available" />
    ) : null}
  </NavLink>
);

const AdminSubLink = ({ to, label }: { to: string; label: string }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      [
        "rounded-full px-3 py-2 text-sm font-semibold transition-colors",
        isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/60",
      ].join(" ")
    }
  >
    <span className="block truncate">{label}</span>
  </NavLink>
);

export default AdminLayout;
