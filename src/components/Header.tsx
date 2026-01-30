import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Phone, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { totalItems } = useCart();

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Menu", path: "/menu" },
    { name: "Deals", path: "/deals" },
    { name: "About", path: "/about" },
    { name: "Contact", path: "/contact" },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border shadow-sm">
      <div className="container-custom section-padding">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-1">
            <span className="font-display text-2xl md:text-3xl text-brand-black">BURGER</span>
            <span className="font-display text-2xl md:text-3xl text-primary">BOYS</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`font-semibold transition-colors duration-300 ${
                  isActive(link.path)
                    ? "text-primary"
                    : "text-foreground hover:text-primary"
                }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2 text-foreground">
              <Phone className="w-4 h-4" />
              <span className="font-semibold">Phone pending</span>
            </div>
            <Link to="/cart" className="relative">
              <Button variant="outline" className="rounded-full px-4">
                <ShoppingCart className="w-4 h-4" />
                Cart
              </Button>
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 h-5 min-w-[1.25rem] rounded-full bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center px-1">
                  {totalItems}
                </span>
              )}
            </Link>
            <Link to="/menu">
              <Button className="btn-order">Order Now</Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-foreground p-2"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <nav className="md:hidden py-4 animate-slide-up">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={`font-semibold py-2 transition-colors ${
                    isActive(link.path)
                      ? "text-primary"
                      : "text-foreground hover:text-primary"
                  }`}
                >
                  {link.name}
                </Link>
              ))}
              <Link to="/cart" onClick={() => setIsOpen(false)}>
                <Button variant="outline" className="w-full rounded-full flex items-center justify-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  Cart {totalItems > 0 ? `(${totalItems})` : ""}
                </Button>
              </Link>
              <Link to="/menu" onClick={() => setIsOpen(false)}>
                <Button className="btn-order w-full mt-4">Order Now</Button>
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
