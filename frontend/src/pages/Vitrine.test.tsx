import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import Vitrine from "./Vitrine";

const posicoes = [
  {
    position: "FAROL_BAIXO",
    socketCodes: ["H4"],
    models: [
      { ledModelId: "led-1", sku: "SHK-S14-H4", name: "Headlight S14", socketCode: "H4", imageUrl: "/leds/SLL-140004.jpg", inStock: true },
      { ledModelId: "led-2", sku: "SHK-S16-H4", name: "Ultraled S16", socketCode: "H4", imageUrl: "/leds/SLL-160004.jpg", inStock: false },
    ],
  },
  {
    position: "NEBLINA",
    socketCodes: ["H11"],
    models: [
      { ledModelId: "led-3", sku: "SHK-H11", name: "Fog H11", socketCode: "H11", imageUrl: null, inStock: true },
    ],
  },
  // Posição sem produto no catálogo: não deve virar cartão.
  { position: "PLACA", socketCodes: ["W5W"], models: [] },
];

function mockApi(resolver: (url: string) => { ok: boolean; status: number; corpo: unknown }) {
  globalThis.fetch = ((url: string) => {
    const r = resolver(String(url));
    return Promise.resolve({ ok: r.ok, status: r.status, json: () => Promise.resolve(r.corpo) });
  }) as unknown as typeof fetch;
}

const semSessao = { ok: false, status: 401, corpo: { error: "Não autenticado." } };

function montar(busca = "?make=VOLKSWAGEN&model=GOL&year=2018") {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[`/resultado${busca}`]}>
        <Routes>
          <Route path="/resultado" element={<Vitrine />} />
          <Route path="/confirmar" element={<p>Confirmar pedido</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

describe("Vitrine", () => {
  it("agrupa os LEDs por posição de farol", async () => {
    mockApi((url) =>
      url.includes("/compatibility") ? { ok: true, status: 200, corpo: { positions: posicoes } } : semSessao
    );
    montar();

    expect(await screen.findByText("Farol baixo")).toBeInTheDocument();
    expect(screen.getByText("Neblina")).toBeInTheDocument();
    expect(screen.getByText("Headlight S14")).toBeInTheDocument();
    expect(screen.getByText("Fog H11")).toBeInTheDocument();
  });

  // RF06 — posição sem produto cadastrado não tem o que escolher.
  it("omite posição que não tem nenhum produto no catálogo", async () => {
    mockApi((url) =>
      url.includes("/compatibility") ? { ok: true, status: 200, corpo: { positions: posicoes } } : semSessao
    );
    montar();

    await screen.findByText("Farol baixo");
    expect(screen.queryByText("Placa")).not.toBeInTheDocument();
  });

  // A foto é decorativa (o nome está no cartão), por isso alt="" e a busca
  // pelo src: produto sem imagem não pode ficar com a caixa vazia.
  it("mostra a foto do produto quando existe e o ícone quando não", async () => {
    mockApi((url) =>
      url.includes("/compatibility") ? { ok: true, status: 200, corpo: { positions: posicoes } } : semSessao
    );
    const { container } = montar();

    await screen.findByText("Headlight S14");
    expect(container.querySelector('img[src="/leds/SLL-140004.jpg"]')).toBeInTheDocument();

    const semFoto = screen.getByText("Fog H11").closest("li");
    expect(semFoto?.querySelector("img")).toBeNull();
    expect(semFoto?.querySelector("svg")).toBeInTheDocument();
  });

  it("não deixa escolher modelo sem estoque", async () => {
    mockApi((url) =>
      url.includes("/compatibility") ? { ok: true, status: 200, corpo: { positions: posicoes } } : semSessao
    );
    montar();

    await screen.findByText("Ultraled S16");
    expect(screen.getByText("Esgotado")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Indisponível" })).toBeDisabled();
  });

  it("acumula a seleção e mostra a barra de reserva", async () => {
    mockApi((url) =>
      url.includes("/compatibility") ? { ok: true, status: 200, corpo: { positions: posicoes } } : semSessao
    );
    montar();

    await screen.findByText("Headlight S14");
    expect(screen.queryByRole("button", { name: /Reservar pedido/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "+ Adicionar" })[0]);

    expect(screen.getByText("✓ Adicionado")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reservar pedido/ })).toBeInTheDocument();
  });

  it("leva para a confirmação ao reservar", async () => {
    mockApi((url) =>
      url.includes("/compatibility") ? { ok: true, status: 200, corpo: { positions: posicoes } } : semSessao
    );
    montar();

    await screen.findByText("Headlight S14");
    fireEvent.click(screen.getAllByRole("button", { name: "+ Adicionar" })[0]);
    fireEvent.click(screen.getByRole("button", { name: /Reservar pedido/ }));

    await waitFor(() => expect(screen.getByText("Confirmar pedido")).toBeInTheDocument());
  });

  it("mostra o 404 do motor quando o veículo não está na matriz", async () => {
    mockApi((url) =>
      url.includes("/compatibility")
        ? { ok: false, status: 404, corpo: { error: "Veículo não encontrado na matriz." } }
        : semSessao
    );
    montar();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Veículo não encontrado na matriz.");
    });
  });

  it("cobra marca, modelo e ano antes de chamar a API", async () => {
    mockApi(() => semSessao);
    montar("?make=&model=&year=0");

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Informe marca, modelo e ano");
    });
  });
});
