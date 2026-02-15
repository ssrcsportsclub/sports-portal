import {
  useRouteError,
  isRouteErrorResponse,
  useNavigate,
} from "react-router-dom";

const ErrorPage = () => {
  const error = useRouteError();
  const navigate = useNavigate();

  let errorMessage: string | React.ReactNode = "Unknown error";
  let errorTitle = "Error";
  let errorStatus: number | undefined;

  if (isRouteErrorResponse(error)) {
    // Handle specific route errors (like 404)
    errorStatus = error.status;
    if (error.status === 404) {
      errorTitle = "Page Not Found";
      errorMessage = "Sorry, we couldn't find the page you're looking for.";
    } else {
      errorTitle = "Oops! Something went wrong";
      errorMessage = error.statusText || "An unexpected error occurred.";
    }
  } else if (error instanceof Error) {
    // Handle standard Javascript errors
    errorTitle = "Application Error";
    errorMessage = error.message;
  } else if (typeof error === "string") {
    errorTitle = "Error";
    errorMessage = error;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="p-8 text-center space-y-6">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            {errorStatus === 404 ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10 text-red-600 dark:text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10 text-red-600 dark:text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            )}
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {errorTitle}
            </h1>
            <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              {errorMessage}
            </p>
            {/* Show stack trace on dev for Errors */}
            {process.env.NODE_ENV === "development" &&
              error instanceof Error && (
                <div className="mt-4 overflow-x-auto rounded-lg bg-zinc-100 p-4 text-left dark:bg-zinc-950">
                  <pre className="whitespace-pre-wrap break-all font-mono text-xs text-red-600 dark:text-red-400">
                    {error.stack}
                  </pre>
                </div>
              )}
          </div>

          <div className="flex flex-col justify-center gap-3 pt-4 sm:flex-row">
            <button
              onClick={() => navigate("/")}
              className="rounded-full bg-[#DD1D25] px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-red-500/20 transition-colors hover:bg-[#C11920]"
            >
              Back to Home
            </button>
            <button
              onClick={() => window.location.reload()}
              className="rounded-full border border-zinc-200 px-6 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;
