import Navbar from "../components/Navbar";
import ScrollEngine from "../components/ScrollEngine";
import {
  DetailsSection,
  MarqueeBanner,
  SportsProgramsSection,
  HowItWorksSection,
  MissionBanner,
  EventsTeaserSection,
  EsportsCommunitySection,
  JoinSection,
} from "../components/InfoSections";
import Footer from "../components/Footer";

export default function LandingPage() {
  return (
    <div className="bg-[#171717] text-white selection:bg-red-600 selection:text-white min-h-screen">
      <Navbar />

      <main>
        {/* Scrollytelling Hero */}
        <ScrollEngine />

        {/* Animated sport names marquee */}
        <MarqueeBanner />

        {/* About / Stats */}
        <DetailsSection />
        <SportsProgramsSection />
        <MissionBanner />
        <EsportsCommunitySection />

        <HowItWorksSection />

        {/* Sports programs grid */}

        {/* Red quote banner */}

        {/* How It Works steps */}

        {/* Upcoming Events teaser */}
        <EventsTeaserSection />

        {/* Esports community + Discord */}

        {/* Join / CTA */}
        <JoinSection />
      </main>

      <Footer />
    </div>
  );
}
