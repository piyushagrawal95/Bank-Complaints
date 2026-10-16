import { useEffect, useState } from "react";
import {
  clearToken,
  getComplaints,
  getMe,
  getProducts,
  getToken,
  setUnauthorizedHandler,
} from "./api";
import Login from "./Login";
import Trends from "./Trends";

const EMPTY = { q: "", product: "", state: "", date_from: "", date_to: "" };
const PAGE_SIZE = 25;
const TREND_ROLES = ["supervisor", "admin"]; // roles that may see the Trends tab

function ComplaintsPage() {
  const [draft, setDraft] = useState(EMPTY);     // what the user is typing
  const [filters, setFilters] = useState(EMPTY); // filters that are applied
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load the product list once, for the dropdown
  useEffect(() => {
    getProducts().then(setProducts).catch(() => setProducts([]));
  }, []);

  // Load complaints whenever the filters or the page change
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getComplaints({ ...filters, page, page_size: PAGE_SIZE })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters, page]);

  function change(e) {
    setDraft({ ...draft, [e.target.name]: e.target.value });
  }

  function applyFilters(e) {
    e.preventDefault();
    setPage(1);
    setFilters(draft);
  }

  function resetFilters() {
    setDraft(EMPTY);
    setPage(1);
    setFilters(EMPTY);
  }

  const totalPages = data ? data.total_pages : 0;

  return (
    <>
      <form className="filters" onSubmit={applyFilters}>
        <input
          name="q"
          placeholder="Search issue or company"
          value={draft.q}
          onChange={change}
        />
        <select name="product" value={draft.product} onChange={change}>
          <option value="">All products</option>
          {products.map((p) => (
            <option key={p.product} value={p.product}>
              {p.product} ({p.count})
            </option>
          ))}
        </select>
        <input
          name="state"
          placeholder="State (e.g. CA)"
          maxLength={2}
          value={draft.state}
          onChange={change}
        />
        <input
          name="date_from"
          type="date"
          title="Received from"
          value={draft.date_from}
          onChange={change}
        />
        <input
          name="date_to"
          type="date"
          title="Received until"
          value={draft.date_to}
          onChange={change}
        />
        <button type="submit">Apply</button>
        <button type="button" className="secondary" onClick={resetFilters}>
          Reset
        </button>
      </form>

      {error && <div className="error">Could not load complaints: {error}</div>}
      {loading && <p className="info">Loading...</p>}

      {!error && data && (
        <>
          <p className="info">{data.total.toLocaleString()} complaints found</p>

          {data.items.length === 0 ? (
            <p className="info">No complaints match these filters.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Date</th>
                    <th>Product</th>
                    <th>Issue</th>
                    <th>Company</th>
                    <th>State</th>
                    <th>Response</th>
                    <th>Timely</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((c) => (
                    <tr key={c.complaint_id}>
                      <td>{c.complaint_id}</td>
                      <td>{c.date_received}</td>
                      <td>{c.product}</td>
                      <td>{c.issue}</td>
                      <td>{c.company}</td>
                      <td>{c.state || "-"}</td>
                      <td>{c.company_response_to_consumer || "-"}</td>
                      <td>
                        {c.timely_response === null
                          ? "-"
                          : c.timely_response
                          ? "Yes"
                          : "No"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="pagination">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages || loading}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("complaints"); // "complaints" or "trends"
  // If a token is saved, we first check that it is still valid
  const [checking, setChecking] = useState(Boolean(getToken()));

  // When the server says the login has expired, go back to the login page
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearToken();
      setUser(null);
    });
  }, []);

  useEffect(() => {
    if (!getToken()) return;
    getMe()
      .then(setUser)
      .catch(() => {
        // An expired token is cleared by the handler above.
        // For other errors (for example the server is down) the login page is shown.
      })
      .finally(() => setChecking(false));
  }, []);

  function handleLogout() {
    clearToken();
    setUser(null);
    setView("complaints");
  }

  if (checking) {
    return (
      <div className="container">
        <p className="info">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Login onLoggedIn={setUser} />;
  }

  // The server also blocks agents from the trends API. This only hides the tab.
  const canSeeTrends = TREND_ROLES.includes(user.role);
  const showTrends = canSeeTrends && view === "trends";

  return (
    <div className="container">
      <header className="topbar">
        <div>
          <h1>Complaint Desk</h1>
          <p className="tagline">AI-powered complaint handling for banks</p>
        </div>
        <div className="userbox">
          <span>
            {user.full_name || user.email}
            <span className="badge">{user.role}</span>
          </span>
          <button className="secondary" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      {canSeeTrends && (
        <nav className="tabs">
          <button
            className={"tab" + (!showTrends ? " active" : "")}
            onClick={() => setView("complaints")}
          >
            Complaints
          </button>
          <button
            className={"tab" + (showTrends ? " active" : "")}
            onClick={() => setView("trends")}
          >
            Trends
          </button>
        </nav>
      )}

      {showTrends ? <Trends /> : <ComplaintsPage />}
    </div>
  );
}

export default App;