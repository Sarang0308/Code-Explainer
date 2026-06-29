import { useState } from 'react';

function App() {
  const [input, setInput] = useState('');
  const [lang, setLang] = useState('JavaScript');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  const explainCode = async () => {
    if (!input.trim()) return alert("Please paste some code first!");
    setLoading(true);
    setErr('');
    setData(null);

    try {
      const res = await fetch("/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: input, language: lang })
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || "Request failed");
      setData(resJson);
    } catch (e) {
      setErr("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h2> Code Explainer</h2>

      <div className="input-section">
        <select value={lang} onChange={e => setLang(e.target.value)}>
          <option value="JavaScript">JavaScript</option>
          <option value="Python">Python</option>
        </select>
        <textarea 
          placeholder="Paste your code here..." 
          value={input} 
          onChange={e => setInput(e.target.value)} 
        />
        <button onClick={explainCode} disabled={loading}>
          {loading ? <><span className="spinner" /> Analyzing...</> : "Explain Code"}
        </button>
      </div>

      {data?.astAnalysis && (
        <div className="card">
          <h3>AST Analysis (JavaScript Statically Parsed)</h3>
          <p><strong>Functions count:</strong> {data.astAnalysis.functionsCount}</p>
          <ul>
            {data.astAnalysis.functionsList?.length > 0 ? (
              data.astAnalysis.functionsList.map((f, i) => <li key={i}>{f}</li>)
            ) : (
              <li>None</li>
            )}
          </ul>
          <p><strong>Loops count:</strong> {data.astAnalysis.loopsCount}</p>
          <ul>
            {data.astAnalysis.loopsList?.length > 0 ? (
              data.astAnalysis.loopsList.map((l, i) => <li key={i}>{l}</li>)
            ) : (
              <li>None</li>
            )}
          </ul>
        </div>
      )}

      {data && (
        <div className="cols">
          <div>
            <h3>Original Code</h3>
            <pre>{input}</pre>
          </div>
          <div>
            <h3>Optimized Code</h3>
            <pre>{data.optimized}</pre>
          </div>
        </div>
      )}

      <div className="explanation-section">
        <h3>Explanation</h3>
        {data && (
          <div style={{ marginBottom: "10px" }}>
            <p>
              <strong>Time Complexity:</strong> {data.time} | <strong>Space Complexity:</strong> {data.space}
            </p>
          </div>
        )}
        <div id="result">
          {err || data?.explanation || "Your explanation will appear here..."}
        </div>
      </div>

      <div className="disclaimer">
        <p><strong>Warning:</strong> AI-generated explanations and optimizations can contain errors. For JavaScript, this tool runs AST (Abstract Syntax Tree) parsing on functions/loops to decrease AI hallucinations.</p>
      </div>
    </div>
  );
}

export default App;
