import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { sportsData } from "../data/sports";
import aboutImg from "../assets/about.jpg";
import { eventService } from "../services/event.service";
import type { Event } from "../types";
import aboutImg2 from "../assets/about2.jpg";
import aboutImg3 from "../assets/about3.jpg";
import aboutImg4 from "../assets/about4.jpg";
import aboutImg5 from "../assets/about5.jpg";
import logoMain from "../assets/logo_main.png";

// ─── Shared primitives ────────────────────────────────────────────────────────

const SectionContainer = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.55, ease: "easeOut" }}
    viewport={{ once: true, margin: "-40px" }}
    className={`max-w-6xl mx-auto px-6 ${className}`}
  >
    {children}
  </motion.div>
);

const Label = ({ text }: { text: string }) => (
  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#DC1E26] mb-3">
    {text}
  </p>
);

// ─── 1. About Section ─────────────────────────────────────────────────────────

export function DetailsSection() {
  const { detailsSection, features, stats } = sportsData;
  return (
    <section
      id="about"
      className="text-white relative overflow-hidden"
      style={{ backgroundColor: "#171717" }}
    >
      <SectionContainer className="py-20 lg:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-stretch">
          {/* Left: text */}
          <div className="space-y-8">
            <div>
              <Label text="Who We Are" />
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight">
                About <span style={{ color: "#DC1E26" }}>SSRC Sports</span>
              </h2>
              <p className="mt-5 text-neutral-400 leading-relaxed text-base">
                {detailsSection.description}
              </p>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3">
              {stats.map((stat, i) => (
                <div key={i} className="px-4 py-2 text-center">
                  <div
                    className="text-3xl font-black"
                    style={{ color: "#DC1E26" }}
                  >
                    {stat.val}
                  </div>
                  <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-widest mt-1">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Feature tags */}
            <div className="flex flex-wrap gap-2">
              {features.map((feature, i) => (
                <span
                  key={i}
                  className="text-xs font-medium text-neutral-400 border border-neutral-700 rounded-full px-3 py-1"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>

          {/* Right: image — stretches to match left column height */}
          <div className="relative rounded-2xl overflow-hidden border border-neutral-800 min-h-[320px]">
            <img
              src={aboutImg}
              alt="SSRC Sports"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-5 left-5">
              <span className="text-xs font-bold uppercase tracking-widest text-white/60">
                Sunway College Kathmandu
              </span>
            </div>
          </div>
        </div>
      </SectionContainer>
    </section>
  );
}

// ─── 2. Marquee Banner ────────────────────────────────────────────────────────

const marqueeItems = [
  "Football",
  "Basketball",
  "Badminton",
  "Table Tennis",
  "Chess",
  "Futsal",
  "Pool",
  "Cricket",
  "Volleyball",
  "Athletics",
];

export function MarqueeBanner() {
  const doubled = [...marqueeItems, ...marqueeItems];
  return (
    <div
      className="overflow-hidden py-3 border-y border-[#b81820]"
      style={{ backgroundColor: "#DC1E26" }}
    >
      <motion.div
        className="flex gap-10 whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 22, ease: "linear", repeat: Infinity }}
      >
        {doubled.map((item, i) => (
          <span
            key={i}
            className="text-white/90 font-black text-xs uppercase tracking-[0.25em] flex items-center gap-10"
          >
            {item}
            <span className="text-white/30">◆</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}

// ─── 3. Sports Programs ───────────────────────────────────────────────────────

const programs = [
  {
    name: "Football",
    desc: "Inter-college leagues and structured training sessions.",
  },
  {
    name: "Basketball",
    desc: "Full-court matches and skills development drills.",
  },
  { name: "Badminton", desc: "Singles and doubles with regular court slots." },
  {
    name: "Table Tennis",
    desc: "Fast-paced tournaments across the academic year.",
  },
  { name: "Chess", desc: "Strategy, patience, and fierce competition." },
  {
    name: "Pool / Billiards",
    desc: "Precision-based events for the tactically minded.",
  },
];

export function SportsProgramsSection() {
  return (
    <section className="text-white" style={{ backgroundColor: "" }}>
      <SectionContainer className="py-20 lg:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          {/* Left: image stack */}
          <div className="relative hidden lg:block">
            <div className="aspect-3/4 rounded-2xl overflow-hidden border border-neutral-800">
              <img
                src={aboutImg2}
                alt="Sports at SSRC"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-linear-to-br from-[#DC1E26]/20 to-transparent" />
            </div>
            {/* floating badge */}
            <div className="absolute -bottom-4 -right-4 bg-neutral-900 border border-neutral-800 rounded-xl px-5 py-3">
              <p className="text-2xl font-black text-white">10+</p>
              <p className="text-xs text-neutral-500 uppercase tracking-widest">
                Sports
              </p>
            </div>
          </div>

          {/* Right: list */}
          <div>
            <Label text="Programs" />
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-10">
              Sports We <span style={{ color: "#DC1E26" }}>Offer</span>
            </h2>
            <div className="space-y-0 divide-y divide-neutral-800 border-t border-neutral-800">
              {programs.map((prog, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  viewport={{ once: true }}
                  className="flex items-center justify-between py-4 group"
                >
                  <div>
                    <p className="font-semibold text-white group-hover:text-[#DC1E26] transition-colors">
                      {prog.name}
                    </p>
                    <p className="text-sm text-neutral-500 mt-0.5">
                      {prog.desc}
                    </p>
                  </div>
                  <svg
                    className="w-4 h-4 text-neutral-700 group-hover:text-[#DC1E26] transition-colors shrink-0 ml-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </SectionContainer>
    </section>
  );
}

// ─── 4. How It Works ──────────────────────────────────────────────────────────

const steps = [
  {
    step: "01",
    title: "Apply for Membership",
    desc: "Submit the online form with your college ID. SC Members and General Members have separate tracks.",
  },
  {
    step: "02",
    title: "Get Approved",
    desc: "The executive team reviews your application. Login credentials are sent to you via email.",
  },
  {
    step: "03",
    title: "Join Events & Teams",
    desc: "Browse upcoming events, register your team, and track performance from the portal.",
  },
  {
    step: "04",
    title: "Compete & Excel",
    desc: "Take part in tournaments and represent SSRC on and off the field.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="text-white" style={{ backgroundColor: "#111111" }}>
      <SectionContainer className="py-20 lg:py-28">
        <div className="max-w-2xl mb-14">
          <Label text="Getting Started" />
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
            How It <span style={{ color: "#DC1E26" }}>Works</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              viewport={{ once: true }}
            >
              <p
                className="text-4xl font-black mb-4 leading-none"
                style={{ color: "#DC1E26" }}
              >
                {s.step}
              </p>
              <h3 className="font-bold text-white text-base mb-2">{s.title}</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">
                {s.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </SectionContainer>
    </section>
  );
}

// ─── 5. Mission Banner ────────────────────────────────────────────────────────

export function MissionBanner() {
  return (
    <section
      className="relative overflow-hidden"
      style={{ backgroundColor: "#DC1E26" }}
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <span className="text-[18vw] font-black text-black/10 leading-none tracking-tighter whitespace-nowrap">
          CHAMPIONS
        </span>
      </div>
      <SectionContainer className="py-20 lg:py-28 relative z-10 text-center">
        <motion.blockquote
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-2xl md:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight max-w-3xl mx-auto"
        >
          "The spirit of sport is the spirit of excellence — it pushes you
          beyond your limits and reveals who you truly are."
        </motion.blockquote>
        <p className="mt-8 text-white/50 text-xs font-semibold uppercase tracking-[0.25em]">
          — SSRC Sports Club
        </p>
      </SectionContainer>
    </section>
  );
}

// ─── 6. Events Teaser (fetched from API) ─────────────────────────────────────

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function EventsTeaserSection() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    eventService
      .getAll()
      .then((data) => setEvents(data.slice(0, 4)))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="text-white" style={{ backgroundColor: "#111111" }}>
      <SectionContainer className="py-20 lg:py-28">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-12">
          <div>
            <Label text="Events" />
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
              Upcoming <span style={{ color: "#DC1E26" }}>Competitions</span>
            </h2>
          </div>
          <Link
            to="/events"
            className="text-sm font-semibold text-neutral-400 hover:text-white transition-colors flex items-center gap-1.5 shrink-0"
          >
            View all
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-20 rounded-xl bg-neutral-800/50 animate-pulse"
              />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="border border-neutral-800 rounded-xl px-6 py-12 text-center">
            <p className="text-neutral-500 text-sm">
              No upcoming events right now. Check back soon.
            </p>
          </div>
        ) : (
          <div className="space-y-0 divide-y divide-neutral-800 border-t border-b border-neutral-800">
            {events.map((ev, i) => (
              <motion.div
                key={ev._id}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: i * 0.07 }}
                viewport={{ once: true }}
                className="flex flex-col sm:flex-row sm:items-center gap-3 py-5 group"
              >
                {/* Date block */}
                <div className="shrink-0 w-14 text-center hidden sm:block">
                  <p
                    className="text-xl font-black leading-none"
                    style={{ color: "#DC1E26" }}
                  >
                    {new Date(ev.date).getDate()}
                  </p>
                  <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">
                    {new Date(ev.date).toLocaleString("en-US", {
                      month: "short",
                    })}
                  </p>
                </div>

                <div className="w-px h-8 bg-neutral-800 hidden sm:block" />

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white group-hover:text-[#DC1E26] transition-colors truncate">
                    {ev.title}
                  </p>
                  <p className="text-xs text-neutral-600 mt-0.5 sm:hidden">
                    {formatDate(ev.date)}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs text-neutral-600 shrink-0">
                  <span className="flex items-center gap-1">
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    {ev.location}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Image strip at bottom */}
        <div className="mt-12 grid grid-cols-3 gap-3">
          {[aboutImg3, aboutImg4, aboutImg5].map((i) => (
            <div
              key={i}
              className="aspect-video rounded-xl overflow-hidden border border-neutral-800"
            >
              <img
                src={i}
                alt=""
                className="w-full h-full object-cover opacity-60 hover:opacity-90 transition-opacity duration-500"
                style={{ objectPosition: `center` }}
              />
            </div>
          ))}
        </div>
      </SectionContainer>
    </section>
  );
}

// ─── 7. Esports Community ─────────────────────────────────────────────────────

const DiscordIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.042.033.052a19.9 19.9 0 0 0 5.993 3.03.077.077 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

export function EsportsCommunitySection() {
  return (
    <section
      className="text-white relative overflow-hidden"
      style={{ backgroundColor: "#111111" }}
    >
      {/* Background glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ backgroundColor: "#DC1E26" }}
      />

      <SectionContainer className="py-20 lg:py-28 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left */}
          <div>
            <div
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] mb-3"
              style={{ color: "#DC1E26" }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#DC1E26]" />
              Esports
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-5">
              SSRC <span style={{ color: "#DC1E26" }}>Esports</span> Community
            </h2>
            <p className="text-neutral-400 leading-relaxed text-base mb-6">
              Beyond the physical courts, SSRC has a thriving esports community
              for students passionate about competitive gaming. Whether you're
              into MOBAs, FPS, or strategy games — find your crew, join scrims,
              and compete in college-level esports events.
            </p>
            <ul className="space-y-3 text-sm text-neutral-500 mb-10">
              {[
                "Organised tournaments across popular titles",
                "Regular practice sessions and scrimmages",
                "A welcoming community for all skill levels",
                "Announcements and updates via Discord",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className="mt-1 w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: "#DC1E26" }}
                  />
                  {item}
                </li>
              ))}
            </ul>

            <a
              href="https://discord.gg/FRV9aXuWuT"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-6 py-3 rounded-full font-bold text-white text-sm transition-all hover:opacity-90 active:scale-95"
              style={{ backgroundColor: "#DC1E26" }}
            >
              <DiscordIcon />
              Join our Discord
            </a>
          </div>

          {/* Right: Discord-themed card */}
          <div className="relative">
            <div
              className="rounded-2xl border p-6 space-y-4"
              style={{ backgroundColor: "#1e1f22", borderColor: "#2b2d31" }}
            >
              {/* Fake Discord server header */}
              <div
                className="flex items-center gap-3 pb-4 border-b"
                style={{ borderColor: "#2b2d31" }}
              >
                <img
                  src={logoMain}
                  alt="SSRC Logo"
                  className="w-8 h-8 object-contain"
                />
                <div>
                  <p className="font-bold text-white text-sm">
                    SSRC Esports Hub
                  </p>
                  <p className="text-xs text-neutral-500">
                    Official Discord Server
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs text-neutral-500">Online</span>
                </div>
              </div>

              {/* Fake channels */}
              {[
                "# announcements",
                "# general",
                "# match-results",
                "# esports-lfg",
                "🎮 gaming-lounge",
              ].map((ch, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-default ${i === 3 ? "text-white" : "text-neutral-500"}`}
                  style={i === 3 ? { backgroundColor: "#35363b" } : {}}
                >
                  {ch}
                </div>
              ))}

              <a
                href="https://discord.gg/FRV9aXuWuT"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center py-2.5 rounded-lg text-sm font-bold text-white transition-all hover:opacity-90"
                style={{ backgroundColor: "#DC1E26" }}
              >
                Join Server
              </a>
            </div>

            {/* Floating member count badge */}
          </div>
        </div>
      </SectionContainer>
    </section>
  );
}

// ─── 8. Join / CTA ────────────────────────────────────────────────────────────

export function JoinSection() {
  const { joinSection } = sportsData;
  return (
    <section
      id="contact"
      className="text-white relative overflow-hidden"
      style={{ backgroundColor: "#171717" }}
    >
      {/* background image with heavy overlay */}
      <div className="absolute inset-0">
        <img
          src={aboutImg}
          alt=""
          className="w-full h-full object-cover opacity-10"
        />
        <div className="absolute inset-0 bg-linear-to-b from-[#171717] via-[#171717]/80 to-[#171717]" />
      </div>

      <SectionContainer className="py-20 lg:py-28 relative z-10">
        <div className="max-w-xl mx-auto text-center">
          <Label text="Join Us" />
          <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-4">
            Ready to <span style={{ color: "#DC1E26" }}>Play?</span>
          </h2>
          <p className="text-neutral-400 text-base mb-10">
            Open to all Sunway College Kathmandu students. Apply for membership
            and get access to events, teams, and announcements.
          </p>

          {/* Perks */}
          <ul className="text-sm text-neutral-400 space-y-3 mb-10 text-left max-w-sm mx-auto">
            {joinSection.perks.map((perk, i) => (
              <li key={i} className="flex items-center gap-3">
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "#DC1E26" }}
                >
                  <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M10 3L4.5 8.5L2 6"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                {perk}
              </li>
            ))}
          </ul>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/login">
              <button
                className="px-8 py-3 rounded-full font-bold text-white text-sm transition-all hover:opacity-90 active:scale-95"
                style={{ backgroundColor: "#DC1E26" }}
              >
                Login to Portal
              </button>
            </Link>
            <a href={`${window.location.origin}/form/student-registration`}>
              <button className="px-8 py-3 rounded-full font-bold text-white text-sm border border-neutral-700 hover:border-neutral-500 transition-all active:scale-95">
                Apply for Membership
              </button>
            </a>
          </div>

          <p className="mt-6 text-xs text-neutral-600">
            {joinSection.guarantee}
          </p>
        </div>
      </SectionContainer>
    </section>
  );
}
