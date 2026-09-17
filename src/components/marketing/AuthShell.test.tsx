import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AuthShell } from "./AuthShell";

vi.mock("./AuthProductShowcase", () => ({
  AuthProductShowcase: () => <div>Prévia do produto</div>,
}));

describe("AuthShell", () => {
  it("keeps the product panel out of tablet layouts and aligns the return link with the form column", () => {
    const { container } = render(
      <MemoryRouter>
        <AuthShell>
          <form aria-label="Acessar conta" />
        </AuthShell>
      </MemoryRouter>,
    );

    const showcase = container.querySelector("aside");
    const contentColumn = screen
      .getByRole("main")
      .querySelector<HTMLDivElement>(":scope > div");

    expect(showcase).toHaveClass("hidden", "lg:block");
    expect(showcase).not.toHaveClass("md:block");
    expect(contentColumn).not.toBeNull();
    expect(contentColumn!).toHaveClass("max-w-[400px]");
    expect(contentColumn!).toContainElement(
      within(contentColumn!).getByRole("link", { name: "Voltar ao início" }),
    );
  });
});
