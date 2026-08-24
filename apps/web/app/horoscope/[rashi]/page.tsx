import { Suspense } from "react";

import { RashiHoroscopeContent } from "./RashiHoroscopeContent";

function HoroscopeFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#0A1A2F] via-[#0F2240] to-[#0A1A2F]">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#C9A227] border-t-transparent" />
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
