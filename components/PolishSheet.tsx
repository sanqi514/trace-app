"use client";
import { useEffect, useState } from "react";
import { polishText } from "@/lib/llm";

/**
 * 优化表达 · 对比确认面板
 * 打开后自动调用 AI 梳理，弹出底部 sheet，左右/上下展示「原文 / 优化后」，
 * 用户可在右侧二次微调，确认后才用优化结果替换。整体复用 .sheet 体系，UI 协调统一。
 */
export default function PolishSheet({
  open,
  source,
  onCancel,
  onConfirm,
  onError,
}: {
  open: boolean;
  source: string;
  onCancel: () => void;
  onConfirm: (text: string) => void;
  onError?: (msg: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [polished, setPolished] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    setFailed(false);
    setPolished("");
    polishText(source)
      .then((r) => {
        if (!alive) return;
        setPolished(r);
      })
      .catch((e: any) => {
        if (!alive) return;
        setFailed(true);
        onError?.(e?.message || "优化失败");
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, source]);

  if (!open) return null;

  const retry = () => {
    setLoading(true);
    setFailed(false);
    polishText(source)
      .then(setPolished)
      .catch((e: any) => {
        setFailed(true);
        onError?.(e?.message || "优化失败");
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="sheet-mask" onClick={onCancel}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="bar" />
        <h3>✨ 优化表达</h3>
        <p className="warn">AI 已帮你梳理表达，左为原文、右为优化后。可继续微调，确认后再替换原内容。</p>

        <div className="cmp">
          <div className="cmp-col">
            <div className="cmp-lbl">原文</div>
            <div className="cmp-box origin">{source || "（空）"}</div>
          </div>
          <div className="cmp-arrow">→</div>
          <div className="cmp-col">
            <div className="cmp-lbl accent">优化后</div>
            {loading ? (
              <div className="cmp-box loading">
                <span className="spinner dark" /> 正在梳理…
              </div>
            ) : failed ? (
              <div className="cmp-box loading">
                优化失败
                <button className="cmp-retry" onClick={retry}>重试</button>
              </div>
            ) : (
              <textarea
                className="cmp-box edit"
                value={polished}
                onChange={(e) => setPolished(e.target.value)}
              />
            )}
          </div>
        </div>

        <div className="sheet-btns">
          <button className="sec-b" onClick={onCancel}>保留原文</button>
          <button
            className="pri-b"
            disabled={loading || failed || !polished.trim()}
            onClick={() => onConfirm(polished.trim())}
          >
            用优化后替换
          </button>
        </div>
      </div>
    </div>
  );
}
