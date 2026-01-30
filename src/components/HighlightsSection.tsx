import { Beef, Flame, Truck, Award } from "lucide-react";

const highlights = [
  {
    icon: Beef,
    title: "Premium Meat",
    description: "100% fresh beef and chicken, never frozen, sourced daily from trusted suppliers",
  },
  {
    icon: Flame,
    title: "Bold Flavors",
    description: "Our signature spices and sauces crafted to deliver that authentic street-food punch",
  },
  {
    icon: Truck,
    title: "Fast Delivery",
    description: "Hot and fresh at your doorstep within 30-45 minutes or your next order is on us",
  },
  {
    icon: Award,
    title: "Quality First",
    description: "Hygienically prepared in our spotless kitchen with the highest standards",
  },
];

const HighlightsSection = () => {
  return (
    <section className="py-20 bg-brand-black">
      <div className="container-custom section-padding">
        <div className="text-center mb-12">
          <h2 className="font-display text-4xl md:text-5xl text-white mb-4">
            WHY <span className="text-primary">BURGER BOYS</span>?
          </h2>
          <p className="text-white/60 max-w-2xl mx-auto">
            We don't just make food. We craft experiences that keep you coming back.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {highlights.map((item, index) => (
            <div
              key={item.title}
              className="text-center p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-primary/10 transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary flex items-center justify-center">
                <item.icon className="w-8 h-8 text-brand-black" />
              </div>
              <h3 className="font-display text-xl text-white mb-3">{item.title}</h3>
              <p className="text-white/60 text-sm">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HighlightsSection;
