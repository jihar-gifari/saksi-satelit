"use client";
import { useReady, type PolicyChapter } from "@/lib/data";
import { fmtDay } from "@/lib/format";
import { tr, useLang, type Lang } from "@/lib/i18n";

/**
 * "Policy check" after each chapter's data: the question, a verdict chip with its one-line reason, then five
 * expandable rows (was it predictable, what the government did, what the evidence says, the verdict, what has
 * worked), every row with its sources. Objective, dated, officials quoted verbatim. Hidden if policy.json is missing.
 */
const VERDICT: Record<string, { en: string; id: string }> = {
  avoidable: { en: "Avoidable", id: "Bisa dicegah" },
  partly: { en: "Partly avoidable", id: "Sebagian bisa dicegah" },
  not: { en: "Not avoidable", id: "Tidak bisa dicegah" },
};
const FALLBACK_FRAMEWORK: Record<string, { en: string; id: string }> = {
  predictable: { en: "Was it predictable?", id: "Apakah bisa diprediksi?" },
  actions: { en: "What did the government do?", id: "Apa yang dilakukan pemerintah?" },
  evidence: { en: "What does the evidence say?", id: "Apa kata bukti?" },
  verdict: { en: "Avoidable?", id: "Bisa dicegah?" },
  fix: { en: "What has worked", id: "Yang terbukti berhasil" },
};

function Src({ url, label }: { url?: string; label?: string }) {
  if (!url) return label ? <span className="policy__meta">{label}</span> : null;
  let host = label;
  if (!host) {
    try {
      host = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      host = url;
    }
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      {host}
    </a>
  );
}

function rowsFor(c: PolicyChapter, lang: Lang) {
  const pick = (en?: string, id?: string) => (lang === "id" ? id || en : en || id);
  return {
    predictable: pick(c.predictable_en, c.predictable_id),
    fix: pick(c.fix_en, c.fix_id),
  };
}

export function PolicyCheck({ chapter, inCard = false }: { chapter: string; inCard?: boolean }) {
  const policy = useReady("policy");
  const lang = useLang();
  const c = policy?.chapters?.[chapter];
  if (!c || !c.question_en || !c.verdict_en) return null;
  const fw = Object.fromEntries((policy?.framework ?? []).map((f) => [f.key, f])) as Record<string, { en: string; id: string }>;
  const label = (k: string) => tr(lang, fw[k] ?? FALLBACK_FRAMEWORK[k]!);
  const v = VERDICT[c.verdict] ?? { en: c.verdict, id: c.verdict };
  const vClass = c.verdict in VERDICT ? c.verdict : "partly";
  const r = rowsFor(c, lang);
  const actions = (c.actions ?? []).filter((a) => a.en || a.id);
  const evidence = (c.evidence ?? []).filter((e) => e.en || e.id);

  return (
    <aside className={`policy ${inCard ? "policy--card" : ""}`} aria-label={tr(lang, { en: "Policy check", id: "Cek kebijakan" })}>
      <div className="policy__top">
        <p className="kicker">{tr(lang, { en: "Policy check", id: "Cek kebijakan" })}</p>
        <p className="policy__q">{tr(lang, { en: c.question_en, id: c.question_id || c.question_en })}</p>
        <div className="policy__verdict">
          <span className={`vchip vchip--${vClass}`}>{tr(lang, v)}</span>
          <span className="small">{tr(lang, { en: c.verdict_en, id: c.verdict_id || c.verdict_en })}</span>
        </div>
      </div>
      <div className="policy__rows">
        {r.predictable ? (
          <details className="policy__row">
            <summary>{label("predictable")}</summary>
            <div className="policy__body">
              <p>{r.predictable}</p>
            </div>
          </details>
        ) : null}
        {actions.length ? (
          <details className="policy__row">
            <summary>
              {label("actions")} <span className="policy__meta">({actions.length})</span>
            </summary>
            <div className="policy__body">
              {actions.map((a, i) => (
                <div key={i} className="policy__item">
                  <span className="policy__meta">
                    {fmtDay(a.date, lang)} · {a.actor}
                  </span>
                  <span>{tr(lang, { en: a.en || a.id, id: a.id || a.en })}</span>
                  <Src url={a.url} />
                </div>
              ))}
            </div>
          </details>
        ) : null}
        {evidence.length ? (
          <details className="policy__row">
            <summary>{label("evidence")}</summary>
            <div className="policy__body">
              {evidence.map((e, i) => (
                <div key={i} className="policy__item">
                  <span>{tr(lang, { en: e.en || e.id, id: e.id || e.en })}</span>
                  <span className="policy__meta">
                    {e.source ? `${e.source} · ` : ""}
                    <Src url={e.url} />
                  </span>
                </div>
              ))}
            </div>
          </details>
        ) : null}
        {r.fix ? (
          <details className="policy__row">
            <summary>{label("fix")}</summary>
            <div className="policy__body">
              <p>{r.fix}</p>
              {c.fix_source || c.fix_url ? (
                <p className="policy__meta">
                  {c.fix_source ? `${c.fix_source} · ` : ""}
                  <Src url={c.fix_url} />
                </p>
              ) : null}
            </div>
          </details>
        ) : null}
      </div>
    </aside>
  );
}
