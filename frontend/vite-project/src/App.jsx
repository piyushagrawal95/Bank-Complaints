import { useEffect, useState } from "react";
import { getComplaints, getProducts } from "./api";

const EMPTY = { q: "", product: "", state: "", date_from: "", date_to: "" };
const PAGE_SIZE = 25;

function App() {
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
    <div className="container">
      <h1>Complaints AI</h1>
      <p className="subtitle">Browse and filter customer complaints</p>

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
    </div>
  );
}

export default App;