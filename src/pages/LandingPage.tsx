import {
  useState
} from "react";

import {
  useNavigate
} from "react-router-dom";

import {
  login
} from "../auth/auth";

import {
  tickerData
} from "../data/ticker";

import "../styles/sentracore-landing.css";

export default function LandingPage() {

  const navigate = useNavigate();

  const [email, setEmail] =
    useState("admin@danandad.com");

  const [password, setPassword] =
    useState("@dan&dad#2025");

  const [error, setError] =
    useState("");

  function handleLogin() {

    setError("");

    const result =
      login(email, password);

    if (!result) {

      setError(
        "Invalid credentials"
      );

      return;
    }

    navigate("/admin");
  }

  return (

    <div className="vk-root">

      <div className="vk-grid" />

      <div className="vk-noise" />

      <header className="vk-header">

        <div className="vk-brand">

          <div className="vk-logo-shape" />

          <div className="vk-brand-text">
            SENTRACORE
          </div>

          <div className="vk-version">
            v2.14
          </div>

        </div>

        <nav className="vk-nav">

          <span>PLATFORM</span>
          <span>CHAINS</span>
          <span>DOCS</span>
          <span>PRICING</span>

        </nav>

        <div className="vk-header-actions">

          <button className="vk-btn ghost">
            SIGN IN
          </button>

          <button className="vk-btn primary">
            REQUEST ACCESS
          </button>

        </div>

      </header>

      <div className="vk-ticker">

        {tickerData.map((item) => (

          <div
            className="vk-ticker-item"
            key={item.symbol}
          >

            <span className="vk-ticker-symbol">
              {item.symbol}
            </span>

            <span className="vk-ticker-price">
              {item.price}
            </span>

            <span className="vk-ticker-change">
              {item.change}
            </span>

          </div>

        ))}

      </div>

      <main className="vk-hero">

        <section className="vk-left">

          <div className="vk-mini-title">
            AI-POWERED BLOCKCHAIN SECURITY
          </div>

          <h1 className="vk-hero-title">

            AUDIT
            <br />

            <span>
              SMARTER.
            </span>

            <br />

            SECURE FASTER.

          </h1>

          <p className="vk-description">

            Sentracore is an AI-enhanced
            smart contract audit platform
            built on distributed workers,
            realtime queue orchestration,
            and multi-chain vulnerability
            analysis infrastructure.

          </p>

          <div className="vk-stats">

            <div className="vk-stat">
              <strong>1,847</strong>
              <span>AUDITS / DAY</span>
            </div>

            <div className="vk-stat">
              <strong>94.7%</strong>
              <span>AI ACCURACY</span>
            </div>

            <div className="vk-stat">
              <strong>8.3S</strong>
              <span>AVG AUDIT TIME</span>
            </div>

          </div>

          <div className="vk-hero-actions">

            <button
              className="vk-launch-btn"
              onClick={handleLogin}
            >
              → LAUNCH DASHBOARD
            </button>

            <button className="vk-arch-btn">
              VIEW ARCHITECTURE
            </button>

          </div>

        </section>

        <section className="vk-login-panel">

          <div className="vk-panel-glow" />

          <div className="vk-panel-inner">

            <div className="vk-panel-mini">
              SECURE ACCESS
            </div>

            <div className="vk-panel-title">
              SIGN IN
            </div>

            <div className="vk-panel-sub">
              Access your audit operations center
            </div>

            <div className="vk-tabs">

              <button className="active">
                EMAIL
              </button>

              <button>
                WALLET
              </button>

              <button>
                SSO
              </button>

            </div>

            <label>
              EMAIL ADDRESS
            </label>

            <input
              className="vk-input"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
            />

            <div className="vk-password-row">

              <label>
                PASSWORD
              </label>

              <span>
                FORGOT PASSWORD?
              </span>

            </div>

            <input
              type="password"
              className="vk-input"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
            />

            {error && (
              <div className="vk-error">
                {error}
              </div>
            )}

            <button
              className="vk-signin-btn"
              onClick={handleLogin}
            >
              → SIGN IN
            </button>

            <div className="vk-divider">
              OR
            </div>

            <div className="vk-socials">

              <button>
                GitHub
              </button>

              <button>
                Google
              </button>

            </div>

            <div className="vk-security-line">
              ● 256-bit TLS · SOC2 Compliant · E2E Encrypted
            </div>

          </div>

        </section>

      </main>

    </div>
  );
}
