// "use client";
// import React, { useState, useEffect, useMemo } from "react";

// // ─── Token & Auth Helpers ───
// function getToken(): string | null {
//   if (typeof window === "undefined") return null;
//   return localStorage.getItem("pd_admin_token");
// }
// function setToken(token: string) {
//   localStorage.setItem("pd_admin_token", token);
// }
// function clearToken() {
//   localStorage.removeItem("pd_admin_token");
// }
// function authHeaders() {
//   return {
//     Authorization: `Bearer ${getToken()}`,
//     "Content-Type": "application/json",
//   };
// }

// async function api(path: string, opts: RequestInit = {}) {
//   const res = await fetch(path, {
//     ...opts,
//     headers: { ...authHeaders(), ...(opts.headers || {}) },
//   });
//   return res.json();
// }

// // ─── Interfaces ───
// interface Stats {
//   totalCustomers: number;
//   totalSubscriptions: number;
//   activeSubscriptions: number;
//   expiredSubscriptions: number;
//   lifetimeSubscriptions: number;
//   freeTrialUsers: number;
//   registeredDevices: number;
//   pendingRenewalsCount: number;
//   totalRevenuePKR: number;
// }

// interface Subscription {
//   id: string;
//   licenseKey: string;
//   pharmacyName: string;
//   customerId?: string;
//   deviceId: string;
//   plan: string;
//   durationDays?: number;
//   isLifetime: boolean;
//   status: string;
//   expiryDate: string | null;
//   lastIssuedEnvelope?: any;
//   createdAt: string;
// }

// interface RenewalRequest {
//   id: string;
//   requestNumber: string;
//   deviceId: string;
//   requestedPlan: string;
//   planName: string;
//   pricePKR?: number;
//   customerName: string;
//   customerPhone: string;
//   paymentReference: string;
//   notes?: string;
//   status: "PENDING" | "APPROVED" | "REJECTED";
//   createdAt: string;
// }

// interface DeviceRecord {
//   id: string;
//   deviceId: string;
//   licenseKey: string;
//   pharmacyName: string;
//   boundAt: string;
//   isActive: boolean;
// }

// interface AuditLog {
//   eventType: string;
//   details: string;
//   timestamp: string;
//   licenseKey?: string;
//   deviceId?: string;
// }

// // ═════════════════════════════════════════════════════════════════════
// // 1. LOGIN SCREEN (Exact Match to Uploaded Screenshot)
// // ═════════════════════════════════════════════════════════════════════
// function LoginScreen({ onLogin }: { onLogin: () => void }) {
//   const [username, setUsername] = useState("admin@pharmadesk.pk");
//   const [password, setPassword] = useState("");
//   const [showPassword, setShowPassword] = useState(false);
//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);

//   async function handleSubmit(e: React.FormEvent) {
//     e.preventDefault();
//     setLoading(true);
//     setError("");
//     try {
//       const data = await fetch("/api/auth/login", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ username, password }),
//       }).then((r) => r.json());

//       if (data.success) {
//         setToken(data.token);
//         onLogin();
//       } else {
//         setError(data.message || "Invalid administrator credentials");
//       }
//     } catch {
//       setError("Server connection failure.");
//     }
//     setLoading(false);
//   }

//   return (
//     <div
//       style={{
//         minHeight: "100vh",
//         width: "100vw",
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "center",
//         padding: "20px",
//         background: "radial-gradient(circle at 50% 50%, #031024 0%, #010712 60%, #000308 100%)",
//         fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
//         boxSizing: "border-box",
//         userSelect: "none",
//         position: "relative",
//         overflow: "hidden",
//       }}
//     >
//       {/* Outer Glow Backdrop */}
//       <div
//         style={{
//           position: "absolute",
//           width: "600px",
//           height: "600px",
//           borderRadius: "50%",
//           background: "rgba(0, 102, 255, 0.08)",
//           filter: "blur(120px)",
//           pointerEvents: "none",
//         }}
//       />

//       {/* Main Login Window / Card (Exact Match to Screenshot) */}
//       <div
//         style={{
//           width: "100%",
//           maxWidth: "460px",
//           borderRadius: "24px",
//           padding: "36px 36px 30px",
//           color: "#FFFFFF",
//           position: "relative",
//           overflow: "hidden",
//           border: "1.5px solid rgba(30, 95, 210, 0.5)",
//           background: "radial-gradient(circle at 100% 0%, #082658 0%, #04122C 45%, #020919 100%)",
//           boxShadow: "0 0 50px rgba(15, 80, 200, 0.3), 0 25px 65px rgba(0, 0, 0, 0.9), inset 0 1px 1px rgba(255, 255, 255, 0.15)",
//           boxSizing: "border-box",
//         }}
//       >
//         {/* Subtle Wave Accents in Background */}
//         <div
//           style={{
//             position: "absolute",
//             top: "-100px",
//             left: "-100px",
//             width: "280px",
//             height: "280px",
//             borderRadius: "50%",
//             background: "radial-gradient(circle, rgba(25, 90, 200, 0.22) 0%, transparent 70%)",
//             pointerEvents: "none",
//           }}
//         />
//         <div
//           style={{
//             position: "absolute",
//             bottom: "-100px",
//             right: "-100px",
//             width: "300px",
//             height: "300px",
//             borderRadius: "50%",
//             background: "radial-gradient(circle, rgba(15, 75, 180, 0.25) 0%, transparent 70%)",
//             pointerEvents: "none",
//           }}
//         />

//         {/* Window Top Controls (— and ✕) */}
//         <div
//           style={{
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "flex-end",
//             gap: "12px",
//             color: "#6B8BB5",
//             marginBottom: "16px",
//             position: "relative",
//             zIndex: 2,
//           }}
//         >
//           <button
//             type="button"
//             style={{
//               background: "none",
//               border: "none",
//               color: "#6B8BB5",
//               cursor: "pointer",
//               padding: "4px",
//               display: "flex",
//               alignItems: "center",
//             }}
//             title="Minimize"
//           >
//             <svg width="14" height="2" viewBox="0 0 14 2" fill="currentColor">
//               <rect width="14" height="2" rx="1" />
//             </svg>
//           </button>
//           <button
//             type="button"
//             style={{
//               background: "none",
//               border: "none",
//               color: "#6B8BB5",
//               cursor: "pointer",
//               padding: "4px",
//               display: "flex",
//               alignItems: "center",
//             }}
//             title="Close"
//           >
//             <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8">
//               <line x1="1" y1="1" x2="11" y2="11" />
//               <line x1="11" y1="1" x2="1" y2="11" />
//             </svg>
//           </button>
//         </div>

//         {/* Center Logo & Title Section */}
//         <div
//           style={{
//             display: "flex",
//             flexDirection: "column",
//             alignItems: "center",
//             textAlign: "center",
//             position: "relative",
//             zIndex: 2,
//           }}
//         >
//           {/* Blue Cross with Green Leaf Logo */}
//           <div
//             style={{
//               width: "84px",
//               height: "84px",
//               marginBottom: "14px",
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "center",
//             }}
//           >
//             <img
//               src="/pharma-logo.png"
//               alt="PharmaDesk Logo"
//               style={{
//                 width: "84px",
//                 height: "84px",
//                 maxWidth: "84px",
//                 maxHeight: "84px",
//                 objectFit: "contain",
//                 filter: "drop-shadow(0 4px 18px rgba(41, 152, 255, 0.45))",
//               }}
//             />
//           </div>

//           {/* Title: Pharma (White) + Desk (Cyan-Blue) */}
//           <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center" }}>
//             <span
//               style={{
//                 fontSize: "36px",
//                 fontWeight: 700,
//                 color: "#FFFFFF",
//                 letterSpacing: "-0.02em",
//                 lineHeight: "1.1",
//               }}
//             >
//               Pharma
//             </span>
//             <span
//               style={{
//                 fontSize: "36px",
//                 fontWeight: 700,
//                 color: "#2998FF",
//                 letterSpacing: "-0.02em",
//                 lineHeight: "1.1",
//               }}
//             >
//               Desk
//             </span>
//           </div>

//           {/* Subtitle Divider: —— Admin Login —— */}
//           <div
//             style={{
//               width: "100%",
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "center",
//               gap: "12px",
//               margin: "18px 0 20px",
//             }}
//           >
//             <div
//               style={{
//                 height: "1px",
//                 flex: 1,
//                 background: "linear-gradient(to right, transparent, #1A4072)",
//               }}
//             />
//             <span
//               style={{
//                 fontSize: "13px",
//                 letterSpacing: "0.16em",
//                 textTransform: "uppercase",
//                 color: "#7E9EC6",
//                 fontWeight: 500,
//                 whiteSpace: "nowrap",
//               }}
//             >
//               Admin Login
//             </span>
//             <div
//               style={{
//                 height: "1px",
//                 flex: 1,
//                 background: "linear-gradient(to left, transparent, #1A4072)",
//               }}
//             />
//           </div>
//         </div>

//         {error && (
//           <div
//             style={{
//               marginBottom: "16px",
//               padding: "10px 14px",
//               borderRadius: "12px",
//               background: "rgba(120, 20, 30, 0.7)",
//               border: "1px solid rgba(220, 50, 70, 0.6)",
//               color: "#FFA6B2",
//               fontSize: "12px",
//               display: "flex",
//               alignItems: "center",
//               gap: "8px",
//             }}
//           >
//             <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//               <circle cx="12" cy="12" r="10" />
//               <line x1="12" y1="8" x2="12" y2="12" />
//               <line x1="12" y1="16" x2="12.01" y2="16" />
//             </svg>
//             <span>{error}</span>
//           </div>
//         )}

//         {/* Input Form */}
//         <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px", position: "relative", zIndex: 2 }}>
//           {/* Admin Username Input */}
//           <div
//             style={{
//               height: "52px",
//               padding: "0 16px",
//               borderRadius: "14px",
//               display: "flex",
//               alignItems: "center",
//               gap: "12px",
//               background: "rgba(6, 22, 48, 0.85)",
//               border: "1.2px solid #1A4174",
//               boxSizing: "border-box",
//             }}
//           >
//             {/* User Icon */}
//             <span style={{ color: "#7E9EC6", display: "flex", alignItems: "center", flexShrink: 0 }}>
//               <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
//                 <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
//               </svg>
//             </span>
//             <input
//               type="text"
//               required
//               value={username}
//               onChange={(e) => setUsername(e.target.value)}
//               placeholder="Admin Username"
//               style={{
//                 width: "100%",
//                 background: "transparent",
//                 border: "none",
//                 outline: "none",
//                 fontSize: "14px",
//                 color: "#FFFFFF",
//                 fontFamily: "inherit",
//               }}
//             />
//           </div>

//           {/* Password Input */}
//           <div
//             style={{
//               height: "52px",
//               padding: "0 16px",
//               borderRadius: "14px",
//               display: "flex",
//               alignItems: "center",
//               gap: "12px",
//               background: "rgba(6, 22, 48, 0.85)",
//               border: "1.2px solid #1A4174",
//               boxSizing: "border-box",
//             }}
//           >
//             {/* Padlock Icon */}
//             <span style={{ color: "#7E9EC6", display: "flex", alignItems: "center", flexShrink: 0 }}>
//               <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
//                 <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
//               </svg>
//             </span>
//             <input
//               type={showPassword ? "text" : "password"}
//               required
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               placeholder="Password"
//               style={{
//                 width: "100%",
//                 background: "transparent",
//                 border: "none",
//                 outline: "none",
//                 fontSize: "14px",
//                 color: "#FFFFFF",
//                 fontFamily: "inherit",
//               }}
//             />
//             {/* Toggle Eye Button */}
//             <button
//               type="button"
//               onClick={() => setShowPassword(!showPassword)}
//               style={{
//                 background: "none",
//                 border: "none",
//                 color: "#7E9EC6",
//                 cursor: "pointer",
//                 padding: "2px",
//                 display: "flex",
//                 alignItems: "center",
//                 flexShrink: 0,
//               }}
//               title={showPassword ? "Hide Password" : "Show Password"}
//             >
//               {showPassword ? (
//                 <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//                   <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
//                   <circle cx="12" cy="12" r="3" />
//                 </svg>
//               ) : (
//                 <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//                   <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
//                   <line x1="1" y1="1" x2="23" y2="23" />
//                 </svg>
//               )}
//             </button>
//           </div>

//           {/* Sign In Button */}
//           <div style={{ paddingTop: "6px" }}>
//             <button
//               type="submit"
//               disabled={loading}
//               style={{
//                 width: "100%",
//                 height: "52px",
//                 borderRadius: "14px",
//                 border: "none",
//                 color: "#FFFFFF",
//                 fontWeight: 600,
//                 fontSize: "16px",
//                 display: "flex",
//                 alignItems: "center",
//                 justifyContent: "center",
//                 gap: "10px",
//                 cursor: loading ? "not-allowed" : "pointer",
//                 background: "linear-gradient(180deg, #1C8EFF 0%, #0060E6 100%)",
//                 boxShadow: "0 6px 25px rgba(0, 96, 230, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.35)",
//                 transition: "opacity 0.2s, transform 0.1s",
//                 fontFamily: "inherit",
//               }}
//             >
//               {loading ? (
//                 <span>Signing In...</span>
//               ) : (
//                 <>
//                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
//                     <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
//                     <polyline points="10 17 15 12 10 7" />
//                     <line x1="15" y1="12" x2="3" y2="12" />
//                   </svg>
//                   <span>Sign In</span>
//                 </>
//               )}
//             </button>
//           </div>
//         </form>

//         {/* Bottom Secure Access Footer */}
//         <div
//           style={{
//             width: "100%",
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "center",
//             gap: "12px",
//             marginTop: "28px",
//             paddingTop: "16px",
//             position: "relative",
//             zIndex: 2,
//           }}
//         >
//           <div
//             style={{
//               height: "1px",
//               flex: 1,
//               background: "linear-gradient(to right, transparent, #153662)",
//             }}
//           />
//           <div
//             style={{
//               display: "flex",
//               alignItems: "center",
//               gap: "6px",
//               color: "#4A6C98",
//               fontSize: "12px",
//               fontWeight: 500,
//             }}
//           >
//             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//               <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
//             </svg>
//             <span>Secure Access</span>
//           </div>
//           <div
//             style={{
//               height: "1px",
//               flex: 1,
//               background: "linear-gradient(to left, transparent, #153662)",
//             }}
//           />
//         </div>
//       </div>
//     </div>
//   );
// }

// // ═════════════════════════════════════════════════════════════════════
// // 2. MAIN APPLICATION (Exact Minimal, Spacey, High-End Layout)
// // ═════════════════════════════════════════════════════════════════════
// export default function AdminPortal() {
//   const [loggedIn, setLoggedIn] = useState<boolean>(false);
//   const [activeTab, setActiveTab] = useState<"overview" | "subscriptions" | "renewals" | "devices">("overview");
//   const [stats, setStats] = useState<Stats | null>(null);
//   const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
//   const [issueModalOpen, setIssueModalOpen] = useState<boolean>(false);

//   useEffect(() => {
//     if (getToken()) setLoggedIn(true);
//   }, []);

//   const refreshStats = async () => {
//     try {
//       const data = await api("/api/stats");
//       if (data.success) {
//         setStats(data.stats);
//         setAuditLogs(data.recentActivity || []);
//       } else if (data.message === "Unauthorized") {
//         clearToken();
//         setLoggedIn(false);
//       }
//     } catch (_) { }
//   };

//   useEffect(() => {
//     if (loggedIn) {
//       refreshStats();
//       const interval = setInterval(refreshStats, 30000);
//       return () => clearInterval(interval);
//     }
//   }, [loggedIn]);

//   function handleLogout() {
//     clearToken();
//     setLoggedIn(false);
//   }

//   if (!loggedIn) {
//     return <LoginScreen onLogin={() => setLoggedIn(true)} />;
//   }

//   return (
//     <div className="min-h-screen bg-[#F5F7F8] text-[#1E293B]">
//       {/* ── TOP NAV BAR (Matches Screenshots 2, 3, 4) ── */}
//       <header className="bg-white border-b border-[#E6EBF0] h-14 sticky top-0 z-30 px-6 flex items-center justify-between">
//         <div className="flex items-center gap-8">
//           {/* Logo Brand */}
//           <div className="flex items-center gap-2.5">
//             <div className="w-7 h-7 rounded-lg flex items-center justify-center p-1" style={{ background: "#0A2E2C" }}>
//               <img src="/pharma-logo.png" alt="Logo" className="w-full h-full object-contain" />
//             </div>
//             <span className="font-editorial text-lg font-semibold tracking-tight text-[#0F172A]">PharmaDesk</span>
//             <span className="tag-badge bg-[#E6F4F1] text-[#0F766E] border border-[#BCE3DD]">
//               SEC-GOV
//             </span>
//           </div>

//           {/* Nav Tabs */}
//           <nav className="flex items-center gap-1 h-14">
//             {[
//               { id: "overview", label: "Overview" },
//               { id: "subscriptions", label: "Subscriptions" },
//               { id: "renewals", label: "Renewals", badge: stats?.pendingRenewalsCount },
//               { id: "devices", label: "Hardware Locks" },
//             ].map((tab) => (
//               <button
//                 key={tab.id}
//                 onClick={() => setActiveTab(tab.id as any)}
//                 className={`h-14 px-3.5 text-xs transition flex items-center gap-1.5 border-b-2 font-medium ${activeTab === tab.id
//                   ? "border-[#0F766E] text-[#0F766E] font-semibold"
//                   : "border-transparent text-[#64748B] hover:text-[#0F172A]"
//                   }`}
//               >
//                 <span>{tab.label}</span>
//                 {Boolean(tab.badge && tab.badge > 0) && (
//                   <span className="w-4 h-4 rounded-full bg-[#F59E0B] text-[#0F172A] text-[9.5px] font-bold flex items-center justify-center">
//                     {tab.badge}
//                   </span>
//                 )}
//               </button>
//             ))}
//           </nav>
//         </div>

//         {/* Right Status & Actions */}
//         <div className="flex items-center gap-3">
//           <div className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono text-[#0F766E] bg-[#F0FDFA] border border-[#CCFBF1]">
//             <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
//             <span>Cluster Active</span>
//           </div>

//           <button
//             onClick={() => setIssueModalOpen(true)}
//             className="h-8 px-3 rounded-lg text-xs font-semibold text-white transition flex items-center gap-1.5 shadow-sm hover:brightness-105"
//             style={{ background: "#0F766E" }}
//           >
//             <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
//             <span>+ Issue New License</span>
//           </button>

//           <button
//             onClick={handleLogout}
//             title="Log Out"
//             className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs transition ml-1"
//           >
//             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
//           </button>
//         </div>
//       </header>

//       {/* ── MAIN CONTENT CONTAINER (Spacey, Minimal, Refined) ── */}
//       <main className="max-w-6xl mx-auto px-6 py-8">
//         {activeTab === "overview" && (
//           <OverviewView
//             stats={stats}
//             auditLogs={auditLogs}
//             onOpenIssue={() => setIssueModalOpen(true)}
//             onNavigate={(tab) => setActiveTab(tab as any)}
//           />
//         )}

//         {activeTab === "subscriptions" && (
//           <SubscriptionsView
//             onOpenIssue={() => setIssueModalOpen(true)}
//             onRefresh={refreshStats}
//           />
//         )}

//         {activeTab === "renewals" && (
//           <RenewalsView onRefresh={refreshStats} />
//         )}

//         {activeTab === "devices" && (
//           <DevicesView onRefresh={refreshStats} />
//         )}
//       </main>

//       {/* ── ISSUE LICENSE MODAL ── */}
//       {issueModalOpen && (
//         <IssueLicenseModal
//           onClose={() => setIssueModalOpen(false)}
//           onSuccess={() => {
//             refreshStats();
//             setActiveTab("subscriptions");
//           }}
//         />
//       )}
//     </div>
//   );
// }

// // ═════════════════════════════════════════════════════════════════════
// // 3. OVERVIEW VIEW (Screenshot 2: Minimal, Spacey, High-End Serif)
// // ═════════════════════════════════════════════════════════════════════
// function OverviewView({
//   stats,
//   auditLogs,
//   onOpenIssue,
//   onNavigate,
// }: {
//   stats: Stats | null;
//   auditLogs: AuditLog[];
//   onOpenIssue: () => void;
//   onNavigate: (tab: string) => void;
// }) {
//   return (
//     <div className="space-y-8">
//       {/* Top Welcome Header */}
//       <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
//         <div>
//           <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold tracking-wide bg-[#E6F4F1] text-[#0F766E] border border-[#BCE3DD] mb-2">
//             <span>● NODE AUTHORITY 01 - MASTER ROOT</span>
//             <span className="text-[#94A3B8]">· Rate 4.6/5.0 QTS</span>
//           </div>

//           <h2 className="font-editorial text-3xl font-normal tracking-tight text-[#0F172A]">
//             Welcome back, Tariq
//           </h2>
//           <p className="text-xs text-[#64748B] mt-1 max-w-xl font-normal leading-relaxed">
//             All cryptographic licensing nodes and database syncs are operating normally.{" "}
//             {stats?.pendingRenewalsCount ? `${stats.pendingRenewalsCount} licenses require your sign-off today.` : "Zero critical anomalies detected."}
//           </p>
//         </div>

//         <div className="flex items-center gap-2.5">
//           <button
//             onClick={onOpenIssue}
//             className="h-9 px-4 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5 shadow-sm hover:brightness-105"
//             style={{ background: "#0F766E" }}
//           >
//             <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
//             <span>+ Issue New License</span>
//           </button>
//         </div>
//       </div>

//       {/* Row 1: 2 Wide Spacey Hero Cards */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//         {/* Card 1: Fiscal Inflow */}
//         <div className="minimal-card p-6 flex flex-col justify-between min-h-[190px]">
//           <div>
//             <div className="flex items-center justify-between">
//               <span className="text-[10.5px] font-mono uppercase tracking-wider text-[#64748B] font-semibold">
//                 Fiscal Cycle Q1 — Net Authority Inflow
//               </span>
//               <span className="tag-badge bg-[#ECFDF5] text-[#027A48] border border-[#A6F4C5]">
//                 +18.4%
//               </span>
//             </div>

//             <div className="mt-3 flex items-baseline gap-1.5">
//               <span className="text-sm font-semibold text-[#64748B]">Rs</span>
//               <span className="font-editorial text-3xl font-medium tracking-tight text-[#0F172A]">
//                 {Number(stats?.totalRevenuePKR || 1450000).toLocaleString()}
//               </span>
//             </div>
//           </div>

//           {/* 3 Minimal Bottom Stats */}
//           <div className="pt-4 mt-4 border-t border-[#F1F5F9] grid grid-cols-3 gap-2 text-center md:text-left">
//             <div>
//               <div className="text-[10px] text-[#94A3B8] uppercase font-semibold">Active Pharmacies</div>
//               <div className="text-sm font-semibold text-[#0F172A] mt-0.5">{stats?.activeSubscriptions || 524}</div>
//             </div>
//             <div>
//               <div className="text-[10px] text-[#94A3B8] uppercase font-semibold">Annual Renewals</div>
//               <div className="text-sm font-semibold text-[#0F172A] mt-0.5">96.2%</div>
//             </div>
//             <div>
//               <div className="text-[10px] text-[#94A3B8] uppercase font-semibold">Recovery Window</div>
//               <div className="text-sm font-semibold text-[#0F172A] mt-0.5">30 Days</div>
//             </div>
//           </div>
//         </div>

//         {/* Card 2: Hardware Security Module */}
//         <div className="minimal-card p-6 flex flex-col justify-between min-h-[190px]">
//           <div>
//             <div className="flex items-center justify-between">
//               <span className="text-[10.5px] font-mono uppercase tracking-wider text-[#64748B] font-semibold">
//                 Hardware Security Module (HSM)
//               </span>
//               <span className="tag-badge bg-[#F0FDFA] text-[#0F766E] border border-[#CCFBF1]">
//                 ● Ed25519 Deployed
//               </span>
//             </div>

//             <div className="mt-3 flex items-baseline gap-2">
//               <span className="font-editorial text-3xl font-medium tracking-tight text-[#0F172A]">
//                 {stats?.registeredDevices || 618}
//               </span>
//               <span className="text-xs text-[#64748B]">Locked Workstations</span>
//             </div>

//             {/* Clean Progress Bars */}
//             <div className="mt-4 space-y-2">
//               <div className="flex justify-between text-[10.5px] font-mono text-[#64748B]">
//                 <span>Cryptographic Node Mesh Sync</span>
//                 <span className="text-[#0F766E] font-semibold">99.82%</span>
//               </div>
//               <div className="w-full h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
//                 <div className="h-full bg-[#0F766E] rounded-full" style={{ width: "99.82%" }} />
//               </div>
//             </div>
//           </div>

//           <div className="pt-4 mt-4 border-t border-[#F1F5F9] grid grid-cols-3 gap-2">
//             <div>
//               <div className="text-[10px] text-[#94A3B8] uppercase font-semibold">Clone Alert</div>
//               <div className="text-sm font-semibold text-[#10B981] mt-0.5">0 Detected</div>
//             </div>
//             <div>
//               <div className="text-[10px] text-[#94A3B8] uppercase font-semibold">Latency (Atlas)</div>
//               <div className="text-sm font-semibold text-[#0F172A] mt-0.5 font-mono">12 ms</div>
//             </div>
//             <div>
//               <div className="text-[10px] text-[#94A3B8] uppercase font-semibold">Root Anomalies</div>
//               <div className="text-sm font-semibold text-[#0F172A] mt-0.5">None</div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Row 2: Spacey Two Column Split */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//         {/* Left Column: Pending Renewals */}
//         <div className="minimal-card p-6">
//           <div className="flex items-center justify-between mb-4">
//             <div>
//               <h3 className="text-sm font-semibold text-[#0F172A]">Pending Renewals &amp; Inflows</h3>
//               <p className="text-[11px] text-[#64748B] mt-0.5">Payment submissions waiting for cryptographic payload issue</p>
//             </div>
//             <button
//               onClick={() => onNavigate("renewals")}
//               className="text-xs text-[#0F766E] hover:underline font-semibold"
//             >
//               View All ({stats?.pendingRenewalsCount || 0}) →
//             </button>
//           </div>

//           <div className="space-y-3">
//             {[
//               { name: "Al-Shifa Medicos", amount: "Rs 24,000 via EasyPaisa", ref: "AEP-98218" },
//               { name: "CareWell Clinical Hub", amount: "Rs 18,000 via Meezan FT", ref: "JMZ-44109" },
//               { name: "Ziauddin Annex Pharmacy", amount: "Rs 52,000 via Bank Alfalah", ref: "SRA-11203" },
//             ].map((item, idx) => (
//               <div
//                 key={idx}
//                 className="p-3.5 rounded-lg border border-[#E6EBF0] bg-[#FAFCFD] flex items-center justify-between hover:border-[#CBD5E1] transition"
//               >
//                 <div>
//                   <div className="text-xs font-semibold text-[#0F172A]">{item.name}</div>
//                   <div className="text-[11px] text-[#64748B] mt-0.5">
//                     {item.amount} · Ref: <span className="font-mono text-[#0F766E]">{item.ref}</span>
//                   </div>
//                 </div>
//                 <button
//                   onClick={() => onNavigate("renewals")}
//                   className="px-2.5 py-1 rounded text-xs font-semibold bg-white border border-[#CBD5E1] text-[#0F766E] hover:bg-[#F0FDFA] transition"
//                 >
//                   Review &amp; Sign
//                 </button>
//               </div>
//             ))}
//           </div>
//         </div>

//         {/* Right Column: Administrative Operations */}
//         <div className="minimal-card p-6">
//           <div className="mb-4">
//             <h3 className="text-sm font-semibold text-[#0F172A]">Administrative Operations</h3>
//             <p className="text-[11px] text-[#64748B] mt-0.5">Direct controls for Tier-1 compliance and emergency authority actions</p>
//           </div>

//           <div className="space-y-3">
//             <button
//               onClick={() => onNavigate("subscriptions")}
//               className="w-full p-3.5 rounded-lg border border-[#E6EBF0] bg-[#FAFCFD] hover:bg-white text-left transition flex items-center justify-between group"
//             >
//               <div>
//                 <div className="text-xs font-semibold text-[#0F172A] group-hover:text-[#0F766E]">Extend License Validity</div>
//                 <div className="text-[11px] text-[#64748B] mt-0.5">Re-issue signed certificate window without hardware re-pairing</div>
//               </div>
//               <span className="text-[#94A3B8] group-hover:text-[#0F766E]">→</span>
//             </button>

//             <button
//               onClick={() => onOpenIssue()}
//               className="w-full p-3.5 rounded-lg border border-[#E6EBF0] bg-[#FAFCFD] hover:bg-white text-left transition flex items-center justify-between group"
//             >
//               <div>
//                 <div className="text-xs font-semibold text-[#0F172A] group-hover:text-[#0F766E]">Issue Signed Envelope</div>
//                 <div className="text-[11px] text-[#64748B] mt-0.5">Generate standalone offline JSON certificate for air-gapped stores</div>
//               </div>
//               <span className="text-[#94A3B8] group-hover:text-[#0F766E]">→</span>
//             </button>

//             <button
//               onClick={() => onNavigate("devices")}
//               className="w-full p-3.5 rounded-lg border border-[#E6EBF0] bg-[#FAFCFD] hover:bg-white text-left transition flex items-center justify-between group"
//             >
//               <div>
//                 <div className="text-xs font-semibold text-[#0F172A] group-hover:text-[#0F766E]">Release Workstation Lock</div>
//                 <div className="text-[11px] text-[#64748B] mt-0.5">Clear motherboard/CPU UUID binding for approved hardware transfers</div>
//               </div>
//               <span className="text-[#94A3B8] group-hover:text-[#0F766E]">→</span>
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* Row 3: Hardware Audit Trace Table */}
//       <div className="minimal-card overflow-hidden">
//         <div className="p-5 border-b border-[#E6EBF0] flex items-center justify-between">
//           <div>
//             <h3 className="text-sm font-semibold text-[#0F172A]">Hardware Audit &amp; Cryptographic Trace</h3>
//             <p className="text-[11px] text-[#64748B] mt-0.5">Real-time ledger events recorded across regional client nodes</p>
//           </div>
//           <span className="tag-badge bg-[#F0FDFA] text-[#0F766E] border border-[#CCFBF1]">
//             ● Live Sync
//           </span>
//         </div>

//         <div className="overflow-x-auto">
//           <table className="clean-table">
//             <thead>
//               <tr>
//                 <th>Pharmacy &amp; Location</th>
//                 <th>Action / Event</th>
//                 <th>Device Hash (UUID)</th>
//                 <th className="text-right">Timestamp</th>
//               </tr>
//             </thead>
//             <tbody>
//               {auditLogs.slice(0, 5).map((log, i) => (
//                 <tr key={i}>
//                   <td className="font-medium text-[#0F172A]">
//                     {log.details?.split("for ")[1]?.split(" on")[0] || "Regional Client Station"}
//                   </td>
//                   <td>
//                     <span className="tag-badge bg-[#E6F4F1] text-[#0F766E] border border-[#BCE3DD]">
//                       {log.eventType}
//                     </span>
//                   </td>
//                   <td>
//                     <code className="text-[11px] font-mono text-[#64748B]">
//                       {log.deviceId ? log.deviceId.slice(0, 16) + "..." : "PHD-ROOT-SYNC"}
//                     </code>
//                   </td>
//                   <td className="text-right text-xs text-[#94A3B8]">
//                     {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : "Just now"}
//                   </td>
//                 </tr>
//               ))}
//               {auditLogs.length === 0 && (
//                 <tr>
//                   <td colSpan={4} className="text-center py-8 text-xs text-[#94A3B8]">
//                     System operating normally. No anomaly entries.
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ═════════════════════════════════════════════════════════════════════
// // 4. SUBSCRIPTIONS VIEW (Screenshot 3: Minimal, Spacey Table)
// // ═════════════════════════════════════════════════════════════════════
// function SubscriptionsView({
//   onOpenIssue,
//   onRefresh,
// }: {
//   onOpenIssue: () => void;
//   onRefresh: () => void;
// }) {
//   const [subs, setSubs] = useState<Subscription[]>([]);
//   const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "EXPIRING" | "LIFETIME">("ALL");
//   const [search, setSearch] = useState<string>("");
//   const [extendingId, setExtendingId] = useState<string | null>(null);

//   const loadSubs = async () => {
//     const data = await api("/api/subscriptions");
//     if (data.success) setSubs(data.subscriptions || []);
//   };

//   useEffect(() => {
//     loadSubs();
//   }, []);

//   async function handleExtend(id: string) {
//     setExtendingId(id);
//     try {
//       const data = await api(`/api/subscriptions/${id}/extend`, {
//         method: "POST",
//         body: JSON.stringify({ additionalDays: 30 }),
//       });
//       if (data.success) {
//         alert(data.message);
//         loadSubs();
//         onRefresh();
//       }
//     } catch {
//       alert("Extension failed.");
//     }
//     setExtendingId(null);
//   }

//   function downloadJson(sub: Subscription) {
//     if (!sub.lastIssuedEnvelope) return alert("No cryptographic envelope available");
//     const blob = new Blob([JSON.stringify(sub.lastIssuedEnvelope, null, 2)], {
//       type: "application/json",
//     });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = `pharmadesk-license-${sub.licenseKey}.json`;
//     a.click();
//     URL.revokeObjectURL(url);
//   }

//   const filteredSubs = useMemo(() => {
//     return subs.filter((s) => {
//       const isExpired = !s.isLifetime && s.expiryDate && new Date(s.expiryDate).getTime() < Date.now();
//       if (filter === "ACTIVE" && isExpired) return false;
//       if (filter === "EXPIRING" && !isExpired) return false;
//       if (filter === "LIFETIME" && !s.isLifetime) return false;

//       if (!search) return true;
//       const q = search.toLowerCase();
//       return (
//         s.pharmacyName?.toLowerCase().includes(q) ||
//         s.licenseKey?.toLowerCase().includes(q) ||
//         s.deviceId?.toLowerCase().includes(q)
//       );
//     });
//   }, [subs, filter, search]);

//   return (
//     <div className="space-y-8">
//       {/* Top Header */}
//       <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
//         <div>
//           <div className="tag-badge bg-[#E6F4F1] text-[#0F766E] border border-[#BCE3DD] mb-2">
//             DRAP CENTRAL REGISTER SYNC - V4.12
//           </div>
//           <h2 className="font-editorial text-3xl font-normal tracking-tight text-[#0F172A]">
//             Subscriptions &amp; Client Licenses
//           </h2>
//           <p className="text-xs text-[#64748B] mt-1 font-normal">
//             Search, review, and manage active pharmacy licenses across Pakistan
//           </p>
//         </div>

//         <div className="flex items-center gap-2">
//           <button
//             onClick={onOpenIssue}
//             className="h-9 px-4 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5 shadow-sm hover:brightness-105"
//             style={{ background: "#0F766E" }}
//           >
//             <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
//             <span>+ New License</span>
//           </button>
//         </div>
//       </div>

//       {/* Row: 2 Clean Minimal Top Cards */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//         {/* Left: Active Deployments */}
//         <div className="minimal-card p-6 flex flex-col justify-between min-h-[160px]">
//           <div>
//             <div className="flex items-center justify-between">
//               <span className="text-[10.5px] font-mono uppercase tracking-wider text-[#64748B] font-semibold">
//                 Active Deployments · National Ledger
//               </span>
//               <span className="tag-badge bg-[#F0FDFA] text-[#0F766E] border border-[#CCFBF1]">
//                 Mesh/Cor Verified
//               </span>
//             </div>

//             <div className="mt-3 flex items-baseline gap-2">
//               <span className="font-editorial text-3xl font-medium tracking-tight text-[#0F172A]">
//                 {subs.length || 524}
//               </span>
//               <span className="text-xs text-[#64748B]">Live Pharmacy Nodes in Production</span>
//             </div>
//           </div>

//           <div className="pt-4 mt-4 border-t border-[#F1F5F9] grid grid-cols-3 gap-2">
//             <div>
//               <div className="text-[10px] text-[#94A3B8] uppercase font-semibold">Active Tier</div>
//               <div className="text-xs font-semibold text-[#027A48] mt-0.5">{subs.length || 482} nodes</div>
//             </div>
//             <div>
//               <div className="text-[10px] text-[#94A3B8] uppercase font-semibold">Expiring Soon</div>
//               <div className="text-xs font-semibold text-[#B42318] mt-0.5">14 stores</div>
//             </div>
//             <div>
//               <div className="text-[10px] text-[#94A3B8] uppercase font-semibold">Hospital Tier</div>
//               <div className="text-xs font-semibold text-[#175CD3] mt-0.5">28 perpetual</div>
//             </div>
//           </div>
//         </div>

//         {/* Right: Filter & Query Directory */}
//         <div className="minimal-card p-6 flex flex-col justify-between min-h-[160px]">
//           <div>
//             <div className="flex items-center justify-between mb-3">
//               <span className="text-[10.5px] font-mono uppercase tracking-wider text-[#64748B] font-semibold">
//                 Filter &amp; Query Directory
//               </span>
//               <span className="text-[10px] font-mono text-[#94A3B8]">SNAP SYNC · OK</span>
//             </div>

//             <input
//               type="text"
//               placeholder="Search by pharmacy name, license key, or city..."
//               value={search}
//               onChange={(e) => setSearch(e.target.value)}
//               className="w-full px-3.5 py-2 rounded-lg text-xs border border-[#E6EBF0] bg-[#FAFCFD] focus:bg-white focus:border-[#0F766E] outline-none transition"
//             />
//           </div>

//           {/* Filter Pills */}
//           <div className="flex items-center gap-1.5 pt-3">
//             {[
//               { id: "ALL", label: "All" },
//               { id: "ACTIVE", label: "Active" },
//               { id: "EXPIRING", label: "Expiring" },
//               { id: "LIFETIME", label: "Lifetime" },
//             ].map((p) => (
//               <button
//                 key={p.id}
//                 onClick={() => setFilter(p.id as any)}
//                 className={`px-3 py-1 rounded text-xs transition font-medium ${filter === p.id
//                   ? "bg-[#0F766E] text-white font-semibold"
//                   : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"
//                   }`}
//               >
//                 {p.label}
//               </button>
//             ))}
//           </div>
//         </div>
//       </div>

//       {/* Main Table: Verified License Ledgers */}
//       <div className="minimal-card overflow-hidden">
//         <div className="p-5 border-b border-[#E6EBF0] flex items-center justify-between">
//           <div className="flex items-center gap-2">
//             <h3 className="text-sm font-semibold text-[#0F172A]">Verified License Ledgers</h3>
//             <span className="text-xs text-[#94A3B8]">Showing {filteredSubs.length} records</span>
//           </div>
//           <div className="flex items-center gap-3 text-[11px] text-[#64748B]">
//             <span>● Hardware-Bound</span>
//             <span>● DRAP Compliant</span>
//           </div>
//         </div>

//         <div className="overflow-x-auto">
//           <table className="clean-table">
//             <thead>
//               <tr>
//                 <th>Pharmacy &amp; City</th>
//                 <th>License Key</th>
//                 <th>Hardware Binding</th>
//                 <th>Plan &amp; Expiry</th>
//                 <th>Status</th>
//                 <th className="text-right">Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {filteredSubs.map((sub) => {
//                 const isExpired = !sub.isLifetime && sub.expiryDate && new Date(sub.expiryDate).getTime() < Date.now();
//                 return (
//                   <tr key={sub.id}>
//                     <td>
//                       <div className="font-semibold text-[#0F172A]">{sub.pharmacyName || "Registered Store"}</div>
//                       <div className="text-[11px] text-[#94A3B8] mt-0.5">Lahore / Regional Station</div>
//                     </td>
//                     <td>
//                       <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#F8FAFC] border border-[#E2E8F0] font-mono text-xs text-[#0F766E] font-medium">
//                         <span>{sub.licenseKey}</span>
//                         <button
//                           onClick={() => {
//                             navigator.clipboard.writeText(sub.licenseKey);
//                             alert("Copied!");
//                           }}
//                           className="hover:text-[#0F172A]"
//                         >
//                           <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
//                         </button>
//                       </div>
//                     </td>
//                     <td>
//                       <div className="font-mono text-xs text-[#0F172A]">{sub.deviceId || "PHD-LOCK-OK"}</div>
//                       <div className="text-[11px] text-[#94A3B8] mt-0.5">Dell OptiPlex 7050 · POS-01</div>
//                     </td>
//                     <td>
//                       <div className="text-xs font-medium text-[#0F172A]">{sub.plan}</div>
//                       <div className="text-[11px] text-[#64748B] mt-0.5">
//                         {sub.isLifetime ? "Never expires · Permanent" : sub.expiryDate ? new Date(sub.expiryDate).toLocaleDateString() : "—"}
//                       </div>
//                     </td>
//                     <td>
//                       {sub.isLifetime ? (
//                         <span className="tag-badge bg-[#EFF8FF] text-[#175CD3] border border-[#B2DDFF]">
//                           ● LIFETIME
//                         </span>
//                       ) : isExpired ? (
//                         <span className="tag-badge bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA]">
//                           ● EXPIRED
//                         </span>
//                       ) : (
//                         <span className="tag-badge bg-[#ECFDF5] text-[#027A48] border border-[#A6F4C5]">
//                           ● ACTIVE
//                         </span>
//                       )}
//                     </td>
//                     <td className="text-right space-x-2">
//                       {!sub.isLifetime && (
//                         <button
//                           onClick={() => handleExtend(sub.id)}
//                           disabled={extendingId === sub.id}
//                           className="px-2.5 py-1 rounded text-xs font-semibold bg-[#0F766E] text-white hover:brightness-105 transition disabled:opacity-50"
//                         >
//                           {extendingId === sub.id ? "..." : "Extend +30d"}
//                         </button>
//                       )}
//                       <button
//                         onClick={() => downloadJson(sub)}
//                         className="px-2 py-1 rounded text-xs font-semibold bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0] transition"
//                         title="Download JSON Envelope"
//                       >
//                         ⬇
//                       </button>
//                     </td>
//                   </tr>
//                 );
//               })}
//               {filteredSubs.length === 0 && (
//                 <tr>
//                   <td colSpan={6} className="text-center py-10 text-xs text-[#94A3B8]">
//                     No licenses match your search filter.
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ═════════════════════════════════════════════════════════════════════
// // 5. RENEWAL APPROVALS VIEW (Screenshot 4: Split Inspector Layout)
// // ═════════════════════════════════════════════════════════════════════
// function RenewalsView({ onRefresh }: { onRefresh: () => void }) {
//   const [requests, setRequests] = useState<RenewalRequest[]>([]);
//   const [selectedReq, setSelectedReq] = useState<RenewalRequest | null>(null);

//   const loadRequests = async () => {
//     const data = await api("/api/renewals?status=PENDING");
//     if (data.success) {
//       setRequests(data.requests || []);
//       if (data.requests?.length) setSelectedReq(data.requests[0]);
//     }
//   };

//   useEffect(() => {
//     loadRequests();
//   }, []);

//   async function handleApprove(id: string) {
//     const data = await api(`/api/renewals/${id}/approve`, { method: "POST" });
//     if (data.success) {
//       alert("Renewal approved and signed Ed25519 license generated!");
//       loadRequests();
//       onRefresh();
//     }
//   }

//   async function handleReject(id: string) {
//     const reason = prompt("Rejection note:", "Payment slip could not be verified");
//     if (!reason) return;
//     await api(`/api/renewals/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) });
//     loadRequests();
//     onRefresh();
//   }

//   return (
//     <div className="space-y-8">
//       {/* Header */}
//       <div>
//         <div className="tag-badge bg-[#E6F4F1] text-[#0F766E] border border-[#BCE3DD] mb-2">
//           PK-FED PROTOCOL 4.2 · Cryptographic Keying Active
//         </div>
//         <h2 className="font-editorial text-3xl font-normal tracking-tight text-[#0F172A]">
//           Renewal Approvals Queue
//         </h2>
//         <p className="text-xs text-[#64748B] mt-1">
//           Verify inbound payment receipts and batch-sign Ed25519 subscription extensions
//         </p>
//       </div>

//       {/* Row: 2 Top Cards */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//         <div className="minimal-card p-6 flex flex-col justify-between min-h-[140px]">
//           <span className="text-[10.5px] font-mono uppercase tracking-wider text-[#64748B] font-semibold">
//             Queue Pipeline
//           </span>
//           <div className="mt-2 flex items-baseline gap-2">
//             <span className="font-editorial text-3xl font-medium tracking-tight text-[#0F172A]">
//               {requests.length || 3}
//             </span>
//             <span className="text-xs text-[#64748B]">Pending Approvals (PKR 72,000 Queued)</span>
//           </div>
//           <div className="pt-3 mt-3 border-t border-[#F1F5F9] flex justify-between text-xs text-[#64748B]">
//             <span>Avg Verification: <strong>14 mins</strong></span>
//             <span>SLA: <strong>99.4%</strong></span>
//             <span>Root Keying: <strong>Ready</strong></span>
//           </div>
//         </div>

//         <div className="minimal-card p-6 flex flex-col justify-between min-h-[140px]">
//           <div className="flex justify-between items-center">
//             <span className="text-[10.5px] font-mono uppercase tracking-wider text-[#64748B] font-semibold">
//               Reconciliation Health
//             </span>
//             <span className="tag-badge bg-[#ECFDF5] text-[#027A48]">100% in sync</span>
//           </div>
//           <div className="grid grid-cols-3 gap-2 pt-2">
//             <div>
//               <div className="text-[10px] text-[#94A3B8] uppercase">EasyPaisa</div>
//               <div className="text-xs font-semibold text-[#0F172A] mt-0.5">PKR 24,000</div>
//             </div>
//             <div>
//               <div className="text-[10px] text-[#94A3B8] uppercase">JazzCash</div>
//               <div className="text-xs font-semibold text-[#0F172A] mt-0.5">PKR 24,000</div>
//             </div>
//             <div>
//               <div className="text-[10px] text-[#94A3B8] uppercase">Meezan Direct</div>
//               <div className="text-xs font-semibold text-[#0F172A] mt-0.5">PKR 24,000</div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Row: Split Inspector */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//         {/* Left: Queue List */}
//         <div className="minimal-card p-6">
//           <h3 className="text-sm font-semibold text-[#0F172A] mb-1">Inbound Verification Queue</h3>
//           <p className="text-[11px] text-[#64748B] mb-4">Click any record to inspect slip telemetry &amp; hardware lock</p>

//           <div className="space-y-3">
//             {requests.map((r) => (
//               <div
//                 key={r.id}
//                 onClick={() => setSelectedReq(r)}
//                 className={`p-4 rounded-xl border cursor-pointer transition ${selectedReq?.id === r.id
//                   ? "bg-[#F0FDFA] border-[#0F766E] shadow-xs"
//                   : "bg-[#FAFCFD] border-[#E6EBF0] hover:border-[#CBD5E1]"
//                   }`}
//               >
//                 <div className="flex items-center justify-between">
//                   <div className="font-semibold text-xs text-[#0F172A]">{r.customerName}</div>
//                   <span className="tag-badge bg-[#E6F4F1] text-[#0F766E]">12 MO EXTENSION</span>
//                 </div>
//                 <div className="text-[11px] text-[#64748B] mt-1">
//                   Owner: {r.customerPhone} · Ref: <span className="font-mono text-[#0F172A]">{r.paymentReference}</span>
//                 </div>
//               </div>
//             ))}
//             {requests.length === 0 && (
//               <div className="text-center py-12 text-xs text-[#94A3B8]">
//                 All renewal requests have been reviewed and approved.
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Right: Slip & Cryptographic Inspector */}
//         <div className="minimal-card p-6">
//           <div className="flex justify-between items-center mb-4 pb-3 border-b border-[#E6EBF0]">
//             <div>
//               <h3 className="text-sm font-semibold text-[#0F172A]">Slip &amp; Cryptographic Inspector</h3>
//               <p className="text-[11px] text-[#64748B]">Reviewing payment artifact for {selectedReq?.customerName || "Selected Store"}</p>
//             </div>
//             <span className="tag-badge bg-[#F0FDFA] text-[#0F766E]">SL-7422-AK48</span>
//           </div>

//           {selectedReq ? (
//             <div className="space-y-4">
//               <div className="p-4 rounded-xl bg-[#FAFCFD] border border-[#E6EBF0] space-y-2 text-xs">
//                 <div className="flex justify-between">
//                   <span className="text-[#64748B]">Settlement Route:</span>
//                   <span className="font-semibold text-[#0F172A]">EasyPaisa / Bank Direct</span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span className="text-[#64748B]">Verified Amount:</span>
//                   <span className="font-semibold text-[#0F766E] font-mono">PKR 24,000.00</span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span className="text-[#64748B]">Sender Account / Mobile:</span>
//                   <span className="font-mono text-[#0F172A]">{selectedReq.customerPhone}</span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span className="text-[#64748B]">Target Subscription:</span>
//                   <span className="font-semibold text-[#0F172A]">{selectedReq.planName || selectedReq.requestedPlan}</span>
//                 </div>
//               </div>

//               {/* Target Machine Hardware Lock */}
//               <div>
//                 <label className="text-[10px] font-mono uppercase tracking-wider text-[#64748B] block mb-1">
//                   Target Machine Hardware Lock ID
//                 </label>
//                 <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] font-mono text-xs text-[#0F172A]">
//                   {selectedReq.deviceId}
//                 </div>
//               </div>

//               {/* Computed Signature Preview */}
//               <div>
//                 <label className="text-[10px] font-mono uppercase tracking-wider text-[#64748B] block mb-1">
//                   Computed Ed25519 Signature Preview
//                 </label>
//                 <div className="p-2.5 rounded-lg bg-[#0A2E2C] text-[#2DD4BF] font-mono text-[10px] break-all leading-relaxed">
//                   ed25519.sig:968132439EC1F...9687C2DEAC1274AA8C274E8741 · 256-Bit Hardware Root Verified
//                 </div>
//               </div>

//               {/* Action Buttons */}
//               <div className="pt-2 flex items-center justify-end gap-2.5">
//                 <button
//                   onClick={() => handleReject(selectedReq.id)}
//                   className="px-3 py-2 rounded-lg text-xs font-semibold bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA] hover:bg-[#FEE4E2] transition"
//                 >
//                   Reject Receipt
//                 </button>
//                 <button
//                   onClick={() => handleApprove(selectedReq.id)}
//                   className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#0F766E] text-white hover:brightness-105 transition shadow-sm flex items-center gap-1.5"
//                 >
//                   <span>✓ Approve &amp; Dispatch Token</span>
//                 </button>
//               </div>
//             </div>
//           ) : (
//             <div className="text-center py-16 text-xs text-[#94A3B8]">
//               Select a renewal request from the left queue to inspect.
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

// // ═════════════════════════════════════════════════════════════════════
// // 6. HARDWARE LOCKS VIEW (Screenshot 5: Devices & PC Unbind)
// // ═════════════════════════════════════════════════════════════════════
// function DevicesView({ onRefresh }: { onRefresh: () => void }) {
//   const [devices, setDevices] = useState<DeviceRecord[]>([]);

//   const loadDevices = async () => {
//     const data = await api("/api/devices");
//     if (data.success) setDevices(data.devices || []);
//   };

//   useEffect(() => {
//     loadDevices();
//   }, []);

//   async function handleReset(id: string) {
//     if (!confirm("Unbind this computer? The customer will be allowed to activate their license on a replacement PC.")) return;
//     const data = await api(`/api/devices/${id}/reset`, { method: "POST" });
//     if (data.success) {
//       alert("Hardware device unbind complete.");
//       loadDevices();
//       onRefresh();
//     }
//   }

//   return (
//     <div className="space-y-8">
//       {/* Header */}
//       <div>
//         <div className="tag-badge bg-[#E6F4F1] text-[#0F766E] border border-[#BCE3DD] mb-2">
//           CRYPTO ROOT SECURITY · Layer 2 Hardware Fingerprint
//         </div>
//         <h2 className="font-editorial text-3xl font-normal tracking-tight text-[#0F172A]">
//           Hardware Devices &amp; PC Unbind Management
//         </h2>
//         <p className="text-xs text-[#64748B] mt-1">
//           Manage cryptographic machine-locked workstations, monitor CPU &amp; Motherboard UUID hash bindings
//         </p>
//       </div>

//       {/* Security Alert Banner */}
//       <div className="p-4 rounded-xl bg-[#FEF3F2] border border-[#FECDCA] text-xs text-[#B42318] flex items-start gap-3">
//         <span className="text-base leading-none">⚠️</span>
//         <div className="leading-relaxed">
//           <strong>Hardware Security Policy:</strong> Unbinding a workstation revokes offline authentication tokens instantly on next sync. Clients receive a mandatory 24-hour temporary grace window before hardware cutoff.
//         </div>
//       </div>

//       {/* 3 Metric Counters */}
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//         <div className="minimal-card p-5">
//           <div className="text-[10.5px] font-mono uppercase tracking-wider text-[#64748B]">Active Footprint</div>
//           <div className="font-editorial text-2xl font-medium text-[#0F172A] mt-1">{devices.length || 618}</div>
//           <div className="text-[11px] text-[#94A3B8] mt-1">Locked POS Workstations in Field</div>
//         </div>

//         <div className="minimal-card p-5">
//           <div className="text-[10.5px] font-mono uppercase tracking-wider text-[#64748B]">Unbind Operations</div>
//           <div className="font-editorial text-2xl font-medium text-[#0F172A] mt-1">7 this month</div>
//           <div className="text-[11px] text-[#94A3B8] mt-1">Authorized by Master Admin</div>
//         </div>

//         <div className="minimal-card p-5">
//           <div className="text-[10.5px] font-mono uppercase tracking-wider text-[#64748B]">Flagged Clone Attempts</div>
//           <div className="font-editorial text-2xl font-medium text-[#10B981] mt-1">0</div>
//           <div className="text-[11px] text-[#94A3B8] mt-1">Zero-tolerance spoofing active</div>
//         </div>
//       </div>

//       {/* Workstation Table */}
//       <div className="minimal-card overflow-hidden">
//         <div className="p-5 border-b border-[#E6EBF0]">
//           <h3 className="text-sm font-semibold text-[#0F172A]">Registered Workstation Fingerprints</h3>
//         </div>

//         <div className="overflow-x-auto">
//           <table className="clean-table">
//             <thead>
//               <tr>
//                 <th>Hardware Device ID</th>
//                 <th>Pharmacy Store Name</th>
//                 <th>Attached License</th>
//                 <th>Workstation Specifications</th>
//                 <th>Binding Status</th>
//                 <th className="text-right">Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {devices.map((d) => (
//                 <tr key={d.id}>
//                   <td>
//                     <code className="text-xs font-mono font-medium text-[#0F172A] bg-[#F1F5F9] px-2 py-0.5 rounded">
//                       {d.deviceId}
//                     </code>
//                   </td>
//                   <td className="font-semibold text-xs text-[#0F172A]">
//                     {d.pharmacyName || "Registered Store"}
//                   </td>
//                   <td>
//                     <span className="font-mono text-xs text-[#0F766E]">{d.licenseKey}</span>
//                   </td>
//                   <td className="text-xs text-[#64748B]">
//                     Core i5 10th Gen · 16GB RAM · Win 11
//                   </td>
//                   <td>
//                     {d.isActive ? (
//                       <span className="tag-badge bg-[#ECFDF5] text-[#027A48]">● BOUND (ACTIVE)</span>
//                     ) : (
//                       <span className="tag-badge bg-[#F1F5F9] text-[#64748B]">UNBOUND</span>
//                     )}
//                   </td>
//                   <td className="text-right">
//                     {d.isActive && (
//                       <button
//                         onClick={() => handleReset(d.id)}
//                         className="px-2.5 py-1 rounded text-xs font-semibold bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA] hover:bg-[#FEE4E2] transition"
//                       >
//                         Unbind PC
//                       </button>
//                     )}
//                   </td>
//                 </tr>
//               ))}
//               {devices.length === 0 && (
//                 <tr>
//                   <td colSpan={6} className="text-center py-10 text-xs text-[#94A3B8]">
//                     No workstations registered.
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ═════════════════════════════════════════════════════════════════════
// // 7. ISSUE LICENSE MODAL (Clean, Spacey, High-End Dialog)
// // ═════════════════════════════════════════════════════════════════════
// function IssueLicenseModal({
//   onClose,
//   onSuccess,
// }: {
//   onClose: () => void;
//   onSuccess: () => void;
// }) {
//   const [form, setForm] = useState({
//     pharmacyName: "",
//     customerPhone: "",
//     deviceId: "",
//     plan: "YEARLY",
//     durationDays: "365",
//     isLifetime: false,
//   });
//   const [loading, setLoading] = useState(false);
//   const [result, setResult] = useState<any>(null);

//   async function handleIssue(e: React.FormEvent) {
//     e.preventDefault();
//     setLoading(true);
//     const data = await api("/api/licenses/issue", {
//       method: "POST",
//       body: JSON.stringify(form),
//     });
//     setResult(data);
//     setLoading(false);
//   }

//   function downloadEnvelope() {
//     if (!result?.licenseEnvelope) return;
//     const blob = new Blob([JSON.stringify(result.licenseEnvelope, null, 2)], {
//       type: "application/json",
//     });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = `pharmadesk-license-${result.licenseKey}.json`;
//     a.click();
//     URL.revokeObjectURL(url);
//   }

//   return (
//     <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
//       <div className="bg-white rounded-2xl border border-[#E6EBF0] shadow-2xl w-full max-w-lg p-6 space-y-5">
//         <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
//           <div>
//             <h3 className="font-editorial text-xl font-normal text-[#0F172A]">Issue Signed License</h3>
//             <p className="text-xs text-[#64748B]">Cryptographic Ed25519 certificate for client workstations</p>
//           </div>
//           <button onClick={onClose} className="text-[#94A3B8] hover:text-[#0F172A] text-lg font-bold">✕</button>
//         </div>

//         {!result ? (
//           <form onSubmit={handleIssue} className="space-y-4">
//             <div>
//               <label className="block text-[10.5px] font-mono uppercase text-[#64748B] mb-1">Pharmacy / Store Name *</label>
//               <input
//                 type="text"
//                 required
//                 value={form.pharmacyName}
//                 onChange={(e) => setForm({ ...form, pharmacyName: e.target.value })}
//                 placeholder="e.g. Al-Shifa Medicos"
//                 className="w-full px-3 py-2 text-xs rounded-lg border border-[#E6EBF0] focus:border-[#0F766E] outline-none"
//               />
//             </div>

//             <div>
//               <label className="block text-[10.5px] font-mono uppercase text-[#64748B] mb-1">Customer Phone Number</label>
//               <input
//                 type="text"
//                 value={form.customerPhone}
//                 onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
//                 placeholder="0300 1234567"
//                 className="w-full px-3 py-2 text-xs rounded-lg border border-[#E6EBF0] focus:border-[#0F766E] outline-none"
//               />
//             </div>

//             <div>
//               <label className="block text-[10.5px] font-mono uppercase text-[#64748B] mb-1">Hardware Device ID *</label>
//               <input
//                 type="text"
//                 required
//                 value={form.deviceId}
//                 onChange={(e) => setForm({ ...form, deviceId: e.target.value.trim().toUpperCase() })}
//                 placeholder="PHD-XXXX-XXXX-XXXX-XXXX"
//                 className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-[#E6EBF0] focus:border-[#0F766E] outline-none bg-[#FAFCFD]"
//               />
//             </div>

//             <div className="grid grid-cols-2 gap-3">
//               <div>
//                 <label className="block text-[10.5px] font-mono uppercase text-[#64748B] mb-1">Plan</label>
//                 <select
//                   value={form.plan}
//                   onChange={(e) => {
//                     const p = e.target.value;
//                     setForm({
//                       ...form,
//                       plan: p,
//                       isLifetime: p === "LIFETIME",
//                       durationDays: p === "MONTHLY" ? "30" : p === "YEARLY" ? "365" : "365",
//                     });
//                   }}
//                   className="w-full px-3 py-2 text-xs rounded-lg border border-[#E6EBF0] bg-white outline-none"
//                 >
//                   <option value="MONTHLY">Monthly (30 Days)</option>
//                   <option value="YEARLY">Yearly (365 Days)</option>
//                   <option value="LIFETIME">Lifetime Membership</option>
//                 </select>
//               </div>

//               <div>
//                 <label className="block text-[10.5px] font-mono uppercase text-[#64748B] mb-1">Duration (Days)</label>
//                 <input
//                   type="text"
//                   disabled={form.isLifetime}
//                   value={form.isLifetime ? "Permanent" : form.durationDays}
//                   onChange={(e) => setForm({ ...form, durationDays: e.target.value })}
//                   className="w-full px-3 py-2 text-xs rounded-lg border border-[#E6EBF0] disabled:bg-[#F1F5F9] outline-none"
//                 />
//               </div>
//             </div>

//             <div className="pt-3 flex justify-end gap-2">
//               <button
//                 type="button"
//                 onClick={onClose}
//                 className="px-3 py-2 text-xs font-medium text-[#64748B] hover:text-[#0F172A]"
//               >
//                 Cancel
//               </button>
//               <button
//                 type="submit"
//                 disabled={loading}
//                 className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#0F766E] hover:brightness-105 transition disabled:opacity-50"
//               >
//                 {loading ? "Signing with Ed25519..." : "Issue & Sign License"}
//               </button>
//             </div>
//           </form>
//         ) : (
//           <div className="space-y-4">
//             <div className="p-4 rounded-xl bg-[#ECFDF5] border border-[#A6F4C5] text-xs text-[#027A48]">
//               <strong>✓ License Certificate Issued!</strong>
//               <div className="mt-2 text-[#0F172A] font-mono font-bold text-sm select-all">
//                 {result.licenseKey}
//               </div>
//             </div>

//             <div className="flex gap-2">
//               <button
//                 onClick={downloadEnvelope}
//                 className="flex-1 py-2 text-xs font-semibold rounded-lg bg-[#0F766E] text-white hover:brightness-105 transition"
//               >
//                 ⬇ Download License File (.json)
//               </button>
//               <button
//                 onClick={() => {
//                   onSuccess();
//                   onClose();
//                 }}
//                 className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"
//               >
//                 Done
//               </button>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }




"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

// Self-contained page styling: layout.tsx and globals.css are intentionally untouched.
const ADMIN_CSS = String.raw`/* PharmaDesk admin portal — clean, offline-friendly design system */
:root {
  --pd-ink: #172b2a;
  --pd-muted: #71817f;
  --pd-subtle: #99a7a4;
  --pd-border: #e5ecea;
  --pd-border-strong: #d7e2df;
  --pd-canvas: #f5f8f7;
  --pd-surface: #ffffff;
  --pd-teal: #14766c;
  --pd-teal-dark: #105e56;
  --pd-teal-soft: #eaf5f2;
  --pd-danger: #b54747;
  --pd-danger-soft: #fff1f0;
  --pd-warning: #9a681b;
  --pd-warning-soft: #fff7e8;
  --pd-success: #16714e;
  --pd-success-soft: #eaf7ef;
  --pd-shadow: 0 12px 32px rgba(24, 53, 49, 0.055);
  --pd-radius: 15px;
}



* { box-sizing: border-box; }
html, body { min-height: 100%; }
body {
  margin: 0;
  background: var(--pd-canvas);
  color: var(--pd-ink);
  font-family: "Segoe UI", Inter, -apple-system, BlinkMacSystemFont, Arial, sans-serif;
  font-size: 16px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
button, input, select, textarea { font: inherit; }
button { -webkit-tap-highlight-color: transparent; }
button:focus-visible, input:focus-visible, select:focus-visible {
  outline: 3px solid rgba(20, 118, 108, .18);
  outline-offset: 2px;
}

/* Login */
.pd-login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  position: relative;
  isolation: isolate;
  overflow: hidden;
  padding: 32px 18px 54px;
  background: #f3f7f6;
}
.pd-login-decoration { position: absolute; z-index: -1; border-radius: 50%; pointer-events: none; }
.pd-login-decoration-one { width: 480px; height: 480px; top: -260px; right: -100px; background: radial-gradient(circle, rgba(30, 139, 123, .13), transparent 68%); }
.pd-login-decoration-two { width: 520px; height: 520px; bottom: -340px; left: -170px; background: radial-gradient(circle, rgba(47, 113, 139, .10), transparent 68%); }
.pd-login-card {
  width: min(100%, 440px);
  padding: 38px 40px 28px;
  border: 1px solid var(--pd-border);
  border-radius: 20px;
  background: rgba(255,255,255,.96);
  box-shadow: 0 28px 80px rgba(28, 62, 57, .10);
}
.pd-login-brand { display: flex; justify-content: center; margin-bottom: 36px; }
.pd-login-heading { text-align: center; margin-bottom: 28px; }
.pd-eyebrow {
  display: inline-block;
  color: var(--pd-teal);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .13em;
  line-height: 1.4;
  text-transform: uppercase;
}
.pd-login-heading h1 { margin: 8px 0 5px; color: var(--pd-ink); font-size: 30px; font-weight: 650; letter-spacing: -.045em; }
.pd-login-heading p { margin: 0; color: var(--pd-muted); font-size: 15px; }
.pd-login-form { display: flex; flex-direction: column; gap: 9px; }
.pd-field-label, .pd-form-field label { color: #455956; font-size: 14px; font-weight: 650; }
.pd-input {
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid var(--pd-border-strong);
  border-radius: 9px;
  outline: none;
  color: var(--pd-ink);
  background: #fff;
  font-size: 15px;
  transition: border-color .15s ease, box-shadow .15s ease;
}
.pd-input::placeholder { color: #a0adaa; }
.pd-input:focus { border-color: #69a99f; box-shadow: 0 0 0 3px rgba(20,118,108,.09); }
.pd-password-wrap { position: relative; margin-bottom: 8px; }
.pd-password-wrap .pd-input { padding-right: 62px; }
.pd-password-toggle { position: absolute; top: 50%; right: 11px; transform: translateY(-50%); padding: 4px; color: var(--pd-teal); background: transparent; border: 0; font-size: 9px; font-weight: 700; cursor: pointer; }
.pd-login-submit { width: 100%; min-height: 46px; justify-content: center; margin-top: 7px; }
.pd-login-footer { display: flex; justify-content: center; align-items: center; gap: 7px; margin-top: 27px; padding-top: 18px; border-top: 1px solid #edf1f0; color: #82918e; font-size: 9px; }
.pd-login-footer svg { width: 14px; height: 14px; color: var(--pd-teal); }
.pd-login-copyright { position: absolute; bottom: 17px; margin: 0; color: #91a09d; font-size: 13px; letter-spacing: .02em; }

/* Brand and app shell */
.pd-brand { display: inline-flex; align-items: center; gap: 10px; min-width: 0; }
.pd-brand-mark { width: 34px; height: 34px; display: grid; place-items: center; overflow: hidden; border-radius: 10px; background: #e9f4f1; flex: 0 0 auto; }
.pd-brand-mark img { display: block; width: 100%; height: 100%; object-fit: contain; padding: 4px; }
.pd-brand-name { color: #1a302d; font-size: 20px; font-weight: 750; letter-spacing: -.055em; white-space: nowrap; }
.pd-brand-name span { color: var(--pd-teal); }
.pd-brand-compact .pd-brand-mark { width: 30px; height: 30px; }
.pd-app-shell { min-height: 100vh; display: flex; }
.pd-sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  width: 248px;
  padding: 25px 17px 17px;
  border-right: 1px solid var(--pd-border);
  background: #fff;
}
.pd-sidebar-brand { padding: 0 10px 28px; border-bottom: 1px solid #edf1f0; }
.pd-sidebar-section-label { padding: 26px 11px 10px; color: #9aa7a4; font-size: 12px; font-weight: 750; letter-spacing: .15em; }
.pd-sidebar-nav { display: flex; flex-direction: column; gap: 5px; }
.pd-nav-item { width: 100%; min-height: 43px; display: flex; align-items: center; gap: 12px; padding: 0 12px; border: 0; border-radius: 9px; background: transparent; color: #687a76; font-size: 12px; font-weight: 600; text-align: left; cursor: pointer; transition: background .15s ease, color .15s ease; }
.pd-nav-item svg { width: 17px; height: 17px; color: #82918e; }
.pd-nav-item:hover { color: var(--pd-ink); background: #f6f9f8; }
.pd-nav-item-active { color: var(--pd-teal-dark); background: var(--pd-teal-soft); }
.pd-nav-item-active svg { color: var(--pd-teal); }
.pd-nav-count { display: inline-grid; place-items: center; min-width: 19px; height: 19px; margin-left: auto; padding: 0 5px; border-radius: 20px; background: #d6ebe5; color: #176b60; font-size: 12px; font-weight: 750; }
.pd-sidebar-bottom { margin-top: auto; }
.pd-sidebar-secure { display: flex; align-items: center; gap: 8px; margin: 0 5px 12px; padding: 11px 9px; border-radius: 9px; background: #f7faf9; color: #71817d; font-size: 12px; }
.pd-sidebar-secure svg { width: 15px; height: 15px; color: var(--pd-teal); }
.pd-logout-button { display: flex; align-items: center; gap: 10px; width: 100%; padding: 11px 12px; border: 0; border-top: 1px solid #edf1f0; background: transparent; color: #7b8986; font-size: 12px; font-weight: 600; text-align: left; cursor: pointer; }
.pd-logout-button:hover, .pd-topbar-logout:hover { color: var(--pd-danger); }
.pd-logout-button svg { width: 16px; height: 16px; }
.pd-main-column { min-width: 0; width: calc(100% - 248px); margin-left: 248px; }
.pd-topbar { position: sticky; top: 0; z-index: 30; height: 62px; display: flex; align-items: center; justify-content: space-between; padding: 0 36px; border-bottom: 1px solid var(--pd-border); background: rgba(255,255,255,.94); backdrop-filter: blur(12px); }
.pd-breadcrumb { color: #82908d; font-size: 12px; font-weight: 500; }
.pd-breadcrumb span { margin: 0 9px; color: #c0cbc8; }
.pd-breadcrumb strong { color: #344a45; font-weight: 700; }
.pd-topbar-right { display: flex; align-items: center; gap: 18px; }
.pd-admin-label { display: inline-flex; align-items: center; gap: 7px; color: #647671; font-size: 12px; font-weight: 600; }
.pd-admin-dot { width: 7px; height: 7px; border-radius: 50%; background: #29a477; box-shadow: 0 0 0 3px #e8f5ef; }
.pd-topbar-logout { display: grid; place-items: center; width: 32px; height: 32px; border: 1px solid var(--pd-border); border-radius: 8px; background: white; color: #7e8c89; cursor: pointer; }
.pd-topbar-logout svg { width: 15px; height: 15px; }
.pd-mobile-menu, .pd-mobile-backdrop { display: none; }
.pd-content { width: 100%; max-width: 1480px; margin: 0 auto; padding: 34px 36px 54px; }
.pd-page-stack { display: flex; flex-direction: column; gap: 23px; }
.pd-page-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; margin-bottom: 3px; }
.pd-page-heading h1 { margin: 6px 0 4px; color: #1a302d; font-size: 31px; font-weight: 700; line-height: 1.18; letter-spacing: -.055em; }
.pd-page-heading p { margin: 0; color: var(--pd-muted); font-size: 14px; }
.pd-heading-actions { display: flex; align-items: center; gap: 9px; }

/* Buttons, panels, status */
.pd-button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 36px; padding: 0 13px; border: 1px solid transparent; border-radius: 8px; font-size: 13px; font-weight: 700; white-space: nowrap; cursor: pointer; transition: background .15s ease, border-color .15s ease, transform .15s ease; }
.pd-button svg { width: 15px; height: 15px; }
.pd-button:disabled { opacity: .55; cursor: not-allowed; }
.pd-button-primary { background: var(--pd-teal); color: white; box-shadow: 0 3px 7px rgba(20,118,108,.12); }
.pd-button-primary:hover:not(:disabled) { background: var(--pd-teal-dark); }
.pd-button-secondary { border-color: var(--pd-border-strong); background: white; color: #536762; }
.pd-button-secondary:hover:not(:disabled) { border-color: #b7cbc5; background: #fbfdfc; }
.pd-button-ghost { background: transparent; color: var(--pd-teal); }
.pd-button-danger { border-color: #f0d4d1; background: #fff8f7; color: var(--pd-danger); }
.pd-button-danger:hover:not(:disabled) { background: var(--pd-danger-soft); }
.pd-panel { min-width: 0; border: 1px solid var(--pd-border); border-radius: var(--pd-radius); background: var(--pd-surface); box-shadow: var(--pd-shadow); }
.pd-section-heading, .pd-panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.pd-section-heading { margin-bottom: -10px; }
.pd-section-heading h2, .pd-panel-heading h2 { margin: 0; color: #253b37; font-size: 15px; font-weight: 750; letter-spacing: -.015em; }
.pd-section-heading p, .pd-panel-heading p { margin: 3px 0 0; color: #899793; font-size: 12px; }
.pd-status { display: inline-flex; align-items: center; min-height: 22px; padding: 0 8px; border: 1px solid transparent; border-radius: 20px; font-size: 12px; font-weight: 750; letter-spacing: .035em; white-space: nowrap; }
.pd-status-success { border-color: #d4eddf; background: var(--pd-success-soft); color: var(--pd-success); }
.pd-status-warning { border-color: #f3e3bd; background: var(--pd-warning-soft); color: var(--pd-warning); }
.pd-status-danger { border-color: #f2d3d0; background: var(--pd-danger-soft); color: var(--pd-danger); }
.pd-status-neutral { border-color: #e5eae8; background: #f5f7f6; color: #697975; }
.pd-inline-error { display: flex; align-items: flex-start; gap: 8px; padding: 10px 12px; border: 1px solid #f0d2cf; border-radius: 9px; background: #fff8f7; color: #a33f3b; font-size: 11px; line-height: 1.45; }
.pd-inline-error svg { width: 15px; height: 15px; flex: 0 0 auto; margin-top: 1px; }
.pd-loading { display: flex; align-items: center; justify-content: center; gap: 9px; min-height: 130px; color: #879590; font-size: 11px; }
.pd-spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid #d9e7e3; border-top-color: var(--pd-teal); border-radius: 50%; animation: pd-spin .7s linear infinite; }
.pd-spinner-light { border-color: rgba(255,255,255,.35); border-top-color: white; }
.pd-subtle-loading { display: inline-flex; align-items: center; gap: 6px; color: #82918d; font-size: 10px; }
.pd-subtle-loading .pd-spinner { width: 11px; height: 11px; }
@keyframes pd-spin { to { transform: rotate(360deg); } }
.pd-empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 190px; padding: 25px; text-align: center; }
.pd-empty-icon { display: grid; place-items: center; width: 38px; height: 38px; margin-bottom: 11px; border-radius: 12px; background: #f0f6f4; color: #7e9d95; }
.pd-empty-icon svg { width: 18px; height: 18px; }
.pd-empty-state strong { color: #425752; font-size: 12px; }
.pd-empty-state p { max-width: 310px; margin: 5px 0 0; color: #899793; font-size: 10px; line-height: 1.6; }

/* Overview */
.pd-metric-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 13px; }
.pd-metric-card { min-height: 116px; padding: 17px 18px; }
.pd-metric-label { margin: 0; color: #778782; font-size: 10px; font-weight: 650; }
.pd-metric-value { margin: 10px 0 3px; color: #1c3732; font-size: 27px; font-weight: 720; line-height: 1; letter-spacing: -.055em; font-variant-numeric: tabular-nums; }
.pd-metric-detail { margin: 0; color: #9aa6a2; font-size: 9px; }
.pd-overview-grid { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(300px, .9fr); gap: 16px; align-items: stretch; }
.pd-overview-grid > .pd-panel { padding: 19px; }
.pd-panel-heading { margin-bottom: 15px; }
.pd-activity-list { display: flex; flex-direction: column; }
.pd-activity-row { display: flex; align-items: flex-start; gap: 11px; padding: 12px 0; border-top: 1px solid #f0f3f2; }
.pd-activity-row:first-child { border-top: 0; }
.pd-activity-marker { display: grid; place-items: center; width: 27px; height: 27px; flex: 0 0 auto; border-radius: 8px; background: #eef6f3; color: #5a9084; }
.pd-activity-marker svg { width: 14px; height: 14px; }
.pd-activity-copy { min-width: 0; flex: 1; }
.pd-activity-copy strong { color: #354b46; font-size: 10px; font-weight: 750; }
.pd-activity-copy p { margin: 3px 0; color: #778782; font-size: 10px; line-height: 1.5; overflow-wrap: anywhere; }
.pd-activity-copy span { color: #a0aaa7; font-size: 9px; }
.pd-activity-code { align-self: center; max-width: 130px; overflow: hidden; color: #7a8b85; font-size: 9px; text-overflow: ellipsis; }
.pd-quick-panel { display: flex; flex-direction: column; }
.pd-quick-action { display: flex; align-items: center; gap: 10px; width: 100%; padding: 12px 0; border: 0; border-top: 1px solid #f0f3f2; background: transparent; text-align: left; cursor: pointer; }
.pd-quick-action:hover strong { color: var(--pd-teal); }
.pd-quick-icon { display: grid; place-items: center; width: 32px; height: 32px; flex: 0 0 auto; border-radius: 9px; background: #eff6f4; color: #4b8b7f; }
.pd-quick-icon svg { width: 16px; height: 16px; }
.pd-quick-action > span:nth-child(2) { display: flex; flex: 1; flex-direction: column; gap: 2px; }
.pd-quick-action strong { color: #405650; font-size: 10px; font-weight: 700; }
.pd-quick-action small { color: #96a29e; font-size: 9px; }
.pd-arrow { color: #a3b0ab; font-size: 16px; }
.pd-revenue-summary { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: auto; padding: 14px 12px 2px; border-top: 1px solid #edf1f0; }
.pd-revenue-summary span { color: #7e8d88; font-size: 10px; }
.pd-revenue-summary strong { color: #1f645b; font-size: 15px; font-weight: 750; }

/* Toolbars and tables */
.pd-toolbar-panel { display: flex; align-items: center; justify-content: space-between; gap: 15px; padding: 13px 15px; box-shadow: none; }
.pd-search-wrap { display: flex; align-items: center; gap: 9px; min-width: 220px; flex: 1; color: #96a39f; }
.pd-search-wrap svg { width: 16px; height: 16px; flex: 0 0 auto; }
.pd-search-wrap input { width: 100%; min-height: 32px; border: 0; outline: 0; background: transparent; color: var(--pd-ink); font-size: 11px; }
.pd-search-wrap input::placeholder { color: #a0aaa7; }
.pd-filter-row { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.pd-filter-button { min-height: 29px; padding: 0 10px; border: 1px solid transparent; border-radius: 7px; background: transparent; color: #778782; font-size: 10px; font-weight: 650; cursor: pointer; }
.pd-filter-button:hover { background: #f5f8f7; }
.pd-filter-active { border-color: #d9eae5; background: #edf6f3; color: var(--pd-teal-dark); }
.pd-record-count { color: #899793; font-size: 10px; white-space: nowrap; }
.pd-table-panel { overflow: hidden; }
.pd-table-heading { padding: 17px 19px 14px; margin: 0; border-bottom: 1px solid #edf1f0; }
.pd-table-scroll { width: 100%; overflow-x: auto; }
.pd-table { width: 100%; border-collapse: collapse; text-align: left; white-space: nowrap; }
.pd-table th { padding: 11px 15px; background: #fafcfb; color: #899691; font-size: 9px; font-weight: 750; letter-spacing: .07em; text-transform: uppercase; }
.pd-table td { padding: 13px 15px; border-top: 1px solid #f0f3f2; color: #5e716b; font-size: 10px; vertical-align: middle; }
.pd-table tbody tr:hover { background: #fcfdfd; }
.pd-table td strong { display: block; color: #344a45; font-size: 10px; font-weight: 700; }
.pd-table td small { display: block; margin-top: 3px; color: #9aa6a2; font-size: 9px; }
.pd-mono-cell { color: #60736d; font-family: "Cascadia Code", Consolas, monospace; font-size: 9px; }
.pd-copy-button { display: inline-grid; place-items: center; width: 22px; height: 22px; margin-left: 5px; border: 0; border-radius: 5px; background: transparent; color: #9aa7a2; vertical-align: middle; cursor: pointer; }
.pd-copy-button:hover { background: #edf5f2; color: var(--pd-teal); }
.pd-copy-button svg { width: 12px; height: 12px; }
.pd-align-right { text-align: right !important; }
.pd-actions-cell { display: flex; justify-content: flex-end; align-items: center; gap: 6px; }
.pd-actions-cell .pd-button { min-height: 29px; padding: 0 9px; font-size: 9px; }
.pd-icon-button { display: inline-grid; place-items: center; width: 31px; height: 31px; border: 1px solid var(--pd-border); border-radius: 8px; background: white; color: #74847f; cursor: pointer; }
.pd-icon-button:hover { border-color: #c7dad4; color: var(--pd-teal); }
.pd-icon-button svg { width: 15px; height: 15px; }
.pd-muted { color: #a1aca8; font-size: 10px; }

/* Renewals */
.pd-renewal-layout { display: grid; grid-template-columns: minmax(280px, .85fr) minmax(0, 1.25fr); gap: 16px; align-items: start; }
.pd-queue-panel, .pd-inspector-panel { padding: 18px; }
.pd-request-list { display: flex; flex-direction: column; gap: 7px; }
.pd-request-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 11px; border: 1px solid #edf1f0; border-radius: 10px; background: #fff; text-align: left; cursor: pointer; transition: border-color .15s ease, background .15s ease; }
.pd-request-item:hover { border-color: #cbded8; background: #fcfefd; }
.pd-request-selected { border-color: #8bbcb0; background: #f1f8f5; }
.pd-request-avatar { display: grid; place-items: center; width: 34px; height: 34px; flex: 0 0 auto; border-radius: 10px; background: #eaf3f0; color: #35786c; font-size: 12px; font-weight: 750; }
.pd-request-main { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 2px; }
.pd-request-main strong { overflow: hidden; color: #3c514b; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.pd-request-main small { overflow: hidden; color: #91a09a; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
.pd-request-date { align-self: flex-start; color: #98a49f; font-size: 8px; white-space: nowrap; }
.pd-detail-title { display: flex; align-items: center; justify-content: space-between; gap: 15px; padding: 4px 0 17px; border-bottom: 1px solid #edf1f0; }
.pd-detail-title h3 { margin: 4px 0 0; color: #273d38; font-size: 18px; font-weight: 700; letter-spacing: -.04em; }
.pd-detail-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 18px; padding: 7px 0; }
.pd-detail { display: flex; flex-direction: column; gap: 4px; min-width: 0; padding: 11px 0; border-bottom: 1px solid #f0f3f2; }
.pd-detail-wide { grid-column: 1 / -1; }
.pd-detail span { color: #91a09a; font-size: 9px; font-weight: 600; }
.pd-detail strong { color: #425650; font-size: 10px; font-weight: 650; overflow-wrap: anywhere; }
.pd-inspector-actions { display: flex; justify-content: flex-end; gap: 8px; padding-top: 16px; }

/* Issue modal */
.pd-modal-backdrop { position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; padding: 18px; background: rgba(19, 36, 33, .38); backdrop-filter: blur(4px); }
.pd-modal { width: min(100%, 510px); max-height: min(90vh, 760px); overflow: auto; padding: 23px; border: 1px solid rgba(255,255,255,.7); border-radius: 17px; background: white; box-shadow: 0 25px 90px rgba(15, 38, 33, .2); }
.pd-modal-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; padding-bottom: 17px; border-bottom: 1px solid #edf1f0; }
.pd-modal-heading h2 { margin: 5px 0 3px; color: #243b35; font-size: 21px; letter-spacing: -.045em; }
.pd-modal-heading p { margin: 0; color: #8b9994; font-size: 10px; }
.pd-issue-form { display: flex; flex-direction: column; gap: 13px; padding-top: 18px; }
.pd-form-field { display: flex; flex: 1; flex-direction: column; gap: 6px; min-width: 0; }
.pd-form-field label b { color: var(--pd-danger); }
.pd-form-row { display: flex; gap: 12px; }
.pd-mono-input { font-family: "Cascadia Code", Consolas, monospace; font-size: 11px; }
.pd-modal-actions { display: flex; justify-content: flex-end; align-items: center; gap: 8px; padding-top: 8px; }
.pd-success-content { display: flex; flex-direction: column; align-items: center; padding: 25px 4px 4px; text-align: center; }
.pd-success-icon { display: grid; place-items: center; width: 46px; height: 46px; margin-bottom: 11px; border-radius: 50%; background: #eaf7ef; color: #168153; }
.pd-success-icon svg { width: 22px; height: 22px; }
.pd-success-content h3 { margin: 0; color: #29443b; font-size: 17px; }
.pd-success-content > p { margin: 4px 0 16px; color: #899793; font-size: 10px; }
.pd-issued-key { width: 100%; display: flex; flex-direction: column; gap: 5px; padding: 13px; border: 1px solid #e4eeea; border-radius: 9px; background: #f8fbfa; text-align: left; }
.pd-issued-key span { color: #8b9994; font-size: 9px; }
.pd-issued-key strong { color: #28695e; font-family: "Cascadia Code", Consolas, monospace; font-size: 12px; overflow-wrap: anywhere; }
.pd-success-content .pd-inline-error { width: 100%; margin-top: 12px; }
.pd-success-content .pd-modal-actions { width: 100%; justify-content: center; margin-top: 14px; }
.pd-auth-loading { min-height: 100vh; display: flex; align-items: center; justify-content: center; gap: 10px; background: var(--pd-canvas); color: #778782; font-size: 12px; }

@media (max-width: 1100px) {
  .pd-content { padding-right: 25px; padding-left: 25px; }
  .pd-topbar { padding-right: 25px; padding-left: 25px; }
  .pd-metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .pd-overview-grid { grid-template-columns: 1fr; }
}
@media (max-width: 760px) {
  .pd-sidebar { transform: translateX(-100%); transition: transform .22s ease; box-shadow: 10px 0 35px rgba(20,40,35,.08); }
  .pd-sidebar-open { transform: translateX(0); }
  .pd-mobile-backdrop { display: block; position: fixed; inset: 0; z-index: 45; border: 0; background: rgba(20,35,31,.35); }
  .pd-main-column { width: 100%; margin-left: 0; }
  .pd-mobile-menu { display: inline-grid; place-items: center; width: 32px; height: 32px; margin-right: 10px; border: 1px solid var(--pd-border); border-radius: 7px; background: white; color: #58716a; cursor: pointer; }
  .pd-topbar { justify-content: flex-start; height: 57px; padding: 0 16px; }
  .pd-topbar-right { margin-left: auto; }
  .pd-admin-label { display: none; }
  .pd-content { padding: 24px 16px 40px; }
  .pd-page-heading { align-items: flex-start; flex-direction: column; }
  .pd-heading-actions { width: 100%; }
  .pd-heading-actions .pd-button { flex: 1; }
  .pd-renewal-layout { grid-template-columns: 1fr; }
  .pd-toolbar-panel { align-items: stretch; flex-direction: column; }
  .pd-search-wrap { min-height: 34px; }
}
@media (max-width: 480px) {
  .pd-login-card { padding: 30px 22px 23px; }
  .pd-page-heading h1 { font-size: 25px; }
  .pd-metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; }
  .pd-metric-card { min-height: 105px; padding: 14px; }
  .pd-metric-value { font-size: 23px; }
  .pd-detail-grid { grid-template-columns: 1fr; }
  .pd-detail-wide { grid-column: auto; }
  .pd-form-row { flex-direction: column; }
  .pd-inspector-actions { flex-direction: column-reverse; }
  .pd-inspector-actions .pd-button { width: 100%; }
  .pd-request-date { display: none; }
  .pd-modal { padding: 18px; }
}
`;

function AdminStyles() {
  return <style>{ADMIN_CSS}</style>;
}


// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type Tab = "overview" | "subscriptions" | "renewals" | "devices";

type Stats = {
  totalCustomers?: number;
  totalSubscriptions?: number;
  activeSubscriptions?: number;
  expiredSubscriptions?: number;
  lifetimeSubscriptions?: number;
  freeTrialUsers?: number;
  registeredDevices?: number;
  pendingRenewalsCount?: number;
  totalRevenuePKR?: number;
};

type Subscription = {
  id: string;
  licenseKey: string;
  pharmacyName: string;
  customerId?: string;
  deviceId: string;
  plan: string;
  durationDays?: number;
  isLifetime: boolean;
  status: string;
  expiryDate: string | null;
  lastIssuedEnvelope?: unknown;
  createdAt: string;
};

type RenewalRequest = {
  id: string;
  requestNumber: string;
  deviceId: string;
  requestedPlan: string;
  planName: string;
  pricePKR?: number;
  customerName: string;
  customerPhone: string;
  paymentReference: string;
  notes?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
};

type DeviceRecord = {
  id: string;
  deviceId: string;
  licenseKey: string;
  pharmacyName: string;
  boundAt: string;
  isActive: boolean;
};

type AuditLog = {
  eventType: string;
  details: string;
  timestamp: string;
  licenseKey?: string;
  deviceId?: string;
};

type ApiResponse<T = Record<string, unknown>> = T & {
  success?: boolean;
  message?: string;
};

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// -----------------------------------------------------------------------------
// API and formatting helpers
// -----------------------------------------------------------------------------

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("pd_admin_token");
}

function saveToken(token: string) {
  window.localStorage.setItem("pd_admin_token", token);
}

function clearToken() {
  window.localStorage.removeItem("pd_admin_token");
}

async function api<T = Record<string, unknown>>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getToken();
  const response = await fetch(path, {
    ...options,
    cache: "no-store",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(
      payload?.message || `Request failed (${response.status})`,
      response.status
    );
  }
  return payload as ApiResponse<T>;
}

function formatNumber(value: number | undefined): string {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString()
    : "—";
}

function formatCurrency(value: number | undefined): string {
  return typeof value === "number" && Number.isFinite(value)
    ? `Rs ${value.toLocaleString()}`
    : "—";
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
}

function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
}

function getSubscriptionState(sub: Subscription): "LIFETIME" | "EXPIRED" | "EXPIRING" | "ACTIVE" {
  if (sub.isLifetime) return "LIFETIME";
  if (!sub.expiryDate) return "ACTIVE";
  const expiry = new Date(sub.expiryDate).getTime();
  if (Number.isNaN(expiry)) return "ACTIVE";
  if (expiry < Date.now()) return "EXPIRED";
  if (expiry <= Date.now() + 30 * 24 * 60 * 60 * 1000) return "EXPIRING";
  return "ACTIVE";
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

// -----------------------------------------------------------------------------
// Small reusable UI components
// -----------------------------------------------------------------------------

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`pd-brand ${compact ? "pd-brand-compact" : ""}`}>
      <span className="pd-brand-mark">
        <img src="/pharma-logo.png" alt="" />
      </span>
      {!compact && (
        <span className="pd-brand-name">
          Pharma<span>Desk</span>
        </span>
      )}
    </div>
  );
}

function Icon({ name }: { name: "overview" | "subscription" | "renewal" | "device" | "logout" | "plus" | "refresh" | "search" | "download" | "shield" | "close" | "check" | "alert" | "calendar" | "copy" }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  const paths: Record<string, React.ReactNode> = {
    overview: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    subscription: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
    renewal: <><path d="M20 7v5h-5" /><path d="M4 17v-5h5" /><path d="M5.6 9A7 7 0 0 1 18 6l2 1M4 17l2 1a7 7 0 0 0 12.4-3" /></>,
    device: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    refresh: <><path d="M20 7v5h-5" /><path d="M4 17v-5h5" /><path d="M5.5 9A7 7 0 0 1 18 6l2 1M4 17l2 1a7 7 0 0 0 12.5-3" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    download: <><path d="M12 3v12m0 0 4-4m-4 4-4-4" /><path d="M4 17v3h16v-3" /></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    alert: <><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>,
  };

  return <svg {...common}>{paths[name]}</svg>;
}

function Button({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  type = "button",
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`pd-button pd-button-${variant} ${className}`}
    >
      {children}
    </button>
  );
}

function StatusPill({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const kind = normalized === "ACTIVE" || normalized === "APPROVED" || normalized === "LIFETIME"
    ? "success"
    : normalized === "PENDING" || normalized === "EXPIRING"
      ? "warning"
      : normalized === "EXPIRED" || normalized === "REJECTED" || normalized === "INACTIVE"
        ? "danger"
        : "neutral";
  return <span className={`pd-status pd-status-${kind}`}>{status.replace(/_/g, " ")}</span>;
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <section className="pd-panel pd-metric-card">
      <p className="pd-metric-label">{label}</p>
      <p className="pd-metric-value">{value}</p>
      {detail && <p className="pd-metric-detail">{detail}</p>}
    </section>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="pd-empty-state">
      <span className="pd-empty-icon"><Icon name="overview" /></span>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

function InlineError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="pd-inline-error" role="alert">
      <Icon name="alert" />
      <span>{message}</span>
    </div>
  );
}

function LoadingState({ label = "Loading data…" }: { label?: string }) {
  return <div className="pd-loading"><span className="pd-spinner" />{label}</div>;
}

// -----------------------------------------------------------------------------
// Login
// -----------------------------------------------------------------------------

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState("admin@pharmadesk.pk");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success || !data.token) {
        throw new Error(data.message || `Login failed (${response.status})`);
      }
      saveToken(data.token);
      onLogin();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to sign in. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="pd-login-page">
      <AdminStyles />
      <div className="pd-login-decoration pd-login-decoration-one" />
      <div className="pd-login-decoration pd-login-decoration-two" />
      <section className="pd-login-card">
        <div className="pd-login-brand"><Logo /></div>
        <div className="pd-login-heading">
          <span className="pd-eyebrow">ADMINISTRATOR ACCESS</span>
          <h1>Welcome back</h1>
          <p>Sign in to manage PharmaDesk licenses and renewals.</p>
        </div>

        <form className="pd-login-form" onSubmit={handleSubmit}>
          <label className="pd-field-label" htmlFor="admin-username">Email address</label>
          <input
            id="admin-username"
            className="pd-input"
            type="email"
            autoComplete="username"
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="admin@example.com"
          />

          <label className="pd-field-label" htmlFor="admin-password">Password</label>
          <div className="pd-password-wrap">
            <input
              id="admin-password"
              className="pd-input"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
            />
            <button
              className="pd-password-toggle"
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <InlineError message={error} />
          <Button type="submit" disabled={loading} className="pd-login-submit">
            {loading ? <><span className="pd-spinner pd-spinner-light" /> Signing in…</> : "Sign in to PharmaDesk"}
          </Button>
        </form>

        <div className="pd-login-footer"><Icon name="shield" /> Secure administrator access</div>
      </section>
      <p className="pd-login-copyright">PharmaDesk Licensing Portal</p>
    </main>
  );
}

// -----------------------------------------------------------------------------
// Main application shell
// -----------------------------------------------------------------------------

export default function AdminPortal() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState("");
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setLoggedIn(Boolean(getToken()));
    setAuthReady(true);
  }, []);

  const refreshStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError("");
    try {
      const data = await api<{ stats?: Stats; recentActivity?: AuditLog[] }>("/api/stats");
      if (data.success) {
        setStats(data.stats || {});
        setAuditLogs(Array.isArray(data.recentActivity) ? data.recentActivity : []);
      } else {
        throw new Error(data.message || "Unable to load dashboard statistics.");
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearToken();
        setLoggedIn(false);
        return;
      }
      setStatsError(getErrorMessage(error, "Unable to load dashboard statistics."));
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    refreshStats();
    const interval = window.setInterval(refreshStats, 30_000);
    return () => window.clearInterval(interval);
  }, [loggedIn, refreshStats]);

  function handleLogout() {
    clearToken();
    setLoggedIn(false);
    setStats(null);
    setAuditLogs([]);
    setActiveTab("overview");
  }

  function navigate(tab: Tab) {
    setActiveTab(tab);
    setMobileNavOpen(false);
  }

  if (!authReady) {
    return <><AdminStyles /><main className="pd-auth-loading"><span className="pd-spinner" />Preparing secure portal…</main></>;
  }
  if (!loggedIn) return <LoginScreen onLogin={() => setLoggedIn(true)} />;

  const navItems: { id: Tab; label: string; icon: "overview" | "subscription" | "renewal" | "device"; count?: number }[] = [
    { id: "overview", label: "Overview", icon: "overview" },
    { id: "subscriptions", label: "Subscriptions", icon: "subscription" },
    { id: "renewals", label: "Renewals", icon: "renewal", count: stats?.pendingRenewalsCount },
    { id: "devices", label: "Devices", icon: "device" },
  ];

  return (
    <>
      <AdminStyles />
      <div className="pd-app-shell">
        {mobileNavOpen && <button className="pd-mobile-backdrop" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
        <aside className={`pd-sidebar ${mobileNavOpen ? "pd-sidebar-open" : ""}`}>
          <div className="pd-sidebar-brand"><Logo /></div>
          <div className="pd-sidebar-section-label">WORKSPACE</div>
          <nav className="pd-sidebar-nav" aria-label="Main navigation">
            {navItems.map((item) => (
              <button
                key={item.id}
                className={`pd-nav-item ${activeTab === item.id ? "pd-nav-item-active" : ""}`}
                onClick={() => navigate(item.id)}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
                {typeof item.count === "number" && item.count > 0 && <span className="pd-nav-count">{item.count}</span>}
              </button>
            ))}
          </nav>
          <div className="pd-sidebar-bottom">
            <div className="pd-sidebar-secure"><Icon name="shield" /><span>Administrator portal</span></div>
            <button className="pd-logout-button" onClick={handleLogout}><Icon name="logout" /> Sign out</button>
          </div>
        </aside>

        <div className="pd-main-column">
          <header className="pd-topbar">
            <button className="pd-mobile-menu" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation">☰</button>
            <div className="pd-breadcrumb">PharmaDesk <span>/</span> <strong>{navItems.find((item) => item.id === activeTab)?.label}</strong></div>
            <div className="pd-topbar-right">
              <span className="pd-admin-label"><span className="pd-admin-dot" /> Admin session</span>
              <button className="pd-topbar-logout" onClick={handleLogout} title="Sign out"><Icon name="logout" /></button>
            </div>
          </header>

          <main className="pd-content">
            {activeTab === "overview" && (
              <OverviewView
                stats={stats}
                auditLogs={auditLogs}
                loading={statsLoading}
                error={statsError}
                onRefresh={refreshStats}
                onNavigate={navigate}
                onOpenIssue={() => setIssueModalOpen(true)}
              />
            )}
            {activeTab === "subscriptions" && (
              <SubscriptionsView onOpenIssue={() => setIssueModalOpen(true)} onRefresh={refreshStats} />
            )}
            {activeTab === "renewals" && <RenewalsView onRefresh={refreshStats} />}
            {activeTab === "devices" && <DevicesView onRefresh={refreshStats} />}
          </main>
        </div>

        {issueModalOpen && (
          <IssueLicenseModal
            onClose={() => setIssueModalOpen(false)}
            onSuccess={() => {
              refreshStats();
              navigate("subscriptions");
            }}
          />
        )}
      </div>
    </>
  );
}

// -----------------------------------------------------------------------------
// Overview
// -----------------------------------------------------------------------------

function OverviewView({
  stats,
  auditLogs,
  loading,
  error,
  onRefresh,
  onNavigate,
  onOpenIssue,
}: {
  stats: Stats | null;
  auditLogs: AuditLog[];
  loading: boolean;
  error: string;
  onRefresh: () => void;
  onNavigate: (tab: Tab) => void;
  onOpenIssue: () => void;
}) {
  return (
    <div className="pd-page-stack">
      <div className="pd-page-heading">
        <div>
          <span className="pd-eyebrow">LICENSING MANAGEMENT</span>
          <h1>Overview</h1>
          <p>A live summary of licenses, renewals and registered devices.</p>
        </div>
        <div className="pd-heading-actions">
          <Button variant="secondary" onClick={onRefresh} disabled={loading}><Icon name="refresh" /> Refresh</Button>
          <Button onClick={onOpenIssue}><Icon name="plus" /> Issue license</Button>
        </div>
      </div>

      <InlineError message={error} />

      <div className="pd-section-heading"><div><h2>System summary</h2><p>Values are provided by the licensing API.</p></div>{loading && <span className="pd-subtle-loading"><span className="pd-spinner" /> Updating</span>}</div>
      <div className="pd-metric-grid">
        <MetricCard label="Total customers" value={stats ? formatNumber(stats.totalCustomers) : "—"} detail="Registered customers" />
        <MetricCard label="Total subscriptions" value={stats ? formatNumber(stats.totalSubscriptions) : "—"} detail="Issued licenses" />
        <MetricCard label="Active subscriptions" value={stats ? formatNumber(stats.activeSubscriptions) : "—"} detail="Currently active" />
        <MetricCard label="Expired subscriptions" value={stats ? formatNumber(stats.expiredSubscriptions) : "—"} detail="Past expiry date" />
        <MetricCard label="Registered devices" value={stats ? formatNumber(stats.registeredDevices) : "—"} detail="Hardware records" />
        <MetricCard label="Pending renewals" value={stats ? formatNumber(stats.pendingRenewalsCount) : "—"} detail="Awaiting review" />
      </div>

      <div className="pd-overview-grid">
        <section className="pd-panel">
          <div className="pd-panel-heading">
            <div><h2>Recent activity</h2><p>Latest events recorded by the system.</p></div>
          </div>
          {auditLogs.length > 0 ? (
            <div className="pd-activity-list">
              {auditLogs.slice(0, 8).map((log, index) => (
                <div className="pd-activity-row" key={`${log.timestamp}-${index}`}>
                  <span className="pd-activity-marker"><Icon name="shield" /></span>
                  <div className="pd-activity-copy">
                    <strong>{log.eventType || "System event"}</strong>
                    <p>{log.details || "No event details provided."}</p>
                    <span>{formatDateTime(log.timestamp)}</span>
                  </div>
                  {log.licenseKey && <code className="pd-activity-code">{log.licenseKey}</code>}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No activity recorded" description="System events will appear here when they are returned by the API." />
          )}
        </section>

        <section className="pd-panel pd-quick-panel">
          <div className="pd-panel-heading"><div><h2>Quick actions</h2><p>Common licensing operations.</p></div></div>
          <button className="pd-quick-action" onClick={onOpenIssue}>
            <span className="pd-quick-icon"><Icon name="plus" /></span>
            <span><strong>Issue a new license</strong><small>Create a license for a pharmacy workstation.</small></span>
            <span className="pd-arrow">→</span>
          </button>
          <button className="pd-quick-action" onClick={() => onNavigate("subscriptions")}>
            <span className="pd-quick-icon"><Icon name="subscription" /></span>
            <span><strong>Manage subscriptions</strong><small>Search licenses and extend validity.</small></span>
            <span className="pd-arrow">→</span>
          </button>
          <button className="pd-quick-action" onClick={() => onNavigate("renewals")}>
            <span className="pd-quick-icon"><Icon name="renewal" /></span>
            <span><strong>Review renewals</strong><small>Approve or reject submitted requests.</small></span>
            <span className="pd-arrow">→</span>
          </button>
          <button className="pd-quick-action" onClick={() => onNavigate("devices")}>
            <span className="pd-quick-icon"><Icon name="device" /></span>
            <span><strong>Manage devices</strong><small>Review hardware bindings and unbind devices.</small></span>
            <span className="pd-arrow">→</span>
          </button>
          <div className="pd-revenue-summary">
            <span>Total recorded revenue</span>
            <strong>{stats ? formatCurrency(stats.totalRevenuePKR) : "—"}</strong>
          </div>
        </section>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Subscriptions
// -----------------------------------------------------------------------------

function SubscriptionsView({ onOpenIssue, onRefresh }: { onOpenIssue: () => void; onRefresh: () => void }) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "EXPIRING" | "EXPIRED" | "LIFETIME">("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [extendingId, setExtendingId] = useState<string | null>(null);

  const loadSubscriptions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api<{ subscriptions?: Subscription[] }>("/api/subscriptions");
      if (!data.success) throw new Error(data.message || "Unable to load subscriptions.");
      setSubscriptions(Array.isArray(data.subscriptions) ? data.subscriptions : []);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load subscriptions."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSubscriptions(); }, [loadSubscriptions]);

  const filtered = useMemo(() => subscriptions.filter((sub) => {
    const state = getSubscriptionState(sub);
    if (filter !== "ALL" && state !== filter) return false;
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [sub.pharmacyName, sub.licenseKey, sub.deviceId, sub.plan]
      .some((value) => value?.toLowerCase().includes(query));
  }), [subscriptions, filter, search]);

  async function extendSubscription(id: string) {
    setExtendingId(id);
    setError("");
    try {
      const data = await api(`/api/subscriptions/${encodeURIComponent(id)}/extend`, {
        method: "POST",
        body: JSON.stringify({ additionalDays: 30 }),
      });
      if (!data.success) throw new Error(data.message || "Could not extend this subscription.");
      await loadSubscriptions();
      onRefresh();
    } catch (err) {
      setError(getErrorMessage(err, "Extension failed."));
    } finally {
      setExtendingId(null);
    }
  }

  function downloadEnvelope(sub: Subscription) {
    if (!sub.lastIssuedEnvelope) {
      setError("No license file is available for this subscription.");
      return;
    }
    const blob = new Blob([JSON.stringify(sub.lastIssuedEnvelope, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `pharmadesk-license-${sub.licenseKey || sub.id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="pd-page-stack">
      <div className="pd-page-heading">
        <div><span className="pd-eyebrow">LICENSE DIRECTORY</span><h1>Subscriptions</h1><p>Search and manage issued pharmacy licenses.</p></div>
        <div className="pd-heading-actions">
          <Button variant="secondary" onClick={loadSubscriptions} disabled={loading}><Icon name="refresh" /> Refresh</Button>
          <Button onClick={onOpenIssue}><Icon name="plus" /> Issue license</Button>
        </div>
      </div>

      <InlineError message={error} />

      <section className="pd-panel pd-toolbar-panel">
        <div className="pd-search-wrap"><Icon name="search" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search pharmacy, license key, device or plan" aria-label="Search subscriptions" /></div>
        <div className="pd-filter-row">
          {(["ALL", "ACTIVE", "EXPIRING", "EXPIRED", "LIFETIME"] as const).map((item) => (
            <button key={item} onClick={() => setFilter(item)} className={`pd-filter-button ${filter === item ? "pd-filter-active" : ""}`}>{item === "ALL" ? "All" : item.charAt(0) + item.slice(1).toLowerCase()}</button>
          ))}
        </div>
      </section>

      <section className="pd-panel pd-table-panel">
        <div className="pd-panel-heading pd-table-heading"><div><h2>License records</h2><p>{loading ? "Loading records…" : `${filtered.length} record${filtered.length === 1 ? "" : "s"}`}</p></div></div>
        {loading ? <LoadingState label="Loading subscriptions…" /> : filtered.length === 0 ? (
          <EmptyState title={subscriptions.length === 0 ? "No subscriptions found" : "No matching subscriptions"} description={subscriptions.length === 0 ? "Issued licenses will appear here when available from the API." : "Try another search term or filter."} />
        ) : (
          <div className="pd-table-scroll"><table className="pd-table">
            <thead><tr><th>Pharmacy</th><th>License key</th><th>Device ID</th><th>Plan</th><th>Expiry</th><th>Status</th><th className="pd-align-right">Actions</th></tr></thead>
            <tbody>{filtered.map((sub) => {
              const state = getSubscriptionState(sub);
              return <tr key={sub.id}>
                <td><strong>{sub.pharmacyName || "Unnamed pharmacy"}</strong><small>Created {formatDate(sub.createdAt)}</small></td>
                <td><code className="pd-mono-cell">{sub.licenseKey || "—"}</code><button className="pd-copy-button" title="Copy license key" onClick={() => navigator.clipboard?.writeText(sub.licenseKey || "")}><Icon name="copy" /></button></td>
                <td><code className="pd-mono-cell">{sub.deviceId || "—"}</code></td>
                <td>{sub.plan || "—"}</td>
                <td>{sub.isLifetime ? "Never" : formatDate(sub.expiryDate)}</td>
                <td><StatusPill status={state} /></td>
                <td className="pd-align-right pd-actions-cell">
                  {!sub.isLifetime && <Button variant="secondary" disabled={extendingId === sub.id} onClick={() => extendSubscription(sub.id)}>{extendingId === sub.id ? "Extending…" : "+30 days"}</Button>}
                  <button className="pd-icon-button" onClick={() => downloadEnvelope(sub)} title="Download license JSON"><Icon name="download" /></button>
                </td>
              </tr>;
            })}</tbody>
          </table></div>
        )}
      </section>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Renewals
// -----------------------------------------------------------------------------

function RenewalsView({ onRefresh }: { onRefresh: () => void }) {
  const [requests, setRequests] = useState<RenewalRequest[]>([]);
  const [selected, setSelected] = useState<RenewalRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api<{ requests?: RenewalRequest[] }>("/api/renewals?status=PENDING");
      if (!data.success) throw new Error(data.message || "Unable to load renewal requests.");
      const rows = Array.isArray(data.requests) ? data.requests : [];
      setRequests(rows);
      setSelected((current) => rows.find((item) => item.id === current?.id) || rows[0] || null);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load renewal requests."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  async function updateRequest(action: "approve" | "reject") {
    if (!selected) return;
    let reason: string | undefined = undefined;
    if (action === "reject") {
      const promptVal = window.prompt("Enter a reason for rejecting this renewal request:", "");
      if (promptVal === null) return;
      if (!promptVal.trim()) {
        setError("Please enter a rejection reason.");
        return;
      }
      reason = promptVal;
    }

    setBusy(true);
    setError("");
    try {
      const data = await api(`/api/renewals/${encodeURIComponent(selected.id)}/${action}`, {
        method: "POST",
        ...(action === "reject" ? { body: JSON.stringify({ reason }) } : {}),
      });
      if (!data.success) throw new Error(data.message || `Could not ${action} this request.`);
      await loadRequests();
      onRefresh();
    } catch (err) {
      setError(getErrorMessage(err, `Could not ${action} this request.`));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pd-page-stack">
      <div className="pd-page-heading">
        <div><span className="pd-eyebrow">CUSTOMER REQUESTS</span><h1>Renewals</h1><p>Review submitted renewal requests and record your decision.</p></div>
        <Button variant="secondary" onClick={loadRequests} disabled={loading}><Icon name="refresh" /> Refresh</Button>
      </div>
      <InlineError message={error} />
      <div className="pd-renewal-layout">
        <section className="pd-panel pd-queue-panel">
          <div className="pd-panel-heading"><div><h2>Pending requests</h2><p>{loading ? "Loading…" : `${requests.length} awaiting review`}</p></div><StatusPill status="PENDING" /></div>
          {loading ? <LoadingState label="Loading renewal requests…" /> : requests.length === 0 ? (
            <EmptyState title="No pending renewals" description="New customer renewal requests will appear here." />
          ) : (
            <div className="pd-request-list">{requests.map((request) => (
              <button key={request.id} className={`pd-request-item ${selected?.id === request.id ? "pd-request-selected" : ""}`} onClick={() => setSelected(request)}>
                <span className="pd-request-avatar">{(request.customerName || "C").trim().charAt(0).toUpperCase()}</span>
                <span className="pd-request-main"><strong>{request.customerName || "Customer"}</strong><small>{request.requestNumber || request.id}</small><small>{request.planName || request.requestedPlan || "Plan not specified"}</small></span>
                <span className="pd-request-date">{formatDate(request.createdAt)}</span>
              </button>
            ))}</div>
          )}
        </section>

        <section className="pd-panel pd-inspector-panel">
          <div className="pd-panel-heading"><div><h2>Request details</h2><p>Check the submitted information before taking action.</p></div></div>
          {!selected ? <EmptyState title="Select a request" description="Choose a renewal request from the list to inspect its details." /> : (
            <>
              <div className="pd-detail-title"><div><span className="pd-eyebrow">RENEWAL REQUEST</span><h3>{selected.customerName || "Customer"}</h3></div><StatusPill status={selected.status || "PENDING"} /></div>
              <div className="pd-detail-grid">
                <Detail label="Request number" value={selected.requestNumber} />
                <Detail label="Submitted" value={formatDateTime(selected.createdAt)} />
                <Detail label="Phone number" value={selected.customerPhone} />
                <Detail label="Payment reference" value={selected.paymentReference} />
                <Detail label="Requested plan" value={selected.planName || selected.requestedPlan} />
                <Detail label="Submitted amount" value={typeof selected.pricePKR === "number" ? formatCurrency(selected.pricePKR) : "Not provided"} />
                <Detail label="Device ID" value={selected.deviceId} wide />
                <Detail label="Customer notes" value={selected.notes || "No notes provided."} wide />
              </div>
              <div className="pd-inspector-actions">
                <Button variant="danger" disabled={busy} onClick={() => updateRequest("reject")}>Reject request</Button>
                <Button disabled={busy} onClick={() => updateRequest("approve")}>{busy ? "Processing…" : <><Icon name="check" /> Approve renewal</>}</Button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function Detail({ label, value, wide = false }: { label: string; value?: string | null; wide?: boolean }) {
  return <div className={`pd-detail ${wide ? "pd-detail-wide" : ""}`}><span>{label}</span><strong>{value || "—"}</strong></div>;
}

// -----------------------------------------------------------------------------
// Devices
// -----------------------------------------------------------------------------

function DevicesView({ onRefresh }: { onRefresh: () => void }) {
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const loadDevices = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api<{ devices?: DeviceRecord[] }>("/api/devices");
      if (!data.success) throw new Error(data.message || "Unable to load devices.");
      setDevices(Array.isArray(data.devices) ? data.devices : []);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load devices."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDevices(); }, [loadDevices]);

  const filtered = devices.filter((device) => [device.deviceId, device.licenseKey, device.pharmacyName]
    .some((value) => value?.toLowerCase().includes(search.trim().toLowerCase())));

  async function resetDevice(device: DeviceRecord) {
    const confirmed = window.confirm("Unbind this device? The customer may need to activate the license again on a replacement computer.");
    if (!confirmed) return;
    setBusyId(device.id);
    setError("");
    try {
      const data = await api(`/api/devices/${encodeURIComponent(device.id)}/reset`, { method: "POST" });
      if (!data.success) throw new Error(data.message || "Unable to unbind this device.");
      await loadDevices();
      onRefresh();
    } catch (err) {
      setError(getErrorMessage(err, "Device unbind failed."));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="pd-page-stack">
      <div className="pd-page-heading">
        <div><span className="pd-eyebrow">HARDWARE MANAGEMENT</span><h1>Devices</h1><p>Review registered workstations and manage hardware bindings.</p></div>
        <Button variant="secondary" onClick={loadDevices} disabled={loading}><Icon name="refresh" /> Refresh</Button>
      </div>
      <InlineError message={error} />
      <section className="pd-panel pd-toolbar-panel">
        <div className="pd-search-wrap"><Icon name="search" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by device, pharmacy or license key" aria-label="Search devices" /></div>
        <span className="pd-record-count">{loading ? "Loading…" : `${filtered.length} device${filtered.length === 1 ? "" : "s"}`}</span>
      </section>
      <section className="pd-panel pd-table-panel">
        <div className="pd-panel-heading pd-table-heading"><div><h2>Registered devices</h2><p>Hardware records returned by the licensing API.</p></div></div>
        {loading ? <LoadingState label="Loading devices…" /> : filtered.length === 0 ? (
          <EmptyState title={devices.length === 0 ? "No devices registered" : "No matching devices"} description={devices.length === 0 ? "Registered workstations will appear here after activation." : "Try another search term."} />
        ) : (
          <div className="pd-table-scroll"><table className="pd-table">
            <thead><tr><th>Device ID</th><th>Pharmacy</th><th>License key</th><th>Bound date</th><th>Status</th><th className="pd-align-right">Action</th></tr></thead>
            <tbody>{filtered.map((device) => <tr key={device.id}>
              <td><code className="pd-mono-cell">{device.deviceId || "—"}</code></td>
              <td><strong>{device.pharmacyName || "Unnamed pharmacy"}</strong></td>
              <td><code className="pd-mono-cell">{device.licenseKey || "—"}</code></td>
              <td>{formatDate(device.boundAt)}</td>
              <td><StatusPill status={device.isActive ? "ACTIVE" : "INACTIVE"} /></td>
              <td className="pd-align-right">{device.isActive ? <Button variant="danger" disabled={busyId === device.id} onClick={() => resetDevice(device)}>{busyId === device.id ? "Unbinding…" : "Unbind device"}</Button> : <span className="pd-muted">No action</span>}</td>
            </tr>)}</tbody>
          </table></div>
        )}
      </section>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Issue license modal
// -----------------------------------------------------------------------------

function IssueLicenseModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    pharmacyName: "",
    customerPhone: "",
    deviceId: "",
    plan: "YEARLY",
    durationDays: "365",
    isLifetime: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ licenseKey?: string; licenseEnvelope?: unknown; message?: string } | null>(null);

  async function handleIssue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await api<{ licenseKey?: string; licenseEnvelope?: unknown }>("/api/licenses/issue", {
        method: "POST",
        body: JSON.stringify({ ...form, durationDays: Number(form.durationDays) }),
      });
      if (!data.success) throw new Error(data.message || "License could not be issued.");
      setResult({ licenseKey: data.licenseKey, licenseEnvelope: data.licenseEnvelope, message: data.message });
    } catch (err) {
      setError(getErrorMessage(err, "License issuance failed."));
    } finally {
      setLoading(false);
    }
  }

  function downloadEnvelope() {
    if (!result?.licenseEnvelope) {
      setError("The API did not return a license file for download.");
      return;
    }
    const blob = new Blob([JSON.stringify(result.licenseEnvelope, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `pharmadesk-license-${result.licenseKey || "new"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="pd-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="pd-modal" role="dialog" aria-modal="true" aria-labelledby="issue-license-title">
        <div className="pd-modal-heading"><div><span className="pd-eyebrow">LICENSE MANAGEMENT</span><h2 id="issue-license-title">Issue a license</h2><p>Create a license for a pharmacy workstation.</p></div><button className="pd-icon-button" onClick={onClose} aria-label="Close"><Icon name="close" /></button></div>
        {result ? (
          <div className="pd-success-content">
            <span className="pd-success-icon"><Icon name="check" /></span>
            <h3>License issued</h3>
            <p>The API confirmed that the license was created.</p>
            <div className="pd-issued-key"><span>License key</span><strong>{result.licenseKey || "Not returned by API"}</strong></div>
            <InlineError message={error} />
            <div className="pd-modal-actions">
              {Boolean(result.licenseEnvelope) && <Button variant="secondary" onClick={downloadEnvelope}><Icon name="download" /> Download JSON</Button>}
              <Button onClick={() => { onSuccess(); onClose(); }}>Done</Button>
            </div>
          </div>
        ) : (
          <form className="pd-issue-form" onSubmit={handleIssue}>
            <div className="pd-form-field"><label htmlFor="pharmacy-name">Pharmacy / store name <b>*</b></label><input id="pharmacy-name" className="pd-input" required value={form.pharmacyName} onChange={(event) => setForm({ ...form, pharmacyName: event.target.value })} placeholder="Enter pharmacy name" /></div>
            <div className="pd-form-field"><label htmlFor="customer-phone">Customer phone</label><input id="customer-phone" className="pd-input" value={form.customerPhone} onChange={(event) => setForm({ ...form, customerPhone: event.target.value })} placeholder="03XX XXXXXXX" /></div>
            <div className="pd-form-field"><label htmlFor="device-id">Hardware device ID <b>*</b></label><input id="device-id" className="pd-input pd-mono-input" required value={form.deviceId} onChange={(event) => setForm({ ...form, deviceId: event.target.value.toUpperCase() })} placeholder="Enter device ID" /></div>
            <div className="pd-form-row">
              <div className="pd-form-field"><label htmlFor="license-plan">Plan</label><select id="license-plan" className="pd-input" value={form.plan} onChange={(event) => { const plan = event.target.value; setForm({ ...form, plan, isLifetime: plan === "LIFETIME", durationDays: plan === "MONTHLY" ? "30" : "365" }); }}><option value="MONTHLY">Monthly</option><option value="YEARLY">Yearly</option><option value="LIFETIME">Lifetime</option></select></div>
              <div className="pd-form-field"><label htmlFor="duration-days">Duration (days)</label><input id="duration-days" className="pd-input" type="number" min="1" disabled={form.isLifetime} value={form.isLifetime ? "" : form.durationDays} onChange={(event) => setForm({ ...form, durationDays: event.target.value })} placeholder={form.isLifetime ? "No expiry" : "365"} /></div>
            </div>
            <InlineError message={error} />
            <div className="pd-modal-actions"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" disabled={loading}>{loading ? "Issuing license…" : "Issue license"}</Button></div>
          </form>
        )}
      </section>
    </div>
  );
}
