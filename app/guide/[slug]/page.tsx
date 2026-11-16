import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageMotion } from "@/components/PageMotion";
import { SiteHeader } from "@/components/SiteHeader";
import { GUIDES, findGuide } from "@/lib/guides";

// 幹事向けの読みもの。検索から来た人の入口(本文は lib/guides.ts)

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata(props: PageProps<"/guide/[slug]">): Promise<Metadata> {
  const g = findGuide((await props.params).slug);
  if (!g) return {};
  return { title: g.title, description: g.description, alternates: { canonical: `/guide/${g.slug}` }, openGraph: { title: g.title, description: g.description } };
}

export default async function GuidePage(props: PageProps<"/guide/[slug]">) {
  const g = findGuide((await props.params).slug);
  if (!g) notFound();
  const others = GUIDES.filter((x) => x.slug !== g.slug);
  return (
    <PageMotion>
      <SiteHeader />
      <article className="mx-auto max-w-xl px-4 pt-6 pb-16">
        <p className="text-xs font-bold text-accent">幹事のガイド</p>
        <h1 className="mt-1 text-[22px] font-black leading-snug tracking-tight">{g.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">{g.description}</p>
        {g.sections.map((s) => (
          <section key={s.h} className="mt-7">
            <h2 className="text-base font-black">{s.h}</h2>
            {s.p.map((t) => (
              <p key={t} className="mt-2 text-sm leading-relaxed text-white/80">
                {t}
              </p>
            ))}
          </section>
        ))}
        <Link
          href={g.cta.href}
          className="mt-9 flex min-h-12 items-center justify-center rounded-2xl bg-accent px-4 font-black text-accent-text active:scale-[0.98]"
        >
          {g.cta.label}
        </Link>
        <h2 className="mt-10 text-sm font-bold text-muted">ほかのガイド</h2>
        <ul className="mt-2 grid gap-2">
          {others.map((o) => (
            <li key={o.slug}>
              <Link href={`/guide/${o.slug}`} className="block rounded-2xl border panel px-4 py-3 text-sm font-bold">
                {o.title}
              </Link>
            </li>
          ))}
        </ul>
      </article>
    </PageMotion>
  );
}
