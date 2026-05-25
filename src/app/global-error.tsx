"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ru">
      <body style={{
        fontFamily: "Georgia, serif",
        background: "#F5F0E8",
        color:      "#4A2C1A",
        margin:     0,
        minHeight:  "100vh",
        display:    "flex",
        alignItems: "center",
        justifyContent: "center",
        padding:    "20px",
      }}>
        <div style={{ maxWidth: "400px", textAlign: "center" }}>
          <p style={{ color: "#C9A84C", letterSpacing: "0.3em", fontSize: "18px", margin: "0 0 16px" }}>✦</p>
          <h1 style={{ fontSize: "28px", margin: "0 0 16px", fontWeight: "normal" }}>
            Серьёзная ошибка
          </h1>
          <p style={{ color: "#8B6F47", fontSize: "14px", marginBottom: "32px", lineHeight: 1.6 }}>
            Приложение не удалось загрузить. Пожалуйста, обновите страницу.
          </p>
          {error.digest && (
            <p style={{ fontSize: "11px", color: "#9B9B9B", fontFamily: "monospace", marginBottom: "24px" }}>
              ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              padding:    "12px 32px",
              background: "#4A2C1A",
              color:      "#F5F0E8",
              border:     "none",
              fontSize:   "11px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              cursor:     "pointer",
              borderRadius: "3px",
            }}
          >
            Перезагрузить
          </button>
        </div>
      </body>
    </html>
  );
}
