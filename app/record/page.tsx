"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useRecorder } from "@/components/useRecorder";
import { useSpeech } from "@/components/useSpeech";
import { formatDuration, useToast } from "@/components/util";
import PolishSheet from "@/components/PolishSheet";
import { processImages, MAX_IMAGES } from "@/components/image";
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
  const [images, setImages] = useState<Blob[]>([]);
  const [imgUrls, setImgUrls] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  // 已同步进文本框的 finalText 长度，避免重复追加
  const syncedLenRef = useRef(0);

  const suggestTags = ["工作", "生活", "灵感", "复盘", "情绪"];
  const toggleTag = (t: string) =>
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  // 选择图片（相机/相册）→ 本地压缩 → 存入待保存列表（不上传）
  const onPickImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      showToast(`最多添加 ${MAX_IMAGES} 张图片`);
      e.target.value = "";
      return;
    }
    const blobs = await processImages(files, remaining);
    if (files.length > remaining) showToast(`已添加 ${blobs.length} 张（上限 ${MAX_IMAGES} 张）`);
    setImages((prev) => [...prev, ...blobs]);
    setImgUrls((prev) => [...prev, ...blobs.map((b) => URL.createObjectURL(b))]);
    e.target.value = "";
  };

  const removeImage = (idx: number) => {
    URL.revokeObjectURL(imgUrls[idx]);
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setImgUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  // 自动把识别到的「最终文本」增量同步进编辑框。
  // 监听 finalText 变化 —— 无论结果何时异步回来都不会丢字（修复"转写不进文本框"）。
  useEffect(() => {
    const full = speech.finalText;
    if (full.length <= syncedLenRef.current) return;
    const delta = full.slice(syncedLenRef.current).trim();
    syncedLenRef.current = full.length;
    if (!delta) return;
    setText((prev) => (prev ? prev + (prev.endsWith("\n") || prev.endsWith(" ") ? "" : " ") + delta : delta));
  }, [speech.finalText]);

  // 同时录音（存音频）+ Web Speech 实时转写（出文字）
  const startVoice = () => {
    syncedLenRef.current = 0; // 新一轮识别，重置同步基线
    speech.reset();
    rec.start();
    speech.start();
  };
  const stopVoice = () => {
    rec.stop();
    speech.stop();
    // 最后一段识别结果会在 stop 后异步进入 speech.finalText，
    // 上面的 useEffect 监听到变化后会自动把它同步进文本框，无需在此手动读取（避免读到旧闭包值）。
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
    if (!text.trim() && !rec.blob && images.length === 0)
      return showToast("请输入文字、录制语音或添加图片");
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
      images: images.length ? images : undefined,
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
                <button className="btn-ghost" style={{ flex: 1 }} onClick={() => { rec.reset(); speech.reset(); setText(""); syncedLenRef.current = 0; }}>
                  重录
                </button>
              )}
              <PolishButton />
            </div>
          </>
        )}

        <div className="field-label">图片（可选 · 仅存本机）</div>
        <div className="img-grid">
          {imgUrls.map((u, i) => (
            <div className="img-thumb" key={i}>
              <img src={u} alt={`图片 ${i + 1}`} />
              <button className="img-del" onClick={() => removeImage(i)} aria-label="删除图片">✕</button>
            </div>
          ))}
          {images.length < MAX_IMAGES && (
            <button className="img-add" onClick={() => fileRef.current?.click()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <path d="M3 15l5-5 4 4 3-3 6 6" />
                <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" />
              </svg>
              <span>添加图片</span>
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={onPickImages}
          />
        </div>

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
