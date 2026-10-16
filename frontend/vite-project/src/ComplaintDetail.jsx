import { useEffect, useState } from "react";
import { analyzeComplaint, getComplaint } from "./api";
import "./ComplaintDetail.css";

function ComplaintDetail({ id, onClose }) {
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getComplaint(id)
      .then((result) => {
        if (cancelled) return;
        setComplaint(result);
        setAnalysis(result.analysis);
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
  }, [id]);

  async function runAnalysis(refresh) {
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      setAnalysis(await analyzeComplaint(id, refresh));
    } catch (err) {
      setAnalyzeError(err.message);
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="detail-card">
      <div className="detail-head">
        <h2>Complaint {id}</h2>
        <button className="secondary" onClick={onClose}>Close</button>
      </div>

      {loading && <p className="info">Loading...</p>}
      {error && <div className="error">Could not load the complaint: {error}</div>}

      {complaint && (
        <>
          <p className="detail-meta">
            {complaint.product} · {complaint.issue} · {complaint.company} ·{" "}
            {complaint.date_received}
          </p>

          <h3>Customer's story</h3>
          <p className="detail-narrative">
            {complaint.narrative || "This complaint has no written story."}
          </p>

          <h3>AI analysis</h3>
          {analysis ? (
            <div className="analysis-box">
              <span className="badge">{analysis.category}</span>
              <p>{analysis.summary}</p>
                {analysis.basis === "metadata" && (
                <p className="analysis-note">
                  Based on the complaint labels only (no written story), so this
                  is less reliable.
                </p>
              )}
              <button className="secondary" disabled={analyzing} onClick={() => runAnalysis(true)}>
                {analyzing ? "Analyzing..." : "Analyze again"}
              </button>
            </div>
          ) : (
            <button disabled={analyzing} onClick={() => runAnalysis(false)}>
              {analyzing ? "Analyzing..." : "Analyze with AI"}
            </button>
          )}
          {analyzeError && <div className="error">{analyzeError}</div>}
        </>
      )}
    </div>
  );
}

export default ComplaintDetail;