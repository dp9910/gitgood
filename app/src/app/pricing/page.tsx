"use client";

import { useState } from "react";
import { TIERS, FEATURES, FAQS, getFeatureValue, isFeatureIncluded } from "@/lib/pricing";

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950" data-testid="pricing-page">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
            <span className="material-icons text-primary">code</span>
            GitGood
          </a>
          <div className="flex items-center gap-4 text-sm">
            <a href="/browse" className="text-slate-500 hover:text-primary transition-colors">Browse</a>
            <a href="/dashboard" className="text-slate-500 hover:text-primary transition-colors">Dashboard</a>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
            Start learning for free. Upgrade when you need more.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto mb-20" data-testid="pricing-cards">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-2xl p-8 ${
                tier.highlighted
                  ? "bg-primary text-white ring-2 ring-primary shadow-lg shadow-primary/20"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
              }`}
              data-testid={`tier-${tier.name.toLowerCase()}`}
            >
              <h2 className={`text-xl font-bold mb-1 ${tier.highlighted ? "text-white" : "text-slate-900 dark:text-white"}`}>
                {tier.name}
              </h2>
              <p className={`text-sm mb-4 ${tier.highlighted ? "text-white/80" : "text-slate-500"}`}>
                {tier.description}
              </p>

              <div className="flex items-baseline gap-1 mb-6">
                <span className={`text-4xl font-bold ${tier.highlighted ? "text-white" : "text-slate-900 dark:text-white"}`}>
                  {tier.price}
                </span>
                <span className={`text-sm ${tier.highlighted ? "text-white/70" : "text-slate-500"}`}>
                  {tier.priceNote}
                </span>
              </div>

              <a
                href={tier.ctaHref}
                className={`block text-center py-3 rounded-xl font-bold text-sm transition-colors ${
                  tier.highlighted
                    ? "bg-white text-primary hover:bg-slate-50"
                    : "bg-primary text-white hover:bg-primary-hover"
                }`}
                data-testid={`cta-${tier.name.toLowerCase()}`}
              >
                {tier.cta}
              </a>
            </div>
          ))}
        </div>

        {/* Feature comparison */}
        <div className="mb-20">
          <h2 className="text-2xl font-bold text-center text-slate-900 dark:text-white mb-8">
            Compare plans
          </h2>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden" data-testid="feature-table">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="text-left px-6 py-3 text-sm font-bold text-slate-500">Feature</th>
                  <th className="text-center px-6 py-3 text-sm font-bold text-slate-500">Free</th>
                  <th className="text-center px-6 py-3 text-sm font-bold text-primary">Pro</th>
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((feature, i) => (
                  <tr
                    key={feature.name}
                    className={i < FEATURES.length - 1 ? "border-b border-slate-100 dark:border-slate-800" : ""}
                  >
                    <td className="px-6 py-3 text-sm text-slate-700 dark:text-slate-300">
                      {feature.name}
                    </td>
                    <td className="px-6 py-3 text-center">
                      {typeof feature.free === "boolean" ? (
                        feature.free ? (
                          <span className="material-icons text-green-500 text-sm">check_circle</span>
                        ) : (
                          <span className="material-icons text-slate-300 text-sm">remove</span>
                        )
                      ) : (
                        <span className="text-sm text-slate-600 dark:text-slate-400">{feature.free}</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-center">
                      {typeof feature.pro === "boolean" ? (
                        feature.pro ? (
                          <span className="material-icons text-green-500 text-sm">check_circle</span>
                        ) : (
                          <span className="material-icons text-slate-300 text-sm">remove</span>
                        )
                      ) : (
                        <span className="text-sm font-medium text-primary">{feature.pro}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-slate-900 dark:text-white mb-8">
            Frequently asked questions
          </h2>
          <div className="space-y-2" data-testid="faq-list">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left"
                  data-testid={`faq-${i}`}
                >
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {faq.question}
                  </span>
                  <span className="material-icons text-slate-400 text-sm">
                    {openFaq === i ? "expand_less" : "expand_more"}
                  </span>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-4" data-testid={`faq-answer-${i}`}>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
