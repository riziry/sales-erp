"use client";
import { useEffect, useState, type ReactNode } from "react";
export default function SectionNavigation({
  label,
  sections,
  children,
}: {
  label: string;
  sections: { id: string; label: string }[];
  children?: ReactNode;
}) {
  const [active, setActive] = useState(sections[0]?.id);
  const ids = sections.map((section) => section.id).join("|");
  useEffect(() => {
    let frame = 0;
    const update = () => {
      const sections = ids.split("|");
      const threshold = window.innerWidth <= 1100 ? 200 : 150;
      const positions = sections
        .map((id) => ({
          id,
          top:
            document.getElementById(id)?.getBoundingClientRect().top ??
            Infinity,
        }))
        .filter((section) => section.top <= threshold);
      const nearestTop = positions.length
        ? Math.max(...positions.map((section) => section.top))
        : Infinity;
      const nearest = positions
        .filter((section) => Math.abs(section.top - nearestTop) < 2)
        .map((section) => section.id);
      setActive((current) =>
        nearest.includes(current) ? current : nearest[0] || sections[0],
      );
      frame = 0;
    };
    const scroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", scroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("resize", scroll);
    };
  }, [ids]);
  return (
    <nav className="editor-sections section-navigation" aria-label={label}>
      {sections.map((section, index) => (
        <a
          href={`#${section.id}`}
          key={section.id}
          aria-current={active === section.id ? "location" : undefined}
          onClick={() => setActive(section.id)}
        >
          <span>{String(index + 1).padStart(2, "0")}</span>
          {section.label}
        </a>
      ))}
      {children}
    </nav>
  );
}
