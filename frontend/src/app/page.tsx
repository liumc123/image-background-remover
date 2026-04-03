"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { removeBackground } from "@imgly/background-removal";

type ProcessingState = "idle" | "processing" | "done" | "error";
type User = { name: string; email: string; picture: string } | null;

// ─── Load Google Identity Services ─────────────────────────
function loadGIS() {
  if (document.getElementById("google-script")) return;
  const s = document.createElement("script");
  s.id = "google-script";
  s.src = "https://accounts.google.com/gsi/client";
  s.async = true;
  s.defer = true;
  document.head.appendChild(s);
}

// ─── Auth Button ───────────────────────────────────────────
function AuthButton({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  if (user) {
    return (
      <div className="flex items-center justify-center gap-3 mt-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.10]">
          {user.picture && (
            <img src={user.picture} alt={user.name} className="w-6 h-6 rounded-full" />
          )}
          <span className="text-white/70 text-sm font-medium">{user.name}</span>
          <span className="text-white/30 text-xs">·</span>
          <span className="text-emerald-400/70 text-xs">Signed in</span>
        </div>
        <button
          onClick={onSignOut}
          className="text-white/30 hover:text-white/60 text-xs transition-colors underline underline-offset-2"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="flex justify-center mt-4">
      <div id="g_id_onload"
        data-client_id="810081244227-kqvuga30g7g9d34tpqj42klm7m367knk.apps.googleusercontent.com"
        data-context="signin"
        data-ux_mode="popup"
        data-callback="handleCredentialResponse"
        data-auto_prompt="false">
      </div>
      <div className="g_id_signin"
        data-type="standard"
        data-shape="rectangular"
        data-theme="outline"
        data-text="signin_with"
        data-size="large"
        data-logo_alignment="left">
      </div>
    </div>
  );
}

// ─── Background with light rays ────────────────────────────
function HeroBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=1920&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="absolute inset-0 bg-[#0d0d12]/[0.82]" />
      <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-violet-600/25 via-purple-600/10 to-transparent pointer-events-none" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 40%, rgba(124,58,237,0.12) 0%, transparent 70%)",
        }}
      />
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#0d0d12] to-transparent" />
      <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-[#0d0d12] to-transparent" />
    </div>
  );
}

// ─── Checkerboard ─────────────────────────────────────────
function Checkerboard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`${className} bg-[length:14px_14px] bg-[linear-gradient(45deg,#2a2a3a_25%,transparent_25%),linear-gradient(-45deg,#2a2a3a_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#2a2a3a_75%),linear-gradient(-45deg,transparent_75%,#2a2a3a_75%)] bg-[#1e1e2c] bg-[0_0,0_7px,7px_-7px,*-7px_*]`}
    />
  );
}

// ─── Before / After slider ─────────────────────────────────
function BeforeAfterSlider({
  original,
  result,
}: {
  original: string;
  result: string;
}) {
  const [sliderX, setSliderX] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setSliderX(
      Math.max(0, Math.min(((clientX - rect.left) / rect.width) * 100, 100))
    );
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    handleMove(e.clientX);
    const onMove = (ev: MouseEvent) => handleMove(ev.clientX);
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden cursor-col-resize select-none max-h-[420px] shadow-2xl ring-1 ring-white/10"
      onMouseDown={onMouseDown}
      onTouchMove={(e) => handleMove(e.touches[0].clientX)}
    >
      <Checkerboard className="absolute inset-0" />
      {/* Result (full) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={result} alt="Result" className="absolute inset-0 w-full h-full object-contain" />
      {/* Original clipped */}
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderX}%` }}>
        <Checkerboard className="absolute inset-0" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={original}
          alt="Original"
          className="absolute inset-0 w-full h-full object-contain"
          style={{ width: `${100 / (sliderX / 100)}%`, maxWidth: "none" }}
        />
      </div>
      {/* Divider */}
      <div
        className="absolute top-0 bottom-0 w-px bg-white/80 shadow-[0_0_8px_rgba(167,139,250,0.5)] z-10"
        style={{ left: `${sliderX}%`, transform: "translateX(-50%)" }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-xl ring-2 ring-violet-500 flex items-center justify-center">
          <svg className="w-4 h-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
        </div>
      </div>
      <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/60 text-white text-xs font-medium backdrop-blur-sm">
        Original
      </div>
      <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/60 text-white text-xs font-medium backdrop-blur-sm">
        Background Removed
      </div>
    </div>
  );
}

// ─── Progress ───────────────────────────────────────────────
function ProgressView({ progress }: { progress: number }) {
  const r = 46;
  const circ = 2 * Math.PI * r;
  const off = circ - (progress / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-6 py-12">
      <div className="relative w-28 h-28">
        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 110 110">
          <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <circle
            cx="55" cy="55" r={r}
            fill="none"
            stroke="url(#ringGrad)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={off}
            style={{ transition: "stroke-dashoffset 0.4s ease" }}
          />
          <defs>
            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
          </defs>
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-white">
          {progress}%
        </span>
      </div>
      <div className="text-center">
        <p className="text-white font-semibold text-lg">
          {progress < 50 ? "Loading AI model…" : "Removing background…"}
        </p>
        <p className="text-white/30 text-sm mt-1.5">
          {progress < 10 ? "First run downloads model (~20MB)" : "Usually 3–8 seconds"}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {[
          { done: progress > 0, label: "Uploading" },
          { done: progress > 20, label: "AI Model" },
          { done: progress > 60, label: "Processing" },
          { done: progress === 100, label: "Complete" },
        ].map(({ done, label }, i) => (
          <div key={label} className="flex items-center gap-1.5">
            <div
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                done ? "bg-violet-400 shadow-[0_0_6px_rgba(167,139,250,0.8)]" : "bg-white/20"
              }`}
            />
            <span className={`text-xs ${done ? "text-white/70" : "text-white/25"}`}>{label}</span>
            {i < 3 && <div className="w-4 h-px bg-white/10 ml-1" />}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Demo showcase ─────────────────────────────────────────
function DemoShowcase() {
  return (
    <div className="grid grid-cols-3 gap-3 mb-8">
      {[
        { emoji: "🧑‍💼", label: "Portrait" },
        { emoji: "🏷️", label: "Product" },
        { emoji: "🐶", label: "Pet" },
      ].map(({ emoji, label }) => (
        <div
          key={label}
          className="group relative bg-white/5 border border-white/10 rounded-xl p-3 text-center cursor-pointer hover:bg-white/10 hover:border-violet-500/40 transition-all duration-300"
        >
          <div className="text-2xl mb-1">{emoji}</div>
          <div className="text-[10px] text-white/30 group-hover:text-white/60 transition-colors">{label}</div>
          <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/5 group-hover:ring-violet-500/20 transition-all" />
        </div>
      ))}
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────
export default function Home() {
  const [state, setState] = useState<ProcessingState>("idle");
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    loadGIS();

    // Load stored token and user data
    const storedToken = localStorage.getItem('auth_token');
    if (storedToken) {
      setAuthToken(storedToken);
      loadUserData(storedToken);
    }

    // @ts-ignore
    window.handleCredentialResponse = async (response: { credential: string }) => {
      try {
        const payload = JSON.parse(atob(response.credential.split('.')[1]));
        setUser({
          name: payload.name,
          email: payload.email,
          picture: payload.picture,
        });
        
        // Get token from backend
        const res = await fetch('https://rmbg-user-api.liumc666.workers.dev/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_token: response.credential })
        });
        const data = await res.json();
        if (data.success && data.data.token) {
          localStorage.setItem('auth_token', data.data.token);
          setAuthToken(data.data.token);
          loadUserData(data.data.token);
        }
      } catch {
        console.error("Failed to parse credential");
      }
    };
  }, []);

  async function loadUserData(token: string) {
    try {
      const res = await fetch('https://rmbg-user-api.liumc666.workers.dev/api/users/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setUserData(data.data);
      }
    } catch (err) {
      console.error('Failed to load user data:', err);
    }
  }

  const handleSignOut = () => {
    // @ts-ignore
    if (window.google?.accounts?.id) {
      // @ts-ignore
      window.google.accounts.id.disableAutoSelect();
    }
    setUser(null);
    setAuthToken(null);
    setUserData(null);
    localStorage.removeItem('auth_token');
  };

  const canProcess = () => {
    if (!userData) return false; // Must be logged in
    if (userData.currentMembership) return true; // Members can always process
    return (userData.free_uses_remaining ?? 0) > 0; // Free users need remaining uses
  };

  const getUsageMessage = () => {
    if (!userData) return 'Sign in to get 3 free uses';
    if (userData.currentMembership) return `${userData.currentMembership.name} Member - Unlimited`;
    const remaining = userData.free_uses_remaining ?? 0;
    if (remaining <= 0) return 'No free uses remaining';
    return `${remaining} free use${remaining !== 1 ? 's' : ''} remaining`;
  };

  const processImage = async (file: File) => {
    if (!userData) {
      setErrorMessage("Please sign in to use this feature"); setState("error"); return;
    }
    if (!canProcess()) {
      setState("error");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("File too large. Max 10MB allowed."); setState("error"); return;
    }
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setErrorMessage("Invalid file type. Please use JPG, PNG, or WebP."); setState("error"); return;
    }
    
    // Deduct free use for non-members
    if (!userData.currentMembership && authToken) {
      try {
        const res = await fetch('https://rmbg-user-api.liumc666.workers.dev/api/users/me/use-free', {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` }
        });
        const data = await res.json();
        if (data.success && data.data.allowed) {
          // Update local userData
          setUserData((prev: any) => ({
            ...prev,
            free_uses_remaining: data.data.remaining
          }));
        }
      } catch (err) {
        console.error('Failed to deduct free use:', err);
      }
    }
    
    const reader = new FileReader();
    reader.onload = (e) => setOriginalImage(e.target?.result as string);
    reader.readAsDataURL(file);
    setState("processing");
    setErrorMessage(null);
    setProgress(0);
    try {
      const blob = await removeBackground(file, {
        progress: (key, current, total) => {
          if (key === "compute:inference") setProgress(Math.round((current / total) * 100));
        },
        output: { format: "image/png", quality: 1 },
      });
      setResultImage(URL.createObjectURL(blob));
      setState("done");
      setProgress(100);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong");
      setState("error");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processImage(file);
  };

  const handleReset = () => {
    setState("idle"); setOriginalImage(null); setResultImage(null);
    setErrorMessage(null); setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDownload = () => {
    if (!resultImage) return;
    const link = document.createElement("a");
    link.href = resultImage; link.download = "removed-background.png"; link.click();
  };

  return (
    <>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap");
        * { font-family: "DM Sans", system-ui, sans-serif; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both; }
        .fade-up-1 { animation-delay: 0.07s; }
        .fade-up-2 { animation-delay: 0.14s; }
        .fade-up-3 { animation-delay: 0.21s; }
        .fade-up-4 { animation-delay: 0.28s; }

        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .text-shimmer {
          background: linear-gradient(90deg, #a78bfa 0%, #f0abfc 35%, #a78bfa 65%, #c4b5fd 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 4s linear infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }
        .float-anim { animation: float 4s ease-in-out infinite; }

        .btn-glow {
          position: relative;
          overflow: hidden;
        }
        .btn-glow::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.15), transparent);
          opacity: 0;
          transition: opacity 0.3s;
        }
        .btn-glow:hover::before { opacity: 1; }

        .card-glow:hover {
          box-shadow: 0 0 40px rgba(124, 58, 237, 0.15);
        }
      `}</style>

      <HeroBackground />

      <main className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-6 pb-16">
        
        {/* ── Nav Bar ────────────────────────────────── */}
        <nav className="w-full max-w-[540px] flex items-center justify-between mb-6">
          <a href="/" className="text-white/60 hover:text-white text-sm font-medium transition-colors">
            RMBG
          </a>
          <div className="flex items-center gap-4">
            <a href="/membership" className="text-white/40 hover:text-white text-sm transition-colors">
              Membership
            </a>
            <a href="/points" className="text-white/40 hover:text-white text-sm transition-colors">
              Points
            </a>
            <a href="/profile" className="text-white/40 hover:text-white text-sm transition-colors">
              Profile
            </a>
          </div>
        </nav>

        <div className="w-full max-w-[540px]">

          {/* ── Header ─────────────────────────────────── */}
          <div className={`text-center mb-10 ${mounted ? "fade-up" : ""}`}>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 mb-5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
              <span className="text-violet-300 text-xs font-medium">100% Local Processing</span>
            </div>

            {/* Title */}
            <h1 className={`text-5xl font-bold text-white mb-3 ${mounted ? "fade-up fade-up-1" : ""}`}>
              Remove Image
              <br />
              <span className="text-shimmer">Backgrounds</span>
            </h1>

            {/* Subtitle */}
            <p className={`text-white/40 text-sm leading-relaxed max-w-sm mx-auto ${mounted ? "fade-up fade-up-2" : ""}`}>
              Drop your photo. Get a flawless transparent PNG in seconds. No uploads, no servers.
            </p>

            {/* Stats */}
            <div className={`flex items-center justify-center gap-8 mt-6 ${mounted ? "fade-up fade-up-3" : ""}`}>
              {[
                { val: "4.9★", label: "User rating" },
                { val: "< 5s", label: "Avg. time" },
                { val: "100%", label: "Privacy" },
              ].map(({ val, label }) => (
                <div key={label} className="text-center">
                  <div className="text-white font-bold text-lg">{val}</div>
                  <div className="text-white/30 text-xs mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            {/* User Status Bar - Minimal */}
            <div className={`mt-4 ${mounted ? "fade-up fade-up-4" : ""}`}>
              {user && userData ? (
                <div className="flex items-center justify-center gap-3">
                  <a href="/profile" className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.10] hover:bg-white/[0.10] transition-colors">
                    {user.picture && (
                      <img src={user.picture} alt={user.name} className="w-5 h-5 rounded-full" />
                    )}
                    <span className="text-white/70 text-sm font-medium">{user.name}</span>
                    <span className="text-white/30 text-xs">·</span>
                    <span className={`text-xs font-medium ${
                      userData.currentMembership 
                        ? 'text-violet-400' 
                        : userData.free_uses_remaining > 0 
                          ? 'text-emerald-400' 
                          : 'text-red-400'
                    }`}>
                      {getUsageMessage()}
                    </span>
                  </a>
                </div>
              ) : null}
            </div>

          </div>

          {/* ── Main card ───────────────────────────────── */}
          <div className={`rounded-3xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl p-7 shadow-2xl ${mounted ? "fade-up fade-up-3" : ""}`}>

            {/* Demo showcase */}
            {state === "idle" && <DemoShowcase />}

            {/* Upload zone - requires login */}
            {(state === "idle" || state === "error") && (
              <div>
                {!user ? (
                  // Not logged in - show login prompt
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h3 className="text-white font-semibold text-lg mb-2">Sign in to get started</h3>
                    <p className="text-white/50 text-sm mb-6 max-w-xs mx-auto">
                      Create a free account to get 3 background removals, or sign in with Google to continue
                    </p>
                    <div className="flex flex-col items-center gap-3">
                      <div id="g_id_onload"
                        data-client_id="810081244227-kqvuga30g7g9d34tpqj42klm7m367knk.apps.googleusercontent.com"
                        data-context="signin"
                        data-ux_mode="popup"
                        data-callback="handleCredentialResponse"
                        data-auto_prompt="false">
                      </div>
                      <div className="g_id_signin"
                        data-type="standard"
                        data-shape="rectangular"
                        data-theme="outline"
                        data-text="signin_with"
                        data-size="large"
                        data-logo_alignment="left">
                      </div>
                    </div>
                  </div>
                ) : !userData?.currentMembership && (userData?.free_uses_remaining ?? 0) <= 0 ? (
                  // Logged in but no uses left and no membership
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-8 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-4">
                      <span className="text-3xl">⚠️</span>
                    </div>
                    <h3 className="text-white font-semibold text-lg mb-2">No free uses remaining</h3>
                    <p className="text-white/50 text-sm mb-6">
                      You've used all 3 of your free background removals. Upgrade to continue!
                    </p>
                    <a
                      href="/profile"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold text-sm shadow-lg shadow-violet-500/30 transition-all"
                    >
                      <span>Upgrade Now</span>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                    </a>
                  </div>
                ) : (
                  // Logged in with uses available - show upload UI
                  <div onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }} onDragLeave={() => setIsDragOver(false)} onDrop={handleDrop}>
                    <input
                      ref={fileInputRef}
                      id="file-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) processImage(f); }}
                    />
                    <label htmlFor="file-input" className="cursor-pointer block rounded-2xl">
                      <div
                        className={`
                          relative rounded-2xl border-2 border-dashed transition-all duration-300 text-center overflow-hidden
                          ${isDragOver
                            ? "border-violet-400 bg-violet-500/10 scale-[1.01]"
                            : "border-white/15 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/25"
                          }
                        `}
                      >
                        {isDragOver && (
                          <div className="absolute inset-0 bg-gradient-to-b from-violet-500/10 to-transparent pointer-events-none" />
                        )}
                        <div className={`py-14 flex flex-col items-center gap-4 ${isDragOver ? "scale-[1.02]" : ""} transition-transform duration-300`}>
                          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 float-anim ${isDragOver ? "bg-violet-500/30 scale-110" : "bg-white/[0.07]"}`}>
                            {isDragOver ? (
                              <svg className="w-7 h-7 text-violet-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                            ) : (
                              <svg className="w-7 h-7 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                              </svg>
                            )}
                          </div>
                          <div>
                            <p className="text-white font-semibold text-base">
                              {isDragOver ? "Release to upload" : "Drop your image here"}
                            </p>
                            <p className="text-white/35 text-sm mt-1">
                              or{" "}
                              <span className="text-violet-400 font-medium hover:text-violet-300">browse files</span>
                              {" · "}JPG, PNG, WebP · max 10MB
                            </p>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {["JPG", "PNG", "WebP"].map((fmt) => (
                              <span key={fmt} className="text-[10px] text-white/25 px-2 py-0.5 rounded-full border border-white/10">
                                {fmt}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {state === "error" && errorMessage && (
              <div className="mt-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                ⚠️ {errorMessage}
              </div>
            )}

            {/* Processing */}
            {state === "processing" && <ProgressView progress={progress} />}

            {/* Done */}
            {state === "done" && originalImage && resultImage && (
              <div>
                <BeforeAfterSlider original={originalImage} result={resultImage} />
                <div className="mt-5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-white/40">
                    <span className="px-2 py-1 rounded-lg bg-white/10 text-white/60 font-semibold">PNG</span>
                    <span>Transparent · High quality</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={handleReset} className="px-4 py-2 text-sm text-white/50 hover:text-white/80 hover:bg-white/5 rounded-xl transition-all duration-200">
                      New image
                    </button>
                    <button
                      onClick={handleDownload}
                      className="btn-glow px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-xl transition-all duration-200 shadow-lg shadow-violet-600/30 hover:shadow-violet-500/40"
                    >
                      ⬇ Download PNG
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Feature row ────────────────────────────── */}
          {state === "idle" && (
            <div className={`mt-5 grid grid-cols-3 gap-3 ${mounted ? "fade-up fade-up-4" : ""}`}>
              {[
                { icon: "🔒", title: "Local only", desc: "Nothing leaves your device" },
                { icon: "⚡", title: "Instant results", desc: "AI processes in seconds" },
                { icon: "✨", title: "HD quality", desc: "Lossless PNG output" },
              ].map(({ icon, title, desc }) => (
                <div
                  key={title}
                  className="card-glow bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4 text-center transition-all duration-300 hover:bg-white/[0.06]"
                >
                  <div className="text-xl mb-2">{icon}</div>
                  <div className="text-white font-semibold text-sm">{title}</div>
                  <div className="text-white/30 text-xs mt-0.5 leading-snug">{desc}</div>
                </div>
              ))}
            </div>
          )}

          <p className="text-center text-white/15 text-xs mt-8">
            © 2026 RmBg · Powered by BRIA RMBG AI
          </p>
        </div>
      </main>
    </>
  );
}
