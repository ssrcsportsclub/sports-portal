import Navbar from "../components/Navbar";
import ScrollEngine from "../components/ScrollEngine";
import { DetailsSection, JoinSection } from "../components/InfoSections";
import Footer from "../components/Footer";

export default function LandingPage() {
  return (
    <div className="bg-[#171717] text-white selection:bg-orange-500 selection:text-white min-h-screen">
      <Navbar />

      <main>
        {/* Scrollytelling Hero */}
        <ScrollEngine />

        {/* Info & Details */}
        <DetailsSection />

        {/* Call to Action */}
        <JoinSection />
      </main>

      <Footer />
    </div>
  );
}
