"use client";
import { useRef, useState, useCallback, useEffect } from "react";

// 浏览器自带语音识别（Web Speech API），零服务器成本。
// iOS Safari 支持不稳定 —— 通过 supported 标志做优雅降级。

type SR = any;

function getSpeechRecognition(): SR | null {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

export function useSpeech(lang = "zh-CN") {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [finalText, setFinalText] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SR | null>(null);

  useEffect(() => {
    setSupported(!!getSpeechRecognition());
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setError("当前浏览器不支持语音识别（iOS Safari 可能受限），可改用录音 + 手动输入。");
      return;
    }
    setError(null);
    setFinalText("");
    setInterim("");
    const rec: SR = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e: any) => {
      let fin = "";
      let itm = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const seg = e.results[i];
        if (seg.isFinal) fin += seg[0].transcript;
        else itm += seg[0].transcript;
      }
      if (fin) setFinalText((prev) => prev + fin);
      setInterim(itm);
    };
    rec.onerror = (e: any) => {
      if (e.error === "no-speech") return;
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setError("麦克风/语音识别权限被拒绝。");
      } else if (e.error === "network") {
        setError("语音识别需要联网，请检查网络。");
      } else {
        setError("语音识别出错，可改用手动输入。");
      }
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
    };

    try {
      rec.start();
      recRef.current = rec;
      setListening(true);
    } catch {
      setError("无法启动语音识别。");
    }
  }, [lang]);

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {}
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    setFinalText("");
    setInterim("");
    setError(null);
  }, []);

  useEffect(() => () => {
    try {
      recRef.current?.abort?.();
    } catch {}
  }, []);

  return { supported, listening, finalText, interim, error, start, stop, reset };
}
