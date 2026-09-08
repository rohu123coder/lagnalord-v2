import Link from "next/link";

export function AstrologerCTA({
  heading = "Want a personalized reading?",
  text = "Numbers give a quick sketch. A conversation with a verified astrologer can place that sketch next to your chart, timing, and the question you actually care about.",
}: {
  heading?: string;
  text?: string;
}) {
  return (
    <aside className="rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-6 shadow-lg shadow-black/30 md:p-8">
      <p className="text-xs font-bold uppercase tracking-wider text-[#C8AC80]">
        Talk to an expert
      </p>
      <h2 className="mt-2 text-xl font-bold text-[#F5F1E8] md:text-2xl">{heading}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#C7C2B4]">{text}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href="/astrologers"
          className="inline-flex rounded-full bg-[#b18d4f] px-5 py-2.5 text-sm font-semibold text-[#09142a] transition hover:bg-[#8E713F] hover:text-white"
        >
          Chat with Astrologer
        </Link>
        <Link
          href="/astrologers"
          className="inline-flex rounded-full border border-[#b18d4f]/20 bg-[#09142a] px-5 py-2.5 text-sm font-semibold text-[#F5F1E8] transition hover:border-[#b18d4f] hover:text-[#C8AC80]"
        >
          Talk to Astrologer
        </Link>
      </div>
    </aside>
  );
}
