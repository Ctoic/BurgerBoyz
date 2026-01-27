import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import beefBurger from "@/assets/beef-burger.jpg";
import chickenBurger from "@/assets/chicken-burger.jpg";
import chickenWrap from "@/assets/chicken-wrap.jpg";
import chickenRice from "@/assets/chicken-rice.jpg";

const categories = [
  {
    name: "Beef Burgers",
    description: "Juicy, flame-grilled 100% beef patties with premium toppings",
    image: beefBurger,
    itemCount: 8,
  },
  {
    name: "Chicken Burgers",
    description: "Crispy, golden-fried chicken with our signature sauce",
    image: chickenBurger,
    itemCount: 6,
  },
  {
    name: "Wraps",
    description: "Fresh tortillas loaded with grilled chicken & veggies",
    image: chickenWrap,
    itemCount: 5,
  },
  {
    name: "Chicken Rice",
    description: "Flavorful rice bowls with tender chicken & special gravy",
    image: chickenRice,
    itemCount: 4,
  },
];

const CategorySection = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container-custom section-padding">
        <div className="text-center mb-12">
          <h2 className="font-display text-4xl md:text-5xl text-foreground mb-4">
            EXPLORE OUR <span className="text-primary">MENU</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            From sizzling beef burgers to crispy chicken delights, find your perfect bite
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((category, index) => (
            <Link
              key={category.name}
              to="/menu"
              className="group relative h-80 rounded-2xl overflow-hidden animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Background Image */}
              <img
                src={category.image}
                alt={category.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-brand-black/40 to-transparent" />
              
              {/* Content */}
              <div className="absolute inset-0 p-6 flex flex-col justify-end">
                <span className="text-primary text-sm font-bold mb-2">
                  {category.itemCount} Items
                </span>
                <h3 className="font-display text-2xl text-white mb-2">
                  {category.name.toUpperCase()}
                </h3>
                <p className="text-white/80 text-sm mb-4 line-clamp-2">
                  {category.description}
                </p>
                <div className="flex items-center gap-2 text-primary font-semibold group-hover:gap-4 transition-all">
                  <span>View Menu</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategorySection;
