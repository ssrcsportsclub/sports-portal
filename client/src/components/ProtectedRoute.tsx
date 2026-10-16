import { Navigate, useLocation } from "react-router-dom";
import { useAppSelector } from "../store/hooks";
import { DashboardShellSkeleton } from "./ui/Skeleton";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isCheckingAuth } = useAppSelector(
    (state) => state.auth,
  );
  const location = useLocation();

  // Wait for the session check on hard refresh instead of bouncing to /login.
  if (isCheckingAuth) {
    return <DashboardShellSkeleton />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};
