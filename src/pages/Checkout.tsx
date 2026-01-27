import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { Link } from "react-router-dom";

const Checkout = () => {
  const { items, subtotal, clearCart } = useCart();

  return (
    <Layout>
      <section className="pt-24 pb-12 bg-gradient-to-b from-primary via-primary to-secondary">
        <div className="container-custom section-padding pt-6 md:pt-12">
          <h1 className="font-display text-3xl md:text-6xl text-brand-black text-center mb-3 md:mb-4">
            CHECK<span className="text-white drop-shadow-lg">OUT</span>
          </h1>
          <p className="text-brand-black/70 text-center max-w-2xl mx-auto font-medium text-sm md:text-base">
            Confirm your order and complete payment.
          </p>
        </div>
      </section>

      <section className="py-12 bg-background">
        <div className="container-custom section-padding">
          <div className="max-w-3xl mx-auto rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            <h2 className="font-display text-2xl text-foreground mb-4">Order Summary</h2>
            <div className="space-y-3 mb-6">
              {items.map((item) => {
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

            <div className="flex items-center justify-between text-lg font-semibold text-foreground border-t border-border pt-4">
              <span>Total</span>
              <span>£{subtotal.toFixed(2)}</span>
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-between">
              <Link to="/cart" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full rounded-full py-6 text-lg">
                  Back to Cart
                </Button>
              </Link>
              <Button
                className="w-full rounded-full bg-brand-black py-6 text-lg text-white hover:bg-brand-black/90 sm:w-auto"
                onClick={clearCart}
              >
                Place Order
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Checkout;
