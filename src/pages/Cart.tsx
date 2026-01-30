import Layout from "@/components/Layout";
import OrderFlowVisualizer from "@/components/OrderFlowVisualizer";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

const Cart = () => {
  const { items, subtotal, order, resetOrder, updateQuantity, removeItem } = useCart();
  const isDelivered = order?.stage === "delivered";

  return (
    <Layout>
      <section className="border-b border-border bg-background">
        <div className="container-custom section-padding pt-24 pb-6 md:pt-28">
          <h1 className="font-display text-3xl text-foreground md:text-5xl">Your Cart</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
            Review your items and head to checkout when you’re ready.
          </p>
        </div>
      </section>

      <section className="py-10 bg-background">
        <div className="container-custom section-padding">
          <div className="mb-8">
            <OrderFlowVisualizer currentStep="cart" />
          </div>

          {items.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-lg text-muted-foreground mb-6">
                {order && !isDelivered
                  ? "Your order is in progress. You can still start another order."
                  : "Your cart is empty."}
              </p>
              {order && isDelivered && (
                <div className="mb-6">
                  <Button variant="outline" onClick={resetOrder}>
                    Clear Delivered Order Timeline
                  </Button>
                </div>
              )}
              <Link to="/menu">
                <Button className="btn-order">Browse Menu</Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
              <div className="space-y-6">
                {items.map((item) => {
                  const addOnTotal = item.addOns.reduce((sum, addOn) => sum + addOn.price, 0);
                  const itemPrice = (item.basePrice + addOnTotal) * item.quantity;

                  return (
                    <div key={item.id} className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:p-6">
                      <img src={item.image} alt={item.name} className="h-24 w-24 rounded-2xl object-cover sm:h-28 sm:w-28" />
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-display text-xl text-foreground">{item.name}</h3>
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          </div>
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-accent transition-colors"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>

                        {item.addOns.length > 0 && (
                          <div className="mt-3 text-sm text-muted-foreground">
                            <span className="font-semibold text-foreground">Add-ons:</span>{" "}
                            {item.addOns.map((addOn) => `${addOn.name} (+£${addOn.price.toFixed(2)})`).join(", ")}
                          </div>
                        )}

                        {item.removals.length > 0 && (
                          <div className="mt-2 text-sm text-muted-foreground">
                            <span className="font-semibold text-foreground">No:</span>{" "}
                            {item.removals.join(", ")}
                          </div>
                        )}

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              className="h-9 w-9 rounded-full border border-border bg-white text-foreground shadow-sm transition hover:border-primary"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            >
                              <Minus className="mx-auto h-4 w-4" />
                            </button>
                            <span className="font-semibold text-foreground">{item.quantity}</span>
                            <button
                              type="button"
                              className="h-9 w-9 rounded-full border border-border bg-white text-foreground shadow-sm transition hover:border-primary"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            >
                              <Plus className="mx-auto h-4 w-4" />
                            </button>
                          </div>
                          <span className="font-display text-xl text-primary">£{itemPrice.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)] h-fit">
                <h3 className="font-display text-2xl text-foreground mb-4">Order Summary</h3>
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                  <span>Subtotal</span>
                  <span>£{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-6">
                  <span>Delivery</span>
                  <span>Free</span>
                </div>
                <div className="flex items-center justify-between text-lg font-semibold text-foreground border-t border-border pt-4">
                  <span>Total</span>
                  <span>£{subtotal.toFixed(2)}</span>
                </div>
                <Link to="/checkout" className="block mt-6">
                  <Button className="w-full rounded-full bg-brand-black py-6 text-lg text-white hover:bg-brand-black/90">
                    Checkout
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Cart;
