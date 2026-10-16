import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  size?: "md" | "lg" | "xl";
}

const SIZES = { md: "max-w-md", lg: "max-w-2xl", xl: "max-w-4xl" };

const Modal = ({
  isOpen,
  onClose,
  children,
  title,
  size = "md",
}: ModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);
  // Parents usually pass an inline onClose; read it through a ref so the
  // listener isn't torn down and re-attached on every parent render.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    const previousOverflow = document.body.style.overflow;
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
      <div
        ref={modalRef}
        className={`w-full ${SIZES[size]} max-h-[92dvh] flex flex-col bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 transform transition-all animate-in fade-in zoom-in-95 duration-200`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between px-6 py-4 sm:p-6 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Close modal"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default Modal;
