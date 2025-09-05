import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth.jsx";

export default function AdminGuard({ children }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: loc }} />;
  if (user.role !== "ADMIN") return <Navigate to="/movies" replace />;
  return children;
}