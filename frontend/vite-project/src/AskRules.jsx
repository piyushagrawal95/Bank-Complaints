import { useState } from "react";
import { askRule } from "./api";
import "./AskRules.css";

const QUICK_QUESTIONS = [
  "How many business days does a bank have to investigate an unauthorized error?",
  "When must the bank provide provisional credit to the customer?",
  "What is the customer's liability if they report an unauthorized card transfer within 2 days?",
  "What counts as an electronic fund transfer error under Regulation E?",
];

function AskRules() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleAsk(qToAsk) {
    const q = qToAsk || question;
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await askRule(q.trim());
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleQuickClick(q) {
    setQuestion(q);
    handleAsk(q);
  }

  return (
    <div className="rules-container">
      <div className="rules-header">
        <h2>Ask Banking Regulations</h2>
        <p className="rules-subtitle">
          Ask rule questions from official federal rulebooks (Regulation E — Electronic Fund Transfers).
          Answers are strictly grounded with legal section & page citations.
        </p>
      </div>

      <div className="quick-prompts">
        <span className="quick-label">Try asking:</span>
        <div className="quick-chips">
          {QUICK_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              type="button"
              className="quick-chip"
              onClick={() => handleQuickClick(q)}
              disabled={loading}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      <form
        className="rules-form"
        onSubmit={(e) => {
          e.preventDefault();
          handleAsk();
        }}
      >
        <div className="input-group">
          <input
            type="text"
            className="rules-input"
            placeholder="e.g. How many days to resolve an ATM transfer dispute?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={loading}
          />
          <button type="submit" className="rules-submit" disabled={loading || !question.trim()}>
            {loading ? "Searching Rules..." : "Ask Rule"}
          </button>
        </div>
      </form>

      {loading && (
        <div className="loading-card">
          <p className="info">Searching 182 pages of Regulation E & generating answer with citations...</p>
        </div>
      )}

      {error && <div className="error">Error retrieving rule: {error}</div>}

      {result && (
        <div className="result-card">
          <div className="result-meta">
            <span className="badge">AI Compliance Answer</span>
            <span className="model-tag">Grounded on Regulation E</span>
          </div>

          <div className="answer-text">{result.answer}</div>

          {result.citations && result.citations.length > 0 && (
            <div className="citations-section">
              <h3>Official Legal Citations & Excerpts:</h3>
              <div className="citations-grid">
                {result.citations.map((c) => (
                  <div key={c.source_id} className="citation-card">
                    <div className="citation-head">
                      <span className="citation-section">{c.section}</span>
                      <span className="citation-page">PDF Page {c.page_number}</span>
                    </div>
                    <p className="citation-excerpt">"{c.excerpt}"</p>
                    <div className="citation-foot">
                      <span className="similarity-badge">
                        Confidence: {Math.round(c.similarity * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AskRules;