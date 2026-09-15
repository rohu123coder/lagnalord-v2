"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import {
  Bot,
  CalendarDays,
  ChevronDown,
  Clock3,
  Compass,
  GitCompare,
  HeartHandshake,
  Lock,
  MessageCircle,
  Orbit,
  ShieldCheck,
  Sparkles,
  Sun,
} from "lucide-react";

import { Footer } from "@/components/Footer";
import { HomepagePopup } from "@/components/HomepagePopup";
import { Navbar } from "@/components/Navbar";
import api from "@/lib/api";
import { formatDisplayDate } from "@/lib/formatDate";
import { getTenant } from "@/lib/tenants";
import { firstName } from "@/lib/utils";
import { HoroscopePreviewCard } from "@/components/HoroscopePreviewCard";
import { createHoroscope, rashis, type Period } from "@/lib/horoscope";
import { getSocketApiBase } from "@/lib/socketBase";
import { useAuthStore } from "@/lib/store";

type Astro = {
  id: string;
  name: string;
  avatar_url: string | null;
  profile_photo_url?: string | null;
  specializations: string[];
  languages: string[];
  rating: number | null;
  price_per_minute: number | null;
  is_available: boolean;
  is_online?: boolean;
  experience_years: number | null;
};

type GeocodeHit = {
  city: string;
  country: string;
  lat?: number;
  lng?: number;
  formattedAddress: string;
};

type AiAstrologerCard = {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  photo_url: string | null;
  rate_per_min: number;
};

function homepagePeriodToApi(period: string): Period {
  if (period === "Weekly") return "weekly";
  if (period === "Monthly" || period === "Yearly") return "monthly";
  return "today";
}

function homepageOverviewHeading(period: string) {
  switch (period) {
    case "Weekly":
      return "This Week's Overview";
    case "Monthly":
      return "This Month's Overview";
    case "Yearly":
      return "This Year's Overview";
    default:
      return "Today's Overview";
  }
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

const homepageFaqs = [
  {
    q: "What is a Kundli on LagnaLord?",
    a: "A Kundli is a map of the sky at your birth, drawn in the sidereal zodiac this app uses. You enter date, time, and place; Swiss Ephemeris supplies the longitudes. Houses, rashis, and dashas are read from that map — not from a one-size essay.",
  },
  {
    q: "Is my birth data private?",
    a: "Birth details are stored so you can reopen a chart and so an astrologer can see the same numbers you do. They are not published on a public wall. Treat any share link you generate as something you control.",
  },
  {
    q: "How are AI astrologers different from live ones?",
    a: "AI personas answer from the same chart JSON, quickly, in character. Live astrologers can ask follow-ups, sit with family context, and disagree with a first reading. Use AI for a sketch; use a human when the question is a decision.",
  },
  {
    q: "What if I do not know my birth time?",
    a: "You can still cast a chart with a noted approximation. Ascendant and house cusps will be less trustworthy than the moon and planets. Say so in chat — a good reading will shrink its claims instead of pretending the lagna is certain.",
  },
  {
    q: "How does the wallet work?",
    a: "You recharge, then pay the per-minute rate printed on a live astrologer’s card, or the per-message rate shown on an AI persona. Unused balance stays in the wallet. There is no hidden “session fee” on top of that displayed rate.",
  },
  {
    q: "Can I trust the horoscope on this site?",
    a: "Rashi notes are sky-weather, written to be read in a minute. They are not a substitute for your Kundli, and they cannot see your hour of birth. If a line feels wrong, prefer the chart over the daily blurb.",
  },
  {
    q: "What makes LagnaLord different?",
    a: "One desk for Kundli, matching, panchang, remedies, numerology, AI chat, and verified live sessions — with calculations from the same ephemeris instead of a collage of unrelated widgets. The rest is still your judgment.",
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

const tithiNames = [
  "Pratipada",
  "Dwitiya",
  "Tritiya",
  "Chaturthi",
  "Panchami",
  "Shashthi",
  "Saptami",
  "Ashtami",
  "Navami",
  "Dashami",
  "Ekadashi",
  "Dwadashi",
  "Trayodashi",
  "Chaturdashi",
  "Purnima",
  "Pratipada",
  "Dwitiya",
  "Tritiya",
  "Chaturthi",
  "Panchami",
  "Shashthi",
  "Saptami",
  "Ashtami",
  "Navami",
  "Dashami",
  "Ekadashi",
  "Dwadashi",
  "Trayodashi",
  "Chaturdashi",
  "Amavasya",
];

const nakshatraNames = [
  "Ashwini",
  "Bharani",
  "Krittika",
  "Rohini",
  "Mrigashira",
  "Ardra",
  "Punarvasu",
  "Pushya",
  "Ashlesha",
  "Magha",
  "Purva Phalguni",
  "Uttara Phalguni",
  "Hasta",
  "Chitra",
  "Swati",
  "Vishakha",
  "Anuradha",
  "Jyeshtha",
  "Mula",
  "Purva Ashadha",
  "Uttara Ashadha",
  "Shravana",
  "Dhanishta",
  "Shatabhisha",
  "Purva Bhadrapada",
  "Uttara Bhadrapada",
  "Revati",
];

const yogaNames = [
  "Vishkumbha",
  "Priti",
  "Ayushman",
  "Saubhagya",
  "Shobhana",
  "Atiganda",
  "Sukarma",
  "Dhriti",
  "Shoola",
  "Ganda",
  "Vriddhi",
  "Dhruva",
  "Vyaghata",
  "Harshana",
  "Vajra",
  "Siddhi",
  "Vyatipata",
  "Variyana",
  "Parigha",
  "Shiva",
  "Siddha",
  "Sadhya",
  "Shubha",
  "Shukla",
  "Brahma",
  "Indra",
  "Vaidhriti",
];

const karanNames = [
  "Bava",
  "Balava",
  "Kaulava",
  "Taitila",
  "Garija",
  "Vanija",
  "Vishti",
  "Shakuni",
  "Chatushpada",
  "Naga",
  "Kimstughna",
];

const rahukaalByDay = [
  "16:30 - 18:00",
  "07:30 - 09:00",
  "15:00 - 16:30",
  "12:00 - 13:30",
  "13:30 - 15:00",
  "10:30 - 12:00",
  "09:00 - 10:30",
];

function normalizeDegree(value: number): number {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function getPanchang(date: Date) {
  const j2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
  const utcDate = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  const days = (utcDate - j2000) / 86400000;

  const sunLongitude = normalizeDegree(280.46 + 0.9856474 * days);
  const moonLongitude = normalizeDegree(218.316 + 13.176396 * days);
  const moonSunAngle = normalizeDegree(moonLongitude - sunLongitude);
  const tithiIndex = Math.floor(moonSunAngle / 12) % 30;
  const nakshatraIndex = Math.floor(moonLongitude / (360 / 27)) % 27;
  const yogaIndex = Math.floor(normalizeDegree(sunLongitude + moonLongitude) / (360 / 27)) % 27;
  const karanIndex = Math.floor(moonSunAngle / 6) % karanNames.length;

  return {
    tithi: tithiNames[tithiIndex],
    nakshatra: nakshatraNames[nakshatraIndex],
    yoga: yogaNames[yogaIndex],
    karan: karanNames[karanIndex],
    rahukaal: rahukaalByDay[date.getDay()],
  };
}

export default function HomePage() {
  const tenant = getTenant();
  const router = useRouter();
  const { token, isLoggedIn } = useAuthStore();
  const [featured, setFeatured] = useState<Astro[]>([]);
  const [liveAstrologers, setLiveAstrologers] = useState<Astro[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveLoading, setLiveLoading] = useState(true);
  const [kundliForm, setKundliForm] = useState({
    name: "",
    gender: "male",
    date: "",
    time: "",
    place: "",
    lat: null as number | null,
    lng: null as number | null,
  });
  const [matchForm, setMatchForm] = useState({
    name: "",
    date: "",
    time: "",
    place: "",
    lat: null as number | null,
    lng: null as number | null,
  });
  const [kundliSuggestions, setKundliSuggestions] = useState<GeocodeHit[]>([]);
  const [kundliShowSuggest, setKundliShowSuggest] = useState(false);
  const [kundliGeoLoading, setKundliGeoLoading] = useState(false);
  const kundliDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const kundliPobRef = useRef<HTMLDivElement>(null);

  const [matchSuggestions, setMatchSuggestions] = useState<GeocodeHit[]>([]);
  const [matchShowSuggest, setMatchShowSuggest] = useState(false);
  const [matchGeoLoading, setMatchGeoLoading] = useState(false);
  const matchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const matchPobRef = useRef<HTMLDivElement>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const onKundliPlaceChange = useCallback((value: string) => {
    setKundliForm((f) => ({ ...f, place: value, lat: null, lng: null }));
    if (kundliDebounceRef.current) clearTimeout(kundliDebounceRef.current);
    if (value.trim().length < 2) {
      setKundliSuggestions([]);
      setKundliShowSuggest(false);
      return;
    }
    kundliDebounceRef.current = setTimeout(async () => {
      setKundliGeoLoading(true);
      try {
        const res = await fetch(`/api/kundli/geocode?q=${encodeURIComponent(value.trim())}`);
        const json = (await res.json()) as { results?: GeocodeHit[]; error?: string };
        if (!res.ok) {
          setKundliSuggestions([]);
          return;
        }
        const list = (json.results ?? [])
          .filter((r) => typeof r.lat === "number" && typeof r.lng === "number" && !Number.isNaN(r.lat) && !Number.isNaN(r.lng))
          .slice(0, 5);
        setKundliSuggestions(list);
        setKundliShowSuggest(list.length > 0);
      } catch {
        setKundliSuggestions([]);
      } finally {
        setKundliGeoLoading(false);
      }
    }, 400);
  }, []);

  const onMatchPlaceChange = useCallback((value: string) => {
    setMatchForm((f) => ({ ...f, place: value, lat: null, lng: null }));
    if (matchDebounceRef.current) clearTimeout(matchDebounceRef.current);
    if (value.trim().length < 2) {
      setMatchSuggestions([]);
      setMatchShowSuggest(false);
      return;
    }
    matchDebounceRef.current = setTimeout(async () => {
      setMatchGeoLoading(true);
      try {
        const res = await fetch(`/api/kundli/geocode?q=${encodeURIComponent(value.trim())}`);
        const json = (await res.json()) as { results?: GeocodeHit[]; error?: string };
        if (!res.ok) {
          setMatchSuggestions([]);
          return;
        }
        const list = (json.results ?? [])
          .filter((r) => typeof r.lat === "number" && typeof r.lng === "number" && !Number.isNaN(r.lat) && !Number.isNaN(r.lng))
          .slice(0, 5);
        setMatchSuggestions(list);
        setMatchShowSuggest(list.length > 0);
      } catch {
        setMatchSuggestions([]);
      } finally {
        setMatchGeoLoading(false);
      }
    }, 400);
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (kundliPobRef.current && !kundliPobRef.current.contains(e.target as Node)) {
        setKundliShowSuggest(false);
      }
      if (matchPobRef.current && !matchPobRef.current.contains(e.target as Node)) {
        setMatchShowSuggest(false);
      }
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const [activePeriod, setActivePeriod] = useState("Daily");
  const [selectedRashi, setSelectedRashi] = useState<string | null>(null);
  const homepageRashiPreview = selectedRashi
    ? createHoroscope(selectedRashi, homepagePeriodToApi(activePeriod))
    : null;
  const [expertiseMode, setExpertiseMode] = useState<"astro" | "vastu">("astro");

  const [aiAstrologers, setAiAstrologers] = useState<AiAstrologerCard[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/ai-astrologer/personas");
        const json = await res.json();
        if (!cancelled && json?.personas) {
          setAiAstrologers(json.personas);
        }
      } catch {
        if (!cancelled) setAiAstrologers([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/api/astrologers`, { params: { limit: 6 } });
        const list = res.data?.data?.astrologers as Astro[] | undefined;
        if (!cancelled && list) {
          setFeatured(list);
        }
      } catch {
        if (!cancelled) {
          setFeatured([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadLive = async () => {
      setLiveLoading(true);
      try {
        const res = await api.get(`/api/astrologers`, {
          params: { online: true, limit: 10, page: 1 },
        });
        const list = res.data?.data?.astrologers as Astro[] | undefined;
        if (!cancelled) {
          setLiveAstrologers(list ?? []);
        }
      } catch {
        if (!cancelled) {
          setLiveAstrologers([]);
        }
      } finally {
        if (!cancelled) {
          setLiveLoading(false);
        }
      }
    };
    void loadLive();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !token) {
      return;
    }
    const socket: Socket = io(getSocketApiBase(), {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socket.on(
      "astrologer_status_changed",
      async (payload: { astrologerId: string; is_online: boolean }) => {
        if (!payload.is_online) {
          setLiveAstrologers((prev) =>
            prev.filter((astro) => astro.id !== payload.astrologerId)
          );
          return;
        }
        try {
          const res = await api.get(`/api/astrologers`, {
            params: { online: true, limit: 10, page: 1 },
          });
          setLiveAstrologers((res.data?.data?.astrologers as Astro[] | undefined) ?? []);
        } catch {
          // no-op for live refresh errors
        }
      }
    );

    return () => {
      socket.disconnect();
    };
  }, [isLoggedIn, token]);

  const today = new Date();
  const todayLong = formatDisplayDate(today);
  const panchang = getPanchang(today);

  const handleKundliSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams({
      name: kundliForm.name,
      gender: kundliForm.gender,
      date: kundliForm.date,
      time: kundliForm.time,
      place: kundliForm.place,
      ...(kundliForm.lat != null ? { lat: String(kundliForm.lat) } : {}),
      ...(kundliForm.lng != null ? { lng: String(kundliForm.lng) } : {}),
    });
    router.push(`/kundli?${params.toString()}`);
  };

  const handleMatchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams({
      boyName: matchForm.name,
      date: matchForm.date,
      time: matchForm.time,
      place: matchForm.place,
      ...(matchForm.lat != null ? { lat: String(matchForm.lat) } : {}),
      ...(matchForm.lng != null ? { lng: String(matchForm.lng) } : {}),
    });
    router.push(`/kundli/match?${params.toString()}`);
  };

  return (
    <div className="min-h-screen text-[#F5F1E8]">
      <Navbar />
      <HomepagePopup />
      <section className="relative overflow-hidden border-b border-[#b18d4f]/20 bg-gradient-to-br from-[#122352] via-[#09142a] to-[#09142a]">
        <div className="pointer-events-none absolute -top-16 right-0 h-72 w-72 rounded-full bg-[#b18d4f]/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full bg-[#C8AC80]/15 blur-3xl" />
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-14 sm:px-6 sm:pb-12 sm:pt-16">
          <div className="mx-auto mb-8 flex w-fit gap-1 rounded-full border border-[#b18d4f]/30 bg-[#0E1C3B] p-1">
            <button
              type="button"
              onClick={() => setExpertiseMode("astro")}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                expertiseMode === "astro"
                  ? "bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] text-[#09142a]"
                  : "text-[#C7C2B4]"
              }`}
            >
              Astrology
            </button>
            <button
              type="button"
              onClick={() => setExpertiseMode("vastu")}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                expertiseMode === "vastu"
                  ? "bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] text-[#09142a]"
                  : "text-[#C7C2B4]"
              }`}
            >
              Vastu Shastra
            </button>
          </div>

          <div className="mx-auto grid max-w-3xl grid-cols-1 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#C8AC80]">
              Premium Astrology &amp; Vastu Platform
            </p>
            <h1 className="mt-3 text-3xl font-extrabold sm:text-5xl">
              {expertiseMode === "astro" ? (
                <>Decode your destiny.<br /><span className="bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] bg-clip-text text-transparent">Master your space.</span></>
              ) : (
                <>Master your space.<br /><span className="bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] bg-clip-text text-transparent">Decode your destiny.</span></>
              )}
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-[#C7C2B4]">
              Explore horoscope, get your free Kundli, match compatibility, and consult verified astrologers with modern tools in one place.
            </p>
          </div>
        </div>

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

        <div className="mx-auto max-w-7xl px-4 pb-14 pt-8 sm:px-6 sm:pb-16 sm:pt-10">
          <div className="rounded-3xl border border-[#b18d4f]/25 bg-[#0E1C3B]/90 p-5 shadow-sm sm:p-8">
            <div className="flex flex-col items-start justify-between gap-3 border-b border-[#b18d4f]/15 pb-4 sm:flex-row sm:items-center">
              <h2 className="text-xl font-bold text-[#C8AC80]">Select Your Rashi</h2>
              <p className="rounded-full bg-[#b18d4f]/15 px-4 py-1.5 text-sm font-semibold text-[#C8AC80]">
                {todayLong}
              </p>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-6">
              {rashis.map((rashi) => (
                <button
                  key={rashi.id}
                  type="button"
                  onClick={() =>
                    setSelectedRashi((current) =>
                      current === rashi.id ? null : rashi.id
                    )
                  }
                  className={`rounded-xl border bg-[#122352] p-3 text-center transition duration-200 hover:-translate-y-0.5 hover:border-[#b18d4f]/50 hover:shadow-md ${
                    selectedRashi === rashi.id
                      ? "border-[#b18d4f] ring-2 ring-[#b18d4f]/30"
                      : "border-[#b18d4f]/20"
                  }`}
                >
                  <p className="text-2xl">{rashi.symbol}</p>
                  <p className="mt-1 text-xs font-semibold text-[#F5F1E8] sm:text-sm">
                    {rashi.english}
                  </p>
                </button>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {["Daily", "Weekly", "Monthly", "Yearly"].map((period) => (
                <button
                  key={period}
                  type="button"
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    activePeriod === period
                      ? "bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] text-[#09142a]"
                      : "border border-[#b18d4f]/25 bg-[#0E1C3B] text-[#C8AC80] hover:bg-[#122352]"
                  }`}
                  onClick={() => setActivePeriod(period)}
                >
                  {period}
                </button>
              ))}
            </div>
            {selectedRashi && homepageRashiPreview ? (
              <HoroscopePreviewCard
                data={homepageRashiPreview}
                overviewHeading={homepageOverviewHeading(activePeriod)}
              />
            ) : null}
          </div>
        </div>
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

      <section className="border-b border-[#b18d4f]/20 bg-[#09142a] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#C8AC80]">First visit</p>
          <h2 className="mt-3 text-3xl font-extrabold text-[#F5F1E8] sm:text-5xl">
            New here? Start with this
          </h2>
          <p className="mt-3 max-w-2xl text-[#C7C2B4]">
            Short answers for the questions people usually ask before they type a birth time.
          </p>
          <div className="mt-10 space-y-3">
            {homepageFaqs.map((item, index) => {
              const open = openFaq === index;
              return (
                <article
                  key={item.q}
                  className="overflow-hidden rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B]"
                >
                  <button
                    type="button"
                    aria-expanded={open}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                    onClick={() => setOpenFaq(open ? null : index)}
                  >
                    <span className="font-semibold text-[#F5F1E8]">{item.q}</span>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-[#C8AC80] transition-transform ${
                        open ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {open ? (
                    <p className="border-t border-[#b18d4f]/20 px-5 py-4 text-sm leading-6 text-[#C7C2B4]">
                      {item.a}
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {!liveLoading && liveAstrologers.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-[#C8AC80]">Live Astrologers</h2>
            <Link href="/astrologers" className="text-sm font-semibold text-[#C7C2B4] hover:text-[#C8AC80] hover:underline">
              View all
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {liveAstrologers.map((astrologer) => (
              <article
                key={`live-${astrologer.id}`}
                className="min-w-[240px] rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {astrologer.profile_photo_url || astrologer.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={astrologer.profile_photo_url ?? astrologer.avatar_url ?? ""}
                        alt={firstName(astrologer.name)}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#b18d4f] to-[#A6745A] text-sm font-bold text-[#09142a]">
                        {firstName(astrologer.name).slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <span className="animate-online-pulse absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#0E1C3B] bg-emerald-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#F5F1E8]">
                      {firstName(astrologer.name)}
                    </p>
                    <p className="text-xs text-[#C7C2B4]">
                      ₹{astrologer.price_per_minute ?? 0}/min
                    </p>
                  </div>
                </div>
                <Link
                  href={`/astrologers/${astrologer.id}`}
                  className="mt-4 block rounded-xl bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] py-2 text-center text-sm font-semibold text-[#09142a] hover:opacity-95"
                >
                  Chat Now
                </Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-[#b18d4f]/25 bg-[#0E1C3B] p-5 shadow-sm transition hover:shadow-md">
            <h3 className="text-lg font-bold text-[#C8AC80]">Kundli / Birth Chart</h3>
            <form className="mt-4 space-y-3" onSubmit={handleKundliSubmit}>
              <input
                type="text"
                placeholder="Name"
                value={kundliForm.name}
                onChange={(e) => setKundliForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-lg border border-[#b18d4f]/40 bg-white px-3 py-2 text-sm text-[#09142a] outline-none placeholder:text-slate-400 focus:border-[#b18d4f] focus:ring-2 focus:ring-[#b18d4f]/30"
              />
              <select
                value={kundliForm.gender}
                onChange={(e) => setKundliForm((prev) => ({ ...prev, gender: e.target.value }))}
                className="w-full rounded-lg border border-[#b18d4f]/40 bg-white px-3 py-2 text-sm text-[#09142a] outline-none placeholder:text-slate-400 focus:border-[#b18d4f] focus:ring-2 focus:ring-[#b18d4f]/30"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              <input
                type="date"
                value={kundliForm.date}
                onChange={(e) => setKundliForm((prev) => ({ ...prev, date: e.target.value }))}
                className="w-full rounded-lg border border-[#b18d4f]/40 bg-white px-3 py-2 text-sm text-[#09142a] outline-none placeholder:text-slate-400 focus:border-[#b18d4f] focus:ring-2 focus:ring-[#b18d4f]/30 [color-scheme:light]"
              />
              <input
                type="time"
                value={kundliForm.time}
                onChange={(e) => setKundliForm((prev) => ({ ...prev, time: e.target.value }))}
                className="w-full rounded-lg border border-[#b18d4f]/40 bg-white px-3 py-2 text-sm text-[#09142a] outline-none placeholder:text-slate-400 focus:border-[#b18d4f] focus:ring-2 focus:ring-[#b18d4f]/30 [color-scheme:light]"
              />
              <div ref={kundliPobRef} className="relative">
                <input
                  type="text"
                  placeholder="Place"
                  autoComplete="off"
                  value={kundliForm.place}
                  onChange={(e) => onKundliPlaceChange(e.target.value)}
                  onFocus={() => kundliSuggestions.length > 0 && setKundliShowSuggest(true)}
                  className="w-full rounded-lg border border-[#b18d4f]/40 bg-white px-3 py-2 text-sm text-[#09142a] outline-none placeholder:text-slate-400 focus:border-[#b18d4f] focus:ring-2 focus:ring-[#b18d4f]/30"
                />
                {kundliGeoLoading ? (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b18d4f]">
                    <span className="text-xs">...</span>
                  </div>
                ) : null}
                {kundliShowSuggest && kundliSuggestions.length > 0 ? (
                  <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-[#b18d4f]/30 bg-white py-1 shadow-lg">
                    {kundliSuggestions.map((s, i) => {
                      const line = [s.city, s.country].filter(Boolean).join(", ");
                      return (
                        <li key={`${s.formattedAddress}-${i}`}>
                          <button
                            type="button"
                            className="w-full px-4 py-2.5 text-left text-sm text-[#09142a] hover:bg-[#b18d4f]/10"
                            onClick={() => {
                              setKundliForm((f) => ({ ...f, place: s.formattedAddress || line, lat: s.lat!, lng: s.lng! }));
                              setKundliShowSuggest(false);
                              setKundliSuggestions([]);
                            }}
                          >
                            {line || s.formattedAddress}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] px-4 py-2.5 text-sm font-semibold text-[#09142a] transition hover:opacity-95"
              >
                Get Kundli
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-[#b18d4f]/25 bg-[#0E1C3B] p-5 shadow-sm transition hover:shadow-md">
            <h3 className="text-lg font-bold text-[#C8AC80]">Kundli Matching</h3>
            <form className="mt-4 space-y-3" onSubmit={handleMatchSubmit}>
              <input
                type="text"
                placeholder="Boy's Name"
                value={matchForm.name}
                onChange={(e) => setMatchForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-lg border border-[#b18d4f]/40 bg-white px-3 py-2 text-sm text-[#09142a] outline-none placeholder:text-slate-400 focus:border-[#b18d4f] focus:ring-2 focus:ring-[#b18d4f]/30"
              />
              <input
                type="date"
                value={matchForm.date}
                onChange={(e) => setMatchForm((prev) => ({ ...prev, date: e.target.value }))}
                className="w-full rounded-lg border border-[#b18d4f]/40 bg-white px-3 py-2 text-sm text-[#09142a] outline-none placeholder:text-slate-400 focus:border-[#b18d4f] focus:ring-2 focus:ring-[#b18d4f]/30 [color-scheme:light]"
              />
              <input
                type="time"
                value={matchForm.time}
                onChange={(e) => setMatchForm((prev) => ({ ...prev, time: e.target.value }))}
                className="w-full rounded-lg border border-[#b18d4f]/40 bg-white px-3 py-2 text-sm text-[#09142a] outline-none placeholder:text-slate-400 focus:border-[#b18d4f] focus:ring-2 focus:ring-[#b18d4f]/30 [color-scheme:light]"
              />
              <div ref={matchPobRef} className="relative">
                <input
                  type="text"
                  placeholder="Place"
                  autoComplete="off"
                  value={matchForm.place}
                  onChange={(e) => onMatchPlaceChange(e.target.value)}
                  onFocus={() => matchSuggestions.length > 0 && setMatchShowSuggest(true)}
                  className="w-full rounded-lg border border-[#b18d4f]/40 bg-white px-3 py-2 text-sm text-[#09142a] outline-none placeholder:text-slate-400 focus:border-[#b18d4f] focus:ring-2 focus:ring-[#b18d4f]/30"
                />
                {matchGeoLoading ? (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b18d4f]">
                    <span className="text-xs">...</span>
                  </div>
                ) : null}
                {matchShowSuggest && matchSuggestions.length > 0 ? (
                  <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-[#b18d4f]/30 bg-white py-1 shadow-lg">
                    {matchSuggestions.map((s, i) => {
                      const line = [s.city, s.country].filter(Boolean).join(", ");
                      return (
                        <li key={`${s.formattedAddress}-${i}`}>
                          <button
                            type="button"
                            className="w-full px-4 py-2.5 text-left text-sm text-[#09142a] hover:bg-[#b18d4f]/10"
                            onClick={() => {
                              setMatchForm((f) => ({ ...f, place: s.formattedAddress || line, lat: s.lat!, lng: s.lng! }));
                              setMatchShowSuggest(false);
                              setMatchSuggestions([]);
                            }}
                          >
                            {line || s.formattedAddress}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] px-4 py-2.5 text-sm font-semibold text-[#09142a] transition hover:opacity-95"
              >
                Continue
              </button>
              <Link
                href="/kundli/match"
                className="block text-center text-sm font-medium text-[#C8AC80] hover:underline"
              >
                Open full matching report
              </Link>
            </form>
          </div>

          <div className="rounded-2xl border border-[#b18d4f]/25 bg-[#0E1C3B] p-5 shadow-sm transition hover:shadow-md">
            <h3 className="text-lg font-bold text-[#C8AC80]">Today&apos;s Panchang</h3>
            <p className="mt-1 text-sm text-[#C7C2B4]">{todayLong}</p>
            <div className="mt-4 space-y-2 text-sm">
              <p className="flex items-center justify-between rounded-lg bg-[#122352] px-3 py-2">
                <span className="font-medium text-[#C7C2B4]">Tithi</span>
                <span className="font-semibold text-[#C8AC80]">{panchang.tithi}</span>
              </p>
              <p className="flex items-center justify-between rounded-lg bg-[#122352] px-3 py-2">
                <span className="font-medium text-[#C7C2B4]">Nakshatra</span>
                <span className="font-semibold text-[#C8AC80]">{panchang.nakshatra}</span>
              </p>
              <p className="flex items-center justify-between rounded-lg bg-[#122352] px-3 py-2">
                <span className="font-medium text-[#C7C2B4]">Yoga</span>
                <span className="font-semibold text-[#C8AC80]">{panchang.yoga}</span>
              </p>
              <p className="flex items-center justify-between rounded-lg bg-[#122352] px-3 py-2">
                <span className="font-medium text-[#C7C2B4]">Karan</span>
                <span className="font-semibold text-[#C8AC80]">{panchang.karan}</span>
              </p>
              <p className="flex items-center justify-between rounded-lg bg-[#122352] px-3 py-2">
                <span className="font-medium text-[#C7C2B4]">Rahukaal (Delhi)</span>
                <span className="font-semibold text-[#C8AC80]">{panchang.rahukaal}</span>
              </p>
            </div>
            <Link
              href="/panchang"
              className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] px-4 py-2.5 text-sm font-semibold text-[#09142a] transition hover:opacity-95"
            >
              Today Panchang
            </Link>
          </div>
        </div>
      </section>

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

      {aiAstrologers.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-[#F5F1E8] sm:text-3xl">
                🔮 AI Astrologers
              </h2>
              <p className="mt-1 text-sm text-[#C7C2B4]">
                Instant answers powered by AI — chat now
              </p>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {aiAstrologers.map((a) => (
              <Link
                key={a.id}
                href={`/ai-astrologers/${a.id}`}
                className="flex flex-col items-center rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-4 text-center transition duration-200 hover:-translate-y-1 hover:border-[#b18d4f]/50 hover:shadow-md"
              >
                {a.photo_url ? (
                  <img
                    src={a.photo_url}
                    alt={a.name}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#09142a] text-3xl">
                    {a.emoji}
                  </span>
                )}
                <p className="mt-3 text-sm font-semibold text-[#F5F1E8]">{a.name}</p>
                <p className="mt-1 line-clamp-1 text-xs text-[#C7C2B4]">{a.tagline}</p>
                <p className="mt-2 text-xs font-medium text-[#C8AC80]">
                  ₹{a.rate_per_min}/message
                </p>
                <span className="mt-3 w-full rounded-lg bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] px-3 py-1.5 text-xs font-semibold text-[#09142a] hover:opacity-95">
                  Chat karein
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">Consult Astrologer on Call &amp; Chat</h2>
            <p className="mt-1 text-sm text-[#C7C2B4]">
              Verified experts available now for instant call and chat sessions.
            </p>
          </div>
          <Link href="/astrologers" className="text-sm font-semibold text-[#C7C2B4] hover:text-[#C8AC80] hover:underline">
            View all astrologers
          </Link>
        </div>
        {loading ? (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-52 animate-pulse rounded-2xl bg-[#0E1C3B]/60" />
            ))}
          </div>
        ) : (
          <div className="mt-6 flex snap-x gap-4 overflow-x-auto pb-2">
            {featured.map((astrologer) => (
              <article
                key={astrologer.id}
                className="min-w-[270px] snap-start rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-4 shadow-sm transition hover:shadow-md md:min-w-[320px]"
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    {astrologer.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={astrologer.avatar_url}
                        alt={firstName(astrologer.name)}
                        className="h-14 w-14 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#b18d4f] to-[#A6745A] text-lg font-bold text-[#09142a]">
                        {firstName(astrologer.name).slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <span className="absolute bottom-1 right-0 h-3.5 w-3.5 rounded-full border-2 border-[#0E1C3B] bg-emerald-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-base font-bold text-[#F5F1E8]">{firstName(astrologer.name)}</h3>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        Verified
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#C7C2B4]">
                      {astrologer.experience_years ?? 0}+ years experience
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(astrologer.specializations ?? []).slice(0, 3).map((specialization) => (
                    <span
                      key={`${astrologer.id}-${specialization}`}
                      className="rounded-full bg-[#0E1C3B]/40 px-2 py-1 text-xs font-medium text-[#C8AC80]"
                    >
                      {specialization}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <p className="font-semibold text-[#C8AC80]">
                    ₹{astrologer.price_per_minute ?? 0}/min
                  </p>
                  <p className="text-amber-500">
                    {"★".repeat(Math.max(1, Math.round(astrologer.rating ?? 4)))}
                    <span className="text-[#C7C2B4]/30">
                      {"★".repeat(5 - Math.max(1, Math.round(astrologer.rating ?? 4)))}
                    </span>
                  </p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link
                    href={`/astrologers/${astrologer.id}`}
                    className="rounded-lg bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] px-3 py-2 text-center text-sm font-semibold text-[#09142a] transition hover:opacity-95"
                  >
                    Call
                  </Link>
                  <Link
                    href={`/astrologers/${astrologer.id}`}
                    className="rounded-lg bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] px-3 py-2 text-center text-sm font-semibold text-[#09142a] transition hover:opacity-95"
                  >
                    Chat
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

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
// deploy test Tue Sep 15 19:59:49 IST 2026
