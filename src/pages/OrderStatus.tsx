import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import OrderFlowVisualizer from "@/components/OrderFlowVisualizer";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { formatCurrency } from "@/lib/money";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { ApiOrder, ApiOrderStatus } from "@/lib/types";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Cash on Delivery",
  PAYPAL: "PayPal",
  STRIPE: "Stripe (Coming soon)",
};

const STAGE_LABELS: Record<ApiOrderStatus, string> = {
  PLACED: "Order placed",
  PREPARING: "Preparing",
  READY_FOR_PICKUP: "Ready for pickup",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

const ORDER_TYPE_LABELS = {
  NORMAL: "Normal Order",
  DEAL: "Deal Order",
} as const;

const OrderStatus = () => {
  const { order, setOrder, resetOrder, isReady } = useCart();
  const navigate = useNavigate();
  const [showDeliveredSuccess, setShowDeliveredSuccess] = useState(false);

  const orderId = order?.id;

  const { data } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => apiFetch<ApiOrder>(`/orders/${orderId}`),
    enabled: Boolean(orderId),
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!isReady) return;
    if (!orderId) {
      navigate("/cart", { replace: true });
    }
  }, [orderId, navigate, isReady]);

  useEffect(() => {
    if (data) {
      setOrder(data);
    }
  }, [data, setOrder]);

  const resolvedOrder = data ?? order;

  const placedAtLabel = useMemo(() => {
    if (!resolvedOrder) return "";
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(resolvedOrder.createdAt));
  }, [resolvedOrder]);

  useEffect(() => {
    if (resolvedOrder?.status !== "DELIVERED") return;
    setShowDeliveredSuccess(true);
    const timer = window.setTimeout(() => setShowDeliveredSuccess(false), 6000);
    return () => window.clearTimeout(timer);
  }, [resolvedOrder?.status]);

  if (!resolvedOrder) return null;

  const demoPaymentMethod =
    typeof window !== "undefined"
      ? window.sessionStorage.getItem("burgerboyz_demo_payment_method")
      : null;
  const paymentLabel =
    demoPaymentMethod === "paypal" && resolvedOrder.paymentMethod === "CASH"
      ? "PayPal (Demo UI)"
      : PAYMENT_METHOD_LABELS[resolvedOrder.paymentMethod] ?? resolvedOrder.paymentMethod;
  const resolvedOrderType = resolvedOrder.orderType === "DEAL" ? "DEAL" : "NORMAL";
  const isDelivered = resolvedOrder.status === "DELIVERED";

  return (
    <Layout>
      <section className="border-b border-border bg-background">
        <div className="container-custom section-padding pt-24 pb-6 md:pt-28">
          <h1 className="font-display text-3xl text-foreground md:text-5xl">Order Status</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
            Track your order in real time.
          </p>
        </div>
      </section>

      <section className="py-12 bg-background">
        <div className="container-custom section-padding">
          <div className="mx-auto mb-8 max-w-4xl">
            <OrderFlowVisualizer currentStep="status" />
          </div>

          {showDeliveredSuccess && (
            <div className="mx-auto mb-8 max-w-5xl">
              <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-r from-primary/15 via-secondary/10 to-accent/10 p-6 shadow-[var(--shadow-card)] animate-scale-in">
                <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-primary/20 blur-2xl animate-float" />
                <div className="pointer-events-none absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-secondary/20 blur-2xl animate-float" />
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg animate-pulse-slow">
                    ✓
                  </div>
                  <div>
                    <h2 className="font-display text-2xl text-foreground">Order Delivered!</h2>
                    <p className="text-sm text-muted-foreground">
                      Enjoy your meal. Thanks for ordering with Burger Guys.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[2fr,1fr]">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-display text-2xl text-foreground">
                  Order #{resolvedOrder.id.slice(0, 8)}
                </h2>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {STAGE_LABELS[resolvedOrder.status]}
                </span>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                  {paymentLabel}
                </span>
                <span
                  className={
                    resolvedOrderType === "DEAL"
                      ? "rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent"
                      : "rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground"
                  }
                >
                  {ORDER_TYPE_LABELS[resolvedOrderType]}
                </span>
              </div>

              <p className="mt-2 text-sm text-muted-foreground">
                Placed {placedAtLabel}
              </p>

              <div className="mt-6 space-y-4">
                {resolvedOrder.items.map((item) => {
                  const addOnTotal = item.addOns.reduce((sum, addOn) => sum + addOn.priceCents, 0);
                  const itemPriceCents = (item.basePriceCents + addOnTotal) * item.quantity;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3 text-sm"
                    >
                      <div>
                        <div className="font-semibold text-foreground">
                          {item.quantity} × {item.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.addOns.length > 0
                            ? `Add-ons: ${item.addOns.map((addOn) => addOn.name).join(", ")}`
                            : "No add-ons"}
                        </div>
                      </div>
                      <div className="font-display text-base text-primary">
                        {formatCurrency(itemPriceCents)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="h-fit rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
              <h3 className="mb-4 font-display text-2xl text-foreground">Summary</h3>
              <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatCurrency(resolvedOrder.subtotalCents)}</span>
              </div>
              <div className="mb-6 flex items-center justify-between text-sm text-muted-foreground">
                <span>Delivery</span>
                <span>{formatCurrency(resolvedOrder.deliveryFeeCents)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-4 text-lg font-semibold text-foreground">
                <span>Total</span>
                <span>{formatCurrency(resolvedOrder.totalCents)}</span>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                {isDelivered && (
                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={() => {
                      resetOrder();
                      navigate("/menu");
                    }}
                  >
                    Start New Order
                  </Button>
                )}
                <Link to="/menu">
                  <Button className="w-full rounded-full bg-brand-black text-white hover:bg-brand-black/90">
                    Browse Menu
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default OrderStatus;
