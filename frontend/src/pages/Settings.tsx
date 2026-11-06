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
} from "lucide-react";
import { useGarden } from "../context/GardenContext";
import { api } from "../api/client";
import type { GardenMember } from "../types";
import "../styles/settings.css";

export const Settings: React.FC = () => {
  const {
    userProfile,
    refreshProfile,
    selectedGarden,
  } = useGarden();

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
      setProfileError(err instanceof Error ? err.message : "Failed to update profile.");
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
      setPasswordError(err instanceof Error ? err.message : "Failed to update password.");
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
      const added = await api.addGardenMember(selectedGarden.id, newMemberEmail.trim());
      setMembers((prev) => [...prev, added]);
      setNewMemberEmail("");
      setMemberNotice(`Added ${added.name || added.email} to ${selectedGarden.name}.`);
      setTimeout(() => setMemberNotice(""), 4000);
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : "Failed to add member.");
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
      setMemberError(err instanceof Error ? err.message : "Failed to remove member.");
    }
  };

  return (
    <div className="settings-container">
      {/* PAGE HEADER */}
      <div className="page-header">
        <div>
          <h1>Account &amp; Garden Settings</h1>
          <p>
            Configure user credentials, security keys, and manage garden operator access permissions.
          </p>
        </div>
      </div>

      <div className="settings-grid">
        {/* CARD 1: PROFILE INFORMATION */}
        <section className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon">
              <UserRound size={20} />
            </div>
            <div>
              <h2>Profile Information</h2>
              <p>Personal identity and contact email saved in PostgreSQL</p>
            </div>
          </div>

          {profileSuccess && (
            <div style={{ padding: "8px 12px", background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", borderRadius: "6px", fontSize: "12px" }}>
              {profileSuccess}
            </div>
          )}
          {profileError && (
            <div style={{ padding: "8px 12px", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: "6px", fontSize: "12px" }}>
              {profileError}
            </div>
          )}

          <form className="settings-form" onSubmit={handleSaveProfile}>
            <div className="settings-form-group">
              <label>Full Name</label>
              <input
                type="text"
                className="settings-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="settings-form-group">
              <label>Email Address</label>
              <input
                type="email"
                className="settings-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="settings-form-group">
              <label>Role</label>
              <input
                type="text"
                className="settings-input"
                value={userProfile?.role || "Gardener"}
                disabled
              />
            </div>

            <button
              type="submit"
              className="app-btn-primary"
              style={{ marginTop: "8px", alignSelf: "flex-start" }}
              disabled={savingProfile}
            >
              <Save size={15} />
              <span>{savingProfile ? "Saving Profile..." : "Save Profile Changes"}</span>
            </button>
          </form>
        </section>

        {/* CARD 2: SECURITY & PASSWORD */}
        <section className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon">
              <LockKeyhole size={20} />
            </div>
            <div>
              <h2>Security &amp; Password</h2>
              <p>Update your authentication password</p>
            </div>
          </div>

          {passwordSuccess && (
            <div style={{ padding: "8px 12px", background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", borderRadius: "6px", fontSize: "12px" }}>
              {passwordSuccess}
            </div>
          )}
          {passwordError && (
            <div style={{ padding: "8px 12px", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: "6px", fontSize: "12px" }}>
              {passwordError}
            </div>
          )}

          <form className="settings-form" onSubmit={handleUpdatePassword}>
            <div className="settings-form-group">
              <label>New Password</label>
              <div className="settings-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  className="settings-input"
                  placeholder="At least 8 characters"
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
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="settings-form-group">
              <label>Confirm New Password</label>
              <input
                type={showPassword ? "text" : "password"}
                className="settings-input"
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                maxLength={72}
                required
              />
            </div>

            <button
              type="submit"
              className="app-btn-primary"
              style={{ marginTop: "8px", alignSelf: "flex-start" }}
              disabled={savingPassword}
            >
              <LockKeyhole size={15} />
              <span>{savingPassword ? "Updating Password..." : "Update Password"}</span>
            </button>
          </form>
        </section>

        {/* CARD 3: TEAM MEMBERS & ACCESS CONTROL */}
        <section className="settings-card" style={{ gridColumn: "1 / -1" }}>
          <div className="settings-card-header">
            <div className="settings-card-icon">
              <Users size={20} />
            </div>
            <div>
              <h2>Garden Team &amp; Operator Access</h2>
              <p>
                Manage operators and agronomists with access to{" "}
                <strong>{selectedGarden?.name || "the current garden"}</strong>
              </p>
            </div>
          </div>

          {memberNotice && (
            <div style={{ padding: "8px 12px", background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", borderRadius: "6px", fontSize: "12px" }}>
              {memberNotice}
            </div>
          )}
          {memberError && (
            <div style={{ padding: "8px 12px", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: "6px", fontSize: "12px" }}>
              {memberError}
            </div>
          )}

          {selectedGarden ? (
            <div>
              {/* Add Member Form */}
              <form onSubmit={handleAddMember} className="settings-add-member-form">
                <input
                  type="email"
                  className="settings-input"
                  placeholder="Enter operator email (e.g. agronomist@garden.id)"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  required
                />
                <button
                  type="submit"
                  className="app-btn-primary"
                  disabled={addingMember}
                  style={{ whiteSpace: "nowrap" }}
                >
                  <UserPlus size={15} />
                  <span>{addingMember ? "Adding..." : "Add Operator"}</span>
                </button>
              </form>

              {/* Members List */}
              <div className="settings-members-list" style={{ marginTop: "16px" }}>
                {members.map((member) => (
                  <div key={member.user_id} className="settings-member-item">
                    <div className="settings-member-info">
                      <strong>{member.name || "Gardener"}</strong>
                      <small>{member.email || "No email listed"}</small>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
                          onClick={() => handleRemoveMember(member.user_id, member.name || member.email || "operator")}
                          title="Remove operator"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ color: "#64748b", fontSize: "13px" }}>
              Select a rooftop garden from the top bar to manage team members.
            </p>
          )}
        </section>
      </div>
    </div>
  );
};

export default Settings;
