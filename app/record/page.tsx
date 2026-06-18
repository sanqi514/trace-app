"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRecorder } from "@/components/useRecorder";
import { useSpeech } from "@/components/useSpeech";
import { formatDuration, useToast } from "@/components/util";
import PolishSheet from "@/components/PolishSheet";
import { saveRecord, uid, getSettings } from "@/lib/store";
import { RecordType, TraceRecord } from "@/lib/types";

type Mode = "text" | "voice";

export default function RecordPage() {
  const router = useRouter();
  const { showToast, toastNode } = useToast();
  const rec = useRecorder();
  const speech = useSpeech("zh-CN");

  const [mode, setMode] = useState<Mode>("voice");
  const [text, setText] = useState("");
  const [type, setType] = useState<RecordType | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [polishOpen, setPolishOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const suggestTags = ["工作", "生活", "灵感", "复盘", "情绪"];
  const toggleTag = (t: string) =>
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  // 同时录音（存音频）+ Web Speech 实时转写（出文字）
  const startVoice = () => {
    rec.start();
    speech.start();
  };
  const stopVoice = () => {
    rec.stop();
    speech.stop();
    // 把识别到的最终文本写入编辑框
    const t = speech.finalText.trim();
    if (t) setText((prev) => (prev ? prev + (prev.endsWith("\n") ? "" : "\n") + t : t));
  };

  // 优化表达：打开「原文/优化后」对比面板
  const doPolish = async () => {
    const content = text.trim();
    if (!content) return showToast("先输入或转写一些文字");
    const s = await getSettings();
    if (!s.aiEnabled) return showToast("AI 已关闭，请到设置开启");
    setPolishOpen(true);
  };

  const save = async () => {
    if (!type) return showToast("请先选择分类");
    if (!text.trim() && !rec.blob) return showToast("请输入文字或录制语音");
    setSaving(true);
    const now = Date.now();
    const record: TraceRecord = {
      id: uid(),
      createdAt: now,
      updatedAt: now,
      type,
      text: text.trim(),
      audioBlob: rec.blob || undefined,
      audioDuration: rec.blob ? rec.seconds : undefined,
      transcribed: !!text.trim() && !!rec.blob,
      tags,
    };
    try {
      await saveRecord(record);
      router.push("/");
    } catch {
      showToast("保存失败");
      setSaving(false);
    }
  };

  const typeClass = (t: RecordType) =>
    type === t ? (t === "review" ? "on-r" : t === "idea" ? "on-i" : "on-f") : "";

  // 优化表达按钮（文字框上方工具条复用）
  const PolishButton = () => (
    <button className="btn-accent" onClick={doPolish} style={{ flex: 1 }}>
      ✨ 优化表达
    </button>
  );

  return (
    <div className="app">
      <div className="rec-wrap">
        <div className="rec-top">
          <span className="ttl">新记录</span>
          <button className="x" onClick={() => router.push("/")}>✕</button>
        </div>

        <div className="rec-mode">
          <button className={mode === "text" ? "on" : ""} onClick={() => setMode("text")}>文字</button>
          <button className={mode === "voice" ? "on" : ""} onClick={() => setMode("voice")}>语音</button>
        </div>

        {mode === "voice" && (
          <div className="mic-zone">
            <div className="rec-timer">{formatDuration(rec.seconds)}</div>
            {speech.listening && (
              <div className="live-wave">
                {Array.from({ length: 10 }).map((_, i) => (
                  <i key={i} style={{ animationDelay: `${(i % 5) * 0.1}s` }} />
                ))}
              </div>
            )}
            <button
              className={`mic-btn ${speech.listening || rec.recording ? "recording" : ""}`}
              onClick={() => (speech.listening || rec.recording ? stopVoice() : startVoice())}
            >
              {speech.listening || rec.recording ? (
                <svg viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="7" width="10" height="10" rx="2" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <rect x="9" y="3" width="6" height="11" rx="3" />
                  <path d="M5 11a7 7 0 0 0 14 0M12 18v3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
            </button>
            <div className="rec-hint">
              {speech.error
                ? speech.error
                : !speech.supported
                ? "此浏览器不支持实时语音转写，可只录音后用「优化表达」或手动输入。"
                : speech.listening
                ? "正在边说边转写…点击停止"
                : "点击麦克风：边录音边自动转文字"}
            </div>
            {(speech.listening && (speech.finalText || speech.interim)) && (
              <div className="transcript" style={{ width: "100%", marginTop: 4 }}>
                <div className="lbl">🎙️ 实时转写</div>
                {speech.finalText}
                <span style={{ color: "#aaa39a" }}>{speech.interim}</span>
              </div>
            )}
          </div>
        )}

        {mode === "voice" && rec.blob && !rec.recording && (
          <div className="transcript" style={{ marginTop: 4 }}>
            <div className="lbl">🔊 录音已保留（本地） · {formatDuration(rec.seconds)}</div>
            <audio className="audio-player" controls src={URL.createObjectURL(rec.blob)} />
          </div>
        )}

        {/* 文字编辑区：文字模式始终显示；语音模式录完后显示 */}
        {(mode === "text" || (mode === "voice" && (text || rec.blob))) && (
          <>
            <div className="field-label">{mode === "text" ? "记点什么" : "文字（可编辑转写结果或补充）"}</div>
            <textarea
              className="textarea"
              placeholder="写下你的灵感、趣事或复盘…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              {mode === "voice" && rec.blob && (
                <button className="btn-ghost" style={{ flex: 1 }} onClick={() => { rec.reset(); speech.reset(); setText(""); }}>
                  重录
                </button>
              )}
              <PolishButton />
            </div>
          </>
        )}

        <div className="field-label">分类</div>
        <div className="type-sel">
          <button className={typeClass("review")} onClick={() => setType("review")}>🟠 复盘</button>
          <button className={typeClass("idea")} onClick={() => setType("idea")}>🔵 灵感</button>
          <button className={typeClass("fun")} onClick={() => setType("fun")}>🟡 趣事</button>
        </div>

        <div className="field-label">标签</div>
        <div className="tag-suggest">
          {suggestTags.map((t) => (
            <button key={t} className={tags.includes(t) ? "added" : ""} onClick={() => toggleTag(t)}>
              {tags.includes(t) ? "✓ " : "+ "}#{t}
            </button>
          ))}
        </div>

        <div style={{ marginTop: "auto", paddingTop: 18 }}>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? <span className="spinner" /> : "保存到本地"}
          </button>
        </div>
      </div>
      <PolishSheet
        open={polishOpen}
        source={text}
        onCancel={() => setPolishOpen(false)}
        onConfirm={(t) => { setText(t); setPolishOpen(false); showToast("已优化表达"); }}
        onError={(m) => showToast(m)}
      />
      {toastNode}
    </div>
  );
}
