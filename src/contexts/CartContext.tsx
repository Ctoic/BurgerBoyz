import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

interface CartAddOn {
  name: string;
  price: number;
}

export interface CartItem {
  id: string;
  name: string;
  description: string;
  image: string;
  basePrice: number;
  addOns: CartAddOn[];
  removals: string[];
  quantity: number;
}

export type OrderStage = "placed" | "preparing" | "out_for_delivery" | "delivered";
export type PaymentMethod = "card" | "apple_pay" | "cash";

export interface OrderState {
  id: string;
  items: CartItem[];
  subtotal: number;
  placedAt: number;
  stage: OrderStage;
  stageStartedAt: number;
  paymentMethod: PaymentMethod;
}

const CART_STORAGE_KEY = "burgerboyz_cart_v1";
const ORDER_STORAGE_KEY = "burgerboyz_order_v1";
const ADDRESS_STORAGE_KEY = "burgerboyz_address_v1";

export const ORDER_STAGE_SEQUENCE: OrderStage[] = [
  "placed",
  "preparing",
  "out_for_delivery",
  "delivered",
];

export const ORDER_STAGE_DURATIONS_MS: Record<OrderStage, number> = {
  placed: 4000,
  preparing: 7000,
  out_for_delivery: 9000,
  delivered: 0,
};

const getCumulativeDurationUntilStage = (stage: OrderStage) => {
  let total = 0;
  for (const currentStage of ORDER_STAGE_SEQUENCE) {
    if (currentStage === stage) break;
    total += ORDER_STAGE_DURATIONS_MS[currentStage];
  }
  return total;
};

export const getOrderStageInfo = (order: OrderState, now = Date.now()) => {
  const elapsed = Math.max(0, now - order.placedAt);
  let cumulative = 0;

  for (let index = 0; index < ORDER_STAGE_SEQUENCE.length; index += 1) {
    const stage = ORDER_STAGE_SEQUENCE[index];
    const duration = ORDER_STAGE_DURATIONS_MS[stage];
    const stageStartAt = order.placedAt + cumulative;
    const nextTransitionAt = stageStartAt + duration;

    if (stage === "delivered") {
      return {
        stage,
        stageIndex: index,
        stageStartAt,
        nextStage: null as OrderStage | null,
        nextTransitionAt: null as number | null,
      };
    }

    if (elapsed < cumulative + duration) {
      const nextStage = ORDER_STAGE_SEQUENCE[index + 1] ?? null;
      return {
        stage,
        stageIndex: index,
        stageStartAt,
        nextStage,
        nextTransitionAt,
      };
    }

    cumulative += duration;
  }

  const deliveredIndex = ORDER_STAGE_SEQUENCE.length - 1;
  const deliveredStartAt =
    order.placedAt + getCumulativeDurationUntilStage("delivered");

  return {
    stage: "delivered" as OrderStage,
    stageIndex: deliveredIndex,
    stageStartAt: deliveredStartAt,
    nextStage: null,
    nextTransitionAt: null,
  };
};

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "id" | "quantity"> & { quantity?: number }) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  address: string | null;
  setAddress: (nextAddress: string | null) => void;
  order: OrderState | null;
  placeOrder: (paymentMethod: PaymentMethod) => OrderState | null;
  resetOrder: () => void;
  totalItems: number;
  subtotal: number;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `cart_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [address, setAddressState] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderState | null>(null);
  const autoAdvanceTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const storedItems = window.localStorage.getItem(CART_STORAGE_KEY);
      if (storedItems) {
        const parsedItems = JSON.parse(storedItems) as CartItem[];
        if (Array.isArray(parsedItems)) {
          setItems(parsedItems);
        }
      }
    } catch {
      window.localStorage.removeItem(CART_STORAGE_KEY);
    }

    try {
      const storedOrder = window.localStorage.getItem(ORDER_STORAGE_KEY);
      if (storedOrder) {
        const parsedOrder = JSON.parse(storedOrder) as Partial<OrderState>;
        if (
          parsedOrder &&
          typeof parsedOrder === "object" &&
          Array.isArray(parsedOrder.items)
        ) {
          const paymentMethod: PaymentMethod = parsedOrder.paymentMethod ?? "card";
          setOrder({
            ...(parsedOrder as OrderState),
            paymentMethod,
          });
        }
      }
    } catch {
      window.localStorage.removeItem(ORDER_STORAGE_KEY);
    }

    try {
      const storedAddress = window.localStorage.getItem(ADDRESS_STORAGE_KEY);
      if (storedAddress) {
        setAddressState(storedAddress);
      }
    } catch {
      window.localStorage.removeItem(ADDRESS_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!order) {
      window.localStorage.removeItem(ORDER_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(order));
  }, [order]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!address) {
      window.localStorage.removeItem(ADDRESS_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(ADDRESS_STORAGE_KEY, address);
  }, [address]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!order) return;

    if (autoAdvanceTimeoutRef.current !== null) {
      window.clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }

    const info = getOrderStageInfo(order);

    if (order.stage !== info.stage || order.stageStartedAt !== info.stageStartAt) {
      setOrder((prev) => {
        if (!prev) return prev;
        if (prev.stage === info.stage && prev.stageStartedAt === info.stageStartAt) {
          return prev;
        }
        return {
          ...prev,
          stage: info.stage,
          stageStartedAt: info.stageStartAt,
        };
      });
      return;
    }

    if (!info.nextTransitionAt || info.stage === "delivered") return;

    const delay = Math.max(0, info.nextTransitionAt - Date.now());
    autoAdvanceTimeoutRef.current = window.setTimeout(() => {
      setOrder((prev) => {
        if (!prev) return prev;
        const nextInfo = getOrderStageInfo(prev);
        if (prev.stage === nextInfo.stage && prev.stageStartedAt === nextInfo.stageStartAt) {
          return prev;
        }
        return {
          ...prev,
          stage: nextInfo.stage,
          stageStartedAt: nextInfo.stageStartAt,
        };
      });
    }, delay);

    return () => {
      if (autoAdvanceTimeoutRef.current !== null) {
        window.clearTimeout(autoAdvanceTimeoutRef.current);
        autoAdvanceTimeoutRef.current = null;
      }
    };
  }, [order]);

  const addItem: CartContextValue["addItem"] = (item) => {
    const quantity = item.quantity ?? 1;
    setItems((prev) => [
      ...prev,
      {
        ...item,
        id: createId(),
        quantity,
      },
    ]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item,
      ),
    );
  };

  const clearCart = () => setItems([]);
  const setAddress = (nextAddress: string | null) => {
    const trimmed = nextAddress?.trim();
    setAddressState(trimmed ? trimmed : null);
  };

  const placeOrder = (paymentMethod: PaymentMethod) => {
    if (items.length === 0) return null;
    const placedAt = Date.now();
    const newOrder: OrderState = {
      id: createId(),
      items,
      subtotal,
      placedAt,
      stage: "placed",
      stageStartedAt: placedAt,
      paymentMethod,
    };
    setOrder(newOrder);
    setItems([]);
    return newOrder;
  };

  const resetOrder = () => setOrder(null);

  const totalItems = useMemo(
    () => items.reduce((total, item) => total + item.quantity, 0),
    [items],
  );

  const subtotal = useMemo(() => {
    return items.reduce((total, item) => {
      const addOnTotal = item.addOns.reduce((sum, addOn) => sum + addOn.price, 0);
      return total + (item.basePrice + addOnTotal) * item.quantity;
    }, 0);
  }, [items]);

  const value = useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      address,
      setAddress,
      order,
      placeOrder,
      resetOrder,
      totalItems,
      subtotal,
    }),
    [address, items, order, totalItems, subtotal],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
};
