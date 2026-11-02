import { notFound, redirect } from "next/navigation";
import { saveTemplateAction } from "@/app/admin/email/actions";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { EmailEditor } from "@/components/admin/EmailEditor";
import { EmailSubNav } from "@/components/admin/EmailSubNav";
import { getCsrfToken } from "@/lib/csrf";
import { prisma } from "@/lib/db";
import { TEMPLATE_DEFS, isTemplateKey } from "@/lib/email-template-defs";
import { readAdminSession } from "@/lib/session";

type PageProps = {
  params: Promise<{ key: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const okBox = "mt-4 rounded-2xl border border-[#a9dba0] bg-[#ebf9ee] p-4 text-[#234a37]";

export default async function EditTemplatePage({ params, searchParams }: PageProps) {
  const session = await readAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  const { key } = await params;
  if (!isTemplateKey(key)) {
    notFound();
  }
  const query = await searchParams;
  const def = TEMPLATE_DEFS[key];
  const stored = await prisma.emailTemplate.findUnique({ where: { key } });
  const csrfToken = await getCsrfToken();

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <div className="baby-card p-6 sm:p-8">
        <h1 className="mt-4 text-3xl font-extrabold text-[#234a37]">{def.label}</h1>
        <p className="mt-2 text-[#4f6a5d]">{def.description}</p>
        <AdminTabs active="email" />
        <EmailSubNav active="sjablonen" />

        {query.saved === "1" && <p className={okBox}>Sjabloon opgeslagen.</p>}
        {query.reset === "1" && <p className={okBox}>Standaardtekst hersteld.</p>}

        <EmailEditor
          key={stored?.updatedAt.toISOString() ?? "default"}
          mode="template"
          action={saveTemplateAction}
          csrfToken={csrfToken}
          hiddenFields={{ key }}
          initialSubject={stored?.subject ?? def.subject}
          initialHtml={stored?.html ?? def.html}
          placeholders={def.placeholders}
          required={def.required}
        />
      </div>
    </main>
  );
}
