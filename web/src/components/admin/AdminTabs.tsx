import Link from "next/link";

type AdminTabKey = "overzicht" | "voorspellingen" | "adressen";

const TABS: { key: AdminTabKey; href: string; label: string }[] = [
  { key: "overzicht", href: "/admin", label: "📊 Overzicht" },
  { key: "voorspellingen", href: "/admin/voorspellingen", label: "🔮 Voorspellingen" },
  { key: "adressen", href: "/admin/adressen", label: "📮 Adressen" },
];

export function AdminTabs({ active }: { active: AdminTabKey }) {
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={tab.key === active ? "baby-button-primary px-4 py-2 text-sm" : "baby-button-secondary px-4 py-2 text-sm"}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
