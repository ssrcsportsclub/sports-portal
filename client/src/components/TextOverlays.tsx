import { MotionValue, useTransform, motion } from "framer-motion";
import { sportsData, type SportsSection } from "../data/sports";

interface OverlaySectionProps {
  section: SportsSection;
  progress: MotionValue<number>;
  range: [number, number];
  position: "center" | "left" | "right";
  highlightWord?: string;
}

// Helper to highlight specific words
const renderTitle = (title: string, highlight?: string) => {
  if (!highlight) return title;
  const parts = title.split(new RegExp(`(${highlight})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === highlight.toLowerCase() ? (
      <span key={i} style={{ color: "#DC1E26" }}>
        {part}
      </span>
    ) : (
      part
    ),
  );
};

const OverlaySection = ({
  section,
  progress,
  range,
  position,
  highlightWord,
}: OverlaySectionProps) => {
  const [start, end] = range;
  const fadeDuration = 0.05;

  const opacity = useTransform(
    progress,
    [start, start + fadeDuration, end - fadeDuration, end],
    [0, 1, 1, 0],
  );

  const y = useTransform(progress, [start, end], [50, -50]);

  // Determine alignment classes based on position
  const alignmentClasses = {
    center: "items-center justify-center text-center",
    left: "items-start justify-center text-left",
    right: "items-end justify-center text-right",
  };

  return (
    <motion.div
      style={{ opacity, y }}
      className={`absolute top-0 left-1/2 -translate-x-1/2 w-[95%] md:w-[70%] h-full flex flex-col ${alignmentClasses[position]} pointer-events-none`}
    >
      <h2 className="text-5xl w-[50%] md:text-7xl font-black text-white mb-6 drop-shadow-2xl max-w-[20ch] leading-[0.9] tracking-tighter">
        {renderTitle(section.title, highlightWord)}
      </h2>
      <p className="text-lg md:text-2xl text-white/90 max-w-xl font-light">
        {section.subtitle}
      </p>
    </motion.div>
  );
};

export default function TextOverlays({
  scrollYProgress,
}: {
  scrollYProgress: MotionValue<number>;
}) {
  return (
    <div className="absolute inset-0 z-10">
      {/* Section 1: Center */}
      <OverlaySection
        section={sportsData.section1}
        progress={scrollYProgress}
        range={[0.0, 0.2]}
        position="center"
        highlightWord="Sports"
      />

      {/* Section 2: Left */}
      <OverlaySection
        section={sportsData.section2}
        progress={scrollYProgress}
        range={[0.25, 0.45]}
        position="left"
        highlightWord="Power"
      />

      {/* Section 3: Right */}
      <OverlaySection
        section={sportsData.section3}
        progress={scrollYProgress}
        range={[0.5, 0.7]}
        position="right"
        highlightWord="Best"
      />

      {/* Section 4: Left */}
      <OverlaySection
        section={sportsData.section4}
        progress={scrollYProgress}
        range={[0.75, 0.95]}
        position="left"
        highlightWord="Legacy"
      />
    </div>
  );
}
