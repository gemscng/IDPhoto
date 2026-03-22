import type { NextPageContext } from "next";

function Error({ statusCode }: { statusCode: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: "3rem", fontWeight: "bold" }}>{statusCode}</h1>
        <p style={{ marginTop: "0.5rem", color: "#666" }}>
          {statusCode === 404 ? "Page not found" : "An error occurred"}
        </p>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/en" style={{ marginTop: "1rem", display: "inline-block", color: "#0070f3" }}>
          Go Home
        </a>
      </div>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
