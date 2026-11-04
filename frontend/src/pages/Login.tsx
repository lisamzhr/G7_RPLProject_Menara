import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  UserRound,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
} from "lucide-react";
import { api } from "../api/client";
import "../styles/login.css";

export const Login: React.FC = () => {
  const [email, setEmail] = useState("gardener@jakarta-roofs.id");
  const [password, setPassword] = useState("password123");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      const res = await api.login(email, password);

      localStorage.setItem("roofgarden_token", res.access_token);

      if (rememberMe) {
        localStorage.setItem("roofgarden_email", email);
      } else {
        localStorage.removeItem("roofgarden_email");
      }

      navigate("/dashboard");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Login failed";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* HEADER */}
      <header className="login-header">
        <Link to="/" className="login-brand">
          <div className="login-brand-logo">
            <img src="/LogoMenara.png" alt="MENARA Logo" />
          </div>

          <div className="login-brand-text">
            <strong>MENARA</strong>
            <span>
              MONITORING ENVIRONMENT FOR AI ROOFTOP AGRICULTURE
            </span>
          </div>
        </Link>

        <div className="login-header-actions">
          <Link to="/" className="login-back-home">
            <ArrowLeft size={12} />
            Back to Home
          </Link>

          <div className="login-profile-icon">
            <UserRound size={13} />
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="login-main">
        {/* LEFT SIDE */}
        <section className="login-hero">
          <div className="login-hero-content">
            <h1>Meet MENARA</h1>

            <p>
              A smarter way to monitor rooftop gardens, understand
              environmental conditions, and make informed plant-care
              decisions with AI and IoT.
            </p>
          </div>
        </section>

        {/* RIGHT SIDE */}
        <section className="login-form-section">
          <div className="login-form-container">
            {/* WELCOME */}
            <div className="login-welcome">
              <div className="login-welcome-logo">
                <img src="/LogoMenara.png" alt="MENARA" />
              </div>

              <span>WELCOME TO MENARA</span>
            </div>

            <h2>Welcome Back</h2>

            <p className="login-description">
              Sign in to monitor your rooftop gardens and access your
              MENARA dashboard.
            </p>

            {error && (
              <div className="login-error">
                {error}
              </div>
            )}

            {/* LOGIN FORM */}
            <form onSubmit={handleLogin} className="login-form">
              {/* EMAIL */}
              <div className="login-field">
                <div className="login-label-row">
                  <label htmlFor="login-email">Email Address</label>
                  <span>Registered ID</span>
                </div>

                <div className="login-input-wrapper">
                  <Mail size={14} />

                  <input
                    id="login-email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div className="login-field">
                <div className="login-label-row">
                  <label htmlFor="login-password">Password</label>
                  <span>Security Key</span>
                </div>

                <div className="login-input-wrapper">
                  <LockKeyhole size={14} />

                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />

                  <button
                    type="button"
                    className="login-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={15} />
                    ) : (
                      <Eye size={15} />
                    )}
                  </button>
                </div>
              </div>

              {/* REMEMBER ME + FORGOT PASSWORD */}
              <div className="login-options">
                <label className="login-remember">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember me</span>
                </label>

                <Link to="/forgot-password" className="login-forgot">
                  Forgot password?
                </Link>
              </div>

              {/* SUBMIT */}
              <button
                type="submit"
                className="login-submit"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
                {!loading && <ArrowRight size={14} />}
              </button>
            </form>

            {/* REGISTER LINK */}
            <p className="login-register-text">
              Don't have an account?{" "}
              <Link to="/register">Sign Up</Link>
            </p>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="login-footer">
        <span>© 2026 MENARA. All rights reserved.</span>
        <strong>Security &amp; Protocols</strong>
      </footer>
    </div>
  );
};

export default Login;