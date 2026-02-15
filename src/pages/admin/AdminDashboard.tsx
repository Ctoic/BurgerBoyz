import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { ApiOrder, ApiPaginatedResponse } from "@/lib/types";
import { formatCurrency } from "@/lib/money";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { ShoppingCart, Banknote, CreditCard, Wallet } from "lucide-react";

const RANGE_OPTIONS = [
  { id: "all", label: "All" },
  { id: "today", label: "Today" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
  { id: "custom", label: "Custom" },
] as const;

type RangeId = (typeof RANGE_OPTIONS)[number]["id"];

  const AdminDashboard = () => {
  const [range, setRange] = useState<RangeId>("all");
  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders-dashboard", range],
    queryFn: () =>
      apiFetch<ApiPaginatedResponse<ApiOrder>>(
        `/admin/orders?page=1&pageSize=100&range=${range}`,
      ),
  });
  const orders = data?.items ?? [];

  const filteredOrders = useMemo(() => {
    return orders;
  }, [orders]);

  const totals = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const cashOrders = filteredOrders.filter((order) => order.paymentMethod === "CASH").length;
    const cardOrders = filteredOrders.filter((order) => order.paymentMethod === "STRIPE").length;
    const totalSalesCents = filteredOrders.reduce((sum, order) => sum + order.totalCents, 0);

    return { totalOrders, cashOrders, cardOrders, totalSalesCents };
  }, [filteredOrders]);

  const chartData = useMemo(() => {
    const days = 8;
    const now = new Date();
    const data = [] as { label: string; sales: number; orders: number }[];

    for (let i = days - 1; i >= 0; i -= 1) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const key = date.toISOString().slice(0, 10);
      const label = date.toLocaleDateString(undefined, { weekday: "short" });
      const dayOrders = filteredOrders.filter(
        (order) => order.createdAt.slice(0, 10) === key,
      );
      const sales = dayOrders.reduce((sum, order) => sum + order.totalCents, 0) / 100;
      data.push({ label, sales, orders: dayOrders.length });
    }

    return data;
  }, [filteredOrders]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-foreground">Business Overview</h1>
          <p className="text-sm text-muted-foreground">Track Burger Guys performance.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded-full border border-border bg-background p-1 shadow-sm">
          {RANGE_OPTIONS.map((option) => (
            <Button
              key={option.id}
              variant={range === option.id ? "default" : "ghost"}
              size="sm"
              className={
                range === option.id
                  ? "rounded-full px-4"
                  : "rounded-full px-4 text-muted-foreground"
              }
              onClick={() => setRange(option.id)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading dashboard...</p>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-4">
            <MetricCard
              title="Total Orders"
              value={totals.totalOrders}
              icon={<ShoppingCart className="h-5 w-5" />}
            />
            <MetricCard
              title="Total COD Orders"
              value={totals.cashOrders}
              icon={<Banknote className="h-5 w-5" />}
            />
            <MetricCard
              title="Total Card Orders"
              value={totals.cardOrders}
              icon={<CreditCard className="h-5 w-5" />}
            />
            <MetricCard
              title="Total Sales"
              value={formatCurrency(totals.totalSalesCents)}
              icon={<Wallet className="h-5 w-5" />}
            />
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl text-foreground">Growth Overview</h2>
                <p className="text-sm text-muted-foreground">Tracking orders and sales.</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-primary" />
                  Sales Amount
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-secondary" />
                  Orders Count
                </div>
              </div>
            </div>
            <div className="mt-6 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ left: 10, right: 10, top: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "16px",
                      border: "1px solid hsl(var(--border))",
                    }}
                    formatter={(value, name) =>
                      name === "sales" ? [`£${value}`, "Sales"] : [value, "Orders"]
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="orders"
                    stroke="hsl(var(--secondary))"
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const MetricCard = ({
  title,
  value,
  icon,
}: {
  title: string;
  value: number | string;
  icon: ReactNode;
}) => {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
          {icon}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
