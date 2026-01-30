import { useMemo, useState } from "react";
import Layout from "@/components/Layout";
import OrderFlowVisualizer from "@/components/OrderFlowVisualizer";
import { Button } from "@/components/ui/button";
import { PaymentMethod, useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";

const Checkout = () => {
  const { items, subtotal, order, placeOrder, resetOrder } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const summaryItems = order?.items ?? items;
  const summarySubtotal = order?.subtotal ?? subtotal;
  const hasSummaryItems = summaryItems.length > 0;
  const hasOrder = Boolean(order);
  const paymentOptions = useMemo(
    () =>
      [
        {
          id: "card" as PaymentMethod,
          label: "Credit / Debit Card",
          description: "Pay securely with Visa, Mastercard, or Amex.",
        },
        {
          id: "apple_pay" as PaymentMethod,
          label: "Apple Pay",
          description: "Fast checkout with Face ID or Touch ID.",
        },
        {
          id: "cash" as PaymentMethod,
          label: "Cash on Delivery",
          description: "Pay the rider when your order arrives.",
        },
      ] satisfies { id: PaymentMethod; label: string; description: string }[],
    [],
  );

  const handlePlaceOrder = () => {
    if (!selectedPaymentMethod) {
      toast({
        title: "Select a payment method",
        description: "Choose how you'd like to pay before placing your order.",
      });
      return;
    }
    const newOrder = placeOrder(selectedPaymentMethod);
    if (!newOrder) return;
    navigate("/order-status");
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
                  {summaryItems.map((item) => {
                    const addOnTotal = item.addOns.reduce((sum, addOn) => sum + addOn.price, 0);
                    const itemPrice = (item.basePrice + addOnTotal) * item.quantity;
                    return (
                      <div key={item.id} className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>
                          {item.quantity} × {item.name}
                        </span>
                        <span>£{itemPrice.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>

                {!hasOrder && (
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
                            onClick={() => setSelectedPaymentMethod(option.id)}
                            className={[
                              "flex flex-col items-start rounded-2xl border px-4 py-3 text-left transition-colors",
                              isSelected
                                ? "border-primary bg-primary/5"
                                : "border-border bg-card hover:border-primary/60",
                            ].join(" ")}
                          >
                            <span className="text-sm font-semibold text-foreground">{option.label}</span>
                            <span className="text-xs text-muted-foreground">{option.description}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-lg font-semibold text-foreground border-t border-border pt-4">
                  <span>Total</span>
                  <span>£{summarySubtotal.toFixed(2)}</span>
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
                        disabled={!selectedPaymentMethod}
                      >
                        {selectedPaymentMethod ? "Place Order" : "Select Payment Method"}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link to="/order-status" className="w-full sm:w-auto">
                        <Button className="w-full rounded-full bg-brand-black py-6 text-lg text-white hover:bg-brand-black/90 sm:w-auto">
                          Track Order
                        </Button>
                      </Link>
                      <Button variant="outline" className="w-full rounded-full py-6 text-lg sm:w-auto" onClick={resetOrder}>
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
