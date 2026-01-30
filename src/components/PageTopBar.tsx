import { useMemo, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";

type PageTopBarProps = {
  title: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
};

const formatAddressLabel = (address: string | null) => {
  if (!address) return "Add Address";
  if (address.length <= 28) return address;
  return `${address.slice(0, 25)}...`;
};

const PageTopBar = ({
  title,
  searchPlaceholder = "Search menu items...",
  searchValue,
  onSearchChange,
}: PageTopBarProps) => {
  const { address, setAddress } = useCart();
  const { toast } = useToast();
  const [internalSearchValue, setInternalSearchValue] = useState("");

  const isControlled = typeof onSearchChange === "function";
  const resolvedSearchValue = isControlled ? searchValue ?? "" : internalSearchValue;

  const addressLabel = useMemo(() => formatAddressLabel(address), [address]);

  const handleSearchChange = (value: string) => {
    if (isControlled) {
      onSearchChange?.(value);
      return;
    }
    setInternalSearchValue(value);
  };

  const handleAddAddress = () => {
    const nextAddress = window.prompt("Enter your delivery address", address ?? "");
    if (nextAddress === null) return;
    setAddress(nextAddress);
    toast({
      title: nextAddress.trim() ? "Address saved" : "Address cleared",
      description: nextAddress.trim()
        ? "We'll use this address during checkout."
        : "You can add it again any time.",
    });
  };

  return (
    <section className="border-b border-border bg-background">
      <div className="container-custom section-padding pt-24 pb-6 md:pt-28">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h1 className="font-display text-3xl text-foreground md:text-5xl">{title}</h1>
            <Button
              variant="outline"
              className="w-full justify-center gap-2 rounded-full md:w-auto"
              onClick={handleAddAddress}
            >
              <MapPin className="h-4 w-4" />
              {addressLabel}
            </Button>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={resolvedSearchValue}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-12 rounded-full border-border bg-card pl-10 text-base"
              aria-label="Search"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default PageTopBar;
