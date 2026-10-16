import { Suspense, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "../UI/Sidebar";
import { PageSkeleton } from "../../ui/Skeleton";

const RootComp = () => {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 transition-colors duration-200">
      <Sidebar />
      <main className="flex-1 w-full min-w-0 ml-0 md:ml-64 p-4 md:p-8 pt-16 md:pt-8 transition-all duration-300">
        {/* Keeps the sidebar on screen while a page chunk loads */}
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
};

export default RootComp;
