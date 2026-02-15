import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import OrderFlowVisualizer from "@/components/OrderFlowVisualizer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FulfillmentType, PaymentMethod, useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { formatCurrency } from "@/lib/money";
import { apiFetch } from "@/lib/api";
import type { ApiDeliveryZoneCheckResponse, ApiLocationReverseResponse } from "@/lib/types";

const LOCATION_STORAGE_KEY = "burgerboyz_selected_location";

interface StoredLocationPreference {
  id?: string;
  source?: "ZONE" | "GPS";
  name: string;
  line1?: string | null;
  city?: string | null;
  postcode?: string | null;
  postcodePrefix?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

const Checkout = () => {
  const {
    items,
    subtotalCents,
    order,
    placeOrder,
    resetOrder,
    address,
    setAddress,
  } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>("delivery");
  const [isPlacing, setIsPlacing] = useState(false);
  const [addressForm, setAddressForm] = useState({
    line1: address ?? "",
    line2: "",
    city: "",
    postcode: "",
    instructions: "",
    latitude: null as number | null,
    longitude: null as number | null,
  });
  const [paypalForm, setPaypalForm] = useState({
    email: user?.email ?? "",
    cardName: user?.name ?? "",
    cardNumber: "",
    expiry: "",
    cvv: "",
    billingPostcode: user?.addressPostcode ?? "",
  });
  const [isProcessingPaypal, setIsProcessingPaypal] = useState(false);
  const [isPaypalDemoPaid, setIsPaypalDemoPaid] = useState(false);
  const [paypalDemoRef, setPaypalDemoRef] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    setAddressForm((prev) => ({ ...prev, line1: address ?? "" }));
  }, [address]);

  useEffect(() => {
    if (!user) return;
    setAddressForm((prev) => ({
      line1: prev.line1 || user.addressLine1 || "",
      line2: prev.line2 || user.addressLine2 || "",
      city: prev.city || user.addressCity || "",
      postcode: prev.postcode || user.addressPostcode || "",
      instructions: prev.instructions || user.addressInstructions || "",
    }));
    setPaypalForm((prev) => ({
      ...prev,
      email: prev.email || user.email || "",
      cardName: prev.cardName || user.name || "",
      billingPostcode: prev.billingPostcode || user.addressPostcode || "",
    }));
  }, [user]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const applySavedLocation = () => {
      try {
        const raw = window.localStorage.getItem(LOCATION_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as StoredLocationPreference;
        setAddressForm((prev) => ({
          ...prev,
          line1: prev.line1 || parsed.line1 || prev.line1,
          city: prev.city || parsed.city || "",
          postcode: prev.postcode || parsed.postcode || parsed.postcodePrefix || "",
          latitude:
            prev.latitude !== null ? prev.latitude : (parsed.latitude ?? prev.latitude),
          longitude:
            prev.longitude !== null ? prev.longitude : (parsed.longitude ?? prev.longitude),
        }));
        if (parsed.line1) {
          setAddress(parsed.line1);
        }
      } catch {
        // Ignore invalid persisted location payloads.
      }
    };

    applySavedLocation();
    window.addEventListener("burgerboyz-location-change", applySavedLocation);
    return () => {
      window.removeEventListener("burgerboyz-location-change", applySavedLocation);
    };
  }, []);

  const summaryItems = order?.items ?? items;
  const summarySubtotalCents = order?.subtotalCents ?? subtotalCents;
  const hasSummaryItems = summaryItems.length > 0;
  const hasOrder = Boolean(order);
  const isDelivery = fulfillmentType === "delivery";

  const deliveryZoneCheckQuery = useQuery({
    queryKey: [
      "delivery-zone-check",
      addressForm.city.trim().toLowerCase(),
      addressForm.postcode.trim().toUpperCase(),
      addressForm.latitude,
      addressForm.longitude,
      isDelivery,
    ],
    queryFn: () =>
      apiFetch<ApiDeliveryZoneCheckResponse>("/delivery-zones/check", {
        method: "POST",
        body: JSON.stringify({
          city: addressForm.city.trim() || undefined,
          postcode: addressForm.postcode.trim() || undefined,
          latitude: addressForm.latitude ?? undefined,
          longitude: addressForm.longitude ?? undefined,
        }),
      }),
    enabled:
      isDelivery &&
      Boolean(
        addressForm.city.trim() ||
          addressForm.postcode.trim() ||
          (addressForm.latitude !== null && addressForm.longitude !== null),
      ),
  });

  const paymentOptions = useMemo(
    () =>
      [
        {
          id: "cash" as PaymentMethod,
          label: "Cash on Delivery",
          description: "Pay the rider when your order arrives.",
          enabled: true,
        },
        {
          id: "paypal" as PaymentMethod,
          label: "PayPal (Demo UI)",
          description: "Pay online with demo card details for now.",
          enabled: true,
        },
        {
          id: "stripe" as PaymentMethod,
          label: "Stripe (Coming soon)",
          description: "Stripe payments will be enabled next.",
          enabled: false,
        },
      ] satisfies {
        id: PaymentMethod;
        label: string;
        description: string;
        enabled: boolean;
      }[],
    [],
  );

  const osmEmbedUrl = useMemo(() => {
    if (addressForm.latitude === null || addressForm.longitude === null) return null;
    const delta = 0.01;
    const bbox = [
      addressForm.longitude - delta,
      addressForm.latitude - delta,
      addressForm.longitude + delta,
      addressForm.latitude + delta,
    ].join(",");
    const params = new URLSearchParams({
      bbox,
      layer: "mapnik",
      marker: `${addressForm.latitude},${addressForm.longitude}`,
    });
    return `https://www.openstreetmap.org/export/embed.html?${params.toString()}`;
  }, [addressForm.latitude, addressForm.longitude]);

  const osmViewUrl = useMemo(() => {
    if (addressForm.latitude === null || addressForm.longitude === null) return null;
    return `https://www.openstreetmap.org/?mlat=${addressForm.latitude}&mlon=${addressForm.longitude}#map=15/${addressForm.latitude}/${addressForm.longitude}`;
  }, [addressForm.latitude, addressForm.longitude]);

  const lineTotalCents = (item: typeof summaryItems[number]) => {
    if ("basePriceCents" in item) {
      const addOnTotal = item.addOns.reduce((sum, addOn) => sum + addOn.priceCents, 0);
      return (item.basePriceCents + addOnTotal) * item.quantity;
    }
    return 0;
  };

  const isPaypalSelected = selectedPaymentMethod === "paypal";
  const canSubmitOrder =
    selectedPaymentMethod === "cash" || (isPaypalSelected && isPaypalDemoPaid);

  const handlePaypalFieldChange = (
    key: keyof typeof paypalForm,
    value: string,
  ) => {
    setPaypalForm((prev) => ({ ...prev, [key]: value }));
    if (isPaypalDemoPaid) {
      setIsPaypalDemoPaid(false);
      setPaypalDemoRef(null);
    }
  };

  const handleDemoPaypalPayment = async () => {
    const email = paypalForm.email.trim();
    const cardName = paypalForm.cardName.trim();
    const cardNumber = paypalForm.cardNumber.replace(/\s+/g, "");
    const expiry = paypalForm.expiry.trim();
    const cvv = paypalForm.cvv.trim();
    const billingPostcode = paypalForm.billingPostcode.trim();

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      toast({
        title: "Valid email required",
        description: "Enter a valid PayPal email for this demo flow.",
      });
      return;
    }
    if (!cardName) {
      toast({
        title: "Cardholder name required",
        description: "Enter the full name shown on the card.",
      });
      return;
    }
    if (cardNumber.length < 13 || cardNumber.length > 19 || !/^\d+$/.test(cardNumber)) {
      toast({
        title: "Invalid card number",
        description: "Use a demo card number between 13 and 19 digits.",
      });
      return;
    }
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) {
      toast({
        title: "Invalid expiry",
        description: "Use MM/YY format, e.g. 12/30.",
      });
      return;
    }
    if (!/^\d{3,4}$/.test(cvv)) {
      toast({
        title: "Invalid CVV",
        description: "Use a 3 or 4 digit CVV for the demo.",
      });
      return;
    }
    if (!billingPostcode) {
      toast({
        title: "Billing postcode required",
        description: "Enter a billing postcode to continue.",
      });
      return;
    }

    setIsProcessingPaypal(true);
    try {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 1200);
      });
      const reference = `PP-DEMO-${Date.now().toString().slice(-6)}`;
      setIsPaypalDemoPaid(true);
      setPaypalDemoRef(reference);
      toast({
        title: "Demo PayPal payment approved",
        description: `Reference ${reference}`,
      });
    } finally {
      setIsProcessingPaypal(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Location is not supported in this browser.");
      return;
    }

    setIsLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = Number(position.coords.latitude.toFixed(6));
        const longitude = Number(position.coords.longitude.toFixed(6));
        setAddressForm((prev) => ({
          ...prev,
          latitude,
          longitude,
        }));

        setIsReverseGeocoding(true);
        try {
          const reverse = await apiFetch<ApiLocationReverseResponse>(
            `/location/reverse?lat=${latitude}&lon=${longitude}`,
          );
          setAddressForm((prev) => ({
            ...prev,
            latitude: reverse.latitude,
            longitude: reverse.longitude,
            line1: reverse.line1 ?? prev.line1,
            city: reverse.city ?? prev.city,
            postcode: reverse.postcode ?? prev.postcode,
          }));
          if (reverse.line1) {
            setAddress(reverse.line1);
          }
          toast({
            title: "Location selected",
            description: reverse.displayName ?? "Address details were fetched from OpenStreetMap.",
          });
        } catch {
          toast({
            title: "Location captured",
            description:
              "Coordinates saved, but address autofill is unavailable right now. You can fill city/postcode manually.",
          });
        } finally {
          setIsReverseGeocoding(false);
          setIsLocating(false);
        }
      },
      () => {
        setLocationError("Could not fetch your location. You can continue with city/postcode.");
        setIsLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  };

  const handlePlaceOrder = async () => {
    if (!selectedPaymentMethod) {
      toast({
        title: "Select a payment method",
        description: "Choose how you'd like to pay before placing your order.",
      });
      return;
    }

    if (selectedPaymentMethod === "paypal" && !isPaypalDemoPaid) {
      toast({
        title: "Complete demo PayPal payment",
        description: "Submit the demo PayPal card form before placing the order.",
      });
      return;
    }

    if (fulfillmentType === "delivery") {
      if (!addressForm.line1.trim() || !addressForm.city.trim() || !addressForm.postcode.trim()) {
        toast({
          title: "Delivery address required",
          description: "Please complete the address fields to continue.",
        });
        return;
      }

      const liveDeliveryCheck = await apiFetch<ApiDeliveryZoneCheckResponse>("/delivery-zones/check", {
        method: "POST",
        body: JSON.stringify({
          city: addressForm.city.trim(),
          postcode: addressForm.postcode.trim(),
          latitude: addressForm.latitude ?? undefined,
          longitude: addressForm.longitude ?? undefined,
        }),
      });

      if (!liveDeliveryCheck.deliverable) {
        toast({
          title: "Address is outside delivery zone",
          description: "Please use pickup or enter a supported delivery area.",
        });
        return;
      }
    }

    setIsPlacing(true);
    try {
      const createdOrder = await placeOrder({
        paymentMethod: selectedPaymentMethod === "paypal" ? "cash" : selectedPaymentMethod,
        fulfillmentType,
        customerEmail: user?.email,
        customerName: user?.name ?? undefined,
        customerPhone: user?.phone ?? undefined,
        address:
          fulfillmentType === "delivery"
            ? {
                line1: addressForm.line1.trim(),
                line2: addressForm.line2.trim() || undefined,
                city: addressForm.city.trim(),
                postcode: addressForm.postcode.trim(),
                instructions: addressForm.instructions.trim() || undefined,
                latitude: addressForm.latitude ?? undefined,
                longitude: addressForm.longitude ?? undefined,
              }
            : undefined,
      });

      if (!createdOrder) return;
      if (typeof window !== "undefined") {
        if (selectedPaymentMethod === "paypal") {
          window.sessionStorage.setItem("burgerboyz_demo_payment_method", "paypal");
        } else {
          window.sessionStorage.removeItem("burgerboyz_demo_payment_method");
        }
      }
      if (selectedPaymentMethod === "paypal") {
        toast({
          title: "Demo flow marked complete",
          description:
            "PayPal checkout UI is complete for preview. Backend settlement is pending real integration.",
        });
      }
      navigate("/order-status");
    } catch (error) {
      toast({
        title: "Order failed",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsPlacing(false);
    }
  };

  return (
    <Layout>
      <section className="border-b border-border bg-background">
        <div className="container-custom section-padding pt-24 pb-6 md:pt-28">
          <h1 className="font-display text-3xl text-foreground md:text-5xl">Checkout</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
            Confirm your order details and choose a payment method.
          </p>
        </div>
      </section>

      <section className="py-12 bg-background">
        <div className="container-custom section-padding">
          <div className="mx-auto mb-8 max-w-4xl">
            <OrderFlowVisualizer currentStep="checkout" />
          </div>

          <div className="max-w-3xl mx-auto rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            {!hasSummaryItems && !hasOrder ? (
              <div className="text-center py-10">
                <p className="mb-6 text-lg text-muted-foreground">
                  Your cart is empty. Add something tasty before checkout.
                </p>
                <Link to="/menu">
                  <Button className="btn-order">Browse Menu</Button>
                </Link>
              </div>
            ) : (
              <>
                <h2 className="font-display text-2xl text-foreground mb-4">Order Summary</h2>
                <div className="space-y-3 mb-6">
                  {summaryItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>
                        {item.quantity} × {item.name}
                      </span>
                      <span>{formatCurrency(lineTotalCents(item))}</span>
                    </div>
                  ))}
                </div>

                {!hasOrder && (
                  <>
                    <div className="mb-6 rounded-2xl border border-border bg-background p-4">
                      <div className="mb-3">
                        <h3 className="font-display text-lg text-foreground">Fulfillment</h3>
                        <p className="text-xs text-muted-foreground">
                          Choose delivery or pickup.
                        </p>
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => setFulfillmentType("delivery")}
                          className={[
                            "flex-1 rounded-2xl border px-4 py-3 text-left transition-colors",
                            fulfillmentType === "delivery"
                              ? "border-primary bg-primary/5"
                              : "border-border bg-card hover:border-primary/60",
                          ].join(" ")}
                        >
                          <span className="text-sm font-semibold text-foreground">Delivery</span>
                          <span className="block text-xs text-muted-foreground">We bring it to you.</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFulfillmentType("pickup")}
                          className={[
                            "flex-1 rounded-2xl border px-4 py-3 text-left transition-colors",
                            fulfillmentType === "pickup"
                              ? "border-primary bg-primary/5"
                              : "border-border bg-card hover:border-primary/60",
                          ].join(" ")}
                        >
                          <span className="text-sm font-semibold text-foreground">Pickup</span>
                          <span className="block text-xs text-muted-foreground">Collect in store.</span>
                        </button>
                      </div>
                    </div>

                    {fulfillmentType === "delivery" && (
                      <div className="mb-6 rounded-2xl border border-border bg-background p-4">
                        <div className="mb-3">
                          <h3 className="font-display text-lg text-foreground">Delivery Address</h3>
                          <p className="text-xs text-muted-foreground">
                            Provide the address for delivery.
                          </p>
                        </div>
                        <div className="grid gap-4">
                          <Input
                            placeholder="Address line 1"
                            value={addressForm.line1}
                            onChange={(event) => {
                              const value = event.target.value;
                              setAddressForm((prev) => ({ ...prev, line1: value }));
                              setAddress(value);
                            }}
                          />
                          <Input
                            placeholder="Address line 2 (optional)"
                            value={addressForm.line2}
                            onChange={(event) =>
                              setAddressForm((prev) => ({ ...prev, line2: event.target.value }))
                            }
                          />
                          <div className="grid gap-4 sm:grid-cols-2">
                            <Input
                              placeholder="City"
                              value={addressForm.city}
                              onChange={(event) =>
                                setAddressForm((prev) => ({ ...prev, city: event.target.value }))
                              }
                            />
                            <Input
                              placeholder="Postcode"
                              value={addressForm.postcode}
                              onChange={(event) =>
                                setAddressForm((prev) => ({ ...prev, postcode: event.target.value }))
                              }
                            />
                          </div>
                          <Textarea
                            placeholder="Delivery instructions (optional)"
                            value={addressForm.instructions}
                            onChange={(event) =>
                              setAddressForm((prev) => ({ ...prev, instructions: event.target.value }))
                            }
                            rows={3}
                          />
                          <div className="rounded-2xl border border-border bg-card p-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-foreground">
                                  Delivery zone check
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Uses postcode/city now. GPS is optional for circle zones.
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="rounded-full"
                                onClick={handleUseCurrentLocation}
                                disabled={isLocating || isReverseGeocoding}
                              >
                                {isLocating
                                  ? "Locating..."
                                  : isReverseGeocoding
                                    ? "Resolving address..."
                                    : "Use my location"}
                              </Button>
                            </div>
                            <div className="mt-3 rounded-xl border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                              {deliveryZoneCheckQuery.isFetching ? (
                                <span>Checking delivery availability...</span>
                              ) : deliveryZoneCheckQuery.data?.deliverable ? (
                                <span className="font-semibold text-secondary">
                                  Deliverable: {deliveryZoneCheckQuery.data.reason}
                                </span>
                              ) : deliveryZoneCheckQuery.data ? (
                                <span className="font-semibold text-destructive">
                                  Not deliverable: {deliveryZoneCheckQuery.data.reason}
                                </span>
                              ) : (
                                <span>
                                  Enter city/postcode to verify if this address is inside the active
                                  zone.
                                </span>
                              )}
                            </div>
                            {(addressForm.latitude !== null && addressForm.longitude !== null) && (
                              <p className="mt-2 text-[11px] text-muted-foreground">
                                Coordinates: {addressForm.latitude}, {addressForm.longitude}
                              </p>
                            )}
                            {osmEmbedUrl && (
                              <div className="mt-3 overflow-hidden rounded-xl border border-border bg-background">
                                <iframe
                                  title="Selected location map"
                                  src={osmEmbedUrl}
                                  className="h-44 w-full"
                                  loading="lazy"
                                />
                                <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
                                  <span>OpenStreetMap preview</span>
                                  {osmViewUrl && (
                                    <a
                                      href={osmViewUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="font-semibold text-primary hover:underline"
                                    >
                                      Open full map
                                    </a>
                                  )}
                                </div>
                              </div>
                            )}
                            {locationError && (
                              <p className="mt-2 text-[11px] font-semibold text-destructive">
                                {locationError}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mb-6 rounded-2xl border border-border bg-background p-4">
                      <div className="mb-3">
                        <h3 className="font-display text-lg text-foreground">Payment method</h3>
                        <p className="text-xs text-muted-foreground">
                          Select a payment option to continue.
                        </p>
                      </div>
                      <div className="grid gap-3">
                        {paymentOptions.map((option) => {
                          const isSelected = selectedPaymentMethod === option.id;
                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => {
                                if (!option.enabled) return;
                                setSelectedPaymentMethod(option.id);
                              }}
                              disabled={!option.enabled}
                              className={[
                                "flex flex-col items-start rounded-2xl border px-4 py-3 text-left transition-colors",
                                isSelected
                                  ? "border-primary bg-primary/5"
                                  : "border-border bg-card hover:border-primary/60",
                                option.enabled ? "" : "cursor-not-allowed opacity-60",
                              ].join(" ")}
                            >
                              <span className="text-sm font-semibold text-foreground">{option.label}</span>
                              <span className="text-xs text-muted-foreground">{option.description}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {isPaypalSelected && (
                      <div className="mb-6 rounded-2xl border border-primary/40 bg-primary/5 p-4">
                        <div className="mb-3">
                          <h3 className="font-display text-lg text-foreground">PayPal Demo Checkout</h3>
                          <p className="text-xs text-muted-foreground">
                            UI preview only. No real card is charged in this demo.
                          </p>
                        </div>

                        <div className="grid gap-4">
                          <Input
                            type="email"
                            placeholder="PayPal email"
                            value={paypalForm.email}
                            onChange={(event) => handlePaypalFieldChange("email", event.target.value)}
                          />
                          <Input
                            placeholder="Cardholder name"
                            value={paypalForm.cardName}
                            onChange={(event) => handlePaypalFieldChange("cardName", event.target.value)}
                          />
                          <Input
                            placeholder="Card number (demo)"
                            value={paypalForm.cardNumber}
                            onChange={(event) => handlePaypalFieldChange("cardNumber", event.target.value)}
                          />
                          <div className="grid gap-4 sm:grid-cols-3">
                            <Input
                              placeholder="MM/YY"
                              value={paypalForm.expiry}
                              onChange={(event) => handlePaypalFieldChange("expiry", event.target.value)}
                            />
                            <Input
                              placeholder="CVV"
                              value={paypalForm.cvv}
                              onChange={(event) => handlePaypalFieldChange("cvv", event.target.value)}
                            />
                            <Input
                              placeholder="Billing postcode"
                              value={paypalForm.billingPostcode}
                              onChange={(event) =>
                                handlePaypalFieldChange("billingPostcode", event.target.value)
                              }
                            />
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                {isPaypalDemoPaid ? "Payment approved (Demo)" : "Payment pending"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {paypalDemoRef
                                  ? `Transaction ref: ${paypalDemoRef}`
                                  : "Submit this form to simulate PayPal approval."}
                              </p>
                            </div>
                            <Button
                              type="button"
                              onClick={handleDemoPaypalPayment}
                              disabled={isProcessingPaypal}
                              className="rounded-full px-5"
                            >
                              {isProcessingPaypal
                                ? "Processing..."
                                : isPaypalDemoPaid
                                  ? "Re-run Demo Payment"
                                  : "Pay with PayPal (Demo)"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div className="flex items-center justify-between text-lg font-semibold text-foreground border-t border-border pt-4">
                  <span>Total</span>
                  <span>{formatCurrency(summarySubtotalCents)}</span>
                </div>

                <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-between">
                  {!hasOrder ? (
                    <>
                      <Link to="/cart" className="w-full sm:w-auto">
                        <Button variant="outline" className="w-full rounded-full py-6 text-lg">
                          Back to Cart
                        </Button>
                      </Link>
                      <Button
                        className="w-full rounded-full bg-brand-black py-6 text-lg text-white hover:bg-brand-black/90 sm:w-auto"
                        onClick={handlePlaceOrder}
                        disabled={
                          !selectedPaymentMethod ||
                          !canSubmitOrder ||
                          isPlacing ||
                          isProcessingPaypal ||
                          (isDelivery && Boolean(deliveryZoneCheckQuery.data && !deliveryZoneCheckQuery.data.deliverable))
                        }
                      >
                        {isPlacing
                          ? "Placing Order..."
                          : selectedPaymentMethod === "cash"
                            ? "Place Order"
                            : isPaypalSelected
                              ? isPaypalDemoPaid
                                ? "Place Demo Paid Order"
                                : "Complete Demo PayPal Payment"
                              : "Select Payment Method"}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link to="/order-status" className="w-full sm:w-auto">
                        <Button className="w-full rounded-full bg-brand-black py-6 text-lg text-white hover:bg-brand-black/90 sm:w-auto">
                          Track Order
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        className="w-full rounded-full py-6 text-lg sm:w-auto"
                        onClick={resetOrder}
                      >
                        Start New Order
                      </Button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Checkout;
