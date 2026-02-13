"use client";

import { useState, useEffect } from "react";
import {
  getSettings,
  saveSettings,
  getCreditsInfo,
  validateDisplayName,
  validateBio,
  BIO_MAX_LENGTH,
  type ExperienceLevel,
  type LearningMode,
  type UserSettings,
  type CreditsInfo,
} from "@/lib/settings";

// ---------- Sidebar ----------

type SettingsTab = "profile" | "preferences" | "credits";

const TABS: { id: SettingsTab; label: string; icon: string }[] = [
  { id: "profile", label: "Public Profile", icon: "person" },
  { id: "preferences", label: "Learning Preferences", icon: "tune" },
  { id: "credits", label: "Credits & Usage", icon: "credit_card" },
];

// ---------- Component ----------

export default function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>("profile");
  const [settings, setSettings] = useState<UserSettings>(getSettings);
  const [credits] = useState<CreditsInfo>(getCreditsInfo);
  const [saved, setSaved] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [bioError, setBioError] = useState<string | null>(null);

  function handleSave() {
    const nameErr = validateDisplayName(settings.displayName);
    const bioErr = validateBio(settings.bio);
    setNameError(nameErr);
    setBioError(bioErr);
    if (nameErr || bioErr) return;

    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleCancel() {
    setSettings(getSettings());
    setNameError(null);
    setBioError(null);
  }

  const creditsPercent = credits.total > 0
    ? Math.round((credits.remaining / credits.total) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950" data-testid="settings-page">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="bg-primary rounded-lg p-1.5">
                <span className="material-icons text-white text-xl">code</span>
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                GitGood<span className="text-primary text-xs ml-0.5 uppercase tracking-widest">AI</span>
              </span>
            </div>
            <h1 className="text-sm font-bold text-slate-500">Settings</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-12">
          {/* Sidebar */}
          <aside className="lg:col-span-3 mb-8 lg:mb-0">
            <nav className="space-y-1" data-testid="settings-nav">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    tab === t.id
                      ? "bg-primary/10 text-primary border-l-4 border-primary"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                  data-testid={`tab-${t.id}`}
                >
                  <span className="material-icons mr-3 text-xl">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </nav>

            {/* Credits Teaser */}
            <div className="mt-10 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Plan Details</h4>
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary capitalize">
                  {credits.plan}
                </span>
              </div>
              <p className="text-sm font-medium text-slate-900 dark:text-white mb-2" data-testid="credits-remaining">
                {credits.remaining} Credits remaining
              </p>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mb-4">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all"
                  style={{ width: `${creditsPercent}%` }}
                  data-testid="credits-bar"
                />
              </div>
            </div>
          </aside>

          {/* Content */}
          <div className="lg:col-span-9 space-y-8">
            {/* Profile Section */}
            {tab === "profile" && (
              <section
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
                data-testid="profile-section"
              >
                <div className="px-6 py-6 border-b border-slate-100 dark:border-slate-800">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Profile Information</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Update your personal details and how you appear to the community.
                  </p>
                </div>
                <div className="p-6 space-y-6">
                  {/* Avatar */}
                  <div className="flex items-center space-x-6">
                    <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center ring-4 ring-slate-50 dark:ring-slate-800">
                      <span className="material-icons text-4xl text-primary">person</span>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Profile Picture</h3>
                      <p className="text-xs text-slate-400">Synced from your GitHub account.</p>
                    </div>
                  </div>

                  {/* Form */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={settings.displayName}
                        onChange={(e) =>
                          setSettings((s) => ({ ...s, displayName: e.target.value }))
                        }
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm outline-none"
                        data-testid="display-name-input"
                      />
                      {nameError && (
                        <p className="text-xs text-red-500" data-testid="name-error">{nameError}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Email Address
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          value="user@github.com"
                          disabled
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-400 text-sm outline-none cursor-not-allowed"
                          data-testid="email-input"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <span className="material-icons text-emerald-500 text-sm">verified</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Bio</label>
                      <textarea
                        value={settings.bio}
                        onChange={(e) =>
                          setSettings((s) => ({ ...s, bio: e.target.value }))
                        }
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm outline-none resize-none"
                        rows={4}
                        data-testid="bio-input"
                      />
                      <p className="text-xs text-right text-slate-400" data-testid="bio-count">
                        {settings.bio.length} / {BIO_MAX_LENGTH} characters
                      </p>
                      {bioError && (
                        <p className="text-xs text-red-500" data-testid="bio-error">{bioError}</p>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Preferences Section */}
            {tab === "preferences" && (
              <section
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
                data-testid="preferences-section"
              >
                <div className="px-6 py-6 border-b border-slate-100 dark:border-slate-800">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Learning Preferences</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Tailor the AI tutor&apos;s tone and difficulty to your expertise.
                  </p>
                </div>
                <div className="p-6 space-y-8">
                  {/* Experience Level */}
                  <div className="space-y-4">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Experience Level
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {(["junior", "mid", "senior"] as ExperienceLevel[]).map((level) => (
                        <button
                          key={level}
                          onClick={() =>
                            setSettings((s) => ({ ...s, experienceLevel: level }))
                          }
                          className={`flex items-center justify-center px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                            settings.experienceLevel === level
                              ? "border-2 border-primary bg-primary/5 text-primary font-bold shadow-sm"
                              : "border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                          }`}
                          data-testid={`level-${level}`}
                        >
                          {level === "junior" ? "Junior" : level === "mid" ? "Mid-level" : "Senior/Lead"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Learning Mode */}
                  <div className="space-y-4">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Learning Track Mode
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {([
                        {
                          mode: "standard" as LearningMode,
                          title: "Standard Curriculum",
                          desc: "Comprehensive end-to-end repository deep dives.",
                        },
                        {
                          mode: "quickstart" as LearningMode,
                          title: "Quick Start",
                          desc: "Fast-paced, high-level summaries and code snippets.",
                        },
                      ]).map(({ mode, title, desc }) => (
                        <label
                          key={mode}
                          className={`relative flex items-center p-4 rounded-xl border cursor-pointer transition-all ${
                            settings.learningMode === mode
                              ? "border-primary bg-primary/5"
                              : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                          }`}
                          data-testid={`mode-${mode}`}
                        >
                          <input
                            type="radio"
                            name="learning_mode"
                            checked={settings.learningMode === mode}
                            onChange={() =>
                              setSettings((s) => ({ ...s, learningMode: mode }))
                            }
                            className="h-4 w-4 text-primary border-slate-300 focus:ring-primary"
                          />
                          <div className="ml-4">
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{title}</p>
                            <p className="text-xs text-slate-500">{desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Credits Section */}
            {tab === "credits" && (
              <section
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
                data-testid="credits-section"
              >
                <div className="px-6 py-6 border-b border-slate-100 dark:border-slate-800">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Credits & Usage</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Monitor your AI credits and daily usage.
                  </p>
                </div>
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 text-center">
                      <p className="text-2xl font-extrabold text-primary" data-testid="credits-count">
                        {credits.remaining}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">Credits Remaining</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 text-center">
                      <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
                        {credits.total}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">Daily Limit</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 text-center">
                      <p className="text-2xl font-extrabold text-slate-900 dark:text-white capitalize">
                        {credits.plan}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">Current Plan</p>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Usage Today</span>
                      <span className="text-sm text-slate-500">{creditsPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${creditsPercent}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">
                    Credits reset daily at midnight UTC. Your next reset is at{" "}
                    {new Date(credits.resetsAt).toLocaleString()}.
                  </p>
                </div>
              </section>
            )}

            {/* Save / Cancel */}
            <div className="flex items-center justify-end gap-3 pt-2">
              {saved && (
                <span className="text-sm text-green-600 font-medium flex items-center gap-1" data-testid="saved-msg">
                  <span className="material-icons text-sm">check_circle</span>
                  Saved!
                </span>
              )}
              <button
                onClick={handleCancel}
                className="px-6 py-2.5 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                data-testid="cancel-btn"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-8 py-2.5 rounded-lg bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-95 transition-all"
                data-testid="save-btn"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
