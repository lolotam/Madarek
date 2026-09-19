"use client";
import { useState } from "react";
import Link from "next/link";
import * as Tabs from "@radix-ui/react-tabs";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Coins,
  Glasses,
  Lock,
  Save,
  Shirt,
  ShoppingBag,
  Smile,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { api } from "../providers";
import { Avatar } from "../avatar/avatar";
import { ImageSlot } from "../ui/image-slot";
import { AVATAR_SLOTS, badgeSlot, lookSlot } from "@/content/avatar-slots";
import { LAYER_LABELS, LAYER_ORDER, frameClass, unlockHint } from "@/content/shop";
import type { AvatarConfig, AvatarLayer, ShopItem, ShopState } from "./types";

const LAYER_ICON: Record<Exclude<AvatarLayer, "frame">, LucideIcon> = {
  base: Smile,
  hair: Sparkles,
  outfit: Shirt,
  accessory: Glasses,
};
const n = (value: number) => value.toLocaleString("ar-KW");
const artPending = AVATAR_SLOTS.some((slot) => !slot.ready);

function noneSwatch() {
  return (
    <span className="frame-swatch none" aria-hidden="true">
      <X size={28} />
    </span>
  );
}

function ItemPicture({ item, draft }: { item: ShopItem; draft: AvatarConfig }) {
  if (item.layer === "frame")
    return <span className={`frame-swatch ${frameClass(item.id)}`} aria-hidden="true" />;
  if (item.layer === "accessory") {
    if (item.id === "acc-none") return noneSwatch();
    const badge = badgeSlot(item.id);
    if (!badge) return noneSwatch();
    return <ImageSlot slot={badge} icon={LAYER_ICON.accessory} sizes="160px" />;
  }
  const slot =
    item.layer === "base"
      ? lookSlot(item.id, draft.hair, draft.outfit)
      : item.layer === "hair"
        ? lookSlot(draft.base, item.id, draft.outfit)
        : lookSlot(draft.base, draft.hair, item.id);
  if (!slot) return noneSwatch();
  return <ImageSlot slot={slot} icon={LAYER_ICON[item.layer]} sizes="160px" />;
}

export function Shop({ initial, name }: { initial: ShopState; name: string }) {
  const reduce = useReducedMotion();
  const [state, setState] = useState(initial);
  const [draft, setDraft] = useState<AvatarConfig>(initial.avatar);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const dirty = LAYER_ORDER.some((layer) => draft[layer] !== state.avatar[layer]);

  async function buy(item: ShopItem) {
    if (confirmId !== item.id) {
      setConfirmId(item.id);
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const next: ShopState = await api("shop/buy", { itemId: item.id });
      setState(next);
      setDraft((current) => ({ ...current, [item.layer]: item.id }));
      setConfirmId(null);
      setNotice(`أصبح «${item.name}» لكِ. جرّبيه ثم احفظي شخصيتك.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { avatar } = await api("avatar", { avatar: draft });
      setState((current) => ({ ...current, avatar }));
      setDraft(avatar);
      setNotice("حُفظت شخصيتك.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="container section shop-page">
      <header className="shop-heading">
        <div>
          <span className="eyebrow">متجر مدارك</span>
          <h1>
            شخصيتي<span className="title-dot">.</span>
          </h1>
          <p>اصرفي عملاتك على ملابس وإضافات لشخصيتك. الخبرة واللقب لا ينقصان عند الشراء.</p>
        </div>
        <span className="coin-balance" aria-live="polite">
          <Coins size={18} aria-hidden="true" /> عملاتك: {n(state.balance)}
        </span>
      </header>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="feedback success" role="status">
          <Check size={18} /> {notice}
        </p>
      )}
      <div className="shop-layout">
        <aside className="panel shop-preview">
          <motion.div
            key={LAYER_ORDER.map((layer) => draft[layer]).join("|")}
            initial={reduce ? false : { opacity: 0.6, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
          >
            <Avatar config={draft} name={name} size="lg" />
          </motion.div>
          {artPending && (
            <p className="muted-text">رسوم الشخصيات قيد التجهيز، وستظهر هنا تلقائيًا عند إضافتها.</p>
          )}
          <button className="button primary" disabled={!dirty || busy} onClick={save}>
            <Save size={18} /> حفظ شخصيتي
          </button>
          <Link href="/dashboard" className="text-link">
            <ArrowRight size={16} /> العودة إلى مساحتي
          </Link>
        </aside>
        <Tabs.Root dir="rtl" defaultValue="outfit" className="shop-tabs-root">
          <Tabs.List className="shop-tabs" aria-label="أقسام المتجر">
            {LAYER_ORDER.map((layer) => (
              <Tabs.Trigger key={layer} value={layer}>
                {LAYER_LABELS[layer]}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          {LAYER_ORDER.map((layer) => (
            <Tabs.Content key={layer} value={layer}>
              <ul className="shop-grid">
                {state.items
                  .filter((item) => item.layer === layer)
                  .map((item) => {
                    const worn = draft[layer] === item.id;
                    const short = item.price - state.balance;
                    return (
                      <li
                        key={item.id}
                        className={
                          "shop-item" +
                          (worn ? " worn" : "") +
                          (!item.owned && item.unlock ? " locked" : "")
                        }
                      >
                        <ItemPicture item={item} draft={draft} />
                        <b>{item.name}</b>
                        {item.owned ? (
                          <button
                            type="button"
                            className="button outline small"
                            aria-pressed={worn}
                            onClick={() => setDraft((current) => ({ ...current, [layer]: item.id }))}
                          >
                            {worn ? (
                              <>
                                <Check size={16} /> ترتدينه
                              </>
                            ) : (
                              "ارتدي"
                            )}
                          </button>
                        ) : item.unlock ? (
                          <span className="shop-lock">
                            <Lock size={16} aria-hidden="true" /> {unlockHint(item.unlock)}
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="button primary small"
                              disabled={busy || short > 0}
                              onClick={() => buy(item)}
                            >
                              <ShoppingBag size={16} />{" "}
                              {confirmId === item.id
                                ? `تأكيد الشراء بـ ${n(item.price)}`
                                : `اشتري بـ ${n(item.price)} عملة`}
                            </button>
                            {short > 0 && (
                              <small className="muted-text">تحتاجين {n(short)} عملة أخرى</small>
                            )}
                          </>
                        )}
                      </li>
                    );
                  })}
              </ul>
            </Tabs.Content>
          ))}
        </Tabs.Root>
      </div>
    </section>
  );
}
