"use client";

import { useRouter } from "next/navigation";
import React from "react";

export default function Activty() {
  const router = useRouter();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#c56cf9ff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        color: "white",
        padding: "2rem",
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      {/* Main heading */}
      <h2
        style={{
          margin: 10,
          position: "absolute",
          top: 20,
          left: 20,
          color: "#ffffffff", // darker purple
        }}
      >
        Activity
      </h2>

      <p
        style={{
          margin: 10,
          position: "absolute",
          top: 50,
          left: 20,
          color: "white",
        }}
      >
        This is where you will see both the history and the suspicious activity
      </p>

      {/* Two big boxes */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          width: "100%",
          marginTop: "100px",
          gap: "2rem",
        }}
      >
        {/* Left box */}
        <div
          style={{
            flex: 1,
            background: "#a24ce0", // darker purple
            borderRadius: "16px",
            padding: "1.5rem",
            minHeight: "70vh",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          }}
        >
          <h3
            style={{
              marginBottom: "1rem",
              fontSize: "1.8rem",
              textAlign: "center",
            }}
          >
            Suspicious Activity
          </h3>
          <p style={{ textAlign: "center", opacity: 0.8 }}>
            Logs or alerts about recent unusual actions will appear here.
          </p>
        </div>

        {/* Right box */}
        <div
          style={{
            flex: 1,
            background: "#a24ce0", // darker purple
            borderRadius: "16px",
            padding: "1.5rem",
            minHeight: "70vh",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          }}
        >
          <h3
            style={{
              marginBottom: "1rem",
              fontSize: "1.8rem",
              textAlign: "center",
            }}
          >
            History
          </h3>
          <p style={{ textAlign: "center", opacity: 0.8 }}>
            Past activity records or completed actions will be listed here.
          </p>
        </div>
      </div>

      {/* Menu button */}
      <button
        aria-label="Open menu"
        onClick={() => router.push("/")}
        style={{
          position: "fixed",
          left: 70,
          bottom: 20,
          background: "#e63946",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          padding: "1rem 1.5rem",
          cursor: "pointer",
          boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
        }}
      >
        Menu
      </button>
    </div>
  );
}