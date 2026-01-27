import Layout from "@/components/Layout";
import { Beef, ChefHat, Heart, Award } from "lucide-react";
import heroBurger from "@/assets/hero-burger.jpg";

const About = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="pt-24 pb-16 relative overflow-hidden bg-gradient-to-b from-primary via-primary to-secondary">
        <div className="absolute inset-0 opacity-20">
          <img src={heroBurger} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="container-custom section-padding pt-12 relative z-10">
          <h1 className="font-display text-5xl md:text-7xl text-brand-black text-center mb-4">
            OUR <span className="text-white drop-shadow-lg">STORY</span>
          </h1>
          <p className="text-brand-black/70 text-center max-w-2xl mx-auto text-lg font-medium">
            From a small street stall to your favorite burger joint
          </p>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20 bg-background">
        <div className="container-custom section-padding">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-display text-4xl text-foreground mb-6">
                THE <span className="text-primary">BURGER BOYS</span> JOURNEY
              </h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  It all started in Manchester in 2020. A passionate foodie with a dream set up a small stall,
                  grilling beef patties with a secret spice blend passed down through generations. The aroma
                  drew crowds, and word spread fast.
                </p>
                <p>
                  <span className="text-primary font-semibold">"Burger Boys"</span> became synonymous with the
                  juiciest burgers in town. What started as a late-night food cart became a movement.
                </p>
                <p>
                  Today, we serve thousands of customers who crave that authentic street-food taste, 
                  now with the quality and convenience of a proper restaurant. But we've never lost 
                  our roots — every burger still carries that original street-style soul.
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-3xl overflow-hidden shadow-xl">
                <img src={heroBurger} alt="Our Story" className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-primary text-brand-black p-6 rounded-2xl shadow-xl">
                <p className="font-display text-4xl">2020</p>
                <p className="text-sm font-medium">Est. in Manchester</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-muted">
        <div className="container-custom section-padding">
          <h2 className="font-display text-4xl text-foreground text-center mb-12">
            WHAT WE <span className="text-primary">STAND FOR</span>
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Beef,
                title: "Premium Meat",
                description: "100% fresh beef and chicken, never frozen. We source only the best cuts daily.",
              },
              {
                icon: ChefHat,
                title: "Crafted With Care",
                description: "Every burger is hand-crafted by our trained chefs who take pride in their work.",
              },
              {
                icon: Heart,
                title: "Made With Love",
                description: "We treat every customer like family. Your satisfaction is our happiness.",
              },
              {
                icon: Award,
                title: "Bold Flavors",
                description: "Our signature spices and sauces are what set us apart. Taste the Burger Boys difference.",
              },
            ].map((value, index) => (
              <div
                key={value.title}
                className="text-center p-8 bg-card rounded-2xl shadow-[var(--shadow-card)] animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary flex items-center justify-center">
                  <value.icon className="w-8 h-8 text-brand-black" />
                </div>
                <h3 className="font-display text-xl text-foreground mb-3">{value.title}</h3>
                <p className="text-muted-foreground text-sm">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Promise */}
      <section className="py-20 bg-brand-black">
        <div className="container-custom section-padding text-center">
          <h2 className="font-display text-4xl md:text-5xl text-white mb-6">
            OUR <span className="text-primary">PROMISE</span>
          </h2>
          <p className="text-white/70 max-w-3xl mx-auto text-lg leading-relaxed">
            Every bite you take at Burger Boys is a promise of quality, freshness, and bold flavor. 
            We're not just serving food — we're serving memories. From our kitchen to your table, 
            we guarantee satisfaction, or we make it right.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <div className="px-6 py-3 bg-primary rounded-full text-brand-black font-bold">
              Fresh Ingredients
            </div>
            <div className="px-6 py-3 bg-secondary rounded-full text-white font-bold">
              Fast Service
            </div>
            <div className="px-6 py-3 bg-accent rounded-full text-white font-bold">
              Bold Taste
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default About;
