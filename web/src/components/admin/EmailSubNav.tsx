import Link from "next/link";

type EmailSubTab = "versturen" | "sjablonen";

const SUB_TABS: { key: EmailSubTab; href: string; label: string }[] = [
  { key: "versturen", href: "/admin/email", label: "Versturen" },
  { key: "sjablonen", href: "/admin/email/sjablonen", label: "Sjablonen" },
];

export function EmailSubNav({ active }: { active: EmailSubTab }) {
  return (
    <nav aria-label="E-mail" className="mt-4 flex gap-2 border-b border-[#cfecc7] pb-3">
      {SUB_TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={tab.key === active ? "page" : undefined}
          className={
            tab.key === active
              ? "rounded-xl bg-[#ebf9ee] px-4 py-1.5 text-sm font-bold text-[#234a37]"
              : "rounded-xl px-4 py-1.5 text-sm text-[#4f6a5d] hover:bg-[#f6fcf4]"
          }
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
