import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";

export default function Header() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  async function handleLogout() {
    try { logout(); } finally { nav("/login"); }
  }

  const isAdmin = user?.role === "ADMIN";

  return (
    <header className="border-b border-white/10 bg-black/30 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="text-white font-semibold">MovieMate</Link>

        <nav className="flex items-center gap-3 text-sm">
          {user && (
            <>
              <Link to="/movies" className={linkCls(loc.pathname.startsWith("/movies"))}>Movies</Link>
              <Link to="/tickets" className={linkCls(loc.pathname.startsWith("/tickets"))}>My Tickets</Link>
              <Link to="/profile" className={linkCls(loc.pathname.startsWith("/profile"))}>Profile</Link>
              {isAdmin && (
                <>
                  <Link to="/admin" className={linkCls(loc.pathname === "/admin")}>Admin</Link>
                  <Link to="/admin/showtimes" className={linkCls(loc.pathname.startsWith("/admin/showtimes"))}>Manage</Link>
                  <Link to="/admin/scan" className={linkCls(loc.pathname === "/admin/scan")}>Scan</Link>
                </>
              )}
            </>
          )}
          {!user ? (
            <>
              <Link to="/login" className={linkCls(loc.pathname === "/login")}>Login</Link>
              <Link to="/register" className={linkCls(loc.pathname === "/register")}>Register</Link>
            </>
          ) : (
            <button onClick={handleLogout} className="text-gray-200 hover:text-white">Logout</button>
          )}
        </nav>
      </div>
    </header>
  );
}

function linkCls(active) {
  return `text-gray-300 hover:text-white ${active ? "text-white font-medium" : ""}`;
}