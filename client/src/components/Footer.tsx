import { sportsData } from "../data/sports";
import logo from "../assets/logo_main.png";

export default function Footer() {
  return (
    <footer
      className="text-white py-12 px-6 border-t border-white/10"
      style={{ backgroundColor: "#171717" }}
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="col-span-1 md:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <img src={logo} alt="SSRC Logo" className="h-8 w-auto" />
            <h3 className="text-xl font-bold bg-clip-text text-transparent bg-linear-to-r from-red-600 to-white">
              SSRC Sports
            </h3>
          </div>
          <p className="text-gray-400 text-sm">{sportsData.description}</p>
        </div>

        <div>
          <h4 className="font-bold mb-4" style={{ color: "#DC1E26" }}>
            Programs
          </h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li>
              <a href="#" className="hover:text-white transition-colors">
                Football
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white transition-colors">
                Basketball
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white transition-colors">
                Badminton
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold mb-4" style={{ color: "#DC1E26" }}>
            Club
          </h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li>
              <a href="#about" className="hover:text-white transition-colors">
                About Us
              </a>
            </li>
            <li>
              <a href="/events" className="hover:text-white transition-colors">
                Events
              </a>
            </li>
            <li>
              <a href="#contact" className="hover:text-white transition-colors">
                Contact
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold mb-4" style={{ color: "#DC1E26" }}>
            Newsletter
          </h4>
          <p className="text-xs text-gray-500 mb-4">
            Stay updated with match schedules and sports news.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="Email address"
              className="bg-gray-900 border border-gray-800 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-red-500"
            />
            <button
              className="px-4 py-2 rounded text-sm font-bold text-white hover:scale-105 transition-transform"
              style={{ backgroundColor: "#DC1E26" }}
            >
              →
            </button>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-gray-900 text-center text-xs text-gray-600">
        © {new Date().getFullYear()} Sunway Student Representatives Council. All
        rights reserved.
      </div>
    </footer>
  );
}
