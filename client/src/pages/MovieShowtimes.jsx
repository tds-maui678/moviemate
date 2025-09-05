import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api";

export default function MovieShowtimes() {
  const { id } = useParams();               
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    let ignore = false;
    setErr("");
    api
      .get(`/api/movies/${id}/showtimes`)   
      .then(({ data }) => {
        if (!ignore) setRows(data || []);
      })
      .catch((e) => setErr(e?.response?.data?.error || "Failed to load showtimes"));
    return () => { ignore = true; };
  }, [id]);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-3">
      <h1 className="text-xl font-semibold">Showtimes</h1>

      {err && <p className="text-red-600 text-sm">{err}</p>}
      {rows.length === 0 && !err && (
        <p className="text-gray-500">No showtimes yet.</p>
      )}

      <div className="space-y-2">
        {rows.map((s) => (
          <div key={s.id} className="border rounded p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{new Date(s.startsAt).toLocaleString()}</div>
              <div className="text-sm text-gray-600">
                Hall: {s.auditorium || s.auditoriumId}
                {s.priceCents != null ? <> · ${(s.priceCents / 100).toFixed(2)}</> : null}
              </div>
            </div>

            {}
            <Link
              to={`/showtimes/${s.id}/seats`}
              className="border px-3 py-1 rounded hover:bg-gray-50"
            >
              Select
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}