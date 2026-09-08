import { useLayoutEffect, type ReactNode, type RefObject } from "react";

/** Public campaign uses a light palette without changing the saved app preference. */
export function PublicSurface({
  children,
  className = "",
  scrollRef,
}: {
  children: ReactNode;
  className?: string;
  scrollRef?: RefObject<HTMLDivElement>;
}) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains("dark");
    root.classList.remove("dark");
    return () => {
      if (wasDark) root.classList.add("dark");
    };
  }, []);
  return (
    <div
      ref={scrollRef}
      className={`fixed inset-0 overflow-y-auto overflow-x-hidden bg-[#f7f9fc] font-sans text-[#172033] selection:bg-blue-100 selection:text-blue-950 [color-scheme:light] ${className}`}
    >
      {children}
    </div>
  );
}
