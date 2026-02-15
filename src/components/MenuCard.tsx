import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { MouseEvent } from "react";

interface MenuCardProps {
  name: string;
  description: string;
  price: number;
  image: string;
  isPopular?: boolean;
  onClick?: () => void;
  onAddToCart?: () => void;
}

const MenuCard = ({
  name,
  description,
  price,
  image,
  isPopular,
  onClick,
  onAddToCart,
}: MenuCardProps) => {
  const handleAddToCartClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onAddToCart?.();
  };

  return (
    <div
      className="card-food group cursor-pointer rounded-2xl sm:rounded-3xl"
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `View ${name}` : undefined}
      onKeyDown={(event) => {
        if (!onClick) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
    >
      {isPopular && (
        <div className="absolute left-3 top-3 z-10 rounded-full border border-accent/30 bg-accent px-3 py-1 text-xs font-bold text-accent-foreground shadow-sm sm:left-4 sm:top-4 sm:text-sm">
          Popular
        </div>
      )}

      <div className="relative h-36 overflow-hidden sm:h-56 lg:h-60">
        <img
          src={image}
          alt={name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/65 via-foreground/20 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-100" />
        <Button
          size="icon"
          className="absolute bottom-3 right-3 h-10 w-10 rounded-full border border-border/80 bg-white text-foreground shadow-md hover:scale-105 hover:bg-white sm:hidden"
          onClick={handleAddToCartClick}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      <div className="space-y-4 p-3 sm:p-5">
        <div>
          <h3 className="mb-2 line-clamp-1 font-display text-base text-foreground sm:text-xl">
            {name}
          </h3>
          <p className="line-clamp-2 text-xs text-muted-foreground sm:text-sm">{description}</p>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border/80 pt-3">
          <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 font-display text-lg text-primary sm:text-2xl">
            £{price.toFixed(2)}
          </span>
          <Button
            className="hidden rounded-full border border-primary/40 bg-primary px-4 py-2 text-primary-foreground transition-all hover:-translate-y-0.5 hover:bg-[hsl(var(--brand-yellow-dark))] sm:flex"
            onClick={handleAddToCartClick}
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MenuCard;
