import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface MenuCardProps {
  name: string;
  description: string;
  price: number;
  image: string;
  isPopular?: boolean;
  onClick?: () => void;
}

const MenuCard = ({ name, description, price, image, isPopular, onClick }: MenuCardProps) => {
  return (
    <div
      className="card-food group relative rounded-2xl sm:rounded-3xl cursor-pointer"
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(event) => {
        if (!onClick) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
    >
      {isPopular && (
        <div className="absolute top-4 left-4 z-10 bg-accent text-accent-foreground px-3 py-1 rounded-full text-sm font-bold">
          🔥 Popular
        </div>
      )}
      
      {/* Image */}
      <div className="relative h-36 sm:h-56 lg:h-60 overflow-hidden">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <Button
          size="icon"
          className="absolute bottom-3 right-3 h-10 w-10 rounded-full bg-white text-foreground shadow-md hover:bg-white sm:hidden"
          onClick={(event) => event.stopPropagation()}
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-5">
        <h3 className="font-display text-base sm:text-xl text-foreground mb-2 line-clamp-1">{name}</h3>
        <p className="text-muted-foreground text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2">{description}</p>
        
        <div className="flex items-center justify-between">
          <span className="font-display text-lg sm:text-2xl text-primary">£{price.toFixed(2)}</span>
          <Button
            className="hidden sm:flex bg-primary hover:bg-[hsl(var(--brand-yellow-dark))] text-primary-foreground rounded-full px-4 py-2 items-center gap-2 transition-all hover:scale-105"
            onClick={(event) => event.stopPropagation()}
          >
            <Plus className="w-4 h-4" />
            Add to cart
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MenuCard;
