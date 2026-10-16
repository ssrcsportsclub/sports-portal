import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { getForms } from "../store/slices/formSlice";
import img from "../assets/logo_main.png";
import { EventCardsSkeleton } from "../components/ui/Skeleton";

const Home = () => {
  const dispatch = useAppDispatch();
  const { forms, loading } = useAppSelector((state) => state.form);

  useEffect(() => {
    dispatch(getForms());
  }, [dispatch]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-900 px-4 py-8">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12">
          <img src={img} alt="SSRC Logo" className="h-24 w-auto mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-white mb-4">
            SSRC Event Registration
          </h1>
          <p className="text-neutral-400 max-w-2xl mx-auto">
            Welcome to the official registration portal for Sunway Student
            Representatives Council events. Please select an event below to
            register.
          </p>
        </div>

        {loading ? (
          <EventCardsSkeleton />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {forms.map((form: any) => (
              <Link
                key={form.formId}
                to={`/form/${form.formId}`}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 transition-all hover:border-[#B61C23] hover:bg-neutral-900 hover:shadow-2xl hover:shadow-[#B61C23]/10"
              >
                <div className="absolute inset-0 bg-linear-to-br from-[#B61C23]/0 via-[#B61C23]/0 to-[#B61C23]/5 opacity-0 transition-opacity group-hover:opacity-100" />

                <div className="relative z-10 flex flex-col h-full">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-800 text-[#B61C23] group-hover:bg-[#B61C23] group-hover:text-white transition-colors">
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#B61C23] transition-colors">
                    {form.formTitle
                      .replace("SSRC ", "")
                      .replace(" Registration", "")}
                  </h3>

                  <p className="text-sm text-neutral-400 line-clamp-3 mb-6 grow">
                    {form.formDescription}
                  </p>

                  <div className="flex items-center text-sm font-medium text-[#B61C23] group-hover:translate-x-1 transition-transform">
                    Register Now
                    <svg
                      className="ml-2 h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-16 text-center border-t border-neutral-800 pt-8">
          <p className="text-neutral-500 text-sm">
            &copy; {new Date().getFullYear()} Sunway Student Representatives
            Council. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home;
