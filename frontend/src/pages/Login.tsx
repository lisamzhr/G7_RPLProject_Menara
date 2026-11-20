import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
} from "lucide-react";
import { api } from "../api/client";
import "../styles/login.css";

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const locationState = location.state as {
    registeredEmail?: string;
    registrationSuccess?: boolean;
    from?: { pathname?: string };
  } | null;

  const [email, setEmail] = useState(
    () =>
      locationState?.registeredEmail ||
      localStorage.getItem("roofgarden_email") ||
      ""
  );

  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(
    Boolean(localStorage.getItem("roofgarden_email"))
  );
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      const cleanEmail = email.trim().toLowerCase();

      const res = await api.login(cleanEmail, password);

      // Clear previous authentication data.
      localStorage.removeItem("roofgarden_token");
      sessionStorage.removeItem("roofgarden_token");
      localStorage.removeItem("roofgarden_user");
      sessionStorage.removeItem("roofgarden_user");

      // Choose storage based on Remember Me.
      const storage = rememberMe ? localStorage : sessionStorage;

      // Save authentication token and user profile.
      storage.setItem("roofgarden_token", res.access_token);
      storage.setItem("roofgarden_user", JSON.stringify(res.user));

      // Remember email only if Remember Me is checked.
      if (rememberMe) {
        localStorage.setItem("roofgarden_email", cleanEmail);
      } else {
        localStorage.removeItem("roofgarden_email");
      }

      const destination =
        locationState?.from?.pathname || "/dashboard";

      navigate(destination, { replace: true });
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

            {locationState?.registrationSuccess && (
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", padding: "10px 14px", borderRadius: "8px", fontSize: "12.5px", marginBottom: "14px" }}>
                Account registered successfully! Please sign in with your credentials.
              </div>
            )}

            {error && (
              <div className="login-error" role="alert">
                {error}
              </div>
            )}

            {/* LOGIN FORM */}
            <form onSubmit={handleLogin} className="login-form">
              {/* EMAIL */}
              <div className="login-field">
                <div className="login-label-row">
                  <label htmlFor="login-email">Email Address</label>
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

                <span
                  className="login-forgot"
                  title="Contact your garden owner or use Settings after login to update passwords."
                  style={{ cursor: "help" }}
                >
                  Forgot password?
                </span>
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