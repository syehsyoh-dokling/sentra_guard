import { useEffect, useMemo, useRef, useState } from "react";
import { findDummyUser } from "./data/dummyUsers";
import "./styles/sentracore-landing.css";

type DanDadLandingProps = {
  onLoginSuccess?: () => void;
};

type LoginTab = "email" | "wallet" | "sso";

type Ticker = {
  sym: string;
  val: string;
  chg: string;
  up: boolean;
};

type Feature = {
  icon: string;
  name: string;
  desc: string;
  tag: string;
  iconStyle?: React.CSSProperties;
  tagStyle?: React.CSSProperties;
};

type Chain = {
  name: string;
  color?: string;
  muted?: boolean;
};

const tickers: Ticker[] = [
  { sym: "ETH", val: "Rp 57,3Jt", chg: "+0.4%", up: true },
  { sym: "BTC", val: "Rp 1,06M", chg: "+2.4%", up: true },
  { sym: "SOL", val: "Rp 2,4Jt", chg: "+5.1%", up: true },
  { sym: "BNB", val: "Rp 9,1Jt", chg: "+1.2%", up: true },
  { sym: "MATIC", val: "Rp 14.2K", chg: "-0.9%", up: false },
  { sym: "ARB", val: "Rp 18.7K", chg: "+3.2%", up: true },
  { sym: "AVAX", val: "Rp 625K", chg: "-1.4%", up: false },
  { sym: "AUDITS", val: "1,847 / day", chg: "↑12.4%", up: true },
  { sym: "AI-ACC", val: "94.7%", chg: "↑2.1%", up: true },
  { sym: "WORKERS", val: "12/16", chg: "ONLINE", up: true }
];

const features: Feature[] = [
  {
    icon: "⬡",
    name: "Distributed Workers",
    desc: "Async Rust worker pool built on Axum handles thousands of concurrent audit tasks with zero-copy processing and backpressure management.",
    tag: "Rust · Axum · Async",
    iconStyle: {
      background: "rgba(245,166,35,.08)",
      borderColor: "rgba(245,166,35,.2)"
    }
  },
  {
    icon: "✦",
    name: "AI / LLM Detection",
    desc: "Multi-model AI pipeline integrating Claude, GPT-4o, and fine-tuned local models for 94.7% vulnerability detection accuracy.",
    tag: "LLM · Claude · GPT-4o",
    iconStyle: {
      background: "rgba(176,110,255,.08)",
      borderColor: "rgba(176,110,255,.2)"
    },
    tagStyle: {
      background: "rgba(176,110,255,.1)",
      color: "#b06eff",
      borderColor: "rgba(176,110,255,.2)"
    }
  },
  {
    icon: "◈",
    name: "Queue Orchestration",
    desc: "Redis-backed priority queues with intelligent routing, dead-letter handling, and real-time WebSocket status streams to all connected clients.",
    tag: "Redis · WebSocket",
    iconStyle: {
      background: "rgba(77,166,255,.08)",
      borderColor: "rgba(77,166,255,.2)"
    },
    tagStyle: {
      background: "rgba(77,166,255,.1)",
      color: "var(--info)",
      borderColor: "rgba(77,166,255,.2)"
    }
  },
  {
    icon: "⬗",
    name: "Multi-Chain Support",
    desc: "Native integration with Ethereum EVM, Solana BPF bytecode, BNB Chain, Polygon — with extensible adapters for any new ecosystem.",
    tag: "ETH · SOL · BNB · MATIC",
    iconStyle: {
      background: "rgba(57,217,138,.08)",
      borderColor: "rgba(57,217,138,.2)"
    },
    tagStyle: {
      background: "rgba(57,217,138,.1)",
      color: "var(--ok)",
      borderColor: "rgba(57,217,138,.2)"
    }
  },
  {
    icon: "☁",
    name: "Distributed Storage",
    desc: "Audit reports immutably stored on IPFS with S3 fallback, PostgreSQL indexing, and cryptographic audit trails for full provenance.",
    tag: "S3 · IPFS · PostgreSQL",
    iconStyle: {
      background: "rgba(245,166,35,.08)",
      borderColor: "rgba(245,166,35,.2)"
    }
  },
  {
    icon: "⟁",
    name: "CI/CD & Automation",
    desc: "Fully containerized with Docker Compose, GitHub Actions pipelines, automated test coverage, and one-command deployment to any environment.",
    tag: "Docker · GH Actions",
    iconStyle: {
      background: "rgba(240,62,62,.08)",
      borderColor: "rgba(240,62,62,.2)"
    },
    tagStyle: {
      background: "rgba(240,62,62,.1)",
      color: "var(--crit)",
      borderColor: "rgba(240,62,62,.2)"
    }
  }
];

const chains: Chain[] = [
  { name: "Ethereum", color: "#627eea" },
  { name: "Solana", color: "#9945ff" },
  { name: "BNB Chain", color: "#f0b90b" },
  { name: "Polygon", color: "#8247e5" },
  { name: "Avalanche", color: "#ff4500" },
  { name: "Arbitrum", color: "#e84142" },
  { name: "Optimism", color: "#ff0420" },
  { name: "+ More coming", muted: true }
];

function GithubIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.09.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12c0-5.523-4.477-10-10-10z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export default function DanDadLanding({ onLoginSuccess }: DanDadLandingProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);

  const [activeTab, setActiveTab] = useState<LoginTab>("email");
  const [showPassword, setShowPassword] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [email, setEmail] = useState("admin@danandad.com");
  const [password, setPassword] = useState("@dan&dad#2025");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loginState, setLoginState] = useState<"idle" | "loading" | "success">("idle");
  const [requestState, setRequestState] = useState<"idle" | "loading" | "success">("idle");

  const seamlessTickers = useMemo(() => [...tickers, ...tickers], []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    type NodePoint = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      color: string;
      pulse: number;
    };

    let width = 0;
    let height = 0;
    let frame = 0;

    const amber = "#f5a623";
    const blue = "#4da6ff";
    const dim = "#1a2030";
    const nodes: NodePoint[] = [];

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener("resize", resize);

    for (let index = 0; index < 55; index += 1) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 2 + 1,
        color: Math.random() < 0.12 ? amber : Math.random() < 0.2 ? blue : dim,
        pulse: Math.random() * Math.PI * 2
      });
    }

    const draw = () => {
      context.clearRect(0, 0, width, height);

      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const a = nodes[i];
          const b = nodes[j];
          const distance = Math.hypot(a.x - b.x, a.y - b.y);

          if (distance < 160) {
            const alpha = (1 - distance / 160) * 0.18;
            context.beginPath();
            context.strokeStyle = `rgba(245,166,35,${alpha * 0.6})`;
            context.lineWidth = 0.5;
            context.moveTo(a.x, a.y);
            context.lineTo(b.x, b.y);
            context.stroke();
          }
        }
      }

      nodes.forEach((node) => {
        node.pulse += 0.015;
        const pulseFactor = 0.6 + Math.sin(node.pulse) * 0.4;

        context.beginPath();
        context.arc(node.x, node.y, node.r * pulseFactor, 0, Math.PI * 2);
        context.fillStyle = node.color;
        context.fill();

        if (node.color === amber) {
          context.beginPath();
          context.arc(node.x, node.y, node.r * 3, 0, Math.PI * 2);
          context.fillStyle = "rgba(245,166,35,0.05)";
          context.fill();
        }
      });
    };

    const update = () => {
      nodes.forEach((node) => {
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;
      });
    };

    const loop = () => {
      draw();
      update();
      frame = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const openLogin = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.setTimeout(() => emailRef.current?.focus(), 400);
  };

  const handleLogin = () => {
    const trimmedEmail = email.trim();
    let valid = true;

    setEmailError("");
    setPasswordError("");

    if (!trimmedEmail || !/\S+@\S+\.\S+/.test(trimmedEmail)) {
      setEmailError("Invalid email address");
      valid = false;
    }

    if (!password || password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      valid = false;
    }

    if (!valid) return;

    const user = findDummyUser(trimmedEmail, password);

    if (!user) {
      setPasswordError("Dummy login salah. Gunakan admin@danandad.com / @dan&dad#2025");
      return;
    }

    setLoginState("loading");

    window.setTimeout(() => {
      localStorage.setItem(
        "sentracoreAuth",
        JSON.stringify({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          loggedInAt: new Date().toISOString()
        })
      );

      setLoginState("success");

      window.setTimeout(() => {
        onLoginSuccess?.();
      }, 700);
    }, 900);
  };

  const connectWallet = (name: string) => {
    window.alert(`Connecting to ${name}... (Web3 provider integration required in production)`);
  };

  const handleSSO = () => {
    window.alert("Redirecting to your organization SSO provider...");
  };

  const handleRequestAccess = () => {
    setRequestState("loading");

    window.setTimeout(() => {
      setRequestState("success");

      window.setTimeout(() => {
        setRegisterOpen(false);
        setRequestState("idle");
      }, 1600);
    }, 900);
  };

  const loginButtonText =
    loginState === "loading"
      ? "Authenticating..."
      : loginState === "success"
        ? "✓ Redirecting to Dashboard"
        : "→ Sign In";

  return (
    <main className="sentracore-page">
      <canvas ref={canvasRef} className="bg-canvas" />

      <nav className="sentracore-nav">
        <a className="nav-logo" href="#">
          <div className="logo-hex" />
          <span className="logo-text">Dan&Dad</span>
          <span className="logo-version">v2.14</span>
        </a>

        <ul className="nav-links">
          <li><a href="#features">Platform</a></li>
          <li><a href="#chains">Chains</a></li>
          <li><a href="#docs">Docs</a></li>
          <li><a href="#pricing">Pricing</a></li>
        </ul>

        <div className="nav-cta">
          <button className="btn-ghost" type="button" onClick={openLogin}>Sign In</button>
          <button className="btn-primary" type="button" onClick={() => setRegisterOpen(true)}>Request Access</button>
        </div>
      </nav>

      <div className="ticker-strip">
        <div className="ticker-inner">
          {seamlessTickers.map((ticker, index) => (
            <div className="tick-item" key={`${ticker.sym}-${index}`}>
              <span className="tick-sym">{ticker.sym}</span>
              <span className="tick-val">{ticker.val}</span>
              <span className={`tick-chg ${ticker.up ? "up" : "dn"}`}>{ticker.chg}</span>
            </div>
          ))}
        </div>
      </div>

      <section className="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <div className="hero-eyebrow">
              <div className="eyebrow-line" />
              <span>AI-Powered Blockchain Security</span>
              <div className="eyebrow-dot" />
            </div>

            <h1 className="hero-h1">
              AUDIT<br />
              <span className="accent">SMARTER.</span><br />
              <span className="line2">SECURE FASTER.</span>
            </h1>

            <p className="hero-desc">
              Dan&Dad is an <strong>AI-enhanced blockchain audit platform</strong> built on a distributed Rust backend — combining static analysis, LLM-powered vulnerability detection, and real-time pipeline processing across <strong>Ethereum, Solana, BNB Chain</strong>, and more.
            </p>

            <div className="hero-stats">
              <div className="hstat">
                <div className="hstat-val">1,847</div>
                <div className="hstat-label">Audits / Day</div>
              </div>
              <div className="hstat">
                <div className="hstat-val" style={{ color: "var(--amber)" }}>94.7%</div>
                <div className="hstat-label">AI Accuracy</div>
              </div>
              <div className="hstat">
                <div className="hstat-val">8.3s</div>
                <div className="hstat-label">Avg Audit Time</div>
              </div>
            </div>

            <div className="hero-actions">
              <button className="btn-launch" type="button" onClick={openLogin}>→ Launch Dashboard</button>
              <button className="btn-outline-big" type="button">View Architecture</button>
            </div>
          </div>

          <div className="login-panel">
            <div className="login-card">
              <div className="lc-header">
                <div className="lc-tag">Secure Access</div>
                <div className="lc-title">SIGN IN</div>
                <div className="lc-sub">Access your audit operations center</div>
              </div>

              <div className="lc-tabs">
                <button className={`lc-tab ${activeTab === "email" ? "active" : ""}`} type="button" onClick={() => setActiveTab("email")}>Email</button>
                <button className={`lc-tab ${activeTab === "wallet" ? "active" : ""}`} type="button" onClick={() => setActiveTab("wallet")}>Wallet</button>
                <button className={`lc-tab ${activeTab === "sso" ? "active" : ""}`} type="button" onClick={() => setActiveTab("sso")}>SSO</button>
              </div>

              {activeTab === "email" && (
                <div>
                  <div className="form-group">
                    <label className="form-label">
                      <span>Email Address</span>
                    </label>
                    <div className="form-input-wrap">
                      <input
                        ref={emailRef}
                        className={`form-input ${emailError ? "err" : ""}`}
                        type="email"
                        placeholder="admin@danandad.com"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                      />
                      <span className="input-icon">@</span>
                    </div>
                    <div className={`form-error ${emailError ? "show" : ""}`}>{emailError}</div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <span>Password</span>
                      <a href="#forgot">Forgot password?</a>
                    </label>
                    <div className="form-input-wrap">
                      <input
                        className={`form-input ${passwordError ? "err" : ""}`}
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") handleLogin();
                        }}
                      />
                      <span className="input-icon" onClick={() => setShowPassword((current) => !current)}>
                        {showPassword ? "🔒" : "👁"}
                      </span>
                    </div>
                    <div className={`form-error ${passwordError ? "show" : ""}`}>{passwordError}</div>
                  </div>

                  <button
                    className={`btn-submit ${loginState === "loading" ? "loading" : ""}`}
                    type="button"
                    onClick={handleLogin}
                    style={
                      loginState === "success"
                        ? { background: "var(--ok)", borderColor: "var(--ok)" }
                        : undefined
                    }
                  >
                    <span>{loginButtonText}</span>
                  </button>

                  <div className="login-demo-note">
                    Dummy login: <strong>admin@danandad.com</strong> / <strong>@dan&dad#2025</strong>
                  </div>
                </div>
              )}

              {activeTab === "wallet" && (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🔗</div>
                  <div style={{ fontSize: 11, color: "var(--text)", marginBottom: 20 }}>
                    Connect your Web3 wallet to authenticate
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <button className="btn-oauth" style={{ justifyContent: "center", padding: 12 }} type="button" onClick={() => connectWallet("MetaMask")}>🦊 MetaMask</button>
                    <button className="btn-oauth" style={{ justifyContent: "center", padding: 12 }} type="button" onClick={() => connectWallet("WalletConnect")}>🔵 WalletConnect</button>
                    <button className="btn-oauth" style={{ justifyContent: "center", padding: 12 }} type="button" onClick={() => connectWallet("Phantom")}>👻 Phantom (Solana)</button>
                  </div>
                </div>
              )}

              {activeTab === "sso" && (
                <div>
                  <div className="form-group">
                    <label className="form-label">
                      <span>Organization Domain</span>
                    </label>
                    <div className="form-input-wrap">
                      <input className="form-input" type="text" placeholder="yourcompany.com" />
                      <span className="input-icon">⬡</span>
                    </div>
                  </div>
                  <button className="btn-submit" type="button" onClick={handleSSO}>→ Continue with SSO</button>
                </div>
              )}

              <div className="divider">or</div>

              <div className="oauth-row">
                <button className="btn-oauth" type="button">
                  <GithubIcon />
                  GitHub
                </button>
                <button className="btn-oauth" type="button">
                  <GoogleIcon />
                  Google
                </button>
              </div>

              <div className="security-row">
                <span className="sec-icon">🔒</span>
                <span><span className="sec-dot" />256-bit TLS · SOC2 Compliant · E2E Encrypted</span>
              </div>

              <div className="lc-footer-text">
                Don't have access?{" "}
                <a href="#request-access" onClick={(event) => {
                  event.preventDefault();
                  setRegisterOpen(true);
                }}>
                  Request an invite →
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="scroll-hint">
          <span>Scroll</span>
          <div className="scroll-line" />
        </div>
      </section>

      <section className="features" id="features">
        <div className="section-label">Core Platform</div>
        <div className="section-title">
          BUILT FOR <span className="accent">SCALE.</span><br />
          DESIGNED FOR PRECISION.
        </div>

        <div className="feat-grid">
          {features.map((feature) => (
            <div className="feat-card" key={feature.name}>
              <div className="feat-icon" style={feature.iconStyle}>{feature.icon}</div>
              <div className="feat-name">{feature.name}</div>
              <p className="feat-desc">{feature.desc}</p>
              <span className="feat-tag" style={feature.tagStyle}>{feature.tag}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="chains-section" id="chains">
        <div className="section-label">Supported Ecosystems</div>
        <div className="section-title" style={{ marginBottom: 28 }}>
          MULTI-CHAIN<br />
          <span className="accent">COVERAGE.</span>
        </div>

        <div className="chain-row">
          {chains.map((chain) => (
            <div
              className="chain-pill"
              key={chain.name}
              style={chain.muted ? { color: "var(--dim)", borderStyle: "dashed" } : undefined}
            >
              {!chain.muted && <span className="chain-dot2" style={{ background: chain.color }} />}
              {chain.name}
            </div>
          ))}
        </div>
      </section>

      <footer className="sentracore-footer">
        <span className="footer-logo">Dan&Dad</span>
        <div className="footer-links">
          <a href="#privacy">Privacy</a>
          <a href="#terms">Terms</a>
          <a href="#security">Security</a>
          <a href="#status">Status</a>
          <a href="#docs">Docs</a>
        </div>
        <span>© 2026 Dan&Dad Systems. All rights reserved.</span>
      </footer>

      <div
        className={`modal-overlay ${registerOpen ? "show" : ""}`}
        onClick={(event) => {
          if (event.target === event.currentTarget) setRegisterOpen(false);
        }}
      >
        <div className="modal-box">
          <button className="modal-close" type="button" onClick={() => setRegisterOpen(false)}>✕</button>

          <div className="lc-tag">New Account</div>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, letterSpacing: 2, color: "var(--head)", marginBottom: 4 }}>
            REQUEST ACCESS
          </div>
          <div style={{ fontSize: 10, color: "var(--dim)", marginBottom: 24 }}>
            Dan&Dad is invite-only. We'll review your request within 24h.
          </div>

          <div className="form-row" style={{ marginBottom: 16 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label"><span>First Name</span></label>
              <input className="form-input" type="text" placeholder="Arif" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label"><span>Last Name</span></label>
              <input className="form-input" type="text" placeholder="Wibowo" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label"><span>Work Email</span></label>
            <input className="form-input" type="email" placeholder="you@company.com" />
          </div>

          <div className="form-group">
            <label className="form-label"><span>Use Case</span></label>
            <input className="form-input" type="text" placeholder="Smart contract security, DeFi audits..." />
          </div>

          <button
            className="btn-submit"
            type="button"
            onClick={handleRequestAccess}
            style={
              requestState === "success"
                ? { background: "var(--ok)", borderColor: "var(--ok)" }
                : undefined
            }
          >
            {requestState === "loading"
              ? "Submitting..."
              : requestState === "success"
                ? "✓ Request Received — We'll be in touch!"
                : "→ Submit Request"}
          </button>

          <div style={{ fontSize: 9, color: "var(--dim)", textAlign: "center", marginTop: 14 }}>
            No spam. We'll only contact you about your access request.
          </div>
        </div>
      </div>
    </main>
  );
}


