"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FlaskConical, Coffee } from "lucide-react";
import { cn } from "@/lib/utils";
import { canAccessFermentation, canAccessQc } from "@/lib/roles";

type BottomNavProps = {
  role?: string | null;
};

const tabs = [
  { href: "/", label: "Home", icon: Home, show: () => true },
  {
    href: "/fermentation",
    label: "Ferment",
    icon: FlaskConical,
    show: (role?: string | null) => canAccessFermentation(role),
  },
  {
    href: "/qc",
    label: "QC",
    icon: Coffee,
    show: (role?: string | null) => canAccessQc(role),
  },
];

export function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname();
  const visibleTabs = tabs.filter((tab) => tab.show(role));

  if (visibleTabs.length <= 1) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-stone-200 bg-white/95 backdrop-blur supports-[padding:max(0px)]:pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-2">
        {visibleTabs.map((tab) => {
          const active =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex min-h-14 min-w-[4.5rem] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 text-xs font-semibold transition-colors",
                active ? "text-emerald-800" : "text-stone-500"
              )}
            >
              <Icon className={cn("h-6 w-6", active && "stroke-[2.5]")} />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
