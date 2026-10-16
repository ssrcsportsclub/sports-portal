import { useEffect, useRef, useState } from "react";
import { useScroll, useTransform, motion } from "framer-motion";
import TextOverlays from "./TextOverlays";

// Dynamically import all images from the football assets folder
const images = import.meta.glob<string>("/src/assets/football/*.jpg", {
  eager: true,
  query: "?url",
  import: "default",
});

// Convert the object to a sorted array of URLs
const allFrameUrls = Object.keys(images)
  .sort((a, b) => {
    const getNum = (str: string) =>
      parseInt(str.match(/frame-(\d+)/)?.[1] || "0");
    return getNum(a) - getNum(b);
  })
  .map((key) => images[key]);

/** Phones and data-saver connections get every other frame (half the bytes). */
const prefersLightAssets = () => {
  const connection = (
    navigator as Navigator & { connection?: { saveData?: boolean } }
  ).connection;
  return !!connection?.saveData || window.innerWidth < 768;
};

/**
 * Coarse-to-fine load order (frame 0, then every 16th, 8th, 4th…) so the
 * whole scroll range is scrubbable early and sharpens as frames arrive.
 */
const loadOrder = (count: number) => {
  const order: number[] = [];
  const seen = new Set<number>();
  for (let stride = 16; stride >= 1; stride /= 2) {
    for (let i = 0; i < count; i += stride) {
      if (!seen.has(i)) {
        seen.add(i);
        order.push(i);
      }
    }
  }
  return order;
};

const MAX_PARALLEL_LOADS = 6;

export default function ScrollEngine() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [firstFrameReady, setFirstFrameReady] = useState(false);
  const [frameUrls] = useState(() =>
    prefersLightAssets()
      ? allFrameUrls.filter((_, i) => i % 2 === 0)
      : allFrameUrls,
  );

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Map scroll progress (0 to 1) to frame index
  const frameIndex = useTransform(
    scrollYProgress,
    [0, 1],
    [0, Math.max(0, frameUrls.length - 1)],
  );
  const hintOpacity = useTransform(scrollYProgress, [0, 0.1], [1, 0]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    if (frameUrls.length === 0) {
      console.error("No images found in src/assets/football");
      return;
    }

    const frames: (HTMLImageElement | null)[] = frameUrls.map(() => null);
    const pending = new Set<HTMLImageElement>();
    let currentFrame = 0;
    let rafId = 0;
    let cancelled = false;

    /** Closest loaded frame to `index`, preferring earlier frames. */
    const nearestLoaded = (index: number) => {
      for (let d = 0; d < frames.length; d++) {
        if (frames[index - d]) return frames[index - d];
        if (frames[index + d]) return frames[index + d];
      }
      return null;
    };

    const draw = () => {
      rafId = 0;
      const img = nearestLoaded(
        Math.min(Math.round(currentFrame), frames.length - 1),
      );
      if (!img) return;

      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);

      // "cover" logic - fill the entire canvas
      const scale = Math.max(width / img.width, height / img.height);
      const x = width / 2 - (img.width / 2) * scale;
      const y = height / 2 - (img.height / 2) * scale;
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    };

    const requestDraw = () => {
      if (!rafId) rafId = requestAnimationFrame(draw);
    };

    const updateSize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
      requestDraw();
    };

    // Bounded-concurrency progressive loader.
    const queue = loadOrder(frameUrls.length);
    const loadNext = () => {
      if (cancelled) return;
      const index = queue.shift();
      if (index === undefined) return;
      const img = new Image();
      img.decoding = "async";
      pending.add(img);
      img.onload = () => {
        pending.delete(img);
        frames[index] = img;
        if (index === 0) setFirstFrameReady(true);
        requestDraw();
        loadNext();
      };
      img.onerror = () => {
        pending.delete(img);
        console.error("Failed to load image:", frameUrls[index]);
        loadNext();
      };
      img.src = frameUrls[index];
    };
    for (let i = 0; i < MAX_PARALLEL_LOADS; i++) loadNext();

    window.addEventListener("resize", updateSize);
    updateSize();

    const unsubscribe = frameIndex.on("change", (latest) => {
      currentFrame = latest;
      requestDraw();
    });

    return () => {
      cancelled = true;
      // Abort in-flight downloads when leaving the page.
      pending.forEach((img) => {
        img.onload = img.onerror = null;
        img.src = "";
      });
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", updateSize);
      unsubscribe();
    };
  }, [frameUrls, frameIndex]);

  return (
    <div
      ref={containerRef}
      className="h-[500vh] relative"
      style={{ backgroundColor: "#171717" }}
    >
      {/* Sticky container for the canvas */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center">
        <canvas ref={canvasRef} className="w-full h-full object-cover" />

        {/* Overlays synced with the same scroll progress */}
        <TextOverlays scrollYProgress={scrollYProgress} />

        {!firstFrameReady && (
          <div className="absolute inset-0 flex items-center justify-center text-white z-50 bg-black">
            <div className="flex flex-col items-center gap-4">
              <div
                className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: "#DC1E26" }}
              ></div>
              <div className="animate-pulse text-lg font-mono text-white">
                LOADING ASSETS...
              </div>
            </div>
          </div>
        )}

        {/* Hint to scroll */}
        <motion.div
          style={{ opacity: hintOpacity }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/50 text-sm animate-bounce"
        >
          SCROLL TO EXPLORE
        </motion.div>
      </div>
    </div>
  );
}
