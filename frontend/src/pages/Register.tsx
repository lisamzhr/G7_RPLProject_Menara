
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  UserRound,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  History,
  Info,
  UserRoundPlus,
} from "lucide-react";
import { api } from "../api/client";
import "../styles/register.css";

export const Register = () => {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    // Frontend validation
    if (!cleanName) {
      setError("Please enter your full name.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password.length > 72) {
      setError("Password must not exceed 72 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      // Send registration data to FastAPI backend
      await api.register(cleanName, cleanEmail, password);

      // Do not store the registration token.
      // User must log in manually after registration.
      navigate("/login", {
        replace: true,
        state: {
          registeredEmail: cleanEmail,
          registrationSuccess: true,
        },
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Registration failed. Please try again.";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      {/* HEADER */}
      <header className="register-header">
        <Link to="/" className="register-brand">
          <div className="register-brand-logo">
            <img src="/LogoMenara.png" alt="MENARA Logo" />
          </div>

          <div className="register-brand-text">
            <strong>MENARA</strong>
            <span>
              MONITORING ENVIRONMENT FOR AI ROOFTOP AGRICULTURE
            </span>
          </div>
        </Link>

        <div className="register-header-actions">
          <Link to="/" className="register-back-home">
            <ArrowLeft size={12} />
            Back to Home
          </Link>

          <div className="register-profile-icon">
            <UserRound size={13} />
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="register-main">
        {/* LEFT SIDE */}
        <section className="register-hero">
          <div className="register-hero-content">
            <h1>Meet MENARA</h1>
            <p>
              A smarter way to monitor rooftop gardens, understand
              environmental conditions, and make informed plant-care
              decisions with AI and IoT.
            </p>
          </div>
        </section>

        {/* RIGHT SIDE */}
        <section className="register-form-section">
          <div className="register-form-container">
            {/* TOP BADGE */}
            <div className="register-top-row">
              <div className="register-welcome">
                <div className="register-welcome-logo">
                  <img src="/LogoMenara.png" alt="MENARA" />
                </div>

                <span>WELCOME TO MENARA</span>
              </div>

              <Link to="/login" className="register-top-login">
                Sign In <ArrowRight size={12} />
              </Link>
            </div>

            <h2>Create Your Account</h2>

            <p className="register-description">
              Join MENARA to monitor environmental conditions and make
              smarter rooftop gardening decisions.
            </p>

            <form onSubmit={handleSubmit} className="register-form">
              {/* FULL NAME */}
              <div className="register-field">
                <div className="register-label-row">
                  <label htmlFor="fullName">Full Name</label>
                  <span>Required</span>
                </div>

                <div className="register-input-wrapper">
                  <UserRound size={14} />

                  <input
                    id="fullName"
                    type="text"
                    placeholder="e.g. Dr. Siti Rahmawati or Budi Santoso"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="name"
                    required
                  />
                </div>
              </div>

              {/* EMAIL */}
              <div className="register-field">
                <div className="register-label-row">
                  <label htmlFor="email">Email Address</label>
                  <span>Required</span>
                </div>

                <div className="register-input-wrapper">
                  <Mail size={14} />

                  <input
                    id="email"
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
              <div className="register-field">
                <div className="register-label-row">
                  <label htmlFor="password">Password</label>
                  <span>Required</span>
                </div>

                <div className="register-input-wrapper">
                  <LockKeyhole size={14} />

                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a secure password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={72}
                    required
                  />

                  <button
                    type="button"
                    className="register-password-toggle"
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

              {/* CONFIRM PASSWORD */}
              <div className="register-field">
                <div className="register-label-row">
                  <label htmlFor="confirmPassword">
                    Confirm Password
                  </label>
                  <span>Required</span>
                </div>

                <div className="register-input-wrapper">
                  <History size={14} />

                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />

                  <button
                    type="button"
                    className="register-password-toggle"
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={15} />
                    ) : (
                      <Eye size={15} />
                    )}
                  </button>
                </div>
              </div>

              {/* PASSWORD HELPER */}
              <div className="register-password-hint">
                <Info size={12} />
                <span>
                  Use a strong password to help protect your account.
                </span>
              </div>

              {/* ERROR */}
              {error && (
                <p className="register-error" role="alert">
                  {error}
                </p>
              )}

              {/* SUBMIT */}
              <button
                type="submit"
                className="register-submit"
                disabled={loading}
              >
                {loading ? (
                  "Creating Account..."
                ) : (
                  <>
                    Create Account <UserRoundPlus size={13} />
                  </>
                )}
              </button>
            </form>

            {/* LOGIN LINK */}
            <p className="register-login-text">
              Already have an account?{" "}
              <Link to="/login">Sign In</Link>
            </p>

            {/* TERMS */}
            <p className="register-terms">
              By registering, you agree to MENARA terms of service and
              environmental data telemetry privacy.
            </p>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="register-footer">
        <span>© 2026 MENARA. All rights reserved.</span>
        <strong>Security &amp; Protocols</strong>
      </footer>
    </div>
  );
};

export default Register;