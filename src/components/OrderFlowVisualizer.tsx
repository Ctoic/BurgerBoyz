import { useEffect, useMemo, useState } from "react";
import {
  ORDER_STAGE_SEQUENCE,
  OrderStage,
  getOrderStageInfo,
  useCart,
} from "@/contexts/CartContext";

type FlowStepKey = "cart" | "checkout" | "status" | OrderStage;
type StepContext = "cart" | "checkout" | "status";

type FlowStep = {
  key: FlowStepKey;
  label: string;
};

const FLOW_STEPS: FlowStep[] = [
  { key: "cart", label: "Cart" },
  { key: "checkout", label: "Checkout" },
  { key: "status", label: "Status" },
  { key: "placed", label: "Order placed" },
  { key: "preparing", label: "Preparing" },
  { key: "out_for_delivery", label: "Out for delivery" },
  { key: "delivered", label: "Delivered" },
];

const STAGE_LABELS: Record<OrderStage, string> = {
  placed: "Order placed",
  preparing: "Preparing",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
};

const getActiveKey = (
  currentStep: StepContext,
  orderStage: OrderStage | null,
): FlowStepKey => {
  if (orderStage) return orderStage;
  return currentStep;
};

const getStepState = (index: number, activeIndex: number) => {
  if (index < activeIndex) return "complete";
  if (index === activeIndex) return "current";
  return "upcoming";
};

const OrderFlowVisualizer = ({ currentStep }: { currentStep: StepContext }) => {
  const { order } = useCart();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!order || order.stage === "delivered") return;
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [order]);

  const orderInfo = useMemo(() => {
    if (!order) return null;
    return getOrderStageInfo(order, now);
  }, [order, now]);

  const activeKey = getActiveKey(currentStep, orderInfo?.stage ?? null);
  const activeIndex = Math.max(
    0,
    FLOW_STEPS.findIndex((step) => step.key === activeKey),
  );

  const nextStageCountdownSeconds = useMemo(() => {
    if (!orderInfo?.nextTransitionAt) return null;
    const diffMs = orderInfo.nextTransitionAt - now;
    if (diffMs <= 0) return 0;
    return Math.ceil(diffMs / 1000);
  }, [orderInfo, now]);

  const placedTimeLabel = useMemo(() => {
    if (!order) return null;
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(order.placedAt));
  }, [order]);

  const stageSequenceText = ORDER_STAGE_SEQUENCE.map((stage) => STAGE_LABELS[stage]).join(
    " → ",
  );

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="font-display text-2xl text-foreground">Order Flow (Demo)</h3>
          <p className="text-sm text-muted-foreground">
            Uses local storage to persist cart data and simulate live order updates.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-muted px-3 py-1">{stageSequenceText}</span>
          {order && placedTimeLabel && (
            <span className="rounded-full bg-secondary px-3 py-1 text-secondary-foreground">
              Placed at {placedTimeLabel}
            </span>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {FLOW_STEPS.map((step, index) => {
            const state = getStepState(index, activeIndex);
            const isCurrent = state === "current";
            const isComplete = state === "complete";

            return (
              <div
                key={step.key}
                className={[
                  "flex items-center gap-3 rounded-2xl border p-3 transition-colors",
                  isCurrent
                    ? "border-primary bg-primary/5"
                    : isComplete
                      ? "border-accent bg-accent/5"
                      : "border-border bg-background",
                ].join(" ")}
              >
                <div
                  className={[
                    "flex h-9 w-9 items-center justify-center rounded-full border text-sm font-bold",
                    isCurrent
                      ? "border-primary bg-primary text-primary-foreground"
                      : isComplete
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-border bg-white text-muted-foreground",
                  ].join(" ")}
                >
                  {index + 1}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-foreground">{step.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {isComplete ? "Done" : isCurrent ? "Active" : "Next"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {order && orderInfo && (
          <div className="flex flex-col gap-2 rounded-2xl border border-border bg-background p-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-foreground">Order #{order.id.slice(0, 8)}</span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {STAGE_LABELS[orderInfo.stage]}
              </span>
              {orderInfo.nextStage && nextStageCountdownSeconds !== null && (
                <span className="text-xs text-muted-foreground">
                  Advancing to {STAGE_LABELS[orderInfo.nextStage]} in {nextStageCountdownSeconds}s
                </span>
              )}
            </div>
            <div className="text-muted-foreground">
              Your cart is cleared after placing an order, but the order timeline remains visible.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderFlowVisualizer;
