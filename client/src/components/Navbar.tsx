import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import logo from "../assets/logo_main.png";

export default function Navbar() {
  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between px-6 py-3 backdrop-blur-md border border-neutral-800 rounded-2xl shadow-lg w-[95%] md:w-[70%]"
      style={{ backgroundColor: "rgba(23, 23, 23, 0.85)" }}
    >
      <div className="flex items-center gap-3">
        {/* SSRC Logo */}
        <img src={logo} alt="SSRC Logo" className="h-10 w-auto" />
        <span className="text-2xl font-bold tracking-tighter text-white">
          SSRC Sports
        </span>
      </div>

      <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
        <Link to="/events" className="hover:text-white transition-colors">
          Events
        </Link>
        <a href="#about" className="hover:text-white transition-colors">
          About
        </a>
        <a href="#contact" className="hover:text-white transition-colors">
          Contact
        </a>
      </div>

      <Link to="/login">
        <button
          className="text-white px-6 py-2 rounded-full font-semibold transition-all hover:scale-105 flex items-center gap-2"
          style={{
            backgroundColor: "#DC1E26",
            boxShadow: "0 0 20px rgba(220,30,38,0.5)",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Login
        </button>
      </Link>
    </motion.nav>
  );
}
