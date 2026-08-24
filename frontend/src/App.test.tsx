import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  it("renderiza o título e a proposta de valor do BuscaLED", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "BuscaLED" })).toBeInTheDocument();
    expect(screen.getByText(/Descubra qual LED serve no seu carro/i)).toBeInTheDocument();
  });

  it("lista os 3 passos do fluxo Como funciona", () => {
    render(<App />);

    const steps = screen.getByRole("list").querySelectorAll("li");
    expect(steps).toHaveLength(3);
    expect(screen.getByText("Busca pelo carro")).toBeInTheDocument();
    expect(screen.getByText("Pedido estruturado")).toBeInTheDocument();
  });
});
