import React from "react";
import { Link } from "react-router-dom";

export default function CheckoutCancel() {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Payment Cancelled</h1>
      <p className="text-gray-500">Your payment was cancelled. Your seat holds may expire soon.</p>
      <Link className="text-blue-500 underline" to="/movies">
        Back to Movies
      </Link>
    </div>
  );
}