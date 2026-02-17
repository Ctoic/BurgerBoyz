import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { ApiOrder, ApiPaginatedResponse, SupportMessage } from "@/lib/types";
import { formatCurrency } from "@/lib/money";
import {
  Heart,
  HelpCircle,
  Mail,
  MapPin,
  Settings2,
  Ticket,
  User,
} from "lucide-react";
import PaginationFooter from "@/components/PaginationFooter";
import { ScrollArea } from "@/components/ui/scroll-area";

const Account = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("personal");
  const [orderView, setOrderView] = useState<"active" | "past">("active");
  const [ordersPage, setOrdersPage] = useState(1);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [supportMessage, setSupportMessage] = useState("");

  useEffect(() => {
    setOrdersPage(1);
    setSelectedOrderId(null);
  }, [orderView]);

  useEffect(() => {
    setSelectedOrderId(null);
  }, [ordersPage]);

  const ordersQuery = useQuery({
    queryKey: ["customer-orders", ordersPage, orderView],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(ordersPage),
        pageSize: "8",
        view: orderView,
      });
      return apiFetch<ApiPaginatedResponse<ApiOrder>>(`/auth/orders?${params.toString()}`);
    },
    enabled: Boolean(user),
  });

  const supportThreadQuery = useQuery({
    queryKey: ["account-support-thread"],
    queryFn: () =>
      apiFetch<{ thread: { id: string }; messages: SupportMessage[] }>("/support/thread"),
    enabled: Boolean(user) && activeTab === "help",
    refetchInterval: activeTab === "help" ? 5000 : false,
  });

  const supportSendMutation = useMutation({
    mutationFn: () =>
      apiFetch("/support/messages", {
        method: "POST",
        body: JSON.stringify({ body: supportMessage }),
      }),
    onSuccess: () => {
      setSupportMessage("");
      supportThreadQuery.refetch();
    },
  });

  const supportReadMutation = useMutation({
    mutationFn: () => apiFetch("/support/read", { method: "POST" }),
  });

  const orders = ordersQuery.data?.items ?? [];
  const selectedOrder =
    selectedOrderId && orders.length
      ? orders.find((order) => order.id === selectedOrderId) ?? null
      : null;
  const totalOrders = ordersQuery.data?.totalItems ?? 0;

  const initials = useMemo(() => {
    const base = user?.name?.trim() || user?.email?.split("@")[0] || "Customer";
    const text = base
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
    return text || "CU";
  }, [user]);

  const fullName = user?.name?.trim() || "Customer";
  const addressLine = [user?.addressLine1, user?.addressLine2].filter(Boolean).join(", ");
  const cityPostcode = [user?.addressCity, user?.addressPostcode].filter(Boolean).join(", ");
  const formatSupportTime = (value: string) =>
    new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));

  useEffect(() => {
    if (!user || activeTab !== "help") return;
    supportReadMutation.mutate();
  }, [activeTab, user]);

  return (
    <Layout>
      <section className="border-b border-border bg-background">
        <div className="container-custom section-padding pt-24 pb-6 md:pt-28">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-3xl text-foreground md:text-5xl">My Account</h1>
              <p className="mt-1 text-sm text-muted-foreground md:text-base">
                Profile, addresses, orders, and support in one place.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 bg-background">
        <div className="container-custom section-padding">
          {!user ? (
            <div className="max-w-3xl rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-3">
                <Mail className="h-6 w-6 text-primary" />
                <h2 className="font-display text-2xl text-foreground">Sign in to continue</h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Please login from the header to view your profile and orders.
              </p>
              <div className="mt-6">
                <Link to="/menu">
                  <Button className="btn-order rounded-full px-8">Explore Menu</Button>
                </Link>
              </div>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
              <div className="overflow-x-auto border-b border-border [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <TabsList className="inline-flex w-max min-w-full flex-nowrap justify-start gap-4 rounded-none border-0 bg-transparent p-0 text-foreground">
                <TabsTrigger
                  value="personal"
                  className="shrink-0 rounded-none border-b-2 border-transparent px-1 pb-3 text-sm font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Personal Info
                </TabsTrigger>
                <TabsTrigger
                  value="addresses"
                  className="shrink-0 rounded-none border-b-2 border-transparent px-1 pb-3 text-sm font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Addresses
                </TabsTrigger>
                <TabsTrigger
                  value="orders"
                  className="shrink-0 rounded-none border-b-2 border-transparent px-1 pb-3 text-sm font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Order History
                </TabsTrigger>
                <TabsTrigger
                  value="settings"
                  className="shrink-0 rounded-none border-b-2 border-transparent px-1 pb-3 text-sm font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Settings
                </TabsTrigger>
                <TabsTrigger
                  value="help"
                  className="shrink-0 rounded-none border-b-2 border-transparent px-1 pb-3 text-sm font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Get Help
                </TabsTrigger>
                <TabsTrigger
                  value="tickets"
                  className="shrink-0 rounded-none border-b-2 border-transparent px-1 pb-3 text-sm font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Tickets
                </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="personal" className="space-y-8">
                <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)] md:p-8">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-lg font-semibold text-primary">
                        {initials}
                      </span>
                      <div>
                        <p className="text-lg font-semibold text-foreground">{fullName}</p>
                        <p className="text-sm text-muted-foreground">Burger Guys Customer</p>
                      </div>
                    </div>
                    <Link to="/menu">
                      <Button variant="outline" className="rounded-full">
                        Explore Store
                      </Button>
                    </Link>
                  </div>

                  <div className="mt-6 grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
                    <InfoBlock label="Email" value={user.email ?? "Not set"} />
                    <InfoBlock label="Phone Number" value={user.phone ?? "Not set"} />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-3xl font-display text-foreground">Your Favorites</h3>
                    <Link to="/menu" className="text-sm font-semibold text-primary hover:underline">
                      See all
                    </Link>
                  </div>
                  <div className="rounded-3xl border border-border bg-card px-6 py-12 text-center shadow-[var(--shadow-card)]">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                      <Heart className="h-10 w-10 text-primary" />
                    </div>
                    <p className="mt-4 text-2xl font-semibold text-foreground">No favorites yet</p>
                    <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                      You’ll find your favorite meals here once you start adding them.
                    </p>
                    <Link to="/menu">
                      <Button variant="outline" className="mt-6 rounded-full px-8">
                        Explore Store
                      </Button>
                    </Link>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="addresses">
                <div className="rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-6 w-6 text-primary" />
                    <h2 className="font-display text-2xl text-foreground">Saved Address</h2>
                  </div>
                  {addressLine || cityPostcode ? (
                    <div className="mt-6 rounded-2xl border border-border bg-background p-5">
                      <p className="text-sm font-semibold text-foreground">{fullName}</p>
                      <p className="mt-2 text-sm text-muted-foreground">{addressLine}</p>
                      <p className="text-sm text-muted-foreground">{cityPostcode}</p>
                      {user.addressInstructions ? (
                        <p className="mt-3 text-xs text-muted-foreground">
                          Instructions: {user.addressInstructions}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <div className="mt-6 rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                      No saved address yet. Your address will be added after signup/checkout flow.
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="orders">
                <div className="rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="font-display text-2xl text-foreground">Order History</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {totalOrders} orders in your account.
                      </p>
                    </div>
                    <div className="flex w-full max-w-xs items-center gap-2 rounded-full bg-muted/50 p-1 text-sm">
                      <button
                        type="button"
                        onClick={() => setOrderView("active")}
                        className={[
                          "flex-1 rounded-full px-4 py-2 font-semibold transition-colors",
                          orderView === "active"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground",
                        ].join(" ")}
                      >
                        Active
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrderView("past")}
                        className={[
                          "flex-1 rounded-full px-4 py-2 font-semibold transition-colors",
                          orderView === "past"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground",
                        ].join(" ")}
                      >
                        Past
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl border border-border bg-background">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[560px] text-left text-sm">
                        <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
                          <tr>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">Items</th>
                            <th className="px-4 py-3">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ordersQuery.isLoading ? (
                            <tr>
                              <td className="px-4 py-5 text-muted-foreground" colSpan={3}>
                                Loading orders...
                              </td>
                            </tr>
                          ) : orders.length > 0 ? (
                            orders.map((order) => {
                              const isSelected = selectedOrderId === order.id;
                              const itemSummary = order.items
                                .map((item) => `${item.name} x${item.quantity}`)
                                .join(", ");
                              return (
                                <tr
                                  key={order.id}
                                  className={[
                                    "cursor-pointer border-b border-border last:border-0",
                                    isSelected ? "bg-primary/5" : "hover:bg-muted/40",
                                  ].join(" ")}
                                  onClick={() => setSelectedOrderId(order.id)}
                                >
                                  <td className="px-4 py-3 text-foreground">
                                    {order.orderType === "DEAL" ? "Deal" : "Normal"}
                                  </td>
                                  <td className="px-4 py-3 text-muted-foreground">{itemSummary}</td>
                                  <td className="px-4 py-3 font-semibold text-foreground">
                                    {formatCurrency(order.totalCents)}
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td className="px-4 py-5 text-muted-foreground" colSpan={3}>
                                No orders found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl border border-border bg-background p-5">
                    {selectedOrder ? (
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-base font-semibold text-foreground">
                            Order #{selectedOrder.id.slice(0, 8)}
                          </p>
                          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                            {selectedOrder.status.replace(/_/g, " ")}
                          </span>
                        </div>

                        <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                          <p>
                            Date:{" "}
                            <span className="font-semibold text-foreground">
                              {new Date(selectedOrder.createdAt).toLocaleString()}
                            </span>
                          </p>
                          <p>
                            Payment:{" "}
                            <span className="font-semibold text-foreground">
                              {selectedOrder.paymentMethod}
                            </span>
                          </p>
                          <p>
                            Fulfillment:{" "}
                            <span className="font-semibold text-foreground">
                              {selectedOrder.fulfillmentType}
                            </span>
                          </p>
                          <p>
                            Delivery Fee:{" "}
                            <span className="font-semibold text-foreground">
                              {formatCurrency(selectedOrder.deliveryFeeCents)}
                            </span>
                          </p>
                        </div>

                        <div className="rounded-xl border border-border">
                          <div className="border-b border-border bg-muted/40 px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">
                            Items
                          </div>
                          <div className="divide-y divide-border">
                            {selectedOrder.items.map((item) => (
                              (() => {
                                const addOnTotal = item.addOns.reduce(
                                  (sum, addOn) => sum + addOn.priceCents,
                                  0,
                                );
                                const lineTotalCents =
                                  (item.basePriceCents + addOnTotal) * item.quantity;
                                return (
                                  <div
                                    key={item.id}
                                    className="flex items-start justify-between gap-3 px-4 py-3 text-sm"
                                  >
                                    <div className="min-w-0">
                                      <p className="truncate font-semibold text-foreground">
                                        {item.name}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        Qty {item.quantity}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {item.addOns.length > 0
                                          ? `Add-ons: ${item.addOns
                                              .map((addOn) => addOn.name)
                                              .join(", ")}`
                                          : "No add-ons"}
                                      </p>
                                      {item.removals.length > 0 ? (
                                        <p className="text-xs text-muted-foreground">
                                          Removed: {item.removals.join(", ")}
                                        </p>
                                      ) : null}
                                    </div>
                                    <span className="font-semibold text-foreground">
                                      {formatCurrency(lineTotalCents)}
                                    </span>
                                  </div>
                                );
                              })()
                            ))}
                          </div>
                        </div>

                        {selectedOrder.address ? (
                          <div className="text-sm text-muted-foreground">
                            Address:{" "}
                            <span className="font-semibold text-foreground">
                              {[selectedOrder.address.line1, selectedOrder.address.line2, selectedOrder.address.city, selectedOrder.address.postcode]
                                .filter(Boolean)
                                .join(", ")}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Select an order from the table to view complete details.
                      </p>
                    )}
                  </div>

                  {!ordersQuery.isLoading && ordersQuery.data ? (
                    <PaginationFooter
                      currentPage={ordersQuery.data.page}
                      totalPages={ordersQuery.data.totalPages}
                      totalItems={ordersQuery.data.totalItems}
                      startItem={
                        ordersQuery.data.totalItems === 0
                          ? 0
                          : (ordersQuery.data.page - 1) * ordersQuery.data.pageSize + 1
                      }
                      endItem={Math.min(
                        ordersQuery.data.page * ordersQuery.data.pageSize,
                        ordersQuery.data.totalItems,
                      )}
                      label="order"
                      onPageChange={setOrdersPage}
                    />
                  ) : null}
                </div>
              </TabsContent>

              <TabsContent value="settings">
                <div className="rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
                  <div className="flex items-center gap-3">
                    <Settings2 className="h-6 w-6 text-primary" />
                    <h2 className="font-display text-2xl text-foreground">Settings</h2>
                  </div>

                  <div className="mt-6 divide-y divide-border">
                    <StaticRow label="Name" value={fullName} />
                    <StaticRow label="Email" value={user.email ?? "Not set"} />
                    <StaticRow label="Mobile number" value={user.phone ?? "Not set"} />
                    <StaticRow label="Country" value="United Kingdom" />
                  </div>

                  <div className="mt-6">
                    <Button variant="outline" className="rounded-full" onClick={() => void logout()}>
                      Logout
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="help">
                <div className="rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
                  <div className="flex items-center gap-3">
                    <HelpCircle className="h-6 w-6 text-primary" />
                    <h2 className="font-display text-2xl text-foreground">Get Help</h2>
                  </div>

                  <p className="mt-3 text-sm text-muted-foreground">
                    Chat directly with admin support from here.
                  </p>

                  <div className="mt-6 rounded-2xl border border-border bg-muted/20">
                    <div className="border-b border-border px-4 py-3">
                      <p className="text-sm font-semibold text-foreground">Customer Support Chat</p>
                      <p className="text-xs text-muted-foreground">
                        Send a message and our team will reply shortly.
                      </p>
                    </div>

                    <div className="h-[340px] px-3 py-3 sm:px-4">
                      <ScrollArea className="h-full w-full pr-1">
                        <div className="space-y-3">
                          {supportThreadQuery.isLoading ? (
                            <p className="text-sm text-muted-foreground">Loading messages...</p>
                          ) : supportThreadQuery.data?.messages?.length ? (
                            supportThreadQuery.data.messages.map((message) => (
                              <div
                                key={message.id}
                                className={[
                                  "flex",
                                  message.sender === "CUSTOMER" ? "justify-end" : "justify-start",
                                ].join(" ")}
                              >
                                <div
                                  className={[
                                    "min-w-[140px] max-w-[88%] rounded-[10px] border px-3 py-2 text-sm leading-relaxed shadow-sm",
                                    message.sender === "CUSTOMER"
                                      ? "border-primary/50 bg-primary/10 text-foreground"
                                      : "border-border bg-background text-foreground",
                                  ].join(" ")}
                                >
                                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    {message.sender === "CUSTOMER" ? "You" : "Admin"} ·{" "}
                                    {formatSupportTime(message.createdAt)}
                                  </p>
                                  {message.body}
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground">No messages yet.</p>
                          )}
                        </div>
                      </ScrollArea>
                    </div>

                    <div className="border-t border-border bg-background px-3 py-3 sm:px-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                        <Input
                          placeholder="Type your message..."
                          value={supportMessage}
                          onChange={(event) => setSupportMessage(event.target.value)}
                          className="h-11 w-full flex-1 rounded-[10px]"
                        />
                        <Button
                          className="h-11 w-full rounded-[10px] px-6 sm:w-auto"
                          onClick={() => supportSendMutation.mutate()}
                          disabled={!supportMessage.trim() || supportSendMutation.isPending}
                        >
                          {supportSendMutation.isPending ? "Sending..." : "Send"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="tickets">
                <div className="rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
                  <div className="flex items-center gap-3">
                    <Ticket className="h-6 w-6 text-primary" />
                    <h2 className="font-display text-2xl text-foreground">Tickets</h2>
                  </div>
                  <div className="mt-6 rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                    No tickets yet.
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </section>
    </Layout>
  );
};

const InfoBlock = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
    <p className="mt-1 text-base font-semibold text-foreground">{value}</p>
  </div>
);

const StaticRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-semibold text-foreground">{value}</span>
  </div>
);

export default Account;
