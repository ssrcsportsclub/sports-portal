import { useEffect, useRef, useState } from "react";
import { useScroll, useTransform, motion } from "framer-motion";
import TextOverlays from "./TextOverlays";

// Dynamically import all images from the football assets folder
const images = import.meta.glob("/src/assets/football/*.jpg", {
  eager: true,
  as: "url",
});

// Convert the object to a sorted array of URLs
const frameUrls = Object.keys(images)
  .sort((a, b) => {
    const getNum = (str: string) =>
      parseInt(str.match(/frame-(\d+)/)?.[1] || "0");
    return getNum(a) - getNum(b);
  })
  .map((key) => images[key]);

export default function ScrollEngine() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [imgObjects, setImgObjects] = useState<HTMLImageElement[]>([]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Map scroll progress (0 to 1) to frame index
  const totalFrames = frameUrls.length;
  const frameIndex = useTransform(
    scrollYProgress,
    [0, 1],
    [0, totalFrames - 1],
  );

  // Preload images
  useEffect(() => {
    if (frameUrls.length === 0) {
      console.error("No images found in src/assets/football");
      return;
    }

    let loadedCount = 0;
    const imgs: HTMLImageElement[] = [];

    frameUrls.forEach((url) => {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        loadedCount++;
        if (loadedCount === totalFrames) {
          setImagesLoaded(true);
        }
      };
      img.onerror = () => {
        console.error("Failed to load image:", url);
        loadedCount++;
        if (loadedCount === totalFrames) setImagesLoaded(true);
      };
      imgs.push(img);
    });
    setImgObjects(imgs);
  }, []);

  // Update canvas on scroll
  useEffect(() => {
    if (!imagesLoaded || !canvasRef.current || imgObjects.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let currentFrame = 0;

    const renderFrame = (index: number) => {
      const imgIndex = Math.min(Math.floor(index), imgObjects.length - 1);
      const img = imgObjects[imgIndex];
      if (!img) return;

      const canvasWidth = canvas.width / (window.devicePixelRatio || 1);
      const canvasHeight = canvas.height / (window.devicePixelRatio || 1);

      // Fill with black background first
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // "cover" logic - fill the entire canvas
      const scale = Math.max(
        canvasWidth / img.width,
        canvasHeight / img.height,
      );
      const x = canvasWidth / 2 - (img.width / 2) * scale;
      const y = canvasHeight / 2 - (img.height / 2) * scale;

      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    };

    const updateSize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
      renderFrame(currentFrame);
    };

    window.addEventListener("resize", updateSize);
    updateSize();

    const unsubscribe = frameIndex.on("change", (latest) => {
      currentFrame = latest;
      requestAnimationFrame(() => renderFrame(latest));
    });

    return () => {
      window.removeEventListener("resize", updateSize);
      unsubscribe();
    };
  }, [imagesLoaded, imgObjects, frameIndex]);

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

        {!imagesLoaded && (
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
          style={{ opacity: useTransform(scrollYProgress, [0, 0.1], [1, 0]) }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/50 text-sm animate-bounce"
        >
          SCROLL TO EXPLORE
        </motion.div>
      </div>
    </div>
  );
}
