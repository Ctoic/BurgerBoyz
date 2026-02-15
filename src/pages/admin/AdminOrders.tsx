import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { ApiOrder, ApiOrderStatus, ApiPaginatedResponse } from "@/lib/types";
import { formatCurrency } from "@/lib/money";
import { printOrderReceipt } from "@/lib/receipt";
import PaginationFooter from "@/components/PaginationFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_OPTIONS: ApiOrderStatus[] = [
  "PLACED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
];

const STATUS_LABELS: Record<ApiOrderStatus, string> = {
  PLACED: "Pending",
  PREPARING: "In Progress",
  READY_FOR_PICKUP: "Ready for Pickup",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

const RANGE_OPTIONS = [
  { id: "all", label: "All" },
  { id: "today", label: "Today" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
  { id: "custom", label: "Custom" },
] as const;

type RangeId = (typeof RANGE_OPTIONS)[number]["id"];
type StatusFilter = "ALL" | ApiOrderStatus;

const formatAddress = (order: ApiOrder) => {
  const address = order.address;
  if (!address) return "Pickup";
  return [address.line1, address.line2, address.city, address.postcode]
    .filter(Boolean)
    .join(", ");
};

const resolveCustomerName = (order: ApiOrder) => {
  return order.customerName || order.user?.email || "Guest";
};

const resolveCustomerPhone = (order: ApiOrder) => {
  return order.customerPhone || "—";
};

const AdminOrders = () => {
  const queryClient = useQueryClient();
  const [range, setRange] = useState<RangeId>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<ApiOrder | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders", currentPage, range, statusFilter, searchTerm],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(currentPage),
        pageSize: "10",
        range,
      });
      if (statusFilter !== "ALL") {
        params.set("status", statusFilter);
      }
      const trimmedSearch = searchTerm.trim();
      if (trimmedSearch) {
        params.set("search", trimmedSearch);
      }
      return apiFetch<ApiPaginatedResponse<ApiOrder>>(
        `/admin/orders?${params.toString()}`,
      );
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });
  const orders = data?.items ?? [];

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApiOrderStatus }) =>
      apiFetch(`/admin/orders/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
  });

  const printerName = import.meta.env.VITE_RECEIPT_PRINTER_NAME ?? "Epson TM-T88";
  const receiptColumns = Number(import.meta.env.VITE_RECEIPT_COLUMNS ?? 32);

  const handlePrint = async (order: ApiOrder) => {
    setIsPrinting(true);
    try {
      await printOrderReceipt(order, { printerName, columns: receiptColumns });
      toast({
        title: "Receipt sent to printer",
        description: `Printer: ${printerName}`,
      });
    } catch (error) {
      toast({
        title: "Printer error",
        description: error instanceof Error ? error.message : "Unable to print receipt.",
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const handleConfirmAndPrint = async (order: ApiOrder) => {
    setIsPrinting(true);
    try {
      await updateStatusMutation.mutateAsync({ id: order.id, status: "PREPARING" });
      setSelectedOrder({ ...order, status: "PREPARING" });
      await printOrderReceipt({ ...order, status: "PREPARING" }, { printerName, columns: receiptColumns });
      toast({
        title: "Order confirmed & printed",
        description: `Printer: ${printerName}`,
      });
    } catch (error) {
      toast({
        title: "Unable to confirm/print",
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setIsPrinting(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [range, searchTerm, statusFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-foreground">Orders</h1>
        <p className="text-sm text-muted-foreground">Manage all customer orders.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search orders"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="h-10 pl-9"
          />
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

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={statusFilter === "ALL" ? "default" : "outline"}
          size="sm"
          className="rounded-full px-4"
          onClick={() => setStatusFilter("ALL")}
        >
          All Statuses
        </Button>
        {STATUS_OPTIONS.map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? "default" : "outline"}
            size="sm"
            className="rounded-full px-4"
            onClick={() => setStatusFilter(status)}
          >
            {STATUS_LABELS[status]}
          </Button>
        ))}
      </div>

      <div className="rounded-3xl border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Order Status</th>
                <th className="px-4 py-3">Created At</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Delivery Address</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-4 py-4 text-muted-foreground" colSpan={9}>
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length > 0 ? (
                orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <td className="px-4 py-3 text-muted-foreground">{order.id.slice(0, 8)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          order.orderType === "DEAL"
                            ? "rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent"
                            : "rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground"
                        }
                      >
                        {order.orderType === "DEAL" ? "Deal Order" : "Normal Order"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{order.items.length} items</td>
                    <td className="px-4 py-3 text-muted-foreground">{order.paymentMethod}</td>
                    <td className="px-4 py-3">
                      <select
                        className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
                        value={order.status}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) =>
                          updateStatusMutation.mutate({
                            id: order.id,
                            status: event.target.value as ApiOrderStatus,
                          })
                        }
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {STATUS_LABELS[status]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(order.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {resolveCustomerName(order)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {resolveCustomerPhone(order)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-xs">
                      {formatAddress(order)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-4 text-muted-foreground" colSpan={9}>
                    No orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {!isLoading && data ? (
          <PaginationFooter
            currentPage={data.page}
            totalPages={data.totalPages}
            totalItems={data.totalItems}
            startItem={data.totalItems === 0 ? 0 : (data.page - 1) * data.pageSize + 1}
            endItem={Math.min(data.page * data.pageSize, data.totalItems)}
            label="order"
            onPageChange={setCurrentPage}
          />
        ) : null}
      </div>

      <Dialog open={Boolean(selectedOrder)} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="w-[92vw] max-w-3xl rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
          {selectedOrder && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl text-foreground">
                    Order #{selectedOrder.id.slice(0, 8)}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedOrder.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {selectedOrder.status.replace(/_/g, " ")}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-xs text-muted-foreground">Customer</p>
                  <p className="font-semibold text-foreground">
                    {resolveCustomerName(selectedOrder)}
                  </p>
                  <p className="text-sm text-muted-foreground">{resolveCustomerPhone(selectedOrder)}</p>
                  <p className="text-sm text-muted-foreground">{selectedOrder.user?.email ?? ""}</p>
                </div>
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-xs text-muted-foreground">Delivery Address</p>
                  <p className="text-sm text-foreground">{formatAddress(selectedOrder)}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Payment</p>
                  <p className="text-sm text-foreground">{selectedOrder.paymentMethod}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Order Type</p>
                  <p className="text-sm text-foreground">
                    {selectedOrder.orderType === "DEAL" ? "Deal Order" : "Normal Order"}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="text-xs text-muted-foreground">Items</p>
                <div className="mt-3 space-y-2 text-sm">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <span>{item.quantity} × {item.name}</span>
                      <span className="font-semibold text-foreground">{formatCurrency(item.basePriceCents * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end text-lg font-semibold text-foreground">
                Total {formatCurrency(selectedOrder.totalCents)}
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                {selectedOrder.status === "PLACED" ? (
                  <Button
                    className="btn-order rounded-full px-6"
                    onClick={() => handleConfirmAndPrint(selectedOrder)}
                    disabled={isPrinting || updateStatusMutation.isPending}
                  >
                    Confirm & Print
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="rounded-full px-6"
                    onClick={() => handlePrint(selectedOrder)}
                    disabled={isPrinting}
                  >
                    Print Receipt
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOrders;
