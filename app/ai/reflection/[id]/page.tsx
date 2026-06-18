"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatTime } from "@/components/util";
import { getReflection } from "@/lib/store";
import { Reflection } from "@/lib/types";
import { REFLECTION_TEMPLATES } from "@/lib/templates";

function exportMarkdown(r: Reflection) {
  const lines = [`# ${r.title}`, ``, `> ${REFLECTION_TEMPLATES[r.template].name} · ${new Date(r.createdAt).toLocaleString("zh-CN")}`, ``];
  r.sections.forEach((s, i) => {
    lines.push(`## ${i + 1}. ${s.title}`, ``, s.body, ``);
  });
  const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `复盘-${r.title}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReflectionDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [r, setR] = useState<Reflection | null>(null);

  useEffect(() => {
    getReflection(id).then((x) => (x ? setR(x) : router.push("/ai")));
  }, [id, router]);

  if (!r) return null;
  const accentColors = ["#2b2824", "#2b2824", "#2b2824", "#e8775a", "#e8775a"];

  return (
    <div className="app">
      <div className="app-body">
        <button className="detail-back" onClick={() => router.push("/ai")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
          返回
        </button>

        <div className="rfl-head">
          <span className="b">✨ AI 复盘 · {REFLECTION_TEMPLATES[r.template].name}</span>
          <h2>{r.title}</h2>
          <div className="d">生成于 {formatTime(r.createdAt)} · 来源 {r.sourceRecordIds.length} 条记录</div>
        </div>

        {r.sections.map((s, i) => {
          const last = i === r.sections.length - 1;
          return (
            <div key={i} className="rfl-block" style={last ? { borderColor: "#f6cfc3", background: "#fff7f4" } : undefined}>
              <div className="step">
                <div className="num" style={{ background: accentColors[Math.min(i, 4)] }}>{i + 1}</div>
                <h4>{s.title}</h4>
              </div>
              <p>{s.body}</p>
            </div>
          );
        })}

        <button className="btn-primary" style={{ marginTop: 8 }} onClick={() => exportMarkdown(r)}>
          导出 Markdown
        </button>
      </div>
    </div>
  );
}
