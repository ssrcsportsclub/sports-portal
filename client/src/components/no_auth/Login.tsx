import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  login,
  googleLogin as googleLoginAction,
  clearError,
} from "../../store/slices/authSlice";
import img from "../../assets/logo_main.png";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated } = useAppSelector(
    (state) => state.auth,
  );

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    // Clear error when component unmounts
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(login({ email, password }));
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      if (tokenResponse.access_token) {
        dispatch(
          googleLoginAction({ accessToken: tokenResponse.access_token }),
        );
      }
    },
    onError: () => console.error("Google Login Failed"),
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-sm rounded-xl border border-neutral-800 bg-neutral-900 shadow-lg">
        {/* Card Navbar */}
        <div className=" justify-center pt-10 items-center flex flex-col rounded-t-xl  px-6">
          <div className="">
            <a
              href="https://ssrc.sunway.edu.np"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-neutral-300 transition hover:text-white"
            >
              <img src={img} alt="SSRC Logo" className="h-18 w-auto" />
            </a>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 pt-2">
          {/* Header */}
          <div className="mb-6 space-y-1 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              SSRC Sports Club
            </h1>
            <p className="text-sm text-neutral-400">
              Please login to continue.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-200">
                Email
              </label>
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10 w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-700"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-200">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-10 w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-700"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="h-10 w-full rounded-md bg-white text-sm font-medium text-neutral-900 transition hover:bg-neutral-200 disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-neutral-800" />
            <span className="mx-3 text-xs text-neutral-400">OR</span>
            <div className="flex-1 border-t border-neutral-800" />
          </div>

          {/* Google Login */}
          <button
            onClick={() => loginWithGoogle()}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-neutral-800 bg-neutral-950 text-sm font-medium text-white transition hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-700"
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path
                fill="#FFC107"
                d="M43.6 20.1H42V20H24v8h11.3C33.8 32.5 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"
              />
              <path
                fill="#FF3D00"
                d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4c-7.7 0-14.4 4.3-17.7 10.7z"
              />
              <path
                fill="#4CAF50"
                d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.2C29.4 35.9 26.8 37 24 37c-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.5 39.6 16.2 44 24 44z"
              />
              <path
                fill="#1976D2"
                d="M43.6 20.1H42V20H24v8h11.3c-1.1 3-3.3 5.4-6.1 6.9l6.3 5.2C39.5 36.6 44 30.9 44 24c0-1.3-.1-2.7-.4-3.9z"
              />
            </svg>
            Continue with Google
          </button>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-neutral-400">
            Don't have an account?{" "}
            <a
              href={`${window.location.origin}/form/student-registration`}
              className="font-medium text-white hover:underline"
            >
              Apply for membership
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
