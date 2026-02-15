import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Layout from "@/components/Layout";
import MenuCard from "@/components/MenuCard";
import PaginationFooter from "@/components/PaginationFooter";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Share2, ShoppingCart, X } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import heroBurger from "@/assets/hero-burger.jpg";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { ApiMenuCategory, ApiMenuItem } from "@/lib/types";
import { formatCurrency } from "@/lib/money";
import { usePagination } from "@/hooks/usePagination";

const removalOptions = [
  "No cheese 🧀",
  "No sauce 💧",
  "No salad 🥗",
  "No tomato 🍅",
  "No onion 🧅",
  "No lettuce 🥬",
];

const Menu = () => {
  const { addItem, totalItems } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["menu"],
    queryFn: () => apiFetch<ApiMenuCategory[]>("/menu"),
  });

  const categories = data ?? [];
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<ApiMenuItem | null>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [selectedRemovals, setSelectedRemovals] = useState<string[]>([]);
  const categoryScrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollCategoryLeft, setCanScrollCategoryLeft] = useState(false);
  const [canScrollCategoryRight, setCanScrollCategoryRight] = useState(false);
  const maxAddOns = 4;
  const maxRemovals = 5;

  useEffect(() => {
    if (!activeCategory && categories.length > 0) {
      setActiveCategory(categories[0].name);
    }
  }, [activeCategory, categories]);

  const syncCategoryScrollState = useCallback(() => {
    const container = categoryScrollRef.current;
    if (!container) {
      setCanScrollCategoryLeft(false);
      setCanScrollCategoryRight(false);
      return;
    }

    const maxScrollLeft = container.scrollWidth - container.clientWidth;
    const hasOverflow = maxScrollLeft > 4;
    if (!hasOverflow) {
      setCanScrollCategoryLeft(false);
      setCanScrollCategoryRight(false);
      return;
    }

    setCanScrollCategoryLeft(container.scrollLeft > 4);
    setCanScrollCategoryRight(container.scrollLeft < maxScrollLeft - 4);
  }, []);

  useEffect(() => {
    syncCategoryScrollState();
    const handleResize = () => syncCategoryScrollState();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [categories.length, syncCategoryScrollState]);

  const activeCategoryData = useMemo(() => {
    if (!categories.length) return null;
    return categories.find((category) => category.name === activeCategory) ?? categories[0];
  }, [categories, activeCategory]);
  const menuItemsPagination = usePagination(activeCategoryData?.items ?? [], {
    pageSize: 12,
    resetDeps: [activeCategory],
  });
  const paginatedMenuItems = menuItemsPagination.paginatedItems;

  const addOnsTotal = useMemo(() => {
    if (!selectedItem) return 0;
    return selectedAddOns.reduce((total, addOnId) => {
      const addOn = selectedItem.addOns.find((item) => item.id === addOnId);
      return total + (addOn?.priceCents ?? 0);
    }, 0);
  }, [selectedAddOns, selectedItem]);

  const totalPriceCents = useMemo(() => {
    if (!selectedItem) return 0;
    return selectedItem.priceCents + addOnsTotal;
  }, [selectedItem, addOnsTotal]);

  const handleOpenItem = (item: ApiMenuItem) => {
    setSelectedItem(item);
    setSelectedAddOns([]);
    setSelectedRemovals([]);
  };

  const handleAddOnChange = (addOnId: string, checked: boolean) => {
    setSelectedAddOns((prev) => {
      if (checked) {
        if (prev.includes(addOnId) || prev.length >= maxAddOns) return prev;
        return [...prev, addOnId];
      }
      return prev.filter((id) => id !== addOnId);
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
    const itemName = selectedItem.name;
    const addOnItems = selectedItem.addOns
      .filter((addOn) => selectedAddOns.includes(addOn.id))
      .map((addOn) => ({
        id: addOn.id,
        name: addOn.name,
        priceCents: addOn.priceCents,
      }));

    addItem({
      menuItemId: selectedItem.id,
      name: selectedItem.name,
      description: selectedItem.description,
      image: selectedItem.imageUrl ?? heroBurger,
      basePriceCents: selectedItem.priceCents,
      addOns: addOnItems,
      removals: selectedRemovals,
      sourceType: "NORMAL",
    });
    setSelectedItem(null);
    setSelectedAddOns([]);
    setSelectedRemovals([]);
    toast({
      title: "Added to cart",
      description: `${itemName} is ready for checkout.`,
    });
  };

  const handleQuickAddToCart = (item: ApiMenuItem) => {
    addItem({
      menuItemId: item.id,
      name: item.name,
      description: item.description,
      image: item.imageUrl ?? heroBurger,
      basePriceCents: item.priceCents,
      addOns: [],
      removals: [],
      sourceType: "NORMAL",
    });
    toast({
      title: "Added to cart",
      description: `${item.name} is ready for checkout.`,
    });
  };

  return (
    <Layout>
      <section className="border-b border-border bg-background">
        <div className="container-custom section-padding pt-24 pb-6 md:pt-28">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl text-foreground md:text-5xl">Our Menu</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
                Pick your favorites and customize them to your taste.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="relative mt-1 h-10 w-10 shrink-0 rounded-full border-primary/30 bg-card text-foreground hover:border-primary/60"
              onClick={() => navigate("/checkout")}
              aria-label="Open cart"
            >
              <ShoppingCart className="h-4 w-4" />
              {totalItems > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                  {totalItems > 99 ? "99+" : totalItems}
                </span>
              ) : null}
            </Button>
          </div>
        </div>
      </section>

      <section className="sticky top-16 md:top-20 z-40 bg-background border-b border-border shadow-sm">
        <div className="container-custom section-padding">
          <div className="py-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Categories
              </p>
              {canScrollCategoryRight || canScrollCategoryLeft ? (
                <p className="text-[11px] font-medium text-muted-foreground">
                  {canScrollCategoryRight ? "Swipe to see more" : "Scroll left for previous"}
                </p>
              ) : null}
            </div>

            <div className="relative">
              {canScrollCategoryLeft ? (
                <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-background to-transparent" />
              ) : null}
              {canScrollCategoryRight ? (
                <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-background to-transparent" />
              ) : null}

              <div
                ref={categoryScrollRef}
                className="flex gap-2 overflow-x-auto py-1 pr-1 scrollbar-hide"
                onScroll={syncCategoryScrollState}
              >
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    onClick={() => setActiveCategory(category.name)}
                    variant={activeCategory === category.name ? "default" : "outline"}
                    className={`whitespace-nowrap rounded-full px-6 ${
                      activeCategory === category.name
                        ? "bg-primary text-primary-foreground"
                        : "border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    {category.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-8 md:py-12 bg-background">
        <div className="container-custom section-padding">
          {isLoading && (
            <p className="text-sm text-muted-foreground">Loading menu...</p>
          )}
          {isError && (
            <p className="text-sm text-destructive">Unable to load menu.</p>
          )}

          {activeCategoryData ? (
            <>
              <h2 className="font-display text-2xl md:text-3xl text-foreground mb-5 md:mb-8">
                {activeCategoryData.name.toUpperCase()}
              </h2>
              {activeCategoryData.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  This category is empty right now.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {paginatedMenuItems.map((item) => (
                      <MenuCard
                        key={item.id}
                        name={item.name}
                        description={item.description}
                        price={item.priceCents / 100}
                        image={item.imageUrl ?? heroBurger}
                        isPopular={item.isPopular}
                        onClick={() => handleOpenItem(item)}
                        onAddToCart={() => handleQuickAddToCart(item)}
                      />
                    ))}
                  </div>
                  <div className="mt-4 rounded-2xl border border-border bg-card">
                    <PaginationFooter
                      currentPage={menuItemsPagination.currentPage}
                      totalPages={menuItemsPagination.totalPages}
                      totalItems={menuItemsPagination.totalItems}
                      startItem={menuItemsPagination.startItem}
                      endItem={menuItemsPagination.endItem}
                      label="item"
                      onPageChange={menuItemsPagination.setCurrentPage}
                    />
                  </div>
                </>
              )}
            </>
          ) : (
            !isLoading && (
              <p className="text-sm text-muted-foreground">No menu items yet.</p>
            )
          )}
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
                  src={selectedItem.imageUrl ?? heroBurger}
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
                  <h3 className="font-display text-2xl sm:text-3xl text-foreground">
                    {selectedItem.name}
                  </h3>
                  <p className="font-display text-xl text-primary">
                    {formatCurrency(selectedItem.priceCents)}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground mb-6">
                  {selectedItem.description}
                </p>

                <div className="border-t border-border pt-6">
                  <div className="mb-4">
                    <h4 className="font-display text-lg text-foreground">
                      Choose your extras 😋 😋 😋
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Choose up to {maxAddOns}
                    </p>
                  </div>
                  {selectedItem.addOns.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No add-ons for this item.</p>
                  ) : (
                    <div className="space-y-4">
                      {selectedItem.addOns.map((addOn) => {
                        const isSelected = selectedAddOns.includes(addOn.id);
                        const isDisabled =
                          !isSelected && selectedAddOns.length >= maxAddOns;
                        return (
                          <label
                            key={addOn.id}
                            className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-white/70 p-4 shadow-sm transition hover:border-primary"
                          >
                            <div>
                              <p className="font-semibold text-foreground">{addOn.name}</p>
                              <p className="text-sm text-muted-foreground">
                                +{formatCurrency(addOn.priceCents)}
                              </p>
                            </div>
                            <Checkbox
                              checked={isSelected}
                              disabled={isDisabled}
                              onCheckedChange={(checked) =>
                                handleAddOnChange(addOn.id, checked === true)
                              }
                              className="h-6 w-6 rounded-full border-2 border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                            />
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="border-t border-border pt-6">
                  <div className="mb-4">
                    <h4 className="font-display text-lg text-foreground">No's 🙄🙄</h4>
                    <p className="text-sm text-muted-foreground">
                      Choose up to {maxRemovals}
                    </p>
                  </div>
                  <div className="space-y-4">
                    {removalOptions.map((option) => {
                      const isSelected = selectedRemovals.includes(option);
                      const isDisabled =
                        !isSelected && selectedRemovals.length >= maxRemovals;
                      return (
                        <label
                          key={option}
                          className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-white/70 p-4 shadow-sm transition hover:border-primary"
                        >
                          <p className="font-semibold text-foreground">{option}</p>
                          <Checkbox
                            checked={isSelected}
                            disabled={isDisabled}
                            onCheckedChange={(checked) =>
                              handleRemovalChange(option, checked === true)
                            }
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
                  Add to cart • {formatCurrency(totalPriceCents)}
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
