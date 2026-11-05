import { useState } from "react";
import {
  LayoutDashboard,
  Sprout,
  Activity,
  Brain,
  SlidersHorizontal,
  Settings,
  Radio,
  UserRound,
  MoreVertical,
  RefreshCw,
  Clock,
  CloudRain,
  Droplet,
  Sun,
  Leaf,
  CheckCircle2,
  Building2,
  CalendarCheck,
  Info,
} from "lucide-react";

import { NavLink } from "react-router-dom";
import "../styles/ai-recommendations.css";

type Recommendation = {
  id: number;
  category: string;
  title: string;
  priority: "High Priority" | "Medium Priority" | "Advisory";
  priorityType: "high" | "medium" | "advisory";
  icon: typeof Droplet;
  iconType: string;
  metrics: {
    icon: typeof Droplet;
    text: string;
  }[];
  observation: string;
  action: string;
  primaryButton: string;
  secondaryButton: string;
  primaryIcon: typeof CheckCircle2;
};

const navigation = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Garden Profile", path: "/garden-profile", icon: Sprout },
  {
    label: "Environmental Monitoring",
    path: "/monitoring",
    icon: Activity,
  },
  {
    label: "AI Recommendations",
    path: "/recommendations",
    icon: Brain,
    tag: "AI",
  },
  {
    label: "Device Control",
    path: "/devices",
    icon: SlidersHorizontal,
  },
  { label: "Settings", path: "/settings", icon: Settings },
];

const initialRecommendations: Recommendation[] = [
  {
    id: 1,
    category: "IRRIGATION CONTROL",
    title: "Delay Afternoon Misting",
    priority: "High Priority",
    priorityType: "high",
    icon: Droplet,
    iconType: "irrigation",
    metrics: [
      { icon: CloudRain, text: "BMKG: 16:00 Rain (65%)" },
      { icon: Droplet, text: "Soil Moisture: 71%" },
    ],
    observation:
      "Convective rain forecasted for 16:00 combined with 71% soil moisture indicates adequate root moisture. Postponing cycle prevents root waterlogging and fungal pathogen development.",
    action:
      "Postpone scheduled 15:30 misting cycle by 3 hours until substrate evaporation rate is re-evaluated.",
    primaryButton: "Postpone Misting",
    secondaryButton: "Dismiss",
    primaryIcon: CheckCircle2,
  },
  {
    id: 2,
    category: "CLIMATE ADAPTATION",
    title: "Deploy Canopy Shade Cloth",
    priority: "Medium Priority",
    priorityType: "medium",
    icon: Sun,
    iconType: "climate",
    metrics: [
      { icon: Sun, text: "BH1750: 42,500 lux (Peak)" },
      { icon: Leaf, text: "Zone: Bok Choy Sector 2B" },
    ],
    observation:
      "Ambient solar radiation exceeds 40,000 lux during mid-day peak (14:00 WIB). Deploying shade netting mitigates tip-burn and solar leaf scorch across young brassica varieties.",
    action:
      "Extend motorized overhead shade cloth to 60% coverage until ambient intensity drops below 35,000 lux (approx. 15:30 WIB).",
    primaryButton: "Deploy Shade Cloth",
    secondaryButton: "Adjust Coverage",
    primaryIcon: Building2,
  },
  {
    id: 3,
    category: "HARVEST TIMING",
    title: "Optimal Harvest Microclimate",
    priority: "Advisory",
    priorityType: "advisory",
    icon: Leaf,
    iconType: "harvest",
    metrics: [
      { icon: Activity, text: "Temp: 31.2°C" },
      { icon: Clock, text: "Stage: Mature (Day 28)" },
    ],
    observation:
      "Stomatal conductance and leaf water content are in optimal equilibrium. Harvesting tomorrow between 06:30–08:30 WIB will preserve peak turgor pressure and crispness.",
    action:
      "Queue Water Spinach Sector B on the morning harvest roster and alert field crew lead.",
    primaryButton: "Add to Schedule",
    secondaryButton: "Review Bed",
    primaryIcon: CalendarCheck,
  },
];

export const AIRecommendations = () => {
  const [recommendations, setRecommendations] = useState(
    initialRecommendations
  );
  const [notice, setNotice] = useState(
    "Automated suggestions synthesize sensor data and BMKG predictive radar models. Verify physical field conditions before triggering major automated adjustments."
  );
  const [lastAction, setLastAction] = useState("");

  const handleDismiss = (id: number) => {
    setRecommendations((current) =>
      current.filter((recommendation) => recommendation.id !== id)
    );
    setNotice("Recommendation dismissed. You can review other active advisories.");
  };

  const handlePrimaryAction = (recommendation: Recommendation) => {
    setLastAction(recommendation.primaryButton);

    if (recommendation.id === 1) {
      setNotice("Misting cycle postponed by 3 hours (demo action).");
    } else if (recommendation.id === 2) {
      setNotice("Shade cloth deployment requested (demo action).");
    } else {
      setNotice("Harvest recommendation added to the schedule (demo action).");
    }
  };

  const handleSecondaryAction = (recommendation: Recommendation) => {
    setLastAction(recommendation.secondaryButton);
    setNotice(
      `${recommendation.secondaryButton} selected for "${recommendation.title}" (demo action).`
    );
  };

  return (
    <div className="ai-recommendations-page">
      
    {/* SIDEBAR */}
    <aside className="ai-sidebar">
      <div className="ai-brand">
        <div className="ai-brand-logo">
          <img src="/LogoMenara.png" alt="MENARA Logo" />
        </div>

        <div className="ai-brand-text">
          <h2>
            MENARA <span />
          </h2>
          <p>ROOFTOP AGRITECH</p>
        </div>
      </div>

      <nav className="ai-navigation">
        {navigation.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `ai-nav-item ${isActive ? "active" : ""}`
              }
            >
              <Icon size={21} strokeWidth={2.2} />

              <span>{item.label}</span>

              {item.tag && (
                <span className="ai-nav-tag">{item.tag}</span>
              )}

              {item.path === "/recommendations" && (
                <span className="ai-nav-indicator" />
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="ai-sidebar-bottom">
        <div className="ai-online-status">
          <span />
          <span>Online • Node Mesh</span>
          <Radio size={17} />
        </div>

        <div className="ai-user-profile">
          <div className="ai-user-avatar">
            <UserRound size={22} />
          </div>

          <div className="ai-user-info">
            <strong>Dr. Ezzedine Ruzash</strong>
            <span>Lead Agronomist</span>
          </div>

          <button
            className="ai-more-button"
            aria-label="More options"
          >
            <MoreVertical size={20} />
          </button>
        </div>
      </div>
    </aside>

      {/* MAIN CONTENT */}
      <main className="ai-main">
        <div className="ai-content">
          {/* TOP BAR */}
          <div className="ai-topbar">
            <div className="ai-location-pill">
              <Building2 size={16} />
              <strong>Kebun Atap Menteng</strong>
              <span>/ Rooftop Block B (Zone 2B)</span>
            </div>

            <div className="ai-sync-pill">
              <RefreshCw size={12} />
              Synced 2m ago
            </div>

            <div className="ai-evaluation">
              <Clock size={14} />
              <span>Evaluation cycle: Every 15 min</span>
              <i />
              <strong>{recommendations.length} Active Advisories</strong>
            </div>
          </div>

          {/* HEADING */}
          <header className="ai-page-heading">
            <h1>AI Recommendations</h1>
            <p>
              Real-time automated agronomical care interventions synthesized
              from live microclimate telemetry, sensor nodes, and BMKG
              predictive data.
            </p>
          </header>

          {/* RECOMMENDATION CARDS */}
          <section className="ai-recommendation-grid">
            {recommendations.map((recommendation) => {
              const Icon = recommendation.icon;
              const PrimaryIcon = recommendation.primaryIcon;

              return (
                <article
                  className="ai-recommendation-card"
                  key={recommendation.id}
                >
                  {/* CARD HEADER */}
                  <div className="ai-card-heading">
                    <div className={`ai-card-icon ${recommendation.iconType}`}>
                      <Icon size={21} />
                    </div>

                    <div className="ai-card-title">
                      <span className={`ai-category ${recommendation.iconType}`}>
                        {recommendation.category}
                      </span>
                      <h2>{recommendation.title}</h2>
                    </div>

                    <span
                      className={`ai-priority ${recommendation.priorityType}`}
                    >
                      <i />
                      {recommendation.priority}
                    </span>
                  </div>

                  {/* SENSOR METRICS */}
                  <div className="ai-card-metrics">
                    {recommendation.metrics.map((metric, index) => {
                      const MetricIcon = metric.icon;

                      return (
                        <div className="ai-metric-pill" key={index}>
                          <MetricIcon size={13} />
                          <span>{metric.text}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* OBSERVATION */}
                  <div className="ai-information-box">
                    <h3>OBSERVATION REASON</h3>
                    <p>{recommendation.observation}</p>
                  </div>

                  {/* PRESCRIBED ACTION */}
                  <div className="ai-action-box">
                    <h3>PRESCRIBED ACTION</h3>
                    <p>{recommendation.action}</p>
                  </div>

                  {/* BUTTONS */}
                  <div className="ai-card-actions">
                    <button
                      className="ai-primary-button"
                      onClick={() => handlePrimaryAction(recommendation)}
                    >
                      <PrimaryIcon size={15} />
                      {recommendation.primaryButton}
                    </button>

                    <button
                      className="ai-secondary-button"
                      onClick={() =>
                        recommendation.id === 1
                          ? handleDismiss(recommendation.id)
                          : handleSecondaryAction(recommendation)
                      }
                    >
                      {recommendation.secondaryButton}
                    </button>
                  </div>
                </article>
              );
            })}
          </section>

          {/* EMPTY STATE */}
          {recommendations.length === 0 && (
            <div className="ai-empty-state">
              <CheckCircle2 size={34} />
              <h2>All recommendations reviewed</h2>
              <p>There are currently no active recommendations to display.</p>
              <button
                onClick={() => setRecommendations(initialRecommendations)}
              >
                Restore Demo Recommendations
              </button>
            </div>
          )}

          {/* NOTICE */}
          <div className="ai-notice">
            <Info size={17} />
            <p>
              <strong>Notice:</strong> {notice}
              {lastAction && (
                <span className="ai-last-action">
                  {" "}Last action: {lastAction}.
                </span>
              )}
            </p>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="ai-footer">
          <span className="ai-footer-dots">•••</span>
          © 2026 MENARA. Monitoring Environment for AI Rooftop Agriculture.
        </footer>
      </main>
    </div>
  );
};

export default AIRecommendations;
