import { Suspense } from "react";
import Link from "next/link";
import {
  Bot,
  CalendarDays,
  Clock3,
  Compass,
  GitCompare,
  HeartHandshake,
  MessageCircle,
  Orbit,
  ShieldCheck,
  Sparkles,
  Sun,
} from "lucide-react";

import { AiPersonasHomepage } from "@/components/AiPersonasHomepage";
import { FaqAccordion } from "@/components/FaqAccordion";
import {
  FeaturedAstrologers,
  FeaturedAstrologersSkeleton,
  type HomepageAstro,
} from "@/components/FeaturedAstrologers";
import { Footer } from "@/components/Footer";
import { HeroExpertiseToggle } from "@/components/HeroExpertiseToggle";
import { HomepageNetworkSection } from "@/components/HomepageNetworkSection";
import { HomepagePopup } from "@/components/HomepagePopup";
import { LiveAstrologersIsland } from "@/components/LiveAstrologersIsland";
import { Navbar } from "@/components/Navbar";
import { RashiPreviewIsland } from "@/components/RashiPreviewIsland";
import { formatDisplayDate } from "@/lib/formatDate";
import { rashis } from "@/lib/horoscope";
import { getTenant } from "@/lib/tenants";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:4000";

async function LiveAstrologersSection() {
  let initial: HomepageAstro[] = [];
  try {
    const url = new URL(`${API_BASE}/api/astrologers`);
    url.searchParams.set("online", "true");
    url.searchParams.set("limit", "10");
    url.searchParams.set("page", "1");
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (res.ok) {
      const json = (await res.json()) as { data?: { astrologers: HomepageAstro[] } };
      initial = json.data?.astrologers ?? [];
    }
  } catch {
    initial = [];
  }
  return <LiveAstrologersIsland initial={initial} />;
}

const topServices = [
  { icon: "🪐", name: "Kundli (Birth Chart)", href: "/kundli" },
  { icon: "💞", name: "Horoscope Matching", href: "/kundli/match" },
  { icon: "🔆", name: "Daily Rashifal", href: "/horoscope?period=today" },
  { icon: "📜", name: "Free Reports", href: "/reports" },
  { icon: "🔥", name: "Mangal Dosha", href: "/reports/mangal-dosha" },
  { icon: "🧿", name: "Sade Sati Report", href: "/reports/sade-sati" },
  { icon: "🔢", name: "Numerology", href: "/numerology" },
  { icon: "🃏", name: "Tarot Reading", href: "/tarot" },
  { icon: "🏠", name: "Vastu Tips", href: "/vastu" },
  { icon: "📈", name: "Career Report", href: "/reports/career" },
  { icon: "❤️", name: "Love Horoscope", href: "/horoscope?topic=love" },
  { icon: "👶", name: "Baby Names", href: "/baby-names" },
  { icon: "📕", name: "Lal Kitab", href: "/lal-kitab" },
  { icon: "💎", name: "Gemstones", href: "/gemstones" },
  { icon: "📚", name: "Learn Astrology", href: "/learn-astrology" },
  { icon: "📱", name: "Talk to Astrologer", href: "/astrologers" },
];

const homepageServices = [
  {
    title: "Kundli / Birth Chart",
    href: "/kundli",
    Icon: Orbit,
    copy: "Cast a sidereal chart from your birth details. Houses, rashis, and planetary longitudes come from Swiss Ephemeris — not a stock template.",
  },
  {
    title: "Kundli Matching",
    href: "/kundli/match",
    Icon: GitCompare,
    copy: "Place two charts side by side. See how lagna, moon, and the 7th-house story sit together before you treat a match as settled.",
  },
  {
    title: "Horoscope",
    href: "/horoscope",
    Icon: Sun,
    copy: "Daily, weekly, and yearly notes by rashi. Use them as a weather report for the sky, not as a script you have to follow.",
  },
  {
    title: "AI Astrologers",
    href: "/astrologers",
    Icon: Bot,
    copy: "Ask a persona that reads the same chart JSON the rest of the app uses. Fast when you want a grounded first pass, not a fortune.",
  },
  {
    title: "Live Astrologer Consultation",
    href: "/astrologers",
    Icon: MessageCircle,
    copy: "Chat or call a verified astrologer. The rate on their card is what you pay per minute — no surprise add-ons in the lobby.",
  },
  {
    title: "Numerology Calculators",
    href: "/numerology",
    Icon: Compass,
    copy: "Mulank, Destiny, name checks, and the lighter name games. All of it runs in the browser from the numbers you type.",
  },
  {
    title: "Panchang",
    href: "/panchang",
    Icon: CalendarDays,
    copy: "Tithi, nakshatra, yoga, karan, and Rahu Kaal for a date and place. Useful before you pick a muhurat or simply a quieter hour.",
  },
  {
    title: "Remedies",
    href: "/remedies",
    Icon: Sparkles,
    copy: "Traditional upay written as practice, not as a product pitch. Read them next to a chart, not instead of one.",
  },
] as const;

/** Verified against real app page routes. Vastu omitted — no /vastu page. */
const HOMEPAGE_MARQUEE_SERVICES = [
  { label: "Free Kundli", href: "/kundli" },
  { label: "Kundli Matching", href: "/kundli/match" },
  { label: "Daily & Weekly Horoscope", href: "/horoscope" },
  { label: "Panchang", href: "/panchang" },
  { label: "Mangal Dosha Report", href: "/reports/mangal-dosha" },
  { label: "Sade Sati Report", href: "/reports/sade-sati" },
  { label: "Kaal Sarp Dosha Report", href: "/reports/kaal-sarp-dosha" },
  { label: "Lal Kitab Report", href: "/reports/lal-kitab" },
  { label: "Numerology Calculators", href: "/numerology" },
  { label: "Live Astrologer Consultation", href: "/astrologers" },
  { label: "AI Astrologer Chat", href: "/astrologers" },
  { label: "Remedies", href: "/remedies" },
] as const;

function HomepageServicesMarqueeCopy({
  hidden,
  className = "",
}: {
  hidden?: boolean;
  className?: string;
}) {
  return (
    <ul
      className={`flex shrink-0 items-center motion-reduce:flex-wrap motion-reduce:justify-center ${className}`}
      aria-hidden={hidden ? true : undefined}
    >
      {HOMEPAGE_MARQUEE_SERVICES.map((service) => (
        <li key={`${hidden ? "dup-" : ""}${service.label}`} className="flex items-center">
          <Sparkles
            className="mx-3 h-3.5 w-3.5 shrink-0 text-[#09142a]/70 sm:mx-4"
            aria-hidden="true"
          />
          <Link
            href={service.href}
            className="whitespace-nowrap text-sm font-semibold tracking-wide text-[#09142a] transition hover:opacity-80"
          >
            {service.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

const whyPoints = [
  {
    n: "01",
    title: "Verified astrologers",
    body: "The people you call are accounts the admin desk has marked verified. You see who is online before you start a session.",
  },
  {
    n: "02",
    title: "Swiss Ephemeris Kundli",
    body: "Birth charts are computed from planetary longitudes, not copied from a sample PDF. Same engine behind reports and the AI chat.",
  },
  {
    n: "03",
    title: "AI and human, both on tap",
    body: "Start with an AI persona when you want speed. Move to a live astrologer when the question needs a conversation, not a paragraph.",
  },
  {
    n: "04",
    title: "Pricing on the card",
    body: "Per-minute rates sit on each astrologer’s card. We do not invent a “from ₹X” banner here — you pay the number you already saw.",
  },
  {
    n: "05",
    title: "Birth details stay yours",
    body: "Date, time, and place are used to cast the chart you asked for. We do not sell that packet as a marketing list.",
  },
  {
    n: "06",
    title: "One shelf, many tools",
    body: "Kundli, matching, horoscope, panchang, remedies, and numerology share the same login and the same navy-and-gold desk.",
  },
] as const;

const kundliReasons = [
  {
    Icon: Compass,
    title: "A map of first instincts",
    body: "Lagna and moon describe how you tend to begin and how you recover. That is useful even if you never open a dasha table.",
  },
  {
    Icon: Clock3,
    title: "Timing, not a deadline",
    body: "Dasha and transits sketch seasons — when effort is cheaper, when waiting is wiser. They do not print a guaranteed date on a calendar.",
  },
  {
    Icon: HeartHandshake,
    title: "How two charts sit together",
    body: "Matching is a second pair of eyes on temperament and 7th-house patterns. It is a conversation starter, not a veto from the sky.",
  },
  {
    Icon: ShieldCheck,
    title: "A language for hard years",
    body: "Saturn, Rahu, and Sade Sati give names to stretches that already feel heavy. Naming them does not remove the work; it can stop the panic of thinking you invented the weather.",
  },
] as const;

const illustrativeTestimonials = [
  {
    name: "Meera K.",
    city: "Pune",
    initial: "M",
    quote:
      "I ran my Kundli here before a job move. The dasha note matched the restlessness I already felt — the live chat helped me plan the month, not invent a promotion date.",
  },
  {
    name: "Arjun S.",
    city: "Bengaluru",
    initial: "A",
    quote:
      "We used Kundli Matching as a family conversation, not a stamp. Seeing both moons written plainly was more useful than a single “gunas” number on a printout.",
  },
  {
    name: "Nisha R.",
    city: "Jaipur",
    initial: "N",
    quote:
      "The AI astrologer answered a 11 p.m. question with the planets from my chart, not a generic pep talk. I still booked a human the next morning for the family piece.",
  },
  {
    name: "Vikram D.",
    city: "Ahmedabad",
    initial: "V",
    quote:
      "Panchang plus Rahu Kaal on the same screen saved a needless argument about when to leave for the registrar. Small tool, quiet morning.",
  },
  {
    name: "Sana P.",
    city: "Hyderabad",
    initial: "S",
    quote:
      "Wallet deducted per minute exactly as the card showed. I stopped the chat when I had enough — no package leftover to feel guilty about.",
  },
] as const;

const paidServices = [
  {
    title: "Detailed Kundli Report",
    description: "Complete Janam Kundli with dosha and planetary analysis.",
    price: 199,
    gradient: "from-[#09142a] via-[#C8AC80] to-[#b18d4f]",
  },
  {
    title: "Marriage Compatibility",
    description: "Guna Milan, Manglik check and practical relationship insights.",
    price: 299,
    gradient: "from-[#C8AC80] via-[#09142a] to-[#b18d4f]",
  },
  {
    title: "Career Report",
    description: "Career timing, opportunities and profession suitability.",
    price: 249,
    gradient: "from-[#b18d4f] via-[#09142a] to-[#C8AC80]",
  },
  {
    title: "Ask a Question",
    description: "Get an expert personalized answer for one important query.",
    price: 99,
    gradient: "from-[#09142a] via-[#b18d4f] to-[#C8AC80]",
  },
  {
    title: "Finance Report",
    description: "Income, savings, investments and wealth planning guidance.",
    price: 249,
    gradient: "from-[#C8AC80] via-[#b18d4f] to-[#09142a]",
  },
  {
    title: "Health Report",
    description: "Planetary health tendencies and preventive remedy guidance.",
    price: 199,
    gradient: "from-[#b18d4f] via-[#C8AC80] to-[#09142a]",
  },
];

const remedies = [
  "Gemstones",
  "Yantras",
  "Rudraksha",
  "Feng Shui",
  "Malas",
  "Puja Items",
];

const articles = [
  {
    title: "How Saturn Transit 2026 Will Impact Each Rashi",
    date: "12 Apr 2026",
    href: "/blog/saturn-transit-2026-rashifal",
  },
  {
    title: "Kundli Matching: Beyond Guna Milan",
    date: "08 Apr 2026",
    href: "/blog/kundli-matching-guide",
  },
  {
    title: "Simple Daily Remedies for Career Growth",
    date: "02 Apr 2026",
    href: "/blog/daily-remedies-career-growth",
  },
];

export default async function HomePage() {
  const tenant = getTenant();
  const todayLong = formatDisplayDate(new Date());

  return (
    <div className="min-h-screen text-[#F5F1E8]">
      <Navbar />
      <HomepagePopup />
      <section className="relative overflow-hidden border-b border-[#b18d4f]/20 bg-gradient-to-br from-[#122352] via-[#09142a] to-[#09142a]">
        <div className="pointer-events-none absolute -top-16 right-0 h-72 w-72 rounded-full bg-[#b18d4f]/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full bg-[#C8AC80]/15 blur-3xl" />
        <HeroExpertiseToggle />

        <div
          className="relative z-10 overflow-hidden bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] py-3 sm:py-4"
          role="region"
          aria-label="Platform services"
        >
          <div className="flex w-max animate-services-marquee hover:[animation-play-state:paused] motion-reduce:w-full motion-reduce:max-w-7xl motion-reduce:animate-none motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:px-4">
            <HomepageServicesMarqueeCopy />
            <HomepageServicesMarqueeCopy hidden className="motion-reduce:hidden" />
          </div>
        </div>

        <RashiPreviewIsland />
      </section>

      <section className="border-b border-[#b18d4f]/20 bg-[#09142a] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#C8AC80]">What you can do here</p>
          <h2 className="mt-3 text-3xl font-extrabold text-[#F5F1E8] sm:text-5xl">Our Services</h2>
          <p className="mt-3 max-w-2xl text-[#C7C2B4]">
            Tools that already live on this site — each card opens the real page, not a teaser.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {homepageServices.map((service) => (
              <Link
                key={service.title}
                href={service.href}
                className="rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-5 transition hover:-translate-y-0.5 hover:border-[#b18d4f]/50"
              >
                <service.Icon className="h-7 w-7 text-[#C8AC80]" />
                <h3 className="mt-4 text-lg font-bold text-[#F5F1E8]">{service.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#C7C2B4]">{service.copy}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-[#b18d4f]/20 bg-[#0E1C3B] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#C8AC80]">Why this desk</p>
          <h2 className="mt-3 text-3xl font-extrabold text-[#F5F1E8] sm:text-5xl">Why LagnaLord</h2>
          <p className="mt-3 max-w-2xl text-[#C7C2B4]">
            Not another icon row. Six numbered notes about how the product is actually built.
          </p>
          <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-[#b18d4f]/20 bg-[#b18d4f]/20 sm:grid-cols-2 lg:grid-cols-3">
            {whyPoints.map((point) => (
              <article key={point.n} className="bg-[#09142a] p-6 sm:p-8">
                <p className="text-5xl font-extrabold leading-none text-[#C8AC80]/40">{point.n}</p>
                <h3 className="mt-4 text-xl font-bold text-[#F5F1E8]">{point.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#C7C2B4]">{point.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-[#E7DCC4] bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#C8AC80]">The chart, not the feed</p>
          <h2 className="mt-3 text-3xl font-extrabold text-[#09142A] sm:text-5xl">
            Why a Kundli still earns a seat at the table
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[#5B5A55]">
            A birth chart does not replace a doctor, a lawyer, or a bank statement. It is a second language for
            temperament and timing — the same sky the rest of this site computes from Swiss Ephemeris. People open
            one when a decision already exists and they want vocabulary for it: a move, a match, a year that feels
            heavier than the last. The four notes below are why that still happens, even in a feed full of daily
            rashifal.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {kundliReasons.map((reason) => (
              <article
                key={reason.title}
                className="rounded-2xl border border-[#E7DCC4] bg-[#fcfafa] p-4"
              >
                <reason.Icon className="h-6 w-6 text-[#C8AC80]" />
                <h3 className="mt-3 font-bold text-[#09142A]">{reason.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#5B5A55]">{reason.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-[#b18d4f]/20 bg-[#0E1C3B]/50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#C8AC80]">Voices</p>
          <h2 className="mt-3 text-3xl font-extrabold text-[#F5F1E8] sm:text-5xl">Testimonials</h2>
          <p className="mt-3 max-w-2xl text-sm text-[#C7C2B4]">
            Illustrative examples — not verified reviews. Written to show the kind of visit this site is built for.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {illustrativeTestimonials.map((item) => (
              <article
                key={item.name}
                className="rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-5"
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#C8AC80]">
                  Illustrative example · not a verified review
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#b18d4f] to-[#A6745A] text-sm font-bold text-[#09142a]">
                    {item.initial}
                  </div>
                  <div>
                    <p className="font-semibold text-[#F5F1E8]">{item.name}</p>
                    <p className="text-xs text-[#C7C2B4]">{item.city}</p>
                  </div>
                </div>
                <p className="mt-2 text-sm text-[#C8AC80]" aria-label="5 stars">
                  ★★★★★
                </p>
                <p className="mt-3 text-sm leading-6 text-[#C7C2B4]">{item.quote}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <FaqAccordion />

      <Suspense fallback={null}>
        <LiveAstrologersSection />
      </Suspense>

      <HomepageNetworkSection />

      <section className="border-y border-[#b18d4f]/15 bg-[#0E1C3B]/40 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold text-[#F5F1E8] sm:text-3xl">
            Free Horoscope and Astrology Services
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            {topServices.map((service) => (
              <Link
                key={service.name}
                href={service.href}
                className="rounded-2xl border border-[#b18d4f]/20 bg-[#122352] p-4 text-center transition duration-200 hover:-translate-y-1 hover:border-[#b18d4f]/50 hover:shadow-md"
              >
                <p className="text-3xl">{service.icon}</p>
                <p className="mt-2 text-sm font-semibold text-[#F5F1E8]">{service.name}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Suspense
        fallback={
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
            <p className="text-center text-sm text-[#C7C2B4]">Loading…</p>
          </div>
        }
      >
        <AiPersonasHomepage />
      </Suspense>

      <Suspense fallback={<FeaturedAstrologersSkeleton />}>
        <FeaturedAstrologers />
      </Suspense>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">Aaj Ka Rashifal</h2>
            <p className="mt-1 text-sm text-[#C7C2B4]">{todayLong}</p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {rashis.map((rashi) => (
            <Link
              key={`today-${rashi.id}`}
              href={`/horoscope/${rashi.id}`}
              className="rounded-xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-3 text-center transition duration-200 hover:-translate-y-0.5 hover:border-[#C8AC80] hover:shadow-md"
            >
              <p className="text-3xl">{rashi.symbol}</p>
              <p className="mt-1 text-sm font-semibold">{rashi.english}</p>
            </Link>
          ))}
        </div>
        <div className="mt-7 text-center">
          <Link
            href="/horoscope"
            className="inline-flex rounded-full bg-[#09142a] px-6 py-3 text-sm font-semibold text-[#b18d4f] transition hover:bg-[#b18d4f] hover:text-[#09142a]"
          >
            View All Horoscopes
          </Link>
        </div>
      </section>

      <section className="border-y border-[#b18d4f]/20 bg-[#09142a] py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-2xl font-bold sm:text-3xl">
            Astrological services for accurate answers
          </h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paidServices.map((service) => (
              <article
                key={service.title}
                className="rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div
                  className={`h-24 rounded-xl bg-gradient-to-br ${service.gradient}`}
                  aria-hidden="true"
                />
                <h3 className="mt-4 text-lg font-bold text-[#F5F1E8]">{service.title}</h3>
                <p className="mt-1 text-sm text-[#C7C2B4]">{service.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-lg font-bold text-[#C8AC80]">₹{service.price}</p>
                  <Link
                    href="/reports"
                    className="rounded-lg bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] px-4 py-2 text-sm font-semibold text-[#09142a] transition hover:opacity-95"
                  >
                    Buy Now
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <h2 className="text-2xl font-bold sm:text-3xl">Astrological Remedies</h2>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {remedies.map((item, index) => (
            <article
              key={item}
              className="rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div
                className={`h-24 rounded-xl bg-gradient-to-br ${
                  index % 2 === 0
                    ? "from-[#09142a] via-[#C8AC80] to-[#b18d4f]"
                    : "from-[#C8AC80] via-[#09142a] to-[#b18d4f]"
                }`}
                aria-hidden="true"
              />
              <h3 className="mt-4 text-lg font-bold text-[#F5F1E8]">{item}</h3>
              <Link
                href="/shop"
                className="mt-3 inline-flex rounded-lg border border-[#b18d4f]/40 px-4 py-2 text-sm font-semibold text-[#C8AC80] transition hover:bg-[#b18d4f]/10"
              >
                Check Now
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-[#b18d4f]/20 bg-[#09142a] py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-2xl font-bold sm:text-3xl">{tenant.name} Magazine</h2>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {articles.map((article) => (
              <article
                key={article.title}
                className="rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-5 shadow-sm transition hover:shadow-md"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-[#C8AC80]">
                  {article.date}
                </p>
                <h3 className="mt-2 text-lg font-bold text-[#F5F1E8]">{article.title}</h3>
                <Link href={article.href} className="mt-4 inline-block text-sm font-semibold text-[#C7C2B4] hover:text-[#C8AC80] hover:underline">
                  Read More
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
