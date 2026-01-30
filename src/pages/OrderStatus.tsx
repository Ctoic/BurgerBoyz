import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import OrderFlowVisualizer from "@/components/OrderFlowVisualizer";
import { Button } from "@/components/ui/button";
import {
  PaymentMethod,
  getOrderStageInfo,
  useCart,
} from "@/contexts/CartContext";

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  card: "Credit / Debit Card",
  apple_pay: "Apple Pay",
  cash: "Cash on Delivery",
};

const STAGE_LABELS = {
  placed: "Order placed",
  preparing: "Preparing",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
} as const;

const OrderStatus = () => {
  const { order, resetOrder } = useCart();
  const navigate = useNavigate();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!order) {
      navigate("/cart", { replace: true });
      return;
    }
    if (order.stage === "delivered") return;
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [order, navigate]);

  const orderInfo = useMemo(() => {
    if (!order) return null;
    return getOrderStageInfo(order, now);
  }, [order, now]);

  const placedAtLabel = useMemo(() => {
    if (!order) return "";
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(order.placedAt));
  }, [order]);

  if (!order || !orderInfo) return null;

  const paymentLabel = PAYMENT_METHOD_LABELS[order.paymentMethod];
  const isDelivered = orderInfo.stage === "delivered";

  return (
    <Layout>
      <section className="border-b border-border bg-background">
        <div className="container-custom section-padding pt-24 pb-6 md:pt-28">
          <h1 className="font-display text-3xl text-foreground md:text-5xl">Order Status</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
            Track your order in real time with a demo status timeline.
          </p>
        </div>
      </section>

      <section className="py-12 bg-background">
        <div className="container-custom section-padding">
          <div className="mx-auto mb-8 max-w-4xl">
            <OrderFlowVisualizer currentStep="status" />
          </div>

          <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[2fr,1fr]">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-display text-2xl text-foreground">
                  Order #{order.id.slice(0, 8)}
                </h2>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {STAGE_LABELS[orderInfo.stage]}
                </span>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                  {paymentLabel}
                </span>
              </div>

              <p className="mt-2 text-sm text-muted-foreground">
                Placed {placedAtLabel}
              </p>

              <div className="mt-6 space-y-4">
                {order.items.map((item) => {
                  const addOnTotal = item.addOns.reduce((sum, addOn) => sum + addOn.price, 0);
                  const itemPrice = (item.basePrice + addOnTotal) * item.quantity;
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
                        £{itemPrice.toFixed(2)}
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
                <span>£{order.subtotal.toFixed(2)}</span>
              </div>
              <div className="mb-6 flex items-center justify-between text-sm text-muted-foreground">
                <span>Delivery</span>
                <span>Free</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-4 text-lg font-semibold text-foreground">
                <span>Total</span>
                <span>£{order.subtotal.toFixed(2)}</span>
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
