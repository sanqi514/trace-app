"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import TabBar from "@/components/TabBar";
import { formatTime, formatDuration } from "@/components/util";
import { getRecords } from "@/lib/store";
import { TraceRecord, RecordType, TYPE_META } from "@/lib/types";

const FILTERS: { key: RecordType | "all"; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "review", label: "🟠 复盘" },
  { key: "idea", label: "🔵 灵感" },
  { key: "fun", label: "🟡 趣事" },
];

export default function HomePage() {
  const [records, setRecords] = useState<TraceRecord[]>([]);
  const [filter, setFilter] = useState<RecordType | "all">("all");
  const [q, setQ] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getRecords()
      .then(setRecords)
      .finally(() => setLoaded(true));
  }, []);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (filter !== "all" && r.type !== filter) return false;
      if (q.trim()) {
        const k = q.trim().toLowerCase();
        const inText = r.text.toLowerCase().includes(k);
        const inTags = r.tags.some((t) => t.toLowerCase().includes(k));
        if (!inText && !inTags) return false;
      }
      return true;
    });
  }, [records, filter, q]);

  const today = new Date();

  return (
    <div className="app">
      <div className="app-body">
        <div className="h-row">
          <div>
            <h2>记录流</h2>
            <div className="date">
              {today.getMonth() + 1}月{today.getDate()}日 · 共 {records.length} 条
            </div>
          </div>
          <div className="avatar">T</div>
        </div>

        <div className="search">
          <span>🔍</span>
          <input
            placeholder="搜索记录、标签、关键词…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="chips">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={`chip ${filter === f.key ? "on" : ""}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {!loaded ? null : filtered.length === 0 ? (
          <div className="empty">
            还没有记录{q || filter !== "all" ? "符合条件的记录" : ""}。
            <br />
            点右下角 ＋ 开始记录你的灵感、趣事或复盘吧。
          </div>
        ) : (
          filtered.map((r) => {
            const m = TYPE_META[r.type];
            return (
              <Link key={r.id} href={`/record/${r.id}`} className="card" style={{ display: "block" }}>
                <div className="top">
                  <span className={`tag-type t-${r.type}`}>● {m.label}</span>
                  <span className="time">{formatTime(r.createdAt)}</span>
                </div>
                <div className="txt">
                  {r.text || (r.images?.length ? "（图片记录）" : r.audioBlob ? "（语音记录，未转写）" : "（空记录）")}
                </div>
                <div className="meta">
                  {r.audioBlob && (
                    <span className="audio">
                      <span className="wave">
                        <i style={{ height: 8 }} />
                        <i style={{ height: 14 }} />
                        <i style={{ height: 6 }} />
                        <i style={{ height: 11 }} />
                      </span>
                      {formatDuration(r.audioDuration)}
                    </span>
                  )}
                  {r.images?.length ? (
                    <span className="pill" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      🖼 {r.images.length}
                    </span>
                  ) : null}
                  {r.tags.map((t) => (
                    <span key={t} className="pill">
                      #{t}
                    </span>
                  ))}
                </div>
              </Link>
            );
          })
        )}
      </div>

      <Link href="/record" className="fab" aria-label="新建记录">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </Link>

      <TabBar />
    </div>
  );
}
