import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Ahmed Khan",
    rating: 5,
    text: "Best beef burger in Manchester! The patty is so juicy and the sauce is absolutely incredible. My go-to place now!",
    avatar: "AK",
  },
  {
    name: "Sara Malik",
    rating: 5,
    text: "Finally, a place that understands flavor! Their chicken wraps are packed with taste. Fast delivery too!",
    avatar: "SM",
  },
  {
    name: "Bilal Ahmed",
    rating: 5,
    text: "The chicken rice bowl is a game changer. Perfect portion, amazing gravy. Will order again for sure!",
    avatar: "BA",
  },
];

const TestimonialsSection = () => {
  return (
    <section className="py-20 bg-muted">
      <div className="container-custom section-padding">
        <div className="text-center mb-12">
          <h2 className="font-display text-4xl md:text-5xl text-foreground mb-4">
            WHAT <span className="text-primary">FOODIES</span> SAY
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Don't just take our word for it. Here's what our customers are saying.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.name}
              className="bg-card p-8 rounded-3xl shadow-[var(--shadow-card)] border-2 border-transparent hover:border-primary transition-colors animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-accent text-accent" />
                ))}
              </div>
              <p className="text-foreground mb-6 leading-relaxed">"{testimonial.text}"</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-brand-black font-bold">
                  {testimonial.avatar}
                </div>
                <span className="font-semibold text-foreground">{testimonial.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
