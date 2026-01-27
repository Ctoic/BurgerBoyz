import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Flame } from "lucide-react";
import heroBurger from "@/assets/hero-burger.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Yellow gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-secondary" />
      
      {/* Background Image with overlay */}
      <div className="absolute inset-0">
        <img
          src={heroBurger}
          alt="Delicious Burger"
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/70 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative container-custom section-padding pt-24">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 mb-6 animate-fade-in">
            <span className="bg-brand-black text-white px-4 py-2 rounded-full font-bold text-sm uppercase tracking-wide flex items-center gap-2">
              <Flame className="w-4 h-4 text-primary" />
              Now Serving in Manchester
            </span>
          </div>

          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-brand-black leading-none mb-6 animate-slide-up">
            REAL BEEF.
            <br />
            <span className="text-white drop-shadow-lg">JUICY CHICKEN.</span>
            <br />
            <span className="text-accent">BURGER BOYS.</span>
          </h1>

          <p className="text-lg md:text-xl text-brand-black/80 max-w-xl mb-10 font-medium animate-fade-in" style={{ animationDelay: "0.2s" }}>
            Street-style flavors crafted with premium beef patties, crispy chicken, and our legendary signature sauces. Taste the difference.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 animate-fade-in" style={{ animationDelay: "0.4s" }}>
            <Link to="/menu">
              <Button className="bg-brand-black text-white font-bold text-lg px-10 py-6 rounded-full hover:bg-brand-black/90 hover:scale-105 transition-all duration-300 flex items-center gap-2 shadow-xl">
                Order Now
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/menu">
              <Button className="bg-white text-brand-black font-bold text-lg px-10 py-6 rounded-full hover:bg-white/90 hover:scale-105 transition-all duration-300 shadow-lg">
                View Menu
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-16 pt-8 border-t border-brand-black/20 animate-fade-in" style={{ animationDelay: "0.6s" }}>
            <div className="text-center">
              <p className="font-display text-3xl md:text-4xl text-brand-black">100%</p>
              <p className="text-sm text-brand-black/70 font-medium">Fresh Ingredients</p>
            </div>
            <div className="text-center">
              <p className="font-display text-3xl md:text-4xl text-white drop-shadow">30min</p>
              <p className="text-sm text-brand-black/70 font-medium">Fast Delivery</p>
            </div>
            <div className="text-center">
              <p className="font-display text-3xl md:text-4xl text-accent">5000+</p>
              <p className="text-sm text-brand-black/70 font-medium">Happy Customers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Order Button (Mobile) */}
      <Link to="/menu" className="floating-order-btn flex items-center gap-2">
        <Flame className="w-5 h-5" />
        Order Now
      </Link>
    </section>
  );
};

export default HeroSection;
