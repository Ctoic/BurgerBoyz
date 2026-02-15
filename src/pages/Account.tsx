import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { ApiOrder, ApiPaginatedResponse } from "@/lib/types";
import { formatCurrency } from "@/lib/money";
import { useSearchParams } from "react-router-dom";
import { Mail, User, MapPin, Settings2, HelpCircle, Ticket, Search } from "lucide-react";
import PaginationFooter from "@/components/PaginationFooter";

const Account = () => {
  const { user, signup, updateProfile, logout } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();

  const [formState, setFormState] = useState({
    email: "",
    name: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    addressCity: "",
    addressPostcode: "",
    addressInstructions: "",
  });

  const [settingsState, setSettingsState] = useState({
    country: "United Kingdom",
    receipts: true,
    promoPush: false,
    promoEmail: true,
  });
  const [orderView, setOrderView] = useState<"active" | "past">("active");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [ordersPage, setOrdersPage] = useState(1);

  useEffect(() => {
    if (!user) return;
    setFormState((prev) => ({
      ...prev,
      email: user.email ?? "",
      name: user.name ?? "",
      phone: user.phone ?? "",
      addressLine1: user.addressLine1 ?? "",
      addressLine2: user.addressLine2 ?? "",
      addressCity: user.addressCity ?? "",
      addressPostcode: user.addressPostcode ?? "",
      addressInstructions: user.addressInstructions ?? "",
    }));
  }, [user]);

  useEffect(() => {
    if (user) return;
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setFormState((prev) => ({ ...prev, email: emailParam }));
    }
  }, [searchParams, user]);

  useEffect(() => {
    setOrdersPage(1);
  }, [orderView, orderSearch, orderDate]);

  const ordersQuery = useQuery({
    queryKey: ["customer-orders", ordersPage, orderView, orderSearch, orderDate],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(ordersPage),
        pageSize: "10",
        view: orderView,
      });
      const trimmedSearch = orderSearch.trim();
      if (trimmedSearch) {
        params.set("search", trimmedSearch);
      }
      if (orderDate) {
        params.set("date", orderDate);
      }
      return apiFetch<ApiPaginatedResponse<ApiOrder>>(`/auth/orders?${params.toString()}`);
    },
    enabled: Boolean(user),
  });
  const orders = ordersQuery.data?.items ?? [];

  const handleSignup = async () => {
    if (!formState.email.trim()) return;
    setLoading(true);
    try {
      await signup({
        email: formState.email.trim(),
        name: formState.name.trim(),
        phone: formState.phone.trim(),
        addressLine1: formState.addressLine1.trim(),
        addressLine2: formState.addressLine2.trim() || undefined,
        addressCity: formState.addressCity.trim(),
        addressPostcode: formState.addressPostcode.trim(),
        addressInstructions: formState.addressInstructions.trim() || undefined,
      });
      toast({
        title: "You're in!",
        description: "Account created and signed in.",
      });
    } catch (error) {
      toast({
        title: "Signup failed",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      await updateProfile({
        name: formState.name.trim() || undefined,
        phone: formState.phone.trim() || undefined,
        addressLine1: formState.addressLine1.trim() || undefined,
        addressLine2: formState.addressLine2.trim() || undefined,
        addressCity: formState.addressCity.trim() || undefined,
        addressPostcode: formState.addressPostcode.trim() || undefined,
        addressInstructions: formState.addressInstructions.trim() || undefined,
      });
      toast({
        title: "Profile updated",
        description: "Your details are saved.",
      });
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const isSignupValid =
    formState.email.trim() &&
    formState.name.trim() &&
    formState.phone.trim() &&
    formState.addressLine1.trim() &&
    formState.addressCity.trim() &&
    formState.addressPostcode.trim();

  const orderCount = ordersQuery.data?.totalItems ?? 0;

  return (
    <Layout>
      <section className="border-b border-border bg-background">
        <div className="container-custom section-padding pt-24 pb-6 md:pt-28">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-3xl text-foreground md:text-5xl">
                {user ? "Profile" : "Create your profile"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground md:text-base">
                {user
                  ? "Manage your account details and order history."
                  : "We’ll save your details for faster checkout."}
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
                <h2 className="font-display text-2xl text-foreground">Sign up with email</h2>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Enter your details once and we’ll keep them ready for future orders.
              </p>

              <div className="mt-6 grid gap-4">
                <Input
                  type="email"
                  placeholder="Email address"
                  value={formState.email}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, email: event.target.value }))
                  }
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    placeholder="Full name"
                    value={formState.name}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, name: event.target.value }))
                    }
                  />
                  <Input
                    placeholder="Phone number"
                    value={formState.phone}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, phone: event.target.value }))
                    }
                  />
                </div>
                <Input
                  placeholder="Address line 1"
                  value={formState.addressLine1}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, addressLine1: event.target.value }))
                  }
                />
                <Input
                  placeholder="Address line 2 (optional)"
                  value={formState.addressLine2}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, addressLine2: event.target.value }))
                  }
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    placeholder="City"
                    value={formState.addressCity}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, addressCity: event.target.value }))
                    }
                  />
                  <Input
                    placeholder="Postcode"
                    value={formState.addressPostcode}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, addressPostcode: event.target.value }))
                    }
                  />
                </div>
                <Textarea
                  placeholder="Delivery instructions (optional)"
                  value={formState.addressInstructions}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, addressInstructions: event.target.value }))
                  }
                  rows={3}
                />
              </div>

              <Button
                className="btn-order mt-6 w-full rounded-full py-6 text-lg"
                onClick={handleSignup}
                disabled={!isSignupValid || loading}
              >
                {loading ? "Creating..." : "Continue"}
              </Button>
            </div>
          ) : (
            <Tabs defaultValue="personal" className="space-y-8">
              <TabsList className="flex w-full flex-wrap justify-start gap-4 rounded-none border-b border-border bg-transparent p-0 text-foreground">
                <TabsTrigger
                  value="personal"
                  className="rounded-none border-b-2 border-transparent px-1 pb-3 text-sm font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Personal Info
                </TabsTrigger>
                <TabsTrigger
                  value="addresses"
                  className="rounded-none border-b-2 border-transparent px-1 pb-3 text-sm font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Addresses
                </TabsTrigger>
                <TabsTrigger
                  value="orders"
                  className="rounded-none border-b-2 border-transparent px-1 pb-3 text-sm font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Order History
                </TabsTrigger>
                <TabsTrigger
                  value="settings"
                  className="rounded-none border-b-2 border-transparent px-1 pb-3 text-sm font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Settings
                </TabsTrigger>
                <TabsTrigger
                  value="help"
                  className="rounded-none border-b-2 border-transparent px-1 pb-3 text-sm font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Get Help
                </TabsTrigger>
                <TabsTrigger
                  value="tickets"
                  className="rounded-none border-b-2 border-transparent px-1 pb-3 text-sm font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Tickets
                </TabsTrigger>
              </TabsList>

              <TabsContent value="personal">
                <div className="rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
                  <div className="flex items-center gap-3">
                    <User className="h-6 w-6 text-primary" />
                    <h2 className="font-display text-2xl text-foreground">Personal info</h2>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Update your name and phone number.
                  </p>
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <Input
                      placeholder="Full name"
                      value={formState.name}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, name: event.target.value }))
                      }
                    />
                    <Input
                      placeholder="Phone number"
                      value={formState.phone}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, phone: event.target.value }))
                      }
                    />
                  </div>
                  <div className="mt-4">
                    <Input value={formState.email} disabled className="bg-muted/40" />
                  </div>
                  <Button
                    className="btn-order mt-6 rounded-full px-8"
                    onClick={handleUpdateProfile}
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Save changes"}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="addresses">
                <div className="rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-6 w-6 text-primary" />
                    <h2 className="font-display text-2xl text-foreground">Addresses</h2>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Saved address for faster checkout.
                  </p>
                  <div className="mt-6 grid gap-4">
                    <Input
                      placeholder="Address line 1"
                      value={formState.addressLine1}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, addressLine1: event.target.value }))
                      }
                    />
                    <Input
                      placeholder="Address line 2 (optional)"
                      value={formState.addressLine2}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, addressLine2: event.target.value }))
                      }
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input
                        placeholder="City"
                        value={formState.addressCity}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, addressCity: event.target.value }))
                        }
                      />
                      <Input
                        placeholder="Postcode"
                        value={formState.addressPostcode}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, addressPostcode: event.target.value }))
                        }
                      />
                    </div>
                    <Textarea
                      placeholder="Delivery instructions (optional)"
                      value={formState.addressInstructions}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, addressInstructions: event.target.value }))
                      }
                      rows={3}
                    />
                  </div>
                  <Button
                    className="btn-order mt-6 rounded-full px-8"
                    onClick={handleUpdateProfile}
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Save address"}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="orders">
                <div className="rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
                  <div className="flex items-center gap-3">
                    <Ticket className="h-6 w-6 text-primary" />
                    <h2 className="font-display text-2xl text-foreground">Order history</h2>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {orderCount} orders saved to your account.
                  </p>

                  <div className="mt-6 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex w-full max-w-md items-center gap-2 rounded-full bg-muted/50 p-1 text-sm">
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
                          Active Orders
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
                          Past Orders
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <div className="relative w-full max-w-xs">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="Search orders..."
                            value={orderSearch}
                            onChange={(event) => setOrderSearch(event.target.value)}
                            className="h-10 pl-9"
                          />
                        </div>
                        <Input
                          type="date"
                          value={orderDate}
                          onChange={(event) => setOrderDate(event.target.value)}
                          className="h-10 w-full max-w-[160px]"
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-background">
                      <div className="overflow-x-auto">
                        <table className="min-w-[720px] w-full text-left text-sm">
                          <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
                            <tr>
                              <th className="px-4 py-3">Order ID</th>
                              <th className="px-4 py-3">Type</th>
                              <th className="px-4 py-3">Order Name</th>
                              <th className="px-4 py-3">Quantity</th>
                              <th className="px-4 py-3">Date</th>
                              <th className="px-4 py-3">Price</th>
                              <th className="px-4 py-3">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ordersQuery.isLoading ? (
                              <tr>
                                <td className="px-4 py-4 text-muted-foreground" colSpan={7}>
                                  Loading orders...
                                </td>
                              </tr>
                            ) : orders.length > 0 ? (
                              orders.map((order) => {
                                const itemCount = order.items.reduce(
                                  (sum, item) => sum + item.quantity,
                                  0,
                                );
                                const orderName = order.items[0]?.name ?? "Order";
                                return (
                                  <tr key={order.id} className="border-b border-border last:border-0">
                                    <td className="px-4 py-3 text-muted-foreground">
                                      {order.id.slice(0, 8)}
                                    </td>
                                    <td className="px-4 py-3">
                                      <span
                                        className={
                                          order.orderType === "DEAL"
                                            ? "rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent"
                                            : "rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground"
                                        }
                                      >
                                        {order.orderType === "DEAL" ? "Deal" : "Normal"}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 font-semibold text-foreground">
                                      {orderName}
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">{itemCount}</td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                      {new Date(order.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3 font-semibold text-foreground">
                                      {formatCurrency(order.totalCents)}
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                                        {order.status.replace(/_/g, " ")}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td className="px-4 py-4 text-muted-foreground" colSpan={7}>
                                  No orders found.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
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
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="settings">
                <div className="rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
                  <div className="flex items-center gap-3">
                    <Settings2 className="h-6 w-6 text-primary" />
                    <h2 className="font-display text-2xl text-foreground">Settings</h2>
                  </div>

                  <div className="mt-6 divide-y divide-border text-sm">
                    <SettingsRow label="Country">
                      <Select
                        value={settingsState.country}
                        onValueChange={(value) =>
                          setSettingsState((prev) => ({ ...prev, country: value }))
                        }
                      >
                        <SelectTrigger className="w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                          <SelectItem value="United States">United States</SelectItem>
                          <SelectItem value="Canada">Canada</SelectItem>
                        </SelectContent>
                      </Select>
                    </SettingsRow>
                    <SettingsRow label="Email">
                      <span className="text-primary font-semibold">{formState.email}</span>
                    </SettingsRow>
                    <SettingsRow label="Mobile number">
                      <span className="text-foreground">{formState.phone || "Add phone"}</span>
                    </SettingsRow>
                    <SettingsRow label="Name">
                      <span className="text-foreground">{formState.name || "Add name"}</span>
                    </SettingsRow>
                    <SettingsRow label="Delete Account">
                      <Button variant="outline" size="sm" disabled>
                        Delete
                      </Button>
                    </SettingsRow>
                    <SettingsRow label="Send receipts to email">
                      <Switch
                        checked={settingsState.receipts}
                        onCheckedChange={(checked) =>
                          setSettingsState((prev) => ({ ...prev, receipts: checked }))
                        }
                      />
                    </SettingsRow>
                    <SettingsRow label="Log out of app">
                      <Button variant="outline" size="sm" onClick={() => logout()}>
                        Logout
                      </Button>
                    </SettingsRow>
                  </div>

                  <div className="mt-8">
                    <h3 className="font-display text-lg text-foreground">Notifications</h3>
                    <div className="mt-4 divide-y divide-border text-sm">
                      <SettingsRow label="Receive special offers via push">
                        <Switch
                          checked={settingsState.promoPush}
                          onCheckedChange={(checked) =>
                            setSettingsState((prev) => ({ ...prev, promoPush: checked }))
                          }
                        />
                      </SettingsRow>
                      <SettingsRow label="Receive special offers via email">
                        <Switch
                          checked={settingsState.promoEmail}
                          onCheckedChange={(checked) =>
                            setSettingsState((prev) => ({ ...prev, promoEmail: checked }))
                          }
                        />
                      </SettingsRow>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="help">
                <div className="rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
                  <div className="flex items-center gap-3">
                    <HelpCircle className="h-6 w-6 text-primary" />
                    <h2 className="font-display text-2xl text-foreground">Get Help</h2>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Reach out and we’ll get back to you quickly.
                  </p>
                  <div className="mt-6 grid gap-4">
                    <Input placeholder="Subject" />
                    <Textarea placeholder="How can we help?" rows={4} />
                    <Button className="btn-order rounded-full px-6">Send message</Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="tickets">
                <div className="rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
                  <div className="flex items-center gap-3">
                    <Ticket className="h-6 w-6 text-primary" />
                    <h2 className="font-display text-2xl text-foreground">Tickets</h2>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Your support tickets will show here.
                  </p>
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

const SettingsRow = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-4">
      <span className="text-muted-foreground">{label}</span>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
};

export default Account;
