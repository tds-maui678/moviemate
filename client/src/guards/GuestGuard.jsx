import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth.jsx";

export default function GuestGuard({ children }) {
  const { user } = useAuth();
  const loc = useLocation();

  if (user) {
    // If they were trying to access a protected page first, go there
    const from = loc.state?.from?.pathname;
    if (from) return <Navigate to={from} replace />;
    return <Navigate to={user.role === "ADMIN" ? "/admin" : "/movies"} replace />;
  }
  return children;
}