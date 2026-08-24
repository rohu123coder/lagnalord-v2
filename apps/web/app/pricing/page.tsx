import type { Metadata } from "next";
import Link from "next/link";

import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { tenantPageTitle } from "@/lib/tenantBranding";
import { getTenant } from "@/lib/tenants";

const pricingCards = [
  {
    title: "Pay Per Minute",
    text: "Each astrologer sets their own rate (₹10–₹500/min). You only pay for time used.",
  },
  {
    title: "Prepaid Wallet",
    text: "Recharge your wallet before starting consultations. Minimum recharge is ₹100.",
  },
  {
    title: "No Subscription",
    text: "No monthly fees. No hidden charges. Pay only when you consult.",
  },
];

const rechargeRows = [
  ["₹100", "₹0", "₹100"],
  ["₹300", "₹30", "₹330"],
  ["₹500", "₹75", "₹575"],
  ["₹1000", "₹200", "₹1200"],
] as const;

const faqs = [
  {
    question: "Can I get a refund on unused balance?",
    answer: "Yes, please see our Refund Policy for eligibility and timelines.",
    href: "/refund-policy",
  },
  {
    question: "Is there a minimum consultation time?",
    answer: "Yes, there is a 1 minute minimum consultation charge.",
  },
  {
    question: "Are there any hidden charges?",
    answer: "No. The price shown on each astrologer profile is final.",
  },
];

export function generateMetadata(): Metadata {
  const tenant = getTenant();
  return {
    title: tenantPageTitle("Pricing"),
    description: `Explore ${tenant.name}'s transparent pay-per-minute pricing, wallet recharge packages, and platform fee policy.`,
  };
}

export default function PricingPage() {
  const tenant = getTenant();

  return (
    <div className="min-h-screen bg-[#0A1A2F] text-[#F5F1E8]">
      <Navbar />

      <main>
        <section className="border-b border-[#C9A227]/20">
          <div className="mx-auto max-w-[1200px] px-4 py-14 md:px-8 md:py-16">
            <h1 className="text-3xl font-extrabold text-[#E0C158] md:text-5xl">
              Transparent Pricing — No Hidden Charges
            </h1>
          </div>
        </section>

        <section className="border-b border-[#C9A227]/20">
          <div className="mx-auto max-w-[1200px] px-4 py-12 md:px-8 md:py-16">
            <h2 className="text-2xl font-bold text-[#E0C158] md:text-3xl">How Pricing Works</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {pricingCards.map((card) => (
                <article key={card.title} className="rounded-2xl border border-[#C9A227]/20 bg-[#0F2240] p-6">
                  <h3 className="text-lg font-bold text-[#E0C158]">{card.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#C7C2B4]">{card.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-[#C9A227]/20">
          <div className="mx-auto max-w-[1200px] px-4 py-12 md:px-8 md:py-16">
            <h2 className="text-2xl font-bold text-[#E0C158] md:text-3xl">Recharge Packages</h2>
            <div className="mt-6 overflow-x-auto rounded-2xl border border-[#C9A227]/20">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#0A1A2F]">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-[#E0C158]">Amount</th>
                    <th className="px-4 py-3 font-semibold text-[#E0C158]">Bonus</th>
                    <th className="px-4 py-3 font-semibold text-[#E0C158]">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rechargeRows.map(([amount, bonus, total]) => (
                    <tr key={amount} className="border-t border-[#C9A227]/10">
                      <td className="px-4 py-3">{amount}</td>
                      <td className="px-4 py-3">{bonus}</td>
                      <td className="px-4 py-3 font-semibold text-[#E0C158]">{total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-[#C7C2B4]/70">
              Note: Bonus amounts are examples and may change based on active offers.
            </p>
          </div>
        </section>

        <section className="border-b border-[#C9A227]/20">
          <div className="mx-auto max-w-[1200px] px-4 py-12 md:px-8 md:py-16">
            <h2 className="text-2xl font-bold text-[#E0C158] md:text-3xl">Platform Fee</h2>
            <ul className="mt-5 space-y-2 text-sm leading-7 text-[#C7C2B4]">
              <li className="flex gap-2">
                <span className="text-[#E0C158]">•</span>
                <span>{tenant.name} charges a small platform fee.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#E0C158]">•</span>
                <span>Astrologers receive 70% of consultation charges.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#E0C158]">•</span>
                <span>Platform fee covers payment processing, support, and platform maintenance.</span>
              </li>
            </ul>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-[1200px] px-4 py-12 md:px-8 md:py-16">
            <h2 className="text-2xl font-bold text-[#E0C158] md:text-3xl">Pricing FAQ</h2>
            <div className="mt-6 space-y-3">
              {faqs.map((faq) => (
                <details key={faq.question} className="rounded-xl border border-[#C9A227]/20 bg-[#0F2240] p-4">
                  <summary className="cursor-pointer list-none text-sm font-semibold text-[#F5F1E8]">
                    {faq.question}
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-[#C7C2B4]">
                    {faq.answer}{" "}
                    {faq.href ? (
                      <Link href={faq.href} className="font-semibold text-[#E0C158] hover:underline">
                        View Refund Policy
                      </Link>
                    ) : null}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
