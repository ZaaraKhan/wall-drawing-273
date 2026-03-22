import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API = "https://wall-drawing-api-581317174663.us-central1.run.app";

export default function Gallery() {
  const navigate = useNavigate();
  const [drawings, setDrawings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/drawings`)
      .then((r) => r.json())
      .then((data) => setDrawings(data.drawings))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.back} onClick={() => navigate("/")}>
          ← back
        </button>
        <div style={styles.headerText}>
          <p style={styles.label}>SOL LEWITT</p>
          <h1 style={styles.title}>Wall Drawing 273</h1>
          <p style={styles.sub}>drawings by visitors</p>
        </div>
      </div>

      {/* Grid */}
      <div style={styles.body}>
        {loading ? (
          <span style={styles.mono}>loading —</span>
        ) : drawings.length === 0 ? (
          <span style={styles.mono}>no drawings yet</span>
        ) : (
          <div style={styles.grid}>
            {drawings.map((url, i) => (
              <div
                key={i}
                style={styles.cell}
                onClick={() => setLightboxUrl(url)}>
                <img src={url} alt={`Drawing ${i + 1}`} style={styles.thumb} />
                <span style={styles.cellLabel}>#{i + 1}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div style={styles.lightbox} onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} alt="Drawing" style={styles.lightboxImg} />
          <span style={styles.lightboxHint}>click to close</span>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    background: "#f7f4ef",
    fontFamily: "'Verdana', sans-serif",
    color: "#1a1a1a",
    overflowY: "auto",
    cursor: "auto",
  },
  header: {
    padding: "48px 64px 32px",
    borderBottom: "1px solid #d8d4cc",
    position: "relative",
  },
  back: {
    background: "transparent",
    border: "none",
    fontFamily: "'Verdana', sans-serif",
    fontSize: "12px",
    letterSpacing: "0.15em",
    color: "#888",
    cursor: "pointer",
    padding: 0,
    marginBottom: "24px",
    display: "block",
  },
  headerText: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
  },
  label: {
    fontSize: "11px",
    letterSpacing: "0.3em",
    color: "#888",
    textTransform: "uppercase" as const,
  },
  title: {
    fontFamily: "'Jost', sans-serif",
    fontSize: "clamp(28px, 4vw, 42px)",
    fontWeight: 400,
    margin: 0,
  },
  sub: {
    fontSize: "12px",
    letterSpacing: "0.15em",
    color: "#888",
  },
  body: {
    padding: "48px 64px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "24px",
  },
  cell: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
    cursor: "pointer",
  },
  thumb: {
    width: "100%",
    aspectRatio: "1",
    objectFit: "cover" as const,
    border: "1px solid #d8d4cc",
  },
  cellLabel: {
    fontSize: "11px",
    letterSpacing: "0.15em",
    color: "#aaa",
  },
  mono: {
    fontSize: "12px",
    letterSpacing: "0.2em",
    color: "#888",
  },
  lightbox: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(247,244,239,0.96)",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
    cursor: "pointer",
    gap: "16px",
  },
  lightboxImg: {
    maxWidth: "90vw",
    maxHeight: "85vh",
    border: "1px solid #ccc",
  },
  lightboxHint: {
    fontSize: "11px",
    letterSpacing: "0.2em",
    color: "#aaa",
  },
};
