"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatTime, formatDuration, useToast } from "@/components/util";
import PolishSheet from "@/components/PolishSheet";
import { getRecord, saveRecord, deleteRecord, getSettings } from "@/lib/store";
import { summarizeRecord } from "@/lib/llm";
import { TraceRecord, TYPE_META } from "@/lib/types";

export default function RecordDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast, toastNode } = useToast();

  const [rec, setRec] = useState<TraceRecord | null>(null);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [polishOpen, setPolishOpen] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    getRecord(id).then((r) => {
      if (!r) {
        router.push("/");
        return;
      }
      setRec(r);
      setText(r.text);
      if (r.audioBlob) setAudioUrl(URL.createObjectURL(r.audioBlob));
    });
  }, [id, router]);

  if (!rec) return null;
  const m = TYPE_META[rec.type];

  const saveEdit = async () => {
    const next = { ...rec, text: text.trim(), updatedAt: Date.now() };
    await saveRecord(next);
    setRec(next);
    setEditing(false);
    showToast("已保存");
  };

  const doSummary = async () => {
    const s = await getSettings();
    if (!s.aiEnabled) return showToast("AI 已关闭，请到设置开启");
    if (!rec.text.trim()) return showToast("没有可摘要的文本");
    setBusy(true);
    try {
      const { summary, tags } = await summarizeRecord(rec.text);
      const next = { ...rec, aiSummary: summary, aiTags: tags, updatedAt: Date.now() };
      await saveRecord(next);
      setRec(next);
      showToast("AI 摘要完成");
    } catch (e: any) {
      showToast(e.message || "摘要失败");
    } finally {
      setBusy(false);
    }
  };

  const doPolish = async () => {
    const s = await getSettings();
    if (!s.aiEnabled) return showToast("AI 已关闭，请到设置开启");
    if (!rec.text.trim()) return showToast("没有可优化的文本");
    setPolishOpen(true);
  };

  const applyPolished = async (polished: string) => {
    const next = { ...rec, text: polished, updatedAt: Date.now() };
    await saveRecord(next);
    setRec(next);
    setText(polished);
    setPolishOpen(false);
    showToast("已优化表达");
  };

  const remove = async () => {
    if (!confirm("确定删除这条记录？")) return;
    await deleteRecord(rec.id);
    router.push("/");
  };

  return (
    <div className="app">
      <div className="app-body">
        <button className="detail-back" onClick={() => router.back()}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          返回
        </button>

        <div className="top" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span className={`tag-type t-${rec.type}`}>● {m.label}</span>
          <span className="time" style={{ color: "#aaa39a", fontSize: 12 }}>{formatTime(rec.createdAt)}</span>
        </div>

        {audioUrl && (
          <div className="transcript">
            <div className="lbl">🎙️ 录音 · {formatDuration(rec.audioDuration)}</div>
            <audio className="audio-player" controls src={audioUrl} />
          </div>
        )}

        <div className="field-label">内容</div>
        {editing ? (
          <>
            <textarea className="textarea" value={text} onChange={(e) => setText(e.target.value)} />
            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => { setText(rec.text); setEditing(false); }}>
                取消
              </button>
              <button className="btn-accent" style={{ flex: 1 }} onClick={saveEdit}>
                保存
              </button>
            </div>
          </>
        ) : (
          <div className="rfl-block">
            <p>{rec.text || "（无文字，仅录音）"}</p>
          </div>
        )}

        {rec.aiSummary && (
          <>
            <div className="field-label">✨ AI 摘要</div>
            <div className="rfl-block" style={{ borderColor: "#f6cfc3", background: "#fff7f4" }}>
              <p>{rec.aiSummary}</p>
            </div>
          </>
        )}

        {(rec.tags.length > 0 || (rec.aiTags && rec.aiTags.length > 0)) && (
          <div className="meta" style={{ marginTop: 4 }}>
            {rec.tags.map((t) => <span key={t} className="pill">#{t}</span>)}
            {rec.aiTags?.map((t) => <span key={t} className="pill" style={{ background: "#fdeee9", color: "#e8775a" }}>#{t}</span>)}
          </div>
        )}

        <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 10 }}>
          {!editing && (
            <>
              <button className="btn-accent" onClick={doPolish} disabled={busy} style={{ width: "100%" }}>
                ✨ 优化表达（AI 梳理文字）
              </button>
              <button className="btn-primary" onClick={doSummary} disabled={busy}>
                {busy ? <span className="spinner" /> : "生成 AI 摘要与标签"}
              </button>
              <button className="btn-ghost" onClick={() => setEditing(true)}>编辑内容</button>
              <button className="btn-ghost" style={{ color: "#c0392b" }} onClick={remove}>删除记录</button>
            </>
          )}
        </div>
      </div>
      <PolishSheet
        open={polishOpen}
        source={rec.text}
        onCancel={() => setPolishOpen(false)}
        onConfirm={applyPolished}
        onError={(m) => showToast(m)}
      />
      {toastNode}
    </div>
  );
}
