import { Suspense } from "react";

import { RashiHoroscopeContent } from "./RashiHoroscopeContent";

function HoroscopeFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#09142a] via-[#0E1C3B] to-[#09142a]">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#b18d4f] border-t-transparent" />
    </div>
  );
}

export default function RashiHoroscopePage() {
  return (
    <Suspense fallback={<HoroscopeFallback />}>
      <RashiHoroscopeContent />
    </Suspense>
  );
}
