import React, { useEffect, useState } from "react";
import {
  UserRound,
  LockKeyhole,
  Users,
  Eye,
  EyeOff,
  Trash2,
  UserPlus,
  Save,
  RefreshCw,
  Building2,
  ChevronDown,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useGarden } from "../context/GardenContext";
import { api } from "../api/client";
import type { GardenMember } from "../types";
import "../styles/settings.css";

export const Settings: React.FC = () => {
  const {
    userProfile,
    refreshProfile,
    selectedGarden,
    gardens,
    setSelectedGarden,
  } = useGarden();

  const [showGardenMenu, setShowGardenMenu] = useState(false);

  // Profile state
  const [name, setName] = useState(userProfile?.name || "");
  const [email, setEmail] = useState(userProfile?.email || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");

  // Sync state if userProfile loads asynchronously
  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name);
      setEmail(userProfile.email || "");
    }
  }, [userProfile]);

  // Security / Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Members state
  const [members, setMembers] = useState<GardenMember[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [memberNotice, setMemberNotice] = useState("");
  const [memberError, setMemberError] = useState("");

  // Load members when selectedGarden changes
  useEffect(() => {
    if (!selectedGarden) {
      setMembers([]);
      return;
    }

    let isMounted = true;

    const loadMembers = async () => {
      try {
        const mems = await api.getGardenMembers(selectedGarden.id);
        if (!isMounted) return;
        setMembers(mems);
      } catch (err) {
        if (!isMounted) return;
        console.error("Failed to load members:", err);
      }
    };

    loadMembers();

    return () => {
      isMounted = false;
    };
  }, [selectedGarden]);

  // Handle Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      setProfileError("Name and email are required.");
      return;
    }

    setSavingProfile(true);
    setProfileError("");
    setProfileSuccess("");

    try {
      await api.updateProfile({
        name: name.trim(),
        email: email.trim(),
      });

      await refreshProfile();
      setProfileSuccess("Profile updated successfully in PostgreSQL backend.");
      setTimeout(() => setProfileSuccess(""), 4000);
    } catch (err) {
      setProfileError(
        err instanceof Error ? err.message : "Failed to update profile."
      );
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Update Password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      setPasswordError("Please enter and confirm your new password.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }

    if (newPassword.length > 72) {
      setPasswordError("Password must not exceed 72 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setSavingPassword(true);
    setPasswordError("");
    setPasswordSuccess("");

    try {
      await api.resetPassword(newPassword);

      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess("Password updated successfully.");
      setTimeout(() => setPasswordSuccess(""), 4000);
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : "Failed to update password."
      );
    } finally {
      setSavingPassword(false);
    }
  };

  // Handle Add Member
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedGarden || !newMemberEmail.trim()) return;

    setAddingMember(true);
    setMemberError("");
    setMemberNotice("");

    try {
      const added = await api.addGardenMember(
        selectedGarden.id,
        newMemberEmail.trim()
      );

      setMembers((prev) => [...prev, added]);
      setNewMemberEmail("");
      setMemberNotice(`Added ${added.name || added.email} to ${selectedGarden.name}.`);
      setTimeout(() => setMemberNotice(""), 4000);
    } catch (err) {
      setMemberError(
        err instanceof Error ? err.message : "Failed to add member."
      );
    } finally {
      setAddingMember(false);
    }
  };

  // Handle Remove Member
  const handleRemoveMember = async (userId: string, memberName: string) => {
    if (!selectedGarden) return;

    try {
      await api.removeGardenMember(selectedGarden.id, userId);

      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
      setMemberNotice(`Removed ${memberName} from garden membership.`);
      setTimeout(() => setMemberNotice(""), 4000);
    } catch (err) {
      setMemberError(
        err instanceof Error ? err.message : "Failed to remove member."
      );
    }
  };

  return (
    <div className="settings-container">
 {/* SETTINGS HERO */}

<section className="settings-hero">

  {/* HERO TOP ROW */}
  <div className="settings-hero-top">

    <div className="settings-hero-overview-title">
      Account &amp; Garden Settings
    </div>

    {/* HERO CONTROLS */}
    <div className="settings-hero-controls">

      {/* CONNECTION STATUS */}
      <div className="settings-hero-sync">
        <RefreshCw size={14} />
        <span>Connected</span>
      </div>

      {/* GARDEN SELECTOR */}
      <div className="settings-hero-garden-selector">

        <button
          type="button"
          className="settings-hero-garden-button"
          onClick={() => setShowGardenMenu((prev) => !prev)}
          aria-expanded={showGardenMenu}
        >
          <Building2 size={18} />

          <div className="settings-hero-garden-info">
            <strong>
              {selectedGarden?.name || "Select Garden"}
            </strong>

            <small>
              {selectedGarden?.location_name || "Garden location"}
            </small>
          </div>

          <ChevronDown
            size={16}
            className={showGardenMenu ? "rotated" : ""}
          />
        </button>

        {/* DROPDOWN */}
        {showGardenMenu && (
          <div className="settings-hero-garden-dropdown">

            <div className="settings-hero-dropdown-label">
              SWITCH GARDEN FACILITY
            </div>

            {gardens.map((g) => (
              <button
                key={g.id}
                type="button"
                className={`settings-hero-garden-option ${
                  g.id === selectedGarden?.id ? "selected" : ""
                }`}
                onClick={() => {
                  setSelectedGarden(g);
                  setShowGardenMenu(false);
                }}
              >
                <strong>{g.name}</strong>

                <small>
                  {g.location_name} • {g.elevation_m}m
                </small>
              </button>
            ))}

            {gardens.length === 0 && (
              <div className="settings-hero-garden-empty">
                No gardens found.
              </div>
            )}

            {/* ADD GARDEN */}
            <div className="settings-hero-dropdown-bottom">
              <Link
                to="/garden-profile"
                onClick={() => setShowGardenMenu(false)}
              >
                <Plus size={15} />
                Add New Garden Facility
              </Link>
            </div>

          </div>
        )}
      </div>
    </div>
  </div>

  {/* HERO DESCRIPTION */}
  <p className="settings-hero-description">
    Configure user credentials, security keys, and manage garden
    operator access permissions.
  </p>

</section>

      <div className="settings-grid">
        {/* CARD 1: PROFILE INFORMATION */}
        <section className="settings-card settings-profile-card">
          <div className="settings-card-header">
            <div className="settings-card-icon">
              <UserRound size={20} />
            </div>

            <div className="settings-card-heading">
              <h2>Profile Information</h2>
              <p>Manage your personal identity and account contact information.</p>
            </div>

            <span className="settings-card-badge">PROFILE</span>
          </div>

          <div className="settings-profile-summary">
            <div className="settings-profile-avatar">
              <UserRound size={22} />
            </div>

            <div className="settings-profile-summary-info">
              <strong>{userProfile?.name || "Gardener"}</strong>
              <span>{userProfile?.email || "No email available"}</span>
              <div className="settings-profile-role">
                {userProfile?.role || "Gardener"}
              </div>
            </div>
          </div>

          {profileSuccess && (
            <div className="settings-notice success">
              {profileSuccess}
            </div>
          )}

          {profileError && (
            <div className="settings-notice error">
              {profileError}
            </div>
          )}

          <form className="settings-form" onSubmit={handleSaveProfile}>
            <div className="settings-profile-fields">
              <div className="settings-form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  className="settings-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <small>Name displayed across your account.</small>
              </div>

              <div className="settings-form-group">
                <label>Official Email Address</label>
                <input
                  type="email"
                  className="settings-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <small>Your primary account email address.</small>
              </div>
            </div>

            <div className="settings-form-group settings-role-group">
              <label>Account Role</label>
              <input
                type="text"
                className="settings-input"
                value={userProfile?.role || "Gardener"}
                disabled
              />
              <small>Role is managed by the system.</small>
            </div>

            <div className="settings-card-footer">
              <span className="settings-footer-note">
                <ShieldCheck size={14} />
                Profile updates are saved to your account.
              </span>

              <button
                type="submit"
                className="app-btn-primary"
                disabled={savingProfile}
              >
                <Save size={15} />
                <span>
                  {savingProfile ? "Saving..." : "Save Changes"}
                </span>
              </button>
            </div>
          </form>
        </section>

        {/* CARD 2: SECURITY & PASSWORD */}
        <section className="settings-card settings-security-card">
          <div className="settings-card-header">
            <div className="settings-card-icon">
              <LockKeyhole size={20} />
            </div>

            <div className="settings-card-heading">
              <h2>Security &amp; Password</h2>
              <p>Update your account password and authentication credentials.</p>
            </div>

            <span className="settings-card-badge">SECURITY</span>
          </div>

          {passwordSuccess && (
            <div className="settings-notice success">
              {passwordSuccess}
            </div>
          )}

          {passwordError && (
            <div className="settings-notice error">
              {passwordError}
            </div>
          )}

          <form className="settings-form" onSubmit={handleUpdatePassword}>
            <div className="settings-form-group">
              <div className="settings-label-row">
                <label>New Password</label>
                <span className="settings-field-hint">Min. 8 characters</span>
              </div>

              <div className="settings-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  className="settings-input"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  maxLength={72}
                  required
                />

                <button
                  type="button"
                  className="settings-input-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="settings-form-group">
              <label>Confirm New Password</label>

              <div className="settings-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  className="settings-input"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={8}
                  maxLength={72}
                  required
                />

                <button
                  type="button"
                  className="settings-input-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="settings-security-tip">
              <ShieldCheck size={16} />
              <div>
                <strong>Account Security</strong>
                <span>
                  Use a strong password with at least 8 characters.
                </span>
              </div>
            </div>

            <div className="settings-card-footer settings-security-footer">
              <span className="settings-footer-note">
                Securely update your account credentials.
              </span>

              <button
                type="submit"
                className="app-btn-primary"
                disabled={savingPassword}
              >
                <LockKeyhole size={15} />
                <span>
                  {savingPassword ? "Updating..." : "Update Password"}
                </span>
              </button>
            </div>
          </form>
        </section>

        {/* CARD 3: TEAM MEMBERS & ACCESS CONTROL */}
        <section className="settings-card settings-team-card">
          <div className="settings-card-header">
            <div className="settings-card-icon">
              <Users size={20} />
            </div>

            <div className="settings-card-heading">
              <h2>Garden Team &amp; Operator Access</h2>
              <p>
                Manage operators and agronomists with access to{" "}
                <strong>
                  {selectedGarden?.name || "the current garden"}
                </strong>
              </p>
            </div>

            <span className="settings-card-badge">TEAM ACCESS</span>
          </div>

          {memberNotice && (
            <div className="settings-notice success">
              {memberNotice}
            </div>
          )}

          {memberError && (
            <div className="settings-notice error">
              {memberError}
            </div>
          )}

          {selectedGarden ? (
            <div className="settings-team-content">
              {/* Add Member Form */}
              <form
                onSubmit={handleAddMember}
                className="settings-add-member-form"
              >
                <div className="settings-add-member-input">
                  <label>Add Garden Operator</label>
                  <input
                    type="email"
                    className="settings-input"
                    placeholder="Enter operator email address"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="app-btn-primary"
                  disabled={addingMember}
                >
                  <UserPlus size={15} />
                  <span>
                    {addingMember ? "Adding..." : "Add Operator"}
                  </span>
                </button>
              </form>

              {/* Members List */}
              <div className="settings-members-section">
                <div className="settings-members-heading">
                  <h3>Garden Members</h3>
                  <span className="settings-members-count">
                    {members.length} member{members.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {members.length > 0 ? (
                  <div className="settings-members-list">
                    {members.map((member) => (
                      <div
                        key={member.user_id}
                        className="settings-member-item"
                      >
                        <div className="settings-member-avatar">
                          <UserRound size={17} />
                        </div>

                        <div className="settings-member-info">
                          <strong>{member.name || "Gardener"}</strong>
                          <small>
                            {member.email || "No email listed"}
                          </small>
                        </div>

                        <div className="settings-member-actions">
                          <span
                            className={`settings-member-badge ${
                              member.role === "owner" ? "owner" : ""
                            }`}
                          >
                            {member.role}
                          </span>

                          {member.role !== "owner" && (
                            <button
                              type="button"
                              className="settings-member-remove"
                              onClick={() =>
                                handleRemoveMember(
                                  member.user_id,
                                  member.name || member.email || "operator"
                                )
                              }
                              title="Remove operator"
                              aria-label="Remove operator"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="settings-members-empty">
                    <Users size={22} />
                    <p>No garden members found.</p>
                    <span>Add an operator using the form above.</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="settings-no-garden">
              Select a rooftop garden from the top bar to manage team members.
            </p>
          )}
        </section>
      </div>

      {/* FOOTER */}
      <footer className="settings-page-footer">
        <span>
          &copy; 2026 MENARA. Monitoring Environment for AI Rooftop Agriculture.
        </span>
      </footer>
    </div>
  );
};

export default Settings;