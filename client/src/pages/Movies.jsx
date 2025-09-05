
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

export default function Movies() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api.get("/api/movies").then(({ data }) => setRows(data || []));
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto grid md:grid-cols-3 sm:grid-cols-2 gap-4">
      {rows.map(m => (
        <Link key={m.id} to={`/movies/${m.id}`} className="border rounded overflow-hidden hover:shadow">
          <div className="aspect-[2/3] bg-gray-100">
            {m.posterUrl && <img src={m.posterUrl} alt={m.title} className="h-full w-full object-cover" />}
          </div>
          <div className="p-3">
            <div className="font-medium">{m.title}</div>
            <div className="text-xs text-gray-600">{m.rating || "NR"} · {m.durationMinutes || "?"} min</div>
          </div>
        </Link>
      ))}
    </div>
  );
}