import type { Metadata } from "next";
import Link from "next/link";

import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { tenantPageTitle } from "@/lib/tenantBranding";
import { getTenant } from "@/lib/tenants";

function getSections(tenantName: string) {
  return [
    {
      id: "general",
      title: "1. General Disclaimer",
      content: `${tenantName} is an online platform that connects users with independent astrologers. The content provided on this platform is for entertainment and informational purposes only.`,
    },
    {
      id: "professional-advice",
      title: "2. Not Professional Advice",
      intro: "Astrological readings are NOT a substitute for:",
      items: [
        "Medical advice (consult a doctor)",
        "Legal advice (consult a lawyer)",
        "Financial advice (consult a financial advisor)",
        "Mental health support (consult a mental health professional)",
      ],
    },
    {
      id: "guarantees",
      title: "3. No Guarantees",
      content: `${tenantName} does not guarantee the accuracy, completeness, or usefulness of any astrological reading. Results may vary.`,
    },
    {
      id: "independent-astrologers",
      title: "4. Independent Astrologers",
      content: `Astrologers on ${tenantName} are independent service providers. ${tenantName} verifies credentials but is not responsible for individual readings.`,
    },
    {
      id: "user-responsibility",
      title: "5. User Responsibility",
      content: `Users consult astrologers at their own discretion and risk. ${tenantName} is not liable for any decisions made based on astrological readings.`,
    },
    {
      id: "age-restriction",
      title: "6. Age Restriction",
      content: "This service is intended for users 18 years and older.",
    },
  ] as const;
}

export function generateMetadata(): Metadata {
  const tenant = getTenant();
  return {
    title: tenantPageTitle("Disclaimer"),
    description: `Read ${tenant.name}'s legal disclaimer covering the scope of astrological guidance and user responsibility.`,
  };
}

export default function DisclaimerPage() {
  const tenant = getTenant();
  const sections = getSections(tenant.name);

  return (
    <div className="min-h-screen scroll-smooth bg-[#0A1A2F] text-[#F5F1E8]">
      <Navbar />

      <main className="border-b border-[#C9A227]/20">
        <div className="mx-auto max-w-[1200px] px-4 py-12 md:px-8 md:py-16">
          <h1 className="text-3xl font-extrabold text-[#E0C158] md:text-4xl">Disclaimer</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[#C7C2B4]">
            Please read this disclaimer carefully before using {tenant.name} services.
          </p>

          <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
            <aside className="h-fit rounded-2xl border border-[#C9A227]/20 bg-[#0F2240] p-4 lg:sticky lg:top-24">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#C7C2B4]">On this page</p>
              <nav className="mt-3 space-y-2">
                {sections.map((section) => (
                  <Link
                    key={section.id}
                    href={`#${section.id}`}
                    className="block text-sm text-[#C7C2B4] transition hover:text-[#E0C158]"
                  >
                    {section.title}
                  </Link>
                ))}
              </nav>
            </aside>

            <div className="space-y-6">
              {sections.map((section) => (
                <section
                  id={section.id}
                  key={section.id}
                  className="scroll-mt-24 rounded-2xl border border-[#C9A227]/20 bg-[#0F2240] p-6"
                >
                  <h2 className="text-xl font-bold text-[#E0C158]">{section.title}</h2>
                  {"content" in section ? (
                    <p className="mt-3 text-sm leading-7 text-[#C7C2B4]">{section.content}</p>
                  ) : null}
                  {"intro" in section ? (
                    <p className="mt-3 text-sm leading-7 text-[#C7C2B4]">{section.intro}</p>
                  ) : null}
                  {"items" in section ? (
                    <ul className="mt-3 space-y-2 text-sm leading-7 text-[#C7C2B4]">
                      {section.items.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="text-[#E0C158]">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
