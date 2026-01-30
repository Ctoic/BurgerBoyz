import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Tag } from "lucide-react";
import beefBurger from "@/assets/beef-burger.jpg";
import chickenBurger from "@/assets/chicken-burger.jpg";
import chickenWrap from "@/assets/chicken-wrap.jpg";
import chickenRice from "@/assets/chicken-rice.jpg";

const deals = [
  {
    name: "Burger Boys Combo",
    description: "Classic Burger Boys Burger + Regular Fries + Drink",
    originalPrice: 950,
    dealPrice: 799,
    image: beefBurger,
    tag: "Best Seller",
  },
  {
    name: "Chicken Feast",
    description: "Crispy Chicken Burger + Wrap + Regular Drink",
    originalPrice: 1100,
    dealPrice: 899,
    image: chickenBurger,
    tag: "Popular",
  },
  {
    name: "Family Pack",
    description: "2 Beef Burgers + 2 Chicken Burgers + 4 Drinks + Large Fries",
    originalPrice: 2800,
    dealPrice: 2199,
    image: beefBurger,
    tag: "Value Deal",
  },
  {
    name: "Rice Bowl Special",
    description: "Signature Chicken Rice + Drink + Free Sauce",
    originalPrice: 750,
    dealPrice: 599,
    image: chickenRice,
    tag: "New",
  },
  {
    name: "Wrap Duo",
    description: "Any 2 Wraps + 2 Regular Drinks",
    originalPrice: 1100,
    dealPrice: 899,
    image: chickenWrap,
    tag: "Limited Time",
  },
  {
    name: "Late Night Bundle",
    description: "Double Trouble Burger + Loaded Rice + 2 Drinks",
    originalPrice: 1800,
    dealPrice: 1399,
    image: beefBurger,
    tag: "After 10 PM",
  },
];

const Deals = () => {
  return (
    <Layout>
      <section className="border-b border-border bg-background">
        <div className="container-custom section-padding pt-24 pb-6 md:pt-28">
          <h1 className="font-display text-3xl text-foreground md:text-5xl">Deals & Combos</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
            Save more with curated bundles and limited-time offers.
          </p>
        </div>
      </section>

      {/* Deals Grid */}
      <section className="py-16 bg-background">
        <div className="container-custom section-padding">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {deals.map((deal, index) => (
              <div
                key={deal.name}
                className="card-food group animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Tag */}
                <div className="absolute top-4 left-4 z-10 bg-brand-black text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {deal.tag}
                </div>

                {/* Discount Badge */}
                <div className="absolute top-4 right-4 z-10 bg-accent text-accent-foreground px-3 py-1 rounded-full text-sm font-bold">
                  Save Rs. {deal.originalPrice - deal.dealPrice}
                </div>

                {/* Image */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={deal.image}
                    alt={deal.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="font-display text-2xl text-foreground mb-2">{deal.name}</h3>
                  <p className="text-muted-foreground text-sm mb-4">{deal.description}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-display text-3xl text-primary">Rs. {deal.dealPrice}</span>
                      <span className="text-muted-foreground line-through text-lg">Rs. {deal.originalPrice}</span>
                    </div>
                  </div>

                  <Button className="w-full mt-4 btn-order">
                    Order Deal
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-12 bg-muted">
        <div className="container-custom section-padding text-center">
          <h3 className="font-display text-2xl text-foreground mb-4">
            CAN'T FIND WHAT YOU'RE LOOKING FOR?
          </h3>
          <p className="text-muted-foreground mb-6">
            Build your own combo! Contact us for custom meal packages.
          </p>
          <a href="https://wa.me/923001234567" target="_blank" rel="noopener noreferrer">
            <Button className="btn-order">
              WhatsApp Us
            </Button>
          </a>
        </div>
      </section>
    </Layout>
  );
};

export default Deals;
