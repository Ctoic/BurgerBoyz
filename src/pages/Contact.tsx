import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Phone, Mail, Clock, MessageCircle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const Contact = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Message Sent!",
      description: "We'll get back to you soon. Thank you for reaching out!",
    });
    setFormData({ name: "", email: "", phone: "", message: "" });
  };

  return (
    <Layout>
      {/* Hero */}
      <section className="pt-24 pb-12 bg-gradient-to-b from-primary via-primary to-secondary">
        <div className="container-custom section-padding pt-12">
          <h1 className="font-display text-5xl md:text-6xl text-brand-black text-center mb-4">
            GET IN <span className="text-white drop-shadow-lg">TOUCH</span>
          </h1>
          <p className="text-brand-black/70 text-center max-w-2xl mx-auto font-medium">
            Got questions? Feedback? Or just want to say hi? We'd love to hear from you!
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 bg-background">
        <div className="container-custom section-padding">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Info */}
            <div>
              <h2 className="font-display text-3xl text-foreground mb-8">
                VISIT US OR REACH OUT
              </h2>

              <div className="space-y-6 mb-10">
                <div className="flex items-start gap-4 p-6 bg-card rounded-2xl shadow-[var(--shadow-card)] border-2 border-transparent hover:border-primary transition-colors">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-brand-black" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Our Location</h3>
                    <p className="text-muted-foreground">Manchester, UK</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-6 bg-card rounded-2xl shadow-[var(--shadow-card)] border-2 border-transparent hover:border-primary transition-colors">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-brand-black" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Phone</h3>
                    <a href="tel:+923001234567" className="text-muted-foreground hover:text-primary transition-colors">
                      0300-1234567
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-6 bg-card rounded-2xl shadow-[var(--shadow-card)] border-2 border-transparent hover:border-primary transition-colors">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-brand-black" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Email</h3>
                    <a href="mailto:hello@dewaasuwale.com" className="text-muted-foreground hover:text-primary transition-colors">
                      hello@dewaasuwale.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-6 bg-card rounded-2xl shadow-[var(--shadow-card)] border-2 border-transparent hover:border-primary transition-colors">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-brand-black" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Hours</h3>
                    <p className="text-muted-foreground">Mon - Thu: 11 AM - 11 PM</p>
                    <p className="text-muted-foreground">Fri - Sun: 11 AM - 12 AM</p>
                  </div>
                </div>
              </div>

              {/* WhatsApp CTA */}
              <a
                href="https://wa.me/923001234567"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-6 bg-[#25D366] text-primary-foreground rounded-2xl hover:bg-[#20BD5A] transition-colors"
              >
                <MessageCircle className="w-8 h-8" />
                <div>
                  <p className="font-semibold">Order via WhatsApp</p>
                  <p className="text-sm opacity-80">Quick responses guaranteed!</p>
                </div>
              </a>
            </div>

            {/* Contact Form */}
            <div>
              <h2 className="font-display text-3xl text-foreground mb-8">
                SEND A MESSAGE
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                    Your Name
                  </label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter your name"
                    required
                    className="h-12"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                    Email Address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter your email"
                    required
                    className="h-12"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-2">
                    Phone Number
                  </label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Enter your phone number"
                    className="h-12"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
                    Message
                  </label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Write your message here..."
                    required
                    rows={5}
                  />
                </div>

                <Button type="submit" className="btn-order w-full text-lg py-6">
                  Send Message
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Map */}
      <section className="h-96 bg-muted">
        <iframe
          src="https://www.google.com/maps?q=Manchester%2C%20UK&output=embed"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Burger Boys Location"
        />
      </section>
    </Layout>
  );
};

export default Contact;
