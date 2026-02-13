import { createBrowserRouter, RouterProvider } from "react-router-dom";
import LoginForm from "./components/no_auth/Login";
import SignupForm from "./components/no_auth/Signup";
import DynamicForm from "./components/no_auth/open_forms/DynamicForm";
import Home from "./pages/Home";
import { store } from "./store/store";
import { Provider } from "react-redux";
import RootComp from "./components/auth_client/root/RootComp";
import Events from "./components/auth_client/pages/Events";
import RequestEquipments from "./components/auth_client/pages/RequestEquipments";
import Team from "./components/auth_client/pages/Team";
import Profile from "./components/auth_client/pages/Profile";
import ReportBug from "./components/auth_client/pages/ReportBug";
import Feedback from "./components/auth_client/pages/Feedback";
import Settings from "./components/auth_client/pages/Settings";
import Forms from "./pages/Forms";
import MyEvents from "./components/auth_client/pages/MyEvents";
import AllEvents from "./components/auth_client/pages/AllEvents";
import EventDetails from "./components/auth_client/pages/EventDetails";
import AllTeams from "./components/auth_client/pages/AllTeams";
import Members from "./components/auth_client/pages/Members";
import MemberRegistrations from "./components/auth_client/pages/MemberRegistrations";
import Announcements from "./components/auth_client/pages/Announcements";
import { ProtectedRoute } from "./components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";

const router = createBrowserRouter([
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <RootComp />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Announcements />,
      },
      {
        path: "events",
        element: <Events />,
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
    ],
  },
  {
    path: "/login",
    element: <LoginForm />,
  },
  {
    path: "/signup",
    element: <SignupForm />,
  },
  {
    path: "/",
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
    ],
  },
]);

import { useEffect } from "react";
import { useAppDispatch } from "./store/hooks";
import { fetchProfile } from "./store/slices/authSlice";

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
          <RouterProvider router={router} />
        </AuthInitializer>
      </Provider>
    </>
  );
}
