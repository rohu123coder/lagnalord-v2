import type { KundliCalculateResponse } from "./types";

export const PROFESSION_MAP: Record<string, string[]> = {
  Mesh: [
    "Entrepreneur",
    "Military/Defense",
    "Sports",
    "Engineering",
    "Police Services",
    "Startup Leadership",
    "Surgery",
  ],
  Vrishabh: [
    "Banking",
    "Finance",
    "Luxury Retail",
    "Hospitality",
    "Music Industry",
    "Food Business",
    "Interior Design",
  ],
  Mithun: [
    "Marketing",
    "Media",
    "Content Strategy",
    "Teaching",
    "Sales",
    "Consulting",
    "Product Communication",
  ],
  Kark: [
    "Counseling",
    "Healthcare",
    "Education",
    "Real Estate",
    "Hospitality",
    "Public Service",
    "Care Management",
  ],
  Singh: [
    "Government Roles",
    "Administration",
    "Politics",
    "Entertainment",
    "Brand Leadership",
    "Public Relations",
    "Corporate Management",
  ],
  Kanya: [
    "Data Analytics",
    "Healthcare Operations",
    "Accounting",
    "Audit",
    "Quality Assurance",
    "Research",
    "Compliance",
  ],
  Tula: [
    "Law",
    "Diplomacy",
    "Human Resources",
    "Design",
    "Brand Strategy",
    "Mediation",
    "Client Partnerships",
  ],
  Vrishchik: [
    "Investigation",
    "Cyber Security",
    "Psychology",
    "Surgery",
    "Risk Management",
    "Intelligence Services",
    "Forensics",
  ],
  Dhanu: [
    "Teaching",
    "Law",
    "Publishing",
    "International Business",
    "Travel Industry",
    "Consulting",
    "Spiritual Coaching",
  ],
  Makar: [
    "Operations Leadership",
    "Engineering",
    "Infrastructure",
    "Administration",
    "Governance",
    "Project Management",
    "Enterprise Strategy",
  ],
  Kumbh: [
    "Technology",
    "AI/Data Science",
    "Social Impact",
    "Policy Innovation",
    "Network Architecture",
    "Product R&D",
    "Digital Platforms",
  ],
  Meen: [
    "Healing Arts",
    "Creative Writing",
    "Cinema/Media",
    "Spiritual Services",
    "NGO/Charity",
    "Psychology",
    "Design",
  ],
};

export const LUCKY_MAP: Record<
  string,
  { colors: string[]; days: string[]; gemstone: string; instruction: string; rudraksha: string }
> = {
  Mesh: {
    colors: ["Red", "Saffron", "Coral"],
    days: ["Tuesday", "Sunday"],
    gemstone: "Red Coral",
    instruction: "Wear in copper or gold on right-hand ring finger on Tuesday morning after Hanuman puja.",
    rudraksha: "3 Mukhi Rudraksha",
  },
  Vrishabh: {
    colors: ["White", "Pastel Pink", "Sky Blue"],
    days: ["Friday", "Monday"],
    gemstone: "Diamond/White Sapphire",
    instruction: "Wear in silver or platinum on Friday in right-hand middle or ring finger after Lakshmi mantra.",
    rudraksha: "6 Mukhi Rudraksha",
  },
  Mithun: {
    colors: ["Green", "Turquoise", "Light Grey"],
    days: ["Wednesday", "Friday"],
    gemstone: "Emerald",
    instruction: "Wear in gold or silver on Wednesday in little finger after Budh beej mantra.",
    rudraksha: "4 Mukhi Rudraksha",
  },
  Kark: {
    colors: ["Pearl White", "Silver", "Light Blue"],
    days: ["Monday", "Thursday"],
    gemstone: "Pearl",
    instruction: "Wear in silver on little finger on Monday evening after Chandra mantra and milk donation.",
    rudraksha: "2 Mukhi Rudraksha",
  },
  Singh: {
    colors: ["Golden", "Orange", "Ruby Red"],
    days: ["Sunday", "Tuesday"],
    gemstone: "Ruby",
    instruction: "Wear in gold on ring finger on Sunday at sunrise after Surya arghya.",
    rudraksha: "1 Mukhi (or 12 Mukhi) Rudraksha",
  },
  Kanya: {
    colors: ["Green", "Earthy Brown", "Mint"],
    days: ["Wednesday", "Friday"],
    gemstone: "Emerald",
    instruction: "Wear in gold on little finger on Wednesday after reciting Budh mantra 108 times.",
    rudraksha: "4 Mukhi Rudraksha",
  },
  Tula: {
    colors: ["White", "Pastel Blue", "Rose"],
    days: ["Friday", "Wednesday"],
    gemstone: "Diamond/Opal",
    instruction: "Wear in silver/platinum on Friday after Shukra mantra and white flower offering.",
    rudraksha: "6 Mukhi Rudraksha",
  },
  Vrishchik: {
    colors: ["Maroon", "Deep Red", "Rust"],
    days: ["Tuesday", "Thursday"],
    gemstone: "Red Coral",
    instruction: "Wear in copper or gold on Tuesday after Hanuman Chalisa and Mangal mantra.",
    rudraksha: "3 Mukhi Rudraksha",
  },
  Dhanu: {
    colors: ["Yellow", "Saffron", "Cream"],
    days: ["Thursday", "Sunday"],
    gemstone: "Yellow Sapphire",
    instruction: "Wear in gold on index finger on Thursday after Guru mantra and turmeric donation.",
    rudraksha: "5 Mukhi Rudraksha",
  },
  Makar: {
    colors: ["Navy Blue", "Charcoal", "Black"],
    days: ["Saturday", "Wednesday"],
    gemstone: "Blue Sapphire (only after trial)",
    instruction: "Wear in steel/silver on middle finger on Saturday after Shani puja and mustard oil daan.",
    rudraksha: "7 Mukhi Rudraksha",
  },
  Kumbh: {
    colors: ["Electric Blue", "Indigo", "Black"],
    days: ["Saturday", "Friday"],
    gemstone: "Blue Sapphire/Amethyst",
    instruction: "Wear after 72-hour trial, on Saturday in middle finger after Shani beej mantra.",
    rudraksha: "7 Mukhi Rudraksha",
  },
  Meen: {
    colors: ["Yellow", "Sea Green", "Lavender"],
    days: ["Thursday", "Monday"],
    gemstone: "Yellow Sapphire",
    instruction: "Wear in gold on index finger on Thursday morning after Guru puja and banana daan.",
    rudraksha: "5 Mukhi Rudraksha",
  },
};

export const PLANET_REMEDIES: Record<
  string,
  {
    mantra: string;
    donation: string;
    fasting: string;
    temple: string;
    colors: string;
  }
> = {
  Sun: {
    mantra: "ॐ घृणि सूर्याय नमः",
    donation: "Donate wheat, jaggery, and copper on Sunday.",
    fasting: "Light Sunday fast till sunset.",
    temple: "Offer water to Surya daily and visit Surya/Hanuman temple.",
    colors: "Wear saffron, orange; avoid dull black on key days.",
  },
  Moon: {
    mantra: "ॐ सोमाय नमः",
    donation: "Donate rice, milk, white sweets on Monday.",
    fasting: "Somvar fast with satvik meals.",
    temple: "Visit Shiva temple on Mondays and offer raw milk.",
    colors: "Wear white and silver tones; avoid dark red on Mondays.",
  },
  Mars: {
    mantra: "ॐ क्रां क्रीं क्रौं सः भौमाय नमः",
    donation: "Donate masoor dal and red cloth on Tuesday.",
    fasting: "Mangalvar fast; avoid anger and non-veg.",
    temple: "Visit Hanuman temple on Tuesday and recite Hanuman Chalisa.",
    colors: "Wear red/coral; avoid black on Tuesdays.",
  },
  Mercury: {
    mantra: "ॐ ब्रां ब्रीं ब्रौं सः बुधाय नमः",
    donation: "Donate green moong, books, and stationery on Wednesday.",
    fasting: "Budhvar light fast with fruits.",
    temple: "Worship Vishnu/Ganesh and chant Vishnu Sahasranama.",
    colors: "Wear green; avoid overly dark shades on Wednesday.",
  },
  Jupiter: {
    mantra: "ॐ ग्रां ग्रीं ग्रौं सः गुरुवे नमः",
    donation: "Donate chana dal, turmeric, yellow cloth on Thursday.",
    fasting: "Guruvar fast with one satvik meal.",
    temple: "Visit Vishnu or Brihaspati temple on Thursdays.",
    colors: "Wear yellow/saffron; avoid black on Thursdays.",
  },
  Venus: {
    mantra: "ॐ द्रां द्रीं द्रौं सः शुक्राय नमः",
    donation: "Donate white rice, curd, perfume, white clothes on Friday.",
    fasting: "Shukravar fast for harmony and relationships.",
    temple: "Offer white flowers in Lakshmi temple.",
    colors: "Wear white/pastels; avoid harsh red in conflicts.",
  },
  Saturn: {
    mantra: "ॐ प्रां प्रीं प्रौं सः शनैश्चराय नमः",
    donation: "Donate black sesame, mustard oil, blanket on Saturday.",
    fasting: "Shanivar fast till sunset with discipline.",
    temple: "Visit Shani/Hanuman temple and light sesame oil diya.",
    colors: "Wear navy/black moderately; avoid bright flashy tones.",
  },
  Rahu: {
    mantra: "ॐ भ्रां भ्रीं भ्रौं सः राहवे नमः",
    donation: "Donate blue cloth, mustard, and coconut on Saturday.",
    fasting: "Fast on Saturdays or during Rahu Kaal remedies.",
    temple: "Visit Durga/Bhairav temple and offer coconut.",
    colors: "Wear smoky blue/grey; avoid neon shades on sensitive days.",
  },
  Ketu: {
    mantra: "ॐ स्रां स्रीं स्रौं सः केतवे नमः",
    donation: "Donate multi-color blanket, sesame, and dog feed on Tuesday/Saturday.",
    fasting: "Simple fast with meditation and silence.",
    temple: "Worship Ganesha and visit Ganpati temple before new beginnings.",
    colors: "Wear earthy tones; avoid chaotic color combinations.",
  },
};

export function signKey(rashi: string): string {
  return rashi.split(" ")[0] ?? rashi;
}

export function calcStars(result: KundliCalculateResponse, targetHouses: number[]): number {
  const planetBoost = result.planets.filter((p) => targetHouses.includes(p.house)).length;
  const lordBoost = result.houses
    .filter((h) => targetHouses.includes(h.number))
    .reduce((sum, h) => {
      const lord = result.planets.find((p) => p.name === h.lord);
      if (!lord) return sum;
      if (lord.isExalted || lord.ownSign) return sum + 1;
      if ([1, 4, 5, 7, 9, 10].includes(lord.house)) return sum + 1;
      return sum;
    }, 0);

  return Math.max(1, Math.min(5, 2 + Math.floor(planetBoost / 2) + Math.min(2, lordBoost)));
}

export function stars(starCount: number) {
  return `${"★".repeat(starCount)}${"☆".repeat(5 - starCount)}`;
}
