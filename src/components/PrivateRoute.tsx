import { Navigate } from "react-router";
import { useAuth } from "../context/AuthContext";

type PrivateRouteProps = {
  children: React.ReactNode;
};

export default function PrivateRoute({ children }: PrivateRouteProps) {
  const { user } = useAuth();

  // If there's no user, redirect to sign in page
  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  // If there is a user, render the protected route
  return <>{children}</>;
}
