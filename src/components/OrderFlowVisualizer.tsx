import { useMemo } from "react";
import { useCart } from "@/contexts/CartContext";
import type { ApiOrderStatus } from "@/lib/types";

type FlowStepKey = "cart" | "checkout" | "status" | ApiOrderStatus;
type StepContext = "cart" | "checkout" | "status";

type FlowStep = {
  key: FlowStepKey;
  label: string;
};

const STATUS_LABELS: Record<ApiOrderStatus, string> = {
  PLACED: "Order placed",
  PREPARING: "Preparing",
  READY_FOR_PICKUP: "Ready for pickup",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

const PRE_ORDER_STEPS: FlowStep[] = [
  { key: "cart", label: "Cart" },
  { key: "checkout", label: "Checkout" },
  { key: "status", label: "Status" },
];

const DELIVERY_STEPS: FlowStep[] = [
  { key: "PLACED", label: STATUS_LABELS.PLACED },
  { key: "PREPARING", label: STATUS_LABELS.PREPARING },
  { key: "OUT_FOR_DELIVERY", label: STATUS_LABELS.OUT_FOR_DELIVERY },
  { key: "DELIVERED", label: STATUS_LABELS.DELIVERED },
];

const PICKUP_STEPS: FlowStep[] = [
  { key: "PLACED", label: STATUS_LABELS.PLACED },
  { key: "PREPARING", label: STATUS_LABELS.PREPARING },
  { key: "READY_FOR_PICKUP", label: STATUS_LABELS.READY_FOR_PICKUP },
  { key: "DELIVERED", label: STATUS_LABELS.DELIVERED },
];

const OrderFlowVisualizer = ({ currentStep }: { currentStep: StepContext }) => {
  const { order } = useCart();

  const steps = useMemo<FlowStep[]>(() => {
    if (!order) return PRE_ORDER_STEPS;

    const baseSteps = order.fulfillmentType === "PICKUP" ? PICKUP_STEPS : DELIVERY_STEPS;
    if (order.status === "CANCELLED") {
      return [...baseSteps, { key: "CANCELLED", label: STATUS_LABELS.CANCELLED }];
    }
    return baseSteps;
  }, [order]);

  const activeKey: FlowStepKey = order ? order.status : currentStep;
  const activeIndex = Math.max(0, steps.findIndex((step) => step.key === activeKey));
  const progressPercent = steps.length > 1 ? (activeIndex / (steps.length - 1)) * 100 : 0;

  const headline = order ? "Order Tracking" : "Order Flow";
  const subline = order
    ? "Follow your order as it moves through each stage."
    : "Complete each step to place your order.";

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="font-display text-2xl text-foreground">{headline}</h3>
          <p className="text-sm text-muted-foreground">{subline}</p>
        </div>

        <div className="relative mt-4">
          <div className="absolute left-0 right-0 top-4 h-1 rounded-full bg-border">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-start justify-between">
            {steps.map((step, index) => {
              const isComplete = index < activeIndex;
              const isCurrent = index === activeIndex;
              return (
                <div key={step.key} className="flex w-full flex-col items-center gap-2">
                  <div
                    className={[
                      "relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors",
                      isComplete
                        ? "border-primary bg-primary text-primary-foreground"
                        : isCurrent
                          ? "border-primary bg-background text-primary"
                          : "border-border bg-background text-muted-foreground",
                    ].join(" ")}
                  >
                    {index + 1}
                  </div>
                  <span
                    className={[
                      "text-center text-xs font-semibold",
                      isComplete || isCurrent ? "text-foreground" : "text-muted-foreground",
                    ].join(" ")}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {order && (
          <div className="mt-4 rounded-2xl border border-border bg-background px-4 py-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-foreground">Order #{order.id.slice(0, 8)}</span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {STATUS_LABELS[order.status]}
              </span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {order.fulfillmentType === "PICKUP"
                ? "Pickup order in progress."
                : "Delivery order in progress."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderFlowVisualizer;
