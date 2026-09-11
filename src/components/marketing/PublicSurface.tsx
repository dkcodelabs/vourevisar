import { useLayoutEffect, type ReactNode, type RefObject } from "react";

/** Public campaign owns its palette without changing the saved app preference. */
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
      className={`fixed inset-0 overflow-y-auto overflow-x-hidden bg-[#070b09] font-sans text-[#f4f8f5] selection:bg-[#70dc51] selection:text-[#071008] [color-scheme:dark] [scrollbar-color:#2a5737_#070b09] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#2a5737] [&::-webkit-scrollbar-track]:bg-[#070b09] [&::-webkit-scrollbar]:w-2 ${className}`}
    >
      {children}
    </div>
  );
}
