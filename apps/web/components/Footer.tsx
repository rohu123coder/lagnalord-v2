import Link from "next/link";

import { getTenant } from "@/lib/tenants";

const columns: Array<{
  title: string;
  links: Array<{ label: string; href: string }>;
}> = [
  {
    title: "Horoscope",
    links: [
      { label: "Horoscope", href: "/horoscope" },
      { label: "Daily & Weekly", href: "/horoscope" },
      { label: "2026 Horoscope", href: "/horoscope?year=2026" },
    ],
  },
  {
    title: "Free Services",
    links: [
      { label: "Free Kundli", href: "/kundli" },
      { label: "Kundli Matching", href: "/kundli/match" },
      { label: "Panchang", href: "/panchang" },
      { label: "Remedies", href: "/remedies" },
      { label: "Free Reports", href: "/reports" },
    ],
  },
  {
    title: "Calculators",
    links: [
      { label: "Mulank", href: "/mulank-calculator" },
      { label: "Destiny Number", href: "/destiny-number-calculator" },
      { label: "Love", href: "/love-calculator" },
      { label: "FLAMES", href: "/flames-calculator" },
      { label: "Age", href: "/age-calculator" },
    ],
  },
  {
    title: "Reports",
    links: [
      { label: "Mangal Dosha", href: "/reports/mangal-dosha" },
      { label: "Sade Sati", href: "/reports/sade-sati" },
      { label: "Kaal Sarp Dosha", href: "/reports/kaal-sarp-dosha" },
      { label: "Lal Kitab", href: "/reports/lal-kitab" },
    ],
  },
  {
    title: "Astrologer",
    links: [
      { label: "Consult Astrologers", href: "/astrologers" },
      { label: "Astrologer Login", href: "/astrologer/login" },
      { label: "Astrologer Registration", href: "/astrologer/register" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Pricing", href: "/pricing" },
      { label: "Blog", href: "/blog" },
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Terms", href: "/terms" },
      { label: "Refund Policy", href: "/refund-policy" },
      { label: "Disclaimer", href: "/disclaimer" },
    ],
  },
];

const socialLinks = [
  { platform: "Facebook", text: "f", href: "#" },
  { platform: "Instagram", text: "ig", href: "#" },
  { platform: "YouTube", text: "yt", href: "#" },
  { platform: "X", text: "x", href: "#" },
] as const;

function SocialIcons() {
  return (
    <div className="flex items-center gap-2">
      {socialLinks.map(({ platform, text, href }) => (
        <Link
          key={platform}
          href={href}
          title={platform}
          aria-label={platform}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-[#b18d4f]/30 text-xs font-bold uppercase text-[#C7C2B4] transition hover:border-[#C8AC80] hover:text-[#C8AC80]"
        >
          {text}
        </Link>
      ))}
    </div>
  );
}

export function Footer() {
  const tenant = getTenant();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[#b18d4f]/20 bg-[#09142a] text-[#C7C2B4]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14">
        <div className="flex flex-col gap-6 border-b border-[#b18d4f]/20 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xl font-bold text-[#C8AC80]">{tenant.logo.text}</p>
            <p className="mt-2 max-w-sm text-sm text-[#C7C2B4]">{tenant.tagline}</p>
          </div>
          <SocialIcons />
        </div>

        <div className="mt-10 grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-6">
          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="text-sm font-semibold tracking-wide text-[#F5F1E8]">
                {column.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={`${column.title}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="text-sm text-[#C7C2B4] transition hover:text-[#C8AC80]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-[#b18d4f]/20 pt-6">
          <p className="text-xs text-[#C7C2B4]/70">
            © {year} {tenant.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
