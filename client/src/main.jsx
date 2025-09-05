import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";

import ErrorBoundary from "./components/ErrorBoundary.jsx";
import Header from "./components/Header.jsx";

import { AuthProvider } from "./auth.jsx";
import AuthGuard from "./guards/AuthGuard.jsx";
import AdminGuard from"./guards/AdminGuard.jsx";
import GuestGuard from "./guards/GuestGuard.jsx";

import CheckoutSuccess from "./pages/CheckoutSuccess.jsx";
import CheckoutCancel from "./pages/CheckoutCancel.jsx";
import LandingRedirect from "./LandingRedirect.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Movies from "./pages/Movies.jsx";
import MovieShowtimes from "./pages/MovieShowTimes.jsx";
import SeatSelect from "./pages/SeatSelect.jsx";
import Tickets from "./pages/Tickets.jsx";
import Profile from "./pages/Profile.jsx";


// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AdminShowtimesManage from "./pages/admin/ShowtimesManage.jsx";
import AdminShowtimeBookings from "./pages/admin/ShowtimeBooked.jsx"
import AdminShowtimeTickets from "./pages/admin/ShowtimeQRCodes.jsx";
import AdminScan from "./pages/admin/ScanTicket.jsx";

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Header />
          <Routes>
            {/* Landing & checkout */}
            <Route path="/" element={<LandingRedirect />} />
            <Route path="/checkout/success" element={<CheckoutSuccess />} />
            <Route path="/checkout/cancel" element={<CheckoutCancel />} />

            {/* Auth */}
            <Route path="/login" element={<GuestGuard><Login /></GuestGuard>} />
            <Route path="/register" element={<GuestGuard><Register /></GuestGuard>} />

            {/* User-facing */}
            <Route path="/movies" element={<AuthGuard><Movies /></AuthGuard>} />
            <Route path="/movies/:id" element={<AuthGuard><MovieShowtimes /></AuthGuard>} />
            <Route path="/showtimes/:id/seats" element={<AuthGuard><SeatSelect /></AuthGuard>} />
            <Route path="/tickets" element={<AuthGuard><Tickets /></AuthGuard>} />
            <Route path="/profile" element={<AuthGuard><Profile /></AuthGuard>} />

            {/* Admin */}
            <Route path="/admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
            <Route path="/admin/showtimes" element={<AdminGuard><AdminShowtimesManage /></AdminGuard>} />
            <Route path="/admin/showtimes/:id/booked" element={<AdminGuard><AdminShowtimeBookings /></AdminGuard>} />
            <Route path="/admin/showtimes/:id/tickets" element={<AdminGuard><AdminShowtimeTickets /></AdminGuard>} />
            <Route path="/admin/scan" element={<AdminGuard><AdminScan /></AdminGuard>} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

createRoot(document.getElementById("root")).render(<App />);