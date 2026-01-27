import { useMemo, useState } from "react";
import Layout from "@/components/Layout";
import MenuCard from "@/components/MenuCard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Share2, X } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useNavigate } from "react-router-dom";
import beefBurger from "@/assets/beef-burger.jpg";
import chickenBurger from "@/assets/chicken-burger.jpg";
import chickenWrap from "@/assets/chicken-wrap.jpg";
import chickenRice from "@/assets/chicken-rice.jpg";
import heroBurger from "@/assets/hero-burger.jpg";

interface MenuItem {
  name: string;
  description: string;
  price: number;
  image: string;
  isPopular?: boolean;
}

const menuItems: Record<string, MenuItem[]> = {
  "Beef Burgers": [
    {
      name: "Star Burger",
      description: "Seeded brioche bun, 2 beef patties, cheese slices, lettuce, tomato, pickle, and star sauce.",
      price: 5.99,
      image: heroBurger,
      isPopular: true,
    },
    {
      name: "Bacon & Cheese",
      description: "Seeded brioche bun, 2 beef patties, cheese slices, bacon, lettuce, tomato, and BBQ sauce.",
      price: 6.99,
      image: beefBurger,
    },
    {
      name: "Triple Plus",
      description: "Seeded brioche bun, 3 beef patties, 4 cheese slices, lettuce, tomato, red onion, and house sauce.",
      price: 7.49,
      image: beefBurger,
    },
    {
      name: "Donner Rise",
      description:
        "Seeded brioche bun, 2 beef patties, 2 cheese slices, lamb donner, lettuce, tomato, red onion, and chilli sauce.",
      price: 6.99,
      image: beefBurger,
    },
    {
      name: "Cheese Burger",
      description: "Seeded brioche bun, 2 beef patties, 2 cheese slices, lettuce, tomato, grilled onion, and ketchup.",
      price: 5.99,
      image: heroBurger,
    },
    {
      name: "Halloumi Special",
      description:
        "Seeded brioche bun, beef patty with cheese slice, halloumi cheese, lettuce, tomato, red onion, mushrooms, and house sauce.",
      price: 6.99,
      image: beefBurger,
    },
    {
      name: "Half & Half",
      description:
        "Seeded brioche bun, beef patty with cheese, fresh chicken with cheese, bacon slice, lettuce, tomato, pickle, and house sauce.",
      price: 6.99,
      image: beefBurger,
    },
    {
      name: "Breakfast Burger",
      description: "Seeded brioche bun, 2 beef patties, egg, cheese slices, bacon slices, and ketchup.",
      price: 6.99,
      image: heroBurger,
    },
    {
      name: "Hash Root",
      description:
        "Seeded brioche bun, 2 beef patties, 2 cheese slices, hash brown, lettuce, tomato, red onion, mayonnaise, and ketchup.",
      price: 6.49,
      image: beefBurger,
    },
    {
      name: "Mushroom Based",
      description: "Seeded brioche bun, 2 beef patties, 2 cheese slices, lettuce, red onion, and mayonnaise.",
      price: 6.49,
      image: heroBurger,
    },
    {
      name: "Rings Beef",
      description:
        "Seeded brioche bun, 2 beef patties, 2 cheese slices, 3 onion rings, lettuce, tomato, red onion, BBQ sauce, and mayonnaise.",
      price: 6.49,
      image: beefBurger,
    },
    {
      name: "Add-ons: Extra patty / chicken / 2 slices bacon / donner",
      description: "Add-on for any burger.",
      price: 1.99,
      image: beefBurger,
    },
  ],
  "Chicken Burgers": [
    {
      name: "Peri Peri Burger",
      description:
        "Fresh fried & grilled chicken breast in a seeded brioche bun, cheese slice, lettuce, tomato, and garlic mayonnaise.",
      price: 3.99,
      image: chickenBurger,
      isPopular: true,
    },
    {
      name: "Zinger Style",
      description: "Fresh fried chicken breast in a seeded brioche bun with lettuce, pepper mayonnaise.",
      price: 3.99,
      image: chickenBurger,
    },
    {
      name: "Cheese & Chicken",
      description:
        "Fresh fried chicken in a plain brioche bun, melted cheese, spicy crisps, lettuce, and star sauce.",
      price: 4.99,
      image: chickenBurger,
    },
    {
      name: "Nashville Chicken",
      description:
        "Fresh fried chicken dipped in buttery spicy Nashville sauce, served in a plain brioche bun with lettuce, pickle, and sriracha sauce.",
      price: 5.99,
      image: chickenBurger,
      isPopular: true,
    },
    {
      name: "Hot & Spicy",
      description:
        "Fresh fried chicken dipped in homemade hot sauce, served in a plain brioche bun with lettuce, jalapeños, and mayonnaise.",
      price: 4.99,
      image: chickenBurger,
    },
    {
      name: "Bacon & Chicken",
      description:
        "Fresh fried chicken in a plain brioche bun, cheese slice, 2 bacon slices, lettuce, tomato, and BBQ sauce.",
      price: 5.99,
      image: chickenBurger,
    },
    {
      name: "Chicken Brown",
      description:
        "Fresh fried chicken in a plain brioche bun with cheese slice, hash brown, mayonnaise, and chilli sauce.",
      price: 4.99,
      image: chickenBurger,
    },
    {
      name: "Veggie Burger",
      description:
        "Veggie patty in a seeded brioche bun with lettuce, tomato, red onion, mayonnaise, and chilli sauce.",
      price: 4.99,
      image: chickenBurger,
    },
    {
      name: "Fish Burger",
      description:
        "Fish fillet in a seeded brioche bun with lettuce, tomato, and star sauce.",
      price: 4.99,
      image: chickenBurger,
    },
    {
      name: "Add-ons: Extra patty / chicken / 2 slices bacon / donner",
      description: "Add-on for any burger.",
      price: 1.99,
      image: chickenBurger,
    },
  ],
  "Wraps": [
    {
      name: "Peri Peri Wrap",
      description:
        "Fresh fried & grilled chicken pieces in a tortilla wrap, grilled in panini, cheese slice, lettuce, tomato, and garlic mayonnaise.",
      price: 4.49,
      image: chickenWrap,
      isPopular: true,
    },
    {
      name: "Zinger Style Wrap",
      description:
        "Fresh fried chicken pieces in a tortilla wrap, grilled in panini, lettuce, and star sauce.",
      price: 4.49,
      image: chickenWrap,
    },
    {
      name: "Cheese Wrap",
      description:
        "Fresh fried chicken pieces in a tortilla wrap, grilled in panini, hash brown, 2 cheese slices, tomatoes, red onion, and star sauce.",
      price: 4.99,
      image: chickenWrap,
    },
    {
      name: "BBQ Wrap",
      description:
        "Fresh fried chicken pieces dipped in BBQ sauce, wrapped with lettuce and 2 cheese slices, grilled in panini.",
      price: 4.49,
      image: chickenWrap,
    },
    {
      name: "Donner Wrap",
      description:
        "Fresh lamb donner in a tortilla wrap, grilled in panini with lettuce, tomato, red onion, jalapeño, mayonnaise, and chilli sauce.",
      price: 4.99,
      image: chickenWrap,
    },
  ],
  "Sides": [
    { name: "Normal Fries", description: "Crispy golden fries.", price: 1.75, image: chickenRice },
    { name: "Red Salt Fries", description: "Fries dusted with red salt.", price: 1.99, image: chickenRice },
    { name: "Cheese Fries", description: "Fries topped with melted cheese.", price: 2.99, image: chickenRice },
    { name: "Curly Fries", description: "Seasoned curly fries.", price: 2.49, image: chickenRice },
    { name: "Curly Cheese Fries", description: "Curly fries with melted cheese.", price: 3.49, image: chickenRice },
    { name: "Mac & Cheese Bites (5)", description: "Five mac & cheese bites.", price: 3.99, image: chickenRice },
    { name: "Mozzarella Sticks (4)", description: "Four mozzarella sticks.", price: 3.99, image: chickenRice },
    { name: "Onion Rings (7)", description: "Seven crispy onion rings.", price: 2.99, image: chickenRice },
    { name: "Hash Brown (3)", description: "Three hash browns.", price: 2.99, image: chickenRice },
    { name: "Chicken Nuggets", description: "Nugget side portion.", price: 1.75, image: chickenRice },
  ],
  "Chicken Wings (5 pcs)": [
    { name: "Plain Wings", description: "5 pcs plain wings.", price: 2.99, image: chickenBurger },
    { name: "Peri Peri Wings", description: "5 pcs peri peri wings.", price: 3.49, image: chickenBurger },
    { name: "BBQ Wings", description: "5 pcs BBQ wings.", price: 3.49, image: chickenBurger },
    { name: "Hot n Spicy Wings", description: "5 pcs hot n spicy wings.", price: 3.49, image: chickenBurger },
    { name: "Lemon & Herbs Wings", description: "5 pcs lemon & herbs wings.", price: 3.49, image: chickenBurger },
  ],
  "Chicken Tenders (4 pcs)": [
    { name: "Plain", description: "4 pcs plain tenders.", price: 3.75, image: chickenBurger },
    { name: "Peri Peri", description: "4 pcs peri peri tenders.", price: 3.75, image: chickenBurger },
    { name: "BBQ", description: "4 pcs BBQ tenders.", price: 3.75, image: chickenBurger },
    { name: "Hot n Spicy", description: "4 pcs hot n spicy tenders.", price: 3.75, image: chickenBurger },
    { name: "Lemon & Herbs", description: "4 pcs lemon and herbs tenders.", price: 3.75, image: chickenBurger },
  ],
  "Hot Dogs": [
    {
      name: "Classic Hot Dog",
      description: "Hot dog in a brioche bun with grilled onion, ketchup, and mustard.",
      price: 4.99,
      image: beefBurger,
    },
    {
      name: "Chilli Hot Dog",
      description:
        "Hot dog in a brioche bun with jalapeños, chilli, grilled onion, and mayonnaise.",
      price: 4.99,
      image: beefBurger,
    },
    {
      name: "Bacon Hot Dog",
      description: "Hot dog in a brioche bun with 2 slices of bacon and BBQ sauce.",
      price: 5.99,
      image: beefBurger,
    },
  ],
  "Dips": [
    { name: "Star Sauce / Garlic Mayonnaise", description: "1oz dip cup.", price: 0.3, image: heroBurger },
    { name: "Pepper Mayonnaise / BBQ Sauce", description: "1oz dip cup.", price: 0.3, image: heroBurger },
    { name: "Chilli Sauce / Mayonnaise", description: "1oz dip cup.", price: 0.3, image: heroBurger },
    { name: "House Sauce / Ketchup / Mustard", description: "1oz dip cup.", price: 0.3, image: heroBurger },
    { name: "Hot Cheese (2oz)", description: "Warm cheese dip.", price: 1.49, image: heroBurger },
  ],
  "Drinks": [
    {
      name: "Coke / Diet Coke / Dr Pepper / Fanta / Vimto / Iron Bru / Coke Zero / Pepsi / Water",
      description: "Soft drink.",
      price: 0.99,
      image: chickenRice,
    },
    { name: "Red Bull / Monster", description: "Energy drink.", price: 1.99, image: chickenRice },
  ],
};

const addOns = [
  { name: "Cheese slice", price: 0.99 },
  { name: "Doner", price: 1.99 },
  { name: "Bacon (2 slices)", price: 1.99 },
  { name: "Extra patty", price: 1.99 },
  { name: "Chicken", price: 1.99 },
];

const removalOptions = [
  "No cheese 🧀",
  "No sauce 💧",
  "No salad 🥗",
  "No tomato 🍅",
  "No onion 🧅",
  "No lettuce 🥬",
];

const categories = Object.keys(menuItems);

const Menu = () => {
  const [activeCategory, setActiveCategory] = useState(categories[0]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [selectedRemovals, setSelectedRemovals] = useState<string[]>([]);
  const maxAddOns = 4;
  const maxRemovals = 5;
  const { addItem } = useCart();
  const navigate = useNavigate();

  const addOnsTotal = useMemo(() => {
    return selectedAddOns.reduce((total, addOnName) => {
      const addOn = addOns.find((item) => item.name === addOnName);
      return total + (addOn?.price ?? 0);
    }, 0);
  }, [selectedAddOns]);

  const totalPrice = useMemo(() => {
    if (!selectedItem) return 0;
    return selectedItem.price + addOnsTotal;
  }, [selectedItem, addOnsTotal]);

  const handleOpenItem = (item: MenuItem) => {
    setSelectedItem(item);
    setSelectedAddOns([]);
    setSelectedRemovals([]);
  };

  const handleAddOnChange = (addOnName: string, checked: boolean) => {
    setSelectedAddOns((prev) => {
      if (checked) {
        if (prev.includes(addOnName) || prev.length >= maxAddOns) return prev;
        return [...prev, addOnName];
      }
      return prev.filter((name) => name !== addOnName);
    });
  };

  const handleRemovalChange = (optionName: string, checked: boolean) => {
    setSelectedRemovals((prev) => {
      if (checked) {
        if (prev.includes(optionName) || prev.length >= maxRemovals) return prev;
        return [...prev, optionName];
      }
      return prev.filter((name) => name !== optionName);
    });
  };

  const handleAddToCart = () => {
    if (!selectedItem) return;
    const addOnItems = addOns.filter((addOn) => selectedAddOns.includes(addOn.name));
    addItem({
      name: selectedItem.name,
      description: selectedItem.description,
      image: selectedItem.image,
      basePrice: selectedItem.price,
      addOns: addOnItems,
      removals: selectedRemovals,
    });
    setSelectedItem(null);
    setSelectedAddOns([]);
    setSelectedRemovals([]);
    navigate("/cart");
  };

  return (
    <Layout>
      {/* Hero */}
      <section className="pt-20 pb-6 md:pt-24 md:pb-12 bg-gradient-to-b from-primary via-primary to-secondary">
        <div className="container-custom section-padding pt-6 md:pt-12">
          <h1 className="font-display text-3xl md:text-6xl text-brand-black text-center mb-3 md:mb-4">
            OUR <span className="text-white drop-shadow-lg">MENU</span>
          </h1>
          <p className="text-brand-black/70 text-center max-w-2xl mx-auto font-medium text-sm md:text-base">
            Crafted with passion, served with pride. Every bite tells a story of bold flavors.
          </p>
        </div>
      </section>

      {/* Category Tabs */}
      <section className="sticky top-16 md:top-20 z-40 bg-background border-b border-border shadow-sm">
        <div className="container-custom section-padding">
          <div className="flex gap-2 overflow-x-auto py-4 scrollbar-hide">
            {categories.map((category) => (
              <Button
                key={category}
                onClick={() => setActiveCategory(category)}
                variant={activeCategory === category ? "default" : "outline"}
                className={`whitespace-nowrap rounded-full px-6 ${
                  activeCategory === category
                    ? "bg-primary text-primary-foreground"
                    : "border-border text-foreground hover:bg-muted"
                }`}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Menu Items */}
      <section className="py-8 md:py-12 bg-background">
        <div className="container-custom section-padding">
          <h2 className="font-display text-2xl md:text-3xl text-foreground mb-5 md:mb-8">{activeCategory.toUpperCase()}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {menuItems[activeCategory as keyof typeof menuItems].map((item) => (
              <MenuCard
                key={item.name}
                name={item.name}
                description={item.description}
                price={item.price}
                image={item.image}
                isPopular={item.isPopular}
                onClick={() => handleOpenItem(item)}
              />
            ))}
          </div>
        </div>
      </section>
      <Dialog
        open={!!selectedItem}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedItem(null);
            setSelectedAddOns([]);
            setSelectedRemovals([]);
          }
        }}
      >
        <DialogContent className="w-[92vw] max-w-2xl p-0 sm:w-full sm:rounded-2xl [&>button]:hidden">
          {selectedItem && (
            <div className="flex max-h-[85vh] flex-col bg-background sm:rounded-2xl">
              <div className="relative h-56 sm:h-72">
                <img
                  src={selectedItem.image}
                  alt={selectedItem.name}
                  className="h-full w-full object-cover"
                />
                <DialogClose asChild>
                  <button
                    type="button"
                    className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-foreground shadow-md transition hover:bg-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </DialogClose>
                <button
                  type="button"
                  className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-foreground shadow-md transition hover:bg-white"
                >
                  <Share2 className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-10">
                <div className="mb-4">
                  <h3 className="font-display text-2xl sm:text-3xl text-foreground">{selectedItem.name}</h3>
                  <p className="font-display text-xl text-primary">£{selectedItem.price.toFixed(2)}</p>
                </div>
                <p className="text-sm text-muted-foreground mb-6">
                  {selectedItem.description}
                </p>

                <div className="border-t border-border pt-6">
                  <div className="mb-4">
                    <h4 className="font-display text-lg text-foreground">
                      Choose your extras 😋 😋 😋
                    </h4>
                    <p className="text-sm text-muted-foreground">Choose up to {maxAddOns}</p>
                  </div>
                  <div className="space-y-4">
                    {addOns.map((addOn) => {
                      const isSelected = selectedAddOns.includes(addOn.name);
                      const isDisabled = !isSelected && selectedAddOns.length >= maxAddOns;
                      return (
                        <label
                          key={addOn.name}
                          className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-white/70 p-4 shadow-sm transition hover:border-primary"
                        >
                          <div>
                            <p className="font-semibold text-foreground">{addOn.name}</p>
                            <p className="text-sm text-muted-foreground">+£{addOn.price.toFixed(2)}</p>
                          </div>
                          <Checkbox
                            checked={isSelected}
                            disabled={isDisabled}
                            onCheckedChange={(checked) => handleAddOnChange(addOn.name, checked === true)}
                            className="h-6 w-6 rounded-full border-2 border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-border pt-6">
                  <div className="mb-4">
                    <h4 className="font-display text-lg text-foreground">No's 🙄🙄</h4>
                    <p className="text-sm text-muted-foreground">Choose up to {maxRemovals}</p>
                  </div>
                  <div className="space-y-4">
                    {removalOptions.map((option) => {
                      const isSelected = selectedRemovals.includes(option);
                      const isDisabled = !isSelected && selectedRemovals.length >= maxRemovals;
                      return (
                        <label
                          key={option}
                          className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-white/70 p-4 shadow-sm transition hover:border-primary"
                        >
                          <p className="font-semibold text-foreground">{option}</p>
                          <Checkbox
                            checked={isSelected}
                            disabled={isDisabled}
                            onCheckedChange={(checked) => handleRemovalChange(option, checked === true)}
                            className="h-6 w-6 rounded-full border-2 border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="border-t border-border bg-background p-4 sm:px-8 sm:rounded-b-2xl">
                <Button
                  className="w-full rounded-full bg-brand-black py-6 text-lg text-white hover:bg-brand-black/90"
                  onClick={handleAddToCart}
                >
                  Add to cart • £{totalPrice.toFixed(2)}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Menu;
