"use client";
import { motion } from "framer-motion";
import Image from "next/image";
import { Atom, Leaf, Sparkles, BookOpen, ArrowUpLeft } from "lucide-react";
export function ScienceScene() {
  return (
    <div className="science-scene">
      <div className="scene-disc" />
      <div className="scene-grid" />
      <span className="scene-tag">
        <span className="status-dot" /> هنا تبدأ الاكتشافات
      </span>
      <div className="orbit-stamp">
        <Atom size={55} strokeWidth={1.3} />
      </div>
      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="science-photo"
      >
        <Image
          src="/images/science-discovery.png"
          alt="مجهر وقارورة ماء ملوّن ونبتة صغيرة ودفتر على طاولة علوم"
          fill
          sizes="(max-width: 767px) 85vw, (max-width: 1024px) 44vw, 490px"
          preload
        />
      </motion.div>
      <div className="scene-note">
        <span className="note-icon">
          <Leaf size={23} />
        </span>
        <div>
          <b>افهمي. جرّبي. اكتشفي.</b>
          <small>العِلم أقرب مما تتخيّلين</small>
        </div>
      </div>
      <span className="scene-spark">
        <Sparkles size={32} />
      </span>
      <div className="scene-book">
        <BookOpen size={25} />
        <span>منهج الكويت</span>
        <ArrowUpLeft size={18} />
      </div>
    </div>
  );
}
export function PlateArt({ preload = false }: { preload?: boolean }) {
  return (
    <div className="plate-art">
      <Image
        src="/images/nutrients-plate.png"
        alt="طبق أرز بني وبيض وحمص وخضراوات، بجواره حليب وزيت زيتون"
        fill
        sizes="(max-width: 767px) 85vw, 400px"
        preload={preload}
      />
    </div>
  );
}
