"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  englishWordPattern,
  wordMeaning,
} from "@/content/english-glossary.mjs";
import "./english-glossary.css";

type WordTip = {
  word: string;
  meaning: string;
  icon: string;
  sprite?: number;
  x: number;
  y: number;
  below: boolean;
};
const Glossary = createContext<{
  show: (word: string, element: HTMLElement) => void;
  hide: () => void;
} | null>(null);

export function EnglishGlossary({ children }: { children: ReactNode }) {
  const [tip, setTip] = useState<WordTip | null>(null);
  const hide = useCallback(() => setTip(null), []);
  const show = useCallback((word: string, element: HTMLElement) => {
    const entry = wordMeaning(word);
    if (!entry) return;
    const box = element.getBoundingClientRect();
    const width = Math.min(224, window.innerWidth - 16);
    const left = Math.min(
      window.innerWidth - width - 8,
      Math.max(8, box.left + (box.width - width) / 2),
    );
    const below = box.top < 125;
    setTip({
      ...entry,
      word,
      x: left,
      y: below ? box.bottom + 8 : box.top - 8,
      below,
    });
  }, []);

  useEffect(() => {
    function dismiss(event: KeyboardEvent) {
      if (event.key === "Escape") hide();
    }
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    document.addEventListener("pointerdown", hide, true);
    document.addEventListener("keydown", dismiss);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
      document.removeEventListener("pointerdown", hide, true);
      document.removeEventListener("keydown", dismiss);
    };
  }, [hide]);

  return (
    <Glossary.Provider value={{ show, hide }}>
      {children}
      {tip &&
        createPortal(
          <div
            className="english-word-tip"
            role="tooltip"
            lang="ar"
            dir="rtl"
            data-below={tip.below ? "" : undefined}
            style={{ left: tip.x, top: tip.y }}
          >
            {tip.sprite === undefined ? (
              <span className="english-word-icon" aria-hidden>
                {tip.icon}
              </span>
            ) : (
              <span
                className="english-word-icon english-word-sprite"
                aria-hidden
                style={{
                  backgroundPosition: `${(tip.sprite % 3) * 50}% ${Math.floor(tip.sprite / 3) * 50}%`,
                }}
              />
            )}
            <div>
              <bdi lang="en">{tip.word}</bdi>
              <strong>{tip.meaning}</strong>
            </div>
          </div>,
          document.body,
        )}
    </Glossary.Provider>
  );
}

export function EnglishWords({
  text,
  embedded = false,
}: {
  text: string;
  embedded?: boolean;
}) {
  const glossary = useContext(Glossary);
  if (!glossary) return text;
  return text.split(englishWordPattern).map((word, index) =>
    index % 2 === 0 || !wordMeaning(word) ? (
      word
    ) : (
      <span
        key={index}
        className="english-word"
        data-word={word}
        data-embedded={embedded ? "" : undefined}
        tabIndex={embedded ? undefined : 0}
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse")
            glossary.show(word, event.currentTarget);
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") glossary.hide();
        }}
        onPointerDown={(event) => {
          if (event.pointerType !== "mouse")
            glossary.show(word, event.currentTarget);
        }}
        onFocus={(event) => glossary.show(word, event.currentTarget)}
        onBlur={glossary.hide}
      >
        {word}
      </span>
    ),
  );
}
