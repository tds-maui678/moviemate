import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";

export default function AdminDashboard() {
  const [movies, setMovies] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [showtimes, setShowtimes] = useState([]);
  const [err, setErr] = useState("");

  const [movieForm, setMovieForm] = useState({
    title: "",
    description: "",
    durationMinutes: "",
    rating: "",
    poster: null,
  });

  const [stForm, setStForm] = useState({
    movieId: "",
    auditoriumId: "",
    startsAt: "",
    priceCents: 1200,
  });

  const [savingMovie, setSavingMovie] = useState(false);
  const [savingSt, setSavingSt] = useState(false);

  function loadMovies() {
    api
      .get("/api/admin/movies")
      .then(({ data }) => setMovies(data || []))
      .catch((e) =>
        setErr(e?.response?.data?.error || "Failed to load movies")
      );
  }

  function loadRooms() {
    api.get("/api/admin/rooms").then(({ data }) => setRooms(data || []));
  }

  function loadShowtimes(movieId) {
    api
      .get("/api/admin/showtimes", { params: movieId ? { movieId } : {} })
      .then(({ data }) => setShowtimes(data || []));
  }

  useEffect(() => {
    loadMovies();
    loadRooms();
    loadShowtimes();
  }, []);

  async function createMovie(e) {
    e.preventDefault();
    setSavingMovie(true);
    setErr("");
    try {
      const fd = new FormData();
      fd.append("title", movieForm.title);
      fd.append("description", movieForm.description);
      fd.append("durationMinutes", movieForm.durationMinutes);
      fd.append("rating", movieForm.rating);
      if (movieForm.poster) fd.append("poster", movieForm.poster);

      await api.post("/api/admin/movies", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMovieForm({
        title: "",
        description: "",
        durationMinutes: "",
        rating: "",
        poster: null,
      });
      loadMovies();
    } catch (e) {
      setErr(e?.response?.data?.error || "Failed to create movie");
    } finally {
      setSavingMovie(false);
    }
  }

  async function delMovie(id) {
    if (!confirm("Delete this movie?")) return;
    try {
      await api.delete(`/api/admin/movies/${id}`);
      loadMovies();
    } catch (e) {
      alert(e?.response?.data?.error || "Delete failed");
    }
  }

  async function createShowtime(e) {
    e.preventDefault();
    setSavingSt(true);
    setErr("");
    try {
      let iso = stForm.startsAt;
      if (iso && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(iso)) {
        // add :00 seconds, convert to UTC
        iso = `${iso}:00`;
        const local = new Date(iso);
        iso = new Date(
          local.getTime() - local.getTimezoneOffset() * 60000
        ).toISOString();
      } else if (iso && !iso.endsWith("Z")) {
        const d = new Date(iso);
        iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
      }

      await api.post("/api/admin/showtimes", {
        movieId: stForm.movieId,
        auditoriumId: stForm.auditoriumId,
        startsAt: iso,
        priceCents: Number(stForm.priceCents) || 1200,
      });

      setStForm({ ...stForm, startsAt: "" });
      loadShowtimes(stForm.movieId);
    } catch (e) {
      setErr(e?.response?.data?.error || "Failed to create showtime");
    } finally {
      setSavingSt(false);
    }
  }

  async function delShowtime(id) {
    if (!confirm("Delete showtime?")) return;
    await api.delete(`/api/admin/showtimes/${id}`);
    loadShowtimes(stForm.movieId);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin</h1>

        {/* Quick links added here */}
        <div className="flex gap-2 text-sm">
          <Link
            to="/admin/showtimes"
            className="border px-3 py-1 rounded hover:bg-gray-50"
          >
            Manage showtimes
          </Link>
          <Link
            to="/admin/scan"
            className="border px-3 py-1 rounded hover:bg-gray-50"
          >
            Scan tickets
          </Link>
        </div>
      </div>

      {/* Create Movie */}
      <section className="space-y-3">
        <h2 className="text-xl font-medium">Add Movie</h2>
        <form onSubmit={createMovie} className="border rounded p-4 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              className="border p-2"
              placeholder="Title"
              value={movieForm.title}
              onChange={(e) =>
                setMovieForm({ ...movieForm, title: e.target.value })
              }
            />
            <input
              className="border p-2"
              placeholder="Rating (e.g. PG-13)"
              value={movieForm.rating}
              onChange={(e) =>
                setMovieForm({ ...movieForm, rating: e.target.value })
              }
            />
            <input
              className="border p-2"
              placeholder="Duration minutes"
              value={movieForm.durationMinutes}
              onChange={(e) =>
                setMovieForm({
                  ...movieForm,
                  durationMinutes: e.target.value,
                })
              }
            />
            <input
              type="file"
              accept="image/*"
              className="border p-2"
              onChange={(e) =>
                setMovieForm({
                  ...movieForm,
                  poster: e.target.files?.[0] || null,
                })
              }
            />
          </div>
          <textarea
            className="border p-2 w-full"
            rows="3"
            placeholder="Description"
            value={movieForm.description}
            onChange={(e) =>
              setMovieForm({ ...movieForm, description: e.target.value })
            }
          />
          {err && <div className="text-red-600 text-sm">{err}</div>}
          <button
            disabled={savingMovie || !movieForm.title}
            className={`px-4 py-2 rounded text-white ${
              savingMovie ? "bg-gray-400" : "bg-black"
            }`}
          >
            {savingMovie ? "Saving..." : "Add Movie"}
          </button>
        </form>
      </section>

      {/* Movies list */}
      <section className="space-y-2">
        <h2 className="text-xl font-medium">Movies</h2>
        <div className="grid md:grid-cols-3 sm:grid-cols-2 gap-4">
          {movies.map((m) => (
            <div key={m.id} className="border rounded p-3">
              <div className="aspect-[2/3] bg-gray-100 mb-2 flex items-center justify-center rounded overflow-hidden">
                {m.posterUrl ? (
                  <img
                    src={m.posterUrl}
                    alt={m.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-gray-400">No poster</span>
                )}
              </div>
              <div className="font-medium">{m.title}</div>
              <div className="text-xs text-gray-600">
                {m.rating || "NR"} · {m.durationMinutes || "?"} min
              </div>
              <button
                onClick={() => delMovie(m.id)}
                className="mt-2 border px-3 py-1 rounded hover:bg-gray-50 w-full"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
        {movies.length === 0 && <p className="text-gray-500">No movies yet.</p>}
      </section>

      {/* Create Showtime */}
      <section className="space-y-3">
        <h2 className="text-xl font-medium">Add Showtime</h2>
        <form onSubmit={createShowtime} className="border rounded p-4 space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <select
              className="border p-2"
              value={stForm.movieId}
              onChange={(e) => {
                setStForm({ ...stForm, movieId: e.target.value });
                loadShowtimes(e.target.value);
              }}
            >
              <option value="">Select movie</option>
              {movies.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
            <select
              className="border p-2"
              value={stForm.auditoriumId}
              onChange={(e) =>
                setStForm({ ...stForm, auditoriumId: e.target.value })
              }
            >
              <option value="">Select hall</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <input
              type="datetime-local"
              className="border p-2"
              value={stForm.startsAt}
              onChange={(e) =>
                setStForm({ ...stForm, startsAt: e.target.value })
              }
            />
          </div>
          <div>
            <input
              className="border p-2"
              placeholder="Price (cents)"
              value={stForm.priceCents}
              onChange={(e) =>
                setStForm({ ...stForm, priceCents: e.target.value })
              }
            />
          </div>
          {err && <div className="text-red-600 text-sm">{err}</div>}
          <button
            disabled={
              savingSt || !stForm.movieId || !stForm.auditoriumId || !stForm.startsAt
            }
            className={`px-4 py-2 rounded text-white ${
              savingSt ? "bg-gray-400" : "bg-black"
            }`}
          >
            {savingSt ? "Saving..." : "Add Showtime"}
          </button>
        </form>

        {/* Existing showtimes with quick actions */}
        <div>
          <h3 className="font-medium mb-2">Existing Showtimes</h3>
          {showtimes.length === 0 && (
            <p className="text-gray-500">No showtimes</p>
          )}
          <div className="space-y-2">
            {showtimes.map((s) => (
              <div
                key={s.id}
                className="border rounded p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div>
                  <div className="font-medium">{s.Movie?.title}</div>
                  <div className="text-sm text-gray-600">
                    {new Date(s.startsAt).toLocaleString()} · {s.Auditorium?.name}
                    {s.priceCents ? ` · $${(s.priceCents / 100).toFixed(2)}` : ""}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    to="/admin/showtimes"
                    className="border px-3 py-1 rounded hover:bg-gray-50"
                  >
                    Manage
                  </Link>
                  <Link
                    to={`/admin/showtimes/${s.id}/booked`}
                    className="border px-3 py-1 rounded hover:bg-gray-50"
                  >
                    Booked seats
                  </Link>
                  <Link
                    to={`/admin/showtimes/${s.id}/tickets`}
                    className="border px-3 py-1 rounded hover:bg-gray-50"
                  >
                    QR tickets
                  </Link>
                  <button
                    onClick={() => delShowtime(s.id)}
                    className="border px-3 py-1 rounded hover:bg-gray-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}