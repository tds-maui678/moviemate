import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./auth.jsx";

export default function LandingRedirect() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {

    if (pathname !== "/") return;

    if (!user) {
      navigate("/login", { replace: true });
    } else if (user.role === "ADMIN") {
      navigate("/admin", { replace: true });
    } else {
      navigate("/movies", { replace: true });
    }
  }, [pathname, user, navigate]);

  return null;
}