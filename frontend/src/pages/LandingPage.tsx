import { useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  CloudSun,
  Leaf,
  Menu,
  Radio,
  Sprout,
  Users,
  Building2,
  Brain,
  X,
} from "lucide-react";
import "../styles/landing.css";

const heroImages = [
{
    src: "/Garden4.avif",
    alt: "MENARA rooftop garden",
  },
  {
    src: "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=2000&q=85",
    alt: "Green plants growing in a garden",
  },
  {
    src: "/Garden1.png",
    alt: "MENARA rooftop garden",
  },
  {
    src: "/garden2.jpg",
    alt: "MENARA rooftop garden",
  },
  {
    src: "/Garden3.webp",
    alt: "MENARA rooftop garden",
  },
];

const capabilities = [
  {
    icon: Radio,
    title: "Environmental Monitoring",
    description:
      "Track air temperature, air humidity, soil moisture, and light intensity through connected sensors.",
    tags: ["Air temperature", "Soil moisture", "Light intensity"],
  },
  {
    icon: CloudSun,
    title: "BMKG Weather Insights",
    description:
      "View weather predictions to better understand changing environmental conditions.",
    tags: ["Weather forecasts", "Rain alerts", "Weather insights"],
  },
  {
    icon: Brain,
    title: "AI Care Recommendations",
    description:
      "Receive relevant care suggestions and warnings based on available data.",
    tags: ["Care suggestions", "Environmental alerts", "Plant care"],
  },
  {
    icon: Sprout,
    title: "IoT Automation & Control",
    description:
      "Monitor supported devices and control systems such as sprinklers where implemented.",
    tags: ["Automatic watering", "Device monitoring", "IoT control"],
  },
];

const audiences = [
  {
    icon: Sprout,
    number: "01",
    title: "Individual Rooftop Gardeners",
    description:
      "Monitor garden conditions, understand environmental changes, and get AI-powered suggestions to help care for plants.",
    label: "For personal rooftop gardens",
  },
  {
    icon: Users,
    number: "02",
    title: "Gardening Communities",
    description:
      "Keep track of environmental conditions across shared rooftop gardens and make more informed plant-care decisions together.",
    label: "For shared gardens",
  },
  {
    icon: Building2,
    number: "03",
    title: "Building Managers Operating Rooftop Farms",
    description:
      "Monitor rooftop growing environments and manage supported IoT devices to help maintain suitable conditions for plants.",
    label: "For managed rooftop farms",
  },
];

export default function LandingPage() {
  const [activeImage, setActiveImage] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  const previousImage = () => {
    setActiveImage((current) =>
      current === 0 ? heroImages.length - 1 : current - 1
    );
  };

  const nextImage = () => {
    setActiveImage((current) => (current + 1) % heroImages.length);
  };

  return (
    <main className="landing-page">
      {/* NAVBAR */}
      <header className="landing-navbar">
        <a className="brand" href="#home" aria-label="MENARA home">
          <span className="brand-mark">
            <img src="/LogoMenara.png" alt="MENARA Logo" />
          </span>
          <span className="brand-copy">
            <strong>MENARA</strong>
            <small>Monitoring Environment for AI Rooftop Agriculture</small>
          </span>
        </a>

        <button
          className="mobile-menu-button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <nav className={`navbar-links ${menuOpen ? "is-open" : ""}`}>
          <a href="#features" onClick={() => setMenuOpen(false)}>
            Features
          </a>
          <a href="#about" onClick={() => setMenuOpen(false)}>
            How It Works
          </a>
          <a href="#platform" onClick={() => setMenuOpen(false)}>
            Platform Access
          </a>
          <a href="#audience" onClick={() => setMenuOpen(false)}>
            About <span className="nav-chevron"></span>
          </a>
          <a className="button button-outline" href="/login">
            Sign In
          </a>
          <a className="button button-primary" href="/login">
            Get Started <ArrowRight size={15} />
          </a>
        </nav>
      </header>

      {/* HERO */}
      <section className="hero" id="home">
        <img
          key={heroImages[activeImage].src}
          className="hero-image"
          src={heroImages[activeImage].src}
          alt={heroImages[activeImage].alt}
        />
        <div className="hero-overlay" />

        <button
          className="hero-arrow hero-arrow-left"
          onClick={previousImage}
          aria-label="Previous hero image"
        >
          ‹
        </button>

        <button
          className="hero-arrow hero-arrow-right"
          onClick={nextImage}
          aria-label="Next hero image"
        >
          ›
        </button>

        <div className="hero-content">
          <h1>Smarter Gardens, Greener Cities.</h1>
          <p>
            Meet MENARA, a smarter way to monitor rooftop gardens,
            understand environmental conditions, and make informed
            plant-care decisions with AI and IoT.
          </p>

          <div className="hero-actions">
            <a className="button button-primary" href="/login">
              Get Started <ArrowRight size={16} />
            </a>
            <a className="button button-glass" href="#features">
              Explore MENARA <ArrowDown size={15} />
            </a>
          </div>
        </div>

        <div className="hero-pagination" aria-label="Hero image selection">
          {heroImages.map((image, index) => (
            <button
              key={image.src}
              className={`pagination-dot ${
                index === activeImage ? "active" : ""
              }`}
              onClick={() => setActiveImage(index)}
              aria-label={`Show image ${index + 1}`}
              aria-current={index === activeImage ? "true" : undefined}
            />
          ))}
        </div>
      </section>

      {/* ABOUT MENARA */}
      <section className="about-section section-padding" id="about">
        <div className="about-copy">
          <span className="eyebrow">
            <Leaf size={12} /> ABOUT MENARA
          </span>
          <h2>Meet MENARA</h2>
          <p>
            Urbanization limits available agricultural land in Jakarta,
            while many rooftops have the potential to become productive
            urban gardens. Managing these gardens can be challenging
            because environmental conditions vary and monitoring often
            depends on manual observation.
          </p>
          <p>
            MENARA stands for Monitoring Environment for AI Rooftop
            Agriculture. It combines IoT-based environmental monitoring,
            BMKG-integrated weather insights, AI-powered care
            recommendations, and supported automated controls in one
            platform.
          </p>
          <a className="text-link" href="#features">
            Discover our capabilities <ArrowUpRight size={16} />
          </a>
        </div>

        <div className="about-visual">
          <div className="about-photo-wrap">
            <img
              src="https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1100&q=85"
              alt="Green plants growing in an urban garden"
              className="about-photo"
            />
            <div className="photo-caption">
              <span>
                <strong>Grow with insight</strong>
                <small>Better-informed plant care</small>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* CORE CAPABILITIES */}
      <section className="features-section section-padding" id="features">
        <div className="section-heading">
          <span className="eyebrow">
            <Leaf size={12} /> CORE CAPABILITIES
          </span>
          <h2>Everything Your Rooftop Garden Needs.</h2>
          <p>
            Purpose-engineered tools that bring environmental monitoring, weather insights, and smarter plant care together.
          </p>
        </div>

        <div className="capability-grid">
          {capabilities.map((item) => {
            const Icon = item.icon;

            return (
              <article className="capability-card" key={item.title}>
                <div className="feature-icon">
                  <Icon size={21} strokeWidth={1.8} />
                </div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <div className="tag-list">
                  {item.tags.map((tag) => (
                    <span className="soft-tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* WHO IT IS FOR */}
      <section className="audience-section section-padding" id="audience">
        <div className="section-heading">
          <span className="eyebrow">
            <Users size={12} /> COMMUNITY & OPERATORS
          </span>
          <h2>Built for Urban Gardeners</h2>
          <p>
            Designed for people and communities making better use of
            urban rooftop spaces.
          </p>
        </div>

        <div className="audience-grid">
          {audiences.map((item) => {
            const Icon = item.icon;

            return (
              <article className="audience-card" key={item.number}>
                <div className="audience-card-top">
                  <span className="audience-icon">
                    <Icon size={20} />
                  </span>
                  <span className="audience-number">{item.number}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <div className="audience-label">
                  <Leaf size={13} /> {item.label}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* CALL TO ACTION */}
      <section className="cta-section section-padding" id="platform">
        <div className="cta-panel">
          <span className="eyebrow eyebrow-light">
            <span className="status-dot" /> MENARA PLATFORM ACCESS
          </span>
          <h2>Ready to Grow Smarter?</h2>
          <p>
            Sign in to explore your gardens, monitor environmental
            conditions, and access MENARA&apos;s available tools.
          </p>
          <div className="cta-actions">
            <a className="button button-primary" href="/login">
              Get Started <ArrowRight size={16} />
            </a>
            <a className="button button-glass" href="/login">
              Sign In
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="footer-main">
          <div className="footer-brand-block">
            <a className="brand footer-brand" href="#home">
              <span className="brand-mark">
                <img src="/LogoMenara.png" alt="MENARA Logo" />
              </span>
              <span className="brand-copy">
                <strong>MENARA</strong>
                <small>Monitoring Environment for AI Rooftop Agriculture</small>
              </span>
            </a>
            <p>
              The all in one smart platform for rooftop garden owners. Combining wireless micro-sensors, weather forecasting, and automated care to make urban gardening effortless.
            </p>
          </div>

          <div className="footer-column">
            <h4>Platform Links</h4>
            <a href="#features">Core Capabilities</a>
            <a href="#about">How It Works</a>
            <a href="#platform">Access Platform</a>
            <a href="#audience">About MENARA</a>
          </div>

          <div className="footer-column">
            <h4>Explore MENARA</h4>
            <a href="#features">Environmental Monitoring</a>
            <a href="#features">Weather Insights</a>
            <a href="#features">AI Care Recommendations</a>
            <a href="#features">IoT Automation</a>
          </div>
        </div>

        <div className="footer-bottom">
          <span>
            © 2026 MENARA. Monitoring Environment for AI Rooftop Agriculture.
          </span>
          <span>Smarter gardens, Greener cities.</span>
        </div>
      </footer>
    </main>
  );
}
