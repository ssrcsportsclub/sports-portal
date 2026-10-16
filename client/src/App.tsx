import { lazy, Suspense, useEffect } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Provider } from "react-redux";
import { Toaster } from "react-hot-toast";
import { store } from "./store/store";
import { useAppDispatch } from "./store/hooks";
import { fetchProfile } from "./store/slices/authSlice";
import ErrorPage from "./components/ui/ErrorPage";
import {
  DashboardShellSkeleton,
  PublicPageSkeleton,
} from "./components/ui/Skeleton";
import { ProtectedRoute } from "./components/ProtectedRoute";

// Every page is its own chunk so visitors only download what they open.
const LandingPage = lazy(() => import("./pages/LandingPage"));
const Home = lazy(() => import("./pages/Home"));
const Forms = lazy(() => import("./pages/Forms"));
const LoginForm = lazy(() => import("./components/no_auth/Login"));
const DynamicForm = lazy(
  () => import("./components/no_auth/open_forms/DynamicForm"),
);
const RootComp = lazy(() => import("./components/auth_client/root/RootComp"));
const RequestEquipments = lazy(
  () => import("./components/auth_client/pages/RequestEquipments"),
);
const Team = lazy(() => import("./components/auth_client/pages/Team"));
const Profile = lazy(() => import("./components/auth_client/pages/Profile"));
const ReportBug = lazy(
  () => import("./components/auth_client/pages/ReportBug"),
);
const Feedback = lazy(() => import("./components/auth_client/pages/Feedback"));
const Settings = lazy(() => import("./components/auth_client/pages/Settings"));
const MyEvents = lazy(() => import("./components/auth_client/pages/MyEvents"));
const AllEvents = lazy(
  () => import("./components/auth_client/pages/AllEvents"),
);
const EventDetails = lazy(
  () => import("./components/auth_client/pages/EventDetails"),
);
const AllTeams = lazy(() => import("./components/auth_client/pages/AllTeams"));
const Members = lazy(() => import("./components/auth_client/pages/Members"));
const MemberRegistrations = lazy(
  () => import("./components/auth_client/pages/MemberRegistrations"),
);
const Announcements = lazy(
  () => import("./components/auth_client/pages/Announcements"),
);
const Inventory = lazy(
  () => import("./components/auth_client/pages/Inventory"),
);
const FeedbackList = lazy(
  () => import("./components/auth_client/pages/FeedbackList"),
);
const MeetingManagement = lazy(
  () => import("./components/auth_client/pages/MeetingManagement"),
);

const router = createBrowserRouter([
  {
    path: "/dashboard",
    errorElement: <ErrorPage />,
    children: [
      {
        element: (
          <ProtectedRoute>
            <Suspense fallback={<DashboardShellSkeleton />}>
              <RootComp />
            </Suspense>
          </ProtectedRoute>
        ),
        children: [
          {
            index: true,
            element: <Announcements />,
          },
          {
            path: "events/:id",
            element: <EventDetails />,
          },
          {
            path: "equipments",
            element: <RequestEquipments />,
          },
          {
            path: "team",
            element: <Team />,
          },
          {
            path: "all-teams",
            element: <AllTeams />,
          },
          {
            path: "profile",
            element: <Profile />,
          },
          {
            path: "forms",
            element: <Forms />,
          },
          {
            path: "bug-report",
            element: <ReportBug />,
          },
          {
            path: "feedback",
            element: <Feedback />,
          },
          {
            path: "my-events",
            element: <MyEvents />,
          },
          {
            path: "all-events",
            element: <AllEvents />,
          },
          {
            path: "members",
            element: <Members />,
          },
          {
            path: "membership-requests",
            element: <MemberRegistrations />,
          },
          {
            path: "settings",
            element: <Settings />,
          },
          {
            path: "announcements",
            element: <Announcements />,
          },
          {
            path: "inventory",
            element: <Inventory />,
          },
          {
            path: "user-feedback",
            element: <FeedbackList />,
          },
          {
            path: "meetings",
            element: <MeetingManagement />,
          },
        ],
      },
      {
        path: "*",
        element: <ErrorPage />,
      },
    ],
  },
  {
    path: "/login",
    element: <LoginForm />,
  },

  {
    path: "/",
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <LandingPage />,
      },
      {
        path: "/events",
        element: <Home />,
      },
      {
        path: "/form/:formId",
        element: <DynamicForm />,
      },
      {
        path: "*",
        element: <ErrorPage />,
      },
    ],
  },
]);

const AuthInitializer = ({ children }: { children: React.ReactNode }) => {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(fetchProfile());
  }, [dispatch]);
  return <>{children}</>;
};

export default function App() {
  return (
    <>
      <Provider store={store}>
        <AuthInitializer>
          <Toaster position="top-center" />
          <Suspense fallback={<PublicPageSkeleton />}>
            <RouterProvider router={router} />
          </Suspense>
        </AuthInitializer>
      </Provider>
    </>
  );
}
