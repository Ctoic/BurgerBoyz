import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { ApiOrder, ApiOrderType } from "@/lib/types";

interface CartAddOn {
  id: string;
  name: string;
  priceCents: number;
}

export interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  description: string;
  image: string;
  basePriceCents: number;
  addOns: CartAddOn[];
  removals: string[];
  quantity: number;
  sourceType?: ApiOrderType;
}

export type PaymentMethod = "cash" | "stripe" | "paypal";
export type FulfillmentType = "delivery" | "pickup";

export interface AddressInput {
  line1: string;
  line2?: string;
  city: string;
  postcode: string;
  instructions?: string;
  latitude?: number;
  longitude?: number;
}

export interface PlaceOrderPayload {
  paymentMethod: PaymentMethod;
  fulfillmentType: FulfillmentType;
  address?: AddressInput;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export type OrderState = ApiOrder;

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "id" | "quantity"> & { quantity?: number }) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  address: string | null;
  setAddress: (nextAddress: string | null) => void;
  order: OrderState | null;
  setOrder: (order: OrderState | null) => void;
  placeOrder: (payload: PlaceOrderPayload) => Promise<OrderState | null>;
  resetOrder: () => void;
  totalItems: number;
  subtotalCents: number;
  isReady: boolean;
}

const CART_STORAGE_KEY = "burgerboyz_cart_v2";
const ORDER_STORAGE_KEY = "burgerboyz_order_v2";
const ADDRESS_STORAGE_KEY = "burgerboyz_address_v1";

const CartContext = createContext<CartContextValue | undefined>(undefined);

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `cart_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const paymentMethodMap: Record<PaymentMethod, "CASH" | "STRIPE"> = {
  cash: "CASH",
  stripe: "STRIPE",
  // Temporary UI-only path until backend PAYPAL support is implemented.
  paypal: "CASH",
};

const fulfillmentTypeMap: Record<FulfillmentType, "DELIVERY" | "PICKUP"> = {
  delivery: "DELIVERY",
  pickup: "PICKUP",
};

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [address, setAddressState] = useState<string | null>(null);
  const [order, setOrderState] = useState<OrderState | null>(null);
  const [isReady, setIsReady] = useState(false);

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
        const parsedOrder = JSON.parse(storedOrder) as OrderState;
        if (parsedOrder && typeof parsedOrder === "object") {
          setOrderState({
            ...parsedOrder,
            orderType: parsedOrder.orderType === "DEAL" ? "DEAL" : "NORMAL",
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

    setIsReady(true);
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

  const setOrder = (nextOrder: OrderState | null) => {
    setOrderState(nextOrder);
  };

  const placeOrder = async (payload: PlaceOrderPayload) => {
    if (items.length === 0) return null;

    const orderPayload = {
      paymentMethod: paymentMethodMap[payload.paymentMethod],
      fulfillmentType: fulfillmentTypeMap[payload.fulfillmentType],
      orderType: items.some((item) => item.sourceType === "DEAL") ? "DEAL" : "NORMAL",
      customerName: payload.customerName,
      customerEmail: payload.customerEmail,
      customerPhone: payload.customerPhone,
      address:
        payload.fulfillmentType === "delivery" ? payload.address : undefined,
      items: items.map((item) => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        removals: item.removals,
        addOnIds: item.addOns.map((addOn) => addOn.id),
      })),
    };

    const createdOrder = await apiFetch<OrderState>("/orders", {
      method: "POST",
      body: JSON.stringify(orderPayload),
    });

    setOrderState(createdOrder);
    setItems([]);

    return createdOrder;
  };

  const resetOrder = () => setOrderState(null);

  const totalItems = useMemo(
    () => items.reduce((total, item) => total + item.quantity, 0),
    [items],
  );

  const subtotalCents = useMemo(() => {
    return items.reduce((total, item) => {
      const addOnTotal = item.addOns.reduce((sum, addOn) => sum + addOn.priceCents, 0);
      return total + (item.basePriceCents + addOnTotal) * item.quantity;
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
      setOrder,
      placeOrder,
      resetOrder,
      totalItems,
      subtotalCents,
      isReady,
    }),
    [address, items, order, totalItems, subtotalCents, isReady],
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
