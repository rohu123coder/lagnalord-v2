import type { ReactNode } from "react";

export function SectionTitle({
  children,
  subtitle,
}: {
  children: ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-semibold tracking-tight text-[#F5F1E8] sm:text-2xl">
        {children}
      </h2>
      {subtitle ? (
        <p className="mt-1 text-sm text-[#C7C2B4]">{subtitle}</p>
      ) : null}
    </div>
  );
}
