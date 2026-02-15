import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import PaginationFooter from "@/components/PaginationFooter";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tag, PackageOpen } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { ApiDeal, ApiPaginatedResponse } from "@/lib/types";
import { formatCurrency } from "@/lib/money";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import heroBurger from "@/assets/hero-burger.jpg";

const Deals = () => {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { toast } = useToast();
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [bundleQuantity, setBundleQuantity] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["deals", currentPage],
    queryFn: () =>
      apiFetch<ApiPaginatedResponse<ApiDeal>>(`/deals?page=${currentPage}&pageSize=9`),
  });
  const deals = data?.items ?? [];

  const selectedDeal = deals.find((deal) => deal.id === selectedDealId) ?? null;
  const openDealReview = (dealId: string) => {
    setSelectedDealId(dealId);
    setBundleQuantity(1);
  };

  const addDealToCart = () => {
    if (!selectedDeal) return;
    for (let bundleIndex = 0; bundleIndex < bundleQuantity; bundleIndex += 1) {
      selectedDeal.bundleItems.forEach((item) => {
        for (let itemIndex = 0; itemIndex < item.quantity; itemIndex += 1) {
          addItem({
            menuItemId: item.id,
            name: item.name,
            description: item.description,
            image: item.imageUrl ?? heroBurger,
            basePriceCents: item.priceCents,
            addOns: [],
            removals: [],
            sourceType: "DEAL",
          });
        }
      });
    }
    toast({
      title: "Deal added to cart",
      description: `${selectedDeal.name} × ${bundleQuantity} is ready for checkout.`,
    });
    setSelectedDealId(null);
    setBundleQuantity(1);
    navigate("/cart");
  };

  return (
    <Layout>
      <section className="border-b border-border bg-background">
        <div className="container-custom section-padding pt-24 pb-6 md:pt-28">
          <h1 className="font-display text-3xl text-foreground md:text-5xl">
            Deals & Combos
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
            Deals are managed from admin. Pick a bundle and add it to cart in one click.
          </p>
        </div>
      </section>

      <section className="py-16 bg-background">
        <div className="container-custom section-padding">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading deals...</p>
          ) : isError ? (
            <p className="text-sm text-destructive">Unable to load deals right now.</p>
          ) : deals.length === 0 ? (
            <div className="rounded-3xl border border-border bg-card p-8 text-center text-muted-foreground shadow-[var(--shadow-card)]">
              No deals configured yet. Check back soon.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                {deals.map((deal, index) => {
                  const savingCents = Math.max(0, deal.subtotalCents - deal.finalPriceCents);
                  return (
                    <div
                      key={deal.id}
                      className="card-food group animate-fade-in cursor-pointer"
                      style={{ animationDelay: `${index * 0.08}s` }}
                      role="button"
                      tabIndex={0}
                      aria-label={`Review ${deal.name}`}
                      onClick={() => openDealReview(deal.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openDealReview(deal.id);
                        }
                      }}
                    >
                      <div className="absolute top-4 left-4 z-10 flex items-center gap-1 rounded-full border border-white/20 bg-brand-black px-3 py-1 text-sm font-bold text-white shadow-md">
                        <Tag className="h-3 w-3" />
                        {deal.tag}
                      </div>

                      {savingCents > 0 ? (
                        <div className="absolute top-4 right-4 z-10 rounded-full border border-accent/30 bg-accent px-3 py-1 text-xs font-bold text-accent-foreground shadow-sm">
                          Save {formatCurrency(savingCents)}
                        </div>
                      ) : null}

                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={deal.imageUrl ?? deal.bundleItems[0]?.imageUrl ?? heroBurger}
                          alt={deal.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      </div>

                      <div className="p-6">
                        <h3 className="mb-2 font-display text-2xl text-foreground">{deal.name}</h3>
                        <p className="mb-4 text-sm text-muted-foreground">{deal.description}</p>

                        <div className="mb-4 rounded-2xl border border-border/80 bg-background p-3 text-xs text-muted-foreground">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground">
                            Included
                          </p>
                          <div className="space-y-1">
                            {deal.bundleItems.map((item) => (
                              <p key={`${deal.id}-${item.id}`}>
                                • {item.name} x{item.quantity}
                              </p>
                            ))}
                          </div>
                        </div>

                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Deal price</span>
                          <div className="text-right">
                            <span className="font-display text-2xl text-primary">
                              {formatCurrency(deal.finalPriceCents)}
                            </span>
                            {savingCents > 0 ? (
                              <p className="text-xs text-muted-foreground line-through">
                                {formatCurrency(deal.subtotalCents)}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <Button
                          className="btn-order mt-4 w-full rounded-2xl"
                          onClick={(event) => {
                            event.stopPropagation();
                            openDealReview(deal.id);
                          }}
                        >
                          Review Deal
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {data ? (
                <div className="mt-5 rounded-2xl border border-border bg-card">
                  <PaginationFooter
                    currentPage={data.page}
                    totalPages={data.totalPages}
                    totalItems={data.totalItems}
                    startItem={data.totalItems === 0 ? 0 : (data.page - 1) * data.pageSize + 1}
                    endItem={Math.min(data.page * data.pageSize, data.totalItems)}
                    label="deal"
                    onPageChange={setCurrentPage}
                  />
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>

      <Dialog open={Boolean(selectedDeal)} onOpenChange={() => setSelectedDealId(null)}>
        <DialogContent className="w-[92vw] max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          {selectedDeal ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-3xl text-foreground">
                  {selectedDeal.name}
                </DialogTitle>
                <DialogDescription>
                  Review included items and add this deal bundle to cart.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="rounded-2xl border border-border bg-background p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <PackageOpen className="h-4 w-4 text-primary" />
                    Included per bundle
                  </div>
                  <div className="space-y-2">
                    {selectedDeal.bundleItems.map((item) => (
                      <div
                        key={`${selectedDeal.id}-${item.id}`}
                        className="flex items-center justify-between text-sm"
                      >
                        <div>
                          <p className="font-semibold text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.categoryName} x{item.quantity}
                          </p>
                        </div>
                        <p className="font-semibold text-primary">
                          {formatCurrency(item.priceCents * item.quantity)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background p-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Number of bundles</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => setBundleQuantity((prev) => Math.max(1, prev - 1))}
                      >
                        -
                      </Button>
                      <span className="min-w-8 text-center font-semibold text-foreground">
                        {bundleQuantity}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => setBundleQuantity((prev) => Math.min(5, prev + 1))}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      Total for {bundleQuantity} bundle(s)
                    </p>
                    <p className="font-display text-3xl text-primary">
                      {formatCurrency(selectedDeal.finalPriceCents * bundleQuantity)}
                    </p>
                  </div>
                </div>

                <Button className="btn-order w-full" onClick={addDealToCart}>
                  Add Deal to Cart
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Deals;
