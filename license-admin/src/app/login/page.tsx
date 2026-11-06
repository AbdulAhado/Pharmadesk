"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin@pharmadesk.pk");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      }).then((r) => r.json());

      if (data.success) {
        localStorage.setItem("pd_admin_token", data.token);
        router.push("/");
      } else {
        setError(data.message || "Invalid administrator credentials");
      }
    } catch {
      setError("Server connection failure.");
    }
    setLoading(false);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        background: "radial-gradient(circle at 50% 50%, #031024 0%, #010712 60%, #000308 100%)",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        boxSizing: "border-box",
        userSelect: "none",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Outer Glow Backdrop */}
      <div
        style={{
          position: "absolute",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: "rgba(0, 102, 255, 0.08)",
          filter: "blur(120px)",
          pointerEvents: "none",
        }}
      />

      {/* Main Login Window / Card (Exact Match to Screenshot) */}
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          borderRadius: "24px",
          padding: "36px 36px 30px",
          color: "#FFFFFF",
          position: "relative",
          overflow: "hidden",
          border: "1.5px solid rgba(30, 95, 210, 0.5)",
          background: "radial-gradient(circle at 100% 0%, #082658 0%, #04122C 45%, #020919 100%)",
          boxShadow: "0 0 50px rgba(15, 80, 200, 0.3), 0 25px 65px rgba(0, 0, 0, 0.9), inset 0 1px 1px rgba(255, 255, 255, 0.15)",
          boxSizing: "border-box",
        }}
      >
        {/* Subtle Wave Accents in Background */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            left: "-100px",
            width: "280px",
            height: "280px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(25, 90, 200, 0.22) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-100px",
            right: "-100px",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(15, 75, 180, 0.25) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Window Top Controls (— and ✕) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "12px",
            color: "#6B8BB5",
            marginBottom: "16px",
            position: "relative",
            zIndex: 2,
          }}
        >
          <button
            type="button"
            style={{
              background: "none",
              border: "none",
              color: "#6B8BB5",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
            }}
            title="Minimize"
          >
            <svg width="14" height="2" viewBox="0 0 14 2" fill="currentColor">
              <rect width="14" height="2" rx="1" />
            </svg>
          </button>
          <button
            type="button"
            style={{
              background: "none",
              border: "none",
              color: "#6B8BB5",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
            }}
            title="Close"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8">
              <line x1="1" y1="1" x2="11" y2="11" />
              <line x1="11" y1="1" x2="1" y2="11" />
            </svg>
          </button>
        </div>

        {/* Center Logo & Title Section */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            position: "relative",
            zIndex: 2,
          }}
        >
          {/* Blue Cross with Green Leaf Logo */}
          <div
            style={{
              width: "84px",
              height: "84px",
              marginBottom: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src="/pharma-logo.png"
              alt="PharmaDesk Logo"
              style={{
                width: "84px",
                height: "84px",
                maxWidth: "84px",
                maxHeight: "84px",
                objectFit: "contain",
                filter: "drop-shadow(0 4px 18px rgba(41, 152, 255, 0.45))",
              }}
            />
          </div>

          {/* Title: Pharma (White) + Desk (Cyan-Blue) */}
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center" }}>
            <span
              style={{
                fontSize: "36px",
                fontWeight: 700,
                color: "#FFFFFF",
                letterSpacing: "-0.02em",
                lineHeight: "1.1",
              }}
            >
              Pharma
            </span>
            <span
              style={{
                fontSize: "36px",
                fontWeight: 700,
                color: "#2998FF",
                letterSpacing: "-0.02em",
                lineHeight: "1.1",
              }}
            >
              Desk
            </span>
          </div>

          {/* Subtitle Divider: —— Admin Login —— */}
          <div
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              margin: "18px 0 20px",
            }}
          >
            <div
              style={{
                height: "1px",
                flex: 1,
                background: "linear-gradient(to right, transparent, #1A4072)",
              }}
            />
            <span
              style={{
                fontSize: "13px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#7E9EC6",
                fontWeight: 500,
                whiteSpace: "nowrap",
              }}
            >
              Admin Login
            </span>
            <div
              style={{
                height: "1px",
                flex: 1,
                background: "linear-gradient(to left, transparent, #1A4072)",
              }}
            />
          </div>
        </div>

        {error && (
          <div
            style={{
              marginBottom: "16px",
              padding: "10px 14px",
              borderRadius: "12px",
              background: "rgba(120, 20, 30, 0.7)",
              border: "1px solid rgba(220, 50, 70, 0.6)",
              color: "#FFA6B2",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px", position: "relative", zIndex: 2 }}>
          {/* Admin Username Input */}
          <div
            style={{
              height: "52px",
              padding: "0 16px",
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              background: "rgba(6, 22, 48, 0.85)",
              border: "1.2px solid #1A4174",
              boxSizing: "border-box",
            }}
          >
            {/* User Icon */}
            <span style={{ color: "#7E9EC6", display: "flex", alignItems: "center", flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
              </svg>
            </span>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Admin Username"
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: "14px",
                color: "#FFFFFF",
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Password Input */}
          <div
            style={{
              height: "52px",
              padding: "0 16px",
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              background: "rgba(6, 22, 48, 0.85)",
              border: "1.2px solid #1A4174",
              boxSizing: "border-box",
            }}
          >
            {/* Padlock Icon */}
            <span style={{ color: "#7E9EC6", display: "flex", alignItems: "center", flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
              </svg>
            </span>
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: "14px",
                color: "#FFFFFF",
                fontFamily: "inherit",
              }}
            />
            {/* Toggle Eye Button */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                background: "none",
                border: "none",
                color: "#7E9EC6",
                cursor: "pointer",
                padding: "2px",
                display: "flex",
                alignItems: "center",
                flexShrink: 0,
              }}
              title={showPassword ? "Hide Password" : "Show Password"}
            >
              {showPassword ? (
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              ) : (
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              )}
            </button>
          </div>

          {/* Sign In Button */}
          <div style={{ paddingTop: "6px" }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                height: "52px",
                borderRadius: "14px",
                border: "none",
                color: "#FFFFFF",
                fontWeight: 600,
                fontSize: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                cursor: loading ? "not-allowed" : "pointer",
                background: "linear-gradient(180deg, #1C8EFF 0%, #0060E6 100%)",
                boxShadow: "0 6px 25px rgba(0, 96, 230, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.35)",
                transition: "opacity 0.2s, transform 0.1s",
                fontFamily: "inherit",
              }}
            >
              {loading ? (
                <span>Signing In...</span>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" />
                    <line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                  <span>Sign In</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Bottom Secure Access Footer */}
        <div
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            marginTop: "28px",
            paddingTop: "16px",
            position: "relative",
            zIndex: 2,
          }}
        >
          <div
            style={{
              height: "1px",
              flex: 1,
              background: "linear-gradient(to right, transparent, #153662)",
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: "#4A6C98",
              fontSize: "12px",
              fontWeight: 500,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>Secure Access</span>
          </div>
          <div
            style={{
              height: "1px",
              flex: 1,
              background: "linear-gradient(to left, transparent, #153662)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
