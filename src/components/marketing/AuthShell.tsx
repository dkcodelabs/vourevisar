import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { PublicSurface } from "./PublicSurface";
import { AuthProductShowcase } from "./AuthProductShowcase";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <PublicSurface>
      <div className="grid min-h-full lg:grid-cols-[0.9fr_1.1fr] xl:grid-cols-2">
        <aside className="relative hidden overflow-hidden lg:block">
          <AuthProductShowcase />
          <Link
            to="/"
            className="absolute left-10 top-9 z-10 rounded-lg text-white transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b7fb45] focus-visible:ring-offset-4 focus-visible:ring-offset-[#08233e] xl:left-14 xl:top-12"
            aria-label="Voltar ao início"
          >
            <BrandLogo motion="entrance" className="!text-white" />
          </Link>
        </aside>
        <main className="min-w-0 bg-white px-5 py-10 sm:px-10 sm:py-12 lg:px-12 lg:py-14 xl:px-16">
          <div className="mx-auto w-full max-w-[400px]">
            <div className="mb-6 flex justify-center">
              <Link
                to="/"
                aria-label="Voltar ao início"
                className="rounded-lg transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                <BrandLogo motion="entrance" />
              </Link>
            </div>
            {children}
          </div>
        </main>
      </div>
    </PublicSurface>
  );
}
