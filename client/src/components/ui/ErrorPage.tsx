import React from "react";
import { Link, useRouteError, isRouteErrorResponse } from "react-router-dom";

const ErrorPage: React.FC = () => {
  const error = useRouteError();
  console.error(error);

  let statusText = "Page Not Found";
  let message = "The page you are looking for doesn't exist or has been moved.";

  if (isRouteErrorResponse(error)) {
    if (error.status !== 404) {
      statusText = `Error ${error.status}`;
      message = error.statusText || message;
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 text-center antialiased overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#DD1D25]/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-zinc-800/10 blur-[120px] rounded-full"></div>
      </div>

      <div className="relative mb-12">
        <h1 className="text-[14rem] font-black tracking-tighter text-white/5 leading-none select-none md:text-[20rem]">
          {isRouteErrorResponse(error) ? error.status : "404"}
        </h1>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-32 w-[2px] bg-linear-to-b from-transparent via-[#DD1D25] to-transparent shadow-[0_0_15px_rgba(221,29,37,0.5)]"></div>
        </div>
      </div>

      <div className="max-w-md space-y-6 relative z-10">
        <div className="space-y-2">
          <h2 className="text-4xl font-bold tracking-tight text-white uppercase sm:text-5xl">
            {statusText}
          </h2>
          <p className="text-lg text-zinc-400 font-medium">{message}</p>
        </div>

        <div className="pt-6">
          <Link
            to="/"
            className="group relative inline-flex items-center justify-center px-8 py-3.5 font-bold text-white transition-all duration-300 bg-[#DD1D25] rounded-full hover:bg-[#C11920] active:scale-95 shadow-xl shadow-red-900/20"
          >
            <span>Return to Home</span>
            <svg
              className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </Link>
        </div>
      </div>

      <div className="absolute bottom-12 text-[10px] text-zinc-500 font-bold uppercase tracking-[0.4em] opacity-40">
        Sunway Sports Resource Center &bull; Portal 2.0
      </div>
    </div>
  );
};

export default ErrorPage;
