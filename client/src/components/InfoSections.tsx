import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { sportsData } from "../data/sports";
import { ArrowRight, Check, Trophy, Users, Medal } from "lucide-react"; // Assuming lucide-react is available or use SVGs

// Shadcn-like Card Component
const Card = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`rounded-xl border border-neutral-800 bg-neutral-900/50 text-neutral-50 shadow-sm p-6 ${className}`}
  >
    {children}
  </div>
);

const SectionContainer = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, ease: "easeOut" }}
    viewport={{ once: true, margin: "-50px" }}
    className={`max-w-7xl mx-auto px-6 py-24 ${className}`}
  >
    {children}
  </motion.div>
);

export function DetailsSection() {
  const { detailsSection, features, stats } = sportsData;
  return (
    <section
      id="about"
      className="text-white min-h-screen flex items-center relative overflow-hidden"
      style={{ backgroundColor: "#171717" }}
    >
      <SectionContainer className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
        <div className="space-y-8">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
              About <span style={{ color: "#DC1E26" }}>SSRC Sports</span>
            </h2>
            <p className="text-lg text-neutral-400 leading-relaxed">
              {detailsSection.description}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {stats.map((stat, i) => (
              <Card
                key={i}
                className="flex flex-col items-center justify-center text-center hover:border-[#DC1E26]/50 transition-colors cursor-default"
              >
                <div
                  className="text-3xl font-bold mb-1"
                  style={{ color: "#DC1E26" }}
                >
                  {stat.val}
                </div>
                <div className="text-xs font-medium text-neutral-500 uppercase tracking-widest">
                  {stat.label}
                </div>
              </Card>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {features.map((feature, i) => (
              <div
                key={i}
                className="inline-flex items-center rounded-full border border-neutral-800 px-3 py-1 text-sm font-medium text-neutral-300 transition-colors hover:border-[#DC1E26]/50 hover:text-white"
              >
                {feature}
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <Card className="aspect-square flex items-center justify-center p-0 overflow-hidden group bg-neutral-900 border-neutral-800">
            {/* Abstract Visual - keeping it clean */}
            <div className="w-full h-full relative flex items-center justify-center bg-neutral-950">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-800/20 via-neutral-950 to-neutral-950" />
              <span className="text-9xl opacity-10 group-hover:opacity-20 transition-opacity duration-500 grayscale text-white z-10">
                ⚽
              </span>
            </div>
          </Card>
        </div>
      </SectionContainer>
    </section>
  );
}

export function JoinSection() {
  const { joinSection } = sportsData;
  return (
    <section
      id="contact"
      className="text-white py-32 relative"
      style={{ backgroundColor: "#171717" }}
    >
      <SectionContainer className="relative z-10 max-w-4xl mx-auto">
        <div className="text-center mb-12 space-y-4">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight">
            Ready to <span style={{ color: "#DC1E26" }}>Play?</span>
          </h2>
          <p className="text-xl text-neutral-400">
            Join the ranks of the elite. Start your journey today.
          </p>
        </div>

        <Card className="max-w-2xl mx-auto bg-neutral-900 border-neutral-800 p-8 md:p-12">
          <div className="flex flex-col items-center justify-center mb-8 space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold text-white tracking-tighter">
                {joinSection.price}
              </span>
              <span className="text-sm font-medium text-neutral-500">
                {joinSection.unit}
              </span>
            </div>
            <div
              className="inline-flex items-center rounded-full border border-[#DC1E26]/20 bg-[#DC1E26]/10 px-3 py-1 text-xs font-medium"
              style={{ color: "#DC1E26" }}
            >
              Student Exclusive
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 mb-10 max-w-md mx-auto">
            {joinSection.perks.map((perk, i) => (
              <div
                key={i}
                className="flex items-center gap-3 text-sm text-neutral-300"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#DC1E26]/10 text-[#DC1E26]">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M10 3L4.5 8.5L2 6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                {perk}
              </div>
            ))}
          </div>

          <Link to="/login" className="block">
            <button
              className="w-full text-white font-medium text-lg py-3 rounded-md shadow-sm transition-all hover:bg-red-700 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
              style={{
                backgroundColor: "#DC1E26",
              }}
            >
              Login
            </button>
          </Link>
          <p className="mt-6 text-xs text-center text-neutral-500">
            {joinSection.guarantee}
          </p>
        </Card>
      </SectionContainer>
    </section>
  );
}
