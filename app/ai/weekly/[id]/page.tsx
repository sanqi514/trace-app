"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getWeeklyReport } from "@/lib/store";
import { WeeklyReport } from "@/lib/types";

function exportMarkdown(w: WeeklyReport) {
  const md = [
    `# 本周总结 ${w.weekRange}`, ``,
    `> 来源 ${w.sourceCount} 条记录`, ``,
    `## 💡 本周灵感清单`, ``, w.ideas, ``,
    `## 🔁 本周复盘要点`, ``, w.reviewPoints, ``,
    `## ✓ 本周做了哪些事`, ``, w.things, ``,
    `## ☺ 情绪 / 状态`, ``, w.mood, ``,
  ].join("\n");
  const blob = new Blob([md], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `周报-${w.weekRange}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function WeeklyDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [w, setW] = useState<WeeklyReport | null>(null);

  useEffect(() => {
    getWeeklyReport(id).then((x) => (x ? setW(x) : router.push("/ai")));
  }, [id, router]);

  if (!w) return null;

  const blocks = [
    { num: "💡", color: "#6c8cff", title: "本周灵感清单", body: w.ideas },
    { num: "🔁", color: "#e8775a", title: "本周复盘要点", body: w.reviewPoints },
    { num: "✓", color: "#f0b429", title: "本周做了哪些事", body: w.things },
    { num: "☺", color: "#c98a06", title: "情绪 / 状态", body: w.mood, highlight: true },
  ];

  return (
    <div className="app">
      <div className="app-body">
        <button className="detail-back" onClick={() => router.push("/ai")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
          返回
        </button>

        <div className="rfl-head">
          <span className="b" style={{ color: "#6c8cff", background: "#eef1ff" }}>📅 本周总结</span>
          <h2>{w.weekRange}</h2>
          <div className="d">来源 {w.sourceCount} 条记录</div>
        </div>

        {blocks.map((b, i) => (
          <div key={i} className="rfl-block" style={b.highlight ? { background: "#fef6e3", borderColor: "#f4e3b8" } : undefined}>
            <div className="step">
              <div className="num" style={{ background: b.color }}>{b.num}</div>
              <h4>{b.title}</h4>
            </div>
            <p>{b.body}</p>
          </div>
        ))}

        <button className="btn-primary" style={{ marginTop: 8 }} onClick={() => exportMarkdown(w)}>
          导出 Markdown
        </button>
      </div>
    </div>
  );
}
