import Layout from "@/components/Layout";
import HeroSection from "@/components/HeroSection";
import CategorySection from "@/components/CategorySection";
import HighlightsSection from "@/components/HighlightsSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import CTASection from "@/components/CTASection";

const Index = () => {
  return (
    <Layout>
      <HeroSection />
      <CategorySection />
      <HighlightsSection />
      <TestimonialsSection />
      <CTASection />
    </Layout>
  );
};

export default Index;
