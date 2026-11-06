import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";

const MODELOS = [
  { model: "FOCUS", yearStart: 2012, yearEnd: 2015 },
  { model: "KA", yearStart: 2018, yearEnd: 2020 },
];

function mockSemSessao() {
  globalThis.fetch = ((url: string) => {
    const u = String(url);
    const responder = (corpo: unknown) =>
      Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(corpo) });

    if (u.includes("/compatibility/makes")) return responder({ makes: ["FORD", "VOLKSWAGEN"] });
    if (u.includes("/compatibility/models")) return responder({ models: MODELOS });

    return Promise.resolve({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: "Não autenticado." }),
    });
  }) as unknown as typeof fetch;
}

function montar() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/resultado" element={<p>Vitrine</p>} />
          <Route path="/garagem" element={<p>Garagem</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

const abaModelo = () => fireEvent.click(screen.getByRole("button", { name: "Modelo/Ano" }));
const buscar = () => fireEvent.click(screen.getByRole("button", { name: "Buscar meu LED" }));
const digitar = (rotulo: string, valor: string) =>
  fireEvent.change(screen.getByLabelText(rotulo), { target: { value: valor } });

describe("App", () => {
  it("renderiza o hero e a proposta de valor do BuscaLED", () => {
    mockSemSessao();
    montar();

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Descubra qual LED/i);
    expect(screen.getByText(/Sem tabelas. Sem WhatsApp/i)).toBeInTheDocument();
  });

  it("lista os 3 passos do fluxo Como funciona", () => {
    mockSemSessao();
    montar();

    expect(screen.getByText("Busca pelo carro")).toBeInTheDocument();
    expect(screen.getByText("Encontra o LED certo")).toBeInTheDocument();
    expect(screen.getByText("Pedido estruturado")).toBeInTheDocument();
  });

  it("começa na aba da placa e troca para Modelo/Ano", async () => {
    mockSemSessao();
    montar();

    expect(screen.getByLabelText("Placa do veículo")).toBeInTheDocument();

    abaModelo();

    expect(await screen.findByLabelText("Marca")).toBeInTheDocument();
    expect(screen.queryByLabelText("Placa do veículo")).not.toBeInTheDocument();
  });

  // O catálogo tem ~1900 modelos com grafia da planilha do parceiro; digitar
  // livre quase nunca casa, então a escolha vem de lista.
  it("oferece marca, modelo e ano em seletores encadeados", async () => {
    mockSemSessao();
    montar();
    abaModelo();

    const marca = (await screen.findByLabelText("Marca")) as HTMLSelectElement;
    await waitFor(() => expect(marca.options.length).toBeGreaterThan(1));

    // Modelo e ano só liberam depois que a marca é escolhida.
    expect(screen.getByLabelText("Modelo")).toBeDisabled();
    expect(screen.getByLabelText("Ano")).toBeDisabled();

    fireEvent.change(marca, { target: { value: "FORD" } });

    const modelo = screen.getByLabelText("Modelo") as HTMLSelectElement;
    await waitFor(() => expect(modelo).not.toBeDisabled());
    expect(screen.getByRole("option", { name: "FOCUS (2012–2015)" })).toBeInTheDocument();

    fireEvent.change(modelo, { target: { value: "0" } });

    const ano = screen.getByLabelText("Ano") as HTMLSelectElement;
    await waitFor(() => expect(ano).not.toBeDisabled());
    // A faixa 2012–2015 vira exatamente 4 anos, mais o placeholder.
    expect(ano.options.length).toBe(5);
  });

  it("recusa placa com tamanho inválido em vez de buscar", () => {
    mockSemSessao();
    montar();

    digitar("Placa do veículo", "ABC12");
    buscar();

    expect(screen.getByRole("alert")).toHaveTextContent("7 caracteres");
    expect(screen.queryByText("Garagem")).not.toBeInTheDocument();
  });

  it("leva para a vitrine quando marca, modelo e ano estão escolhidos", async () => {
    mockSemSessao();
    montar();
    abaModelo();

    const marca = await screen.findByLabelText("Marca");
    await waitFor(() => expect((marca as HTMLSelectElement).options.length).toBeGreaterThan(1));
    fireEvent.change(marca, { target: { value: "FORD" } });

    const modelo = screen.getByLabelText("Modelo");
    await waitFor(() => expect(modelo).not.toBeDisabled());
    fireEvent.change(modelo, { target: { value: "0" } });

    const ano = screen.getByLabelText("Ano");
    await waitFor(() => expect(ano).not.toBeDisabled());
    fireEvent.change(ano, { target: { value: "2013" } });

    buscar();

    await waitFor(() => expect(screen.getByText("Vitrine")).toBeInTheDocument());
  });

  it("avisa quando o veículo não foi escolhido por inteiro", async () => {
    mockSemSessao();
    montar();
    abaModelo();

    const marca = await screen.findByLabelText("Marca");
    await waitFor(() => expect((marca as HTMLSelectElement).options.length).toBeGreaterThan(1));
    fireEvent.change(marca, { target: { value: "FORD" } });

    buscar();

    expect(screen.getByRole("alert")).toHaveTextContent("Selecione marca, modelo e ano.");
  });
});
