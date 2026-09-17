import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthProductShowcase } from "./AuthProductShowcase";

describe("AuthProductShowcase", () => {
  it("apresenta a jornada do produto e permite navegar entre as cenas", () => {
    render(<AuthProductShowcase />);

    expect(
      screen.getByRole("region", {
        name: "Demonstração de como o vouRevisar funciona",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Decida o que fazer agora")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Ver demonstração do ciclo" }),
    );

    expect(
      screen.getByText("Transforme o edital em rotina"),
    ).toBeInTheDocument();
  });

  it("não adiciona um rótulo redundante à prévia", () => {
    render(<AuthProductShowcase />);

    expect(screen.queryByText("Demonstração do produto")).not.toBeInTheDocument();
  });

  it("explica a proposta do produto antes das cenas animadas", () => {
    render(<AuthProductShowcase />);

    expect(
      screen.getByRole("heading", { name: "Revisão inteligente para concursos." }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Organize edital, ciclo e revisões em uma rotina que você consegue manter.",
      ),
    ).toBeInTheDocument();
  });
});
