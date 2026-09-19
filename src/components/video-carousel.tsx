"use client";
import { useEffect, useState } from "react";
import { Clock, PlayCircle } from "lucide-react";
import { api } from "./providers";
import { ModalDialog } from "./ui/modal-dialog";

export type LessonVideo = {
  id: string;
  youtubeId: string;
  title: string;
  goal: string;
  kind: "explain" | "experiment" | "review" | "guide";
  durationSeconds: number | null;
};

export const videoKindLabel: Record<LessonVideo["kind"], string> = {
  explain: "شرح إضافي",
  experiment: "تجربة",
  review: "مراجعة",
  guide: "دليل الاستخدام",
};

export function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600),
    m = Math.floor((seconds % 3600) / 60),
    s = String(seconds % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

export function VideoCarousel({
  lessonId,
  title,
  intro,
  onOpen,
}: {
  lessonId: string;
  title: string;
  intro?: string;
  onOpen?: () => void;
}) {
  const [videos, setVideos] = useState<LessonVideo[]>([]);
  const [active, setActive] = useState<LessonVideo | null>(null);
  useEffect(() => {
    api("videos?lesson=" + encodeURIComponent(lessonId))
      .then((d) => setVideos(d.videos))
      .catch(() => setVideos([]));
  }, [lessonId]);
  if (!videos.length) return null;
  const headingId = "videos-" + lessonId;
  return (
    <section className="video-shelf" aria-labelledby={headingId}>
      <h2 id={headingId}>{title}</h2>
      {intro && <p className="section-intro">{intro}</p>}
      <ul className="video-track">
        {videos.map((v) => (
          <li key={v.id}>
            <button
              type="button"
              className="video-card"
              onClick={() => {
                onOpen?.();
                setActive(v);
              }}
            >
              <span className="video-thumb">
                <img
                  src={`https://i.ytimg.com/vi/${v.youtubeId}/hqdefault.jpg`}
                  alt=""
                  loading="lazy"
                  width={480}
                  height={360}
                />
                <PlayCircle size={46} aria-hidden />
              </span>
              <span className="pill blue">{videoKindLabel[v.kind]}</span>
              <b>{v.title}</b>
              <span className="video-goal">{v.goal}</span>
              {v.durationSeconds ? (
                <span className="video-duration">
                  <Clock size={14} aria-hidden />{" "}
                  <bdi>{formatDuration(v.durationSeconds)}</bdi>
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
      <ModalDialog
        open={active !== null}
        onOpenChange={(open) => {
          if (!open) setActive(null);
        }}
        title={active?.title ?? ""}
        description={active?.goal}
        className="video-dialog"
      >
        {active && (
          <div className="video-frame">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${active.youtubeId}?rel=0&playsinline=1`}
              title={active.title}
              allow="encrypted-media; picture-in-picture; fullscreen"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        )}
      </ModalDialog>
    </section>
  );
}
