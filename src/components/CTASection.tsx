import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Phone, MessageCircle } from "lucide-react";

const CTASection = () => {
  return (
    <section className="py-20 bg-gradient-to-r from-primary via-primary to-secondary relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />

      <div className="container-custom section-padding relative z-10">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="font-display text-4xl md:text-6xl text-brand-black mb-6">
            HUNGRY? ORDER NOW!
          </h2>
          <p className="text-brand-black/70 text-lg mb-10 font-medium">
            Get your favorite burgers, wraps, and rice bowls delivered hot to your doorstep. 
            Order via call or WhatsApp!
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="tel:+923001234567">
              <Button className="bg-brand-black text-white hover:bg-brand-black/90 text-lg px-8 py-6 rounded-full flex items-center gap-3 shadow-xl">
                <Phone className="w-5 h-5" />
                Call to Order
              </Button>
            </a>
            <a href="https://wa.me/923001234567" target="_blank" rel="noopener noreferrer">
              <Button className="bg-[#25D366] hover:bg-[#20BD5A] text-white text-lg px-8 py-6 rounded-full flex items-center gap-3 shadow-xl">
                <MessageCircle className="w-5 h-5" />
                WhatsApp Order
              </Button>
            </a>
          </div>

          <div className="mt-10">
            <Link to="/menu" className="text-brand-black/70 hover:text-brand-black underline underline-offset-4 transition-colors font-medium">
              Or browse our full menu →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
