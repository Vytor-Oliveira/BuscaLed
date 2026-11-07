import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import type { GarageVehicle } from "../api/vehicles";
import Garagem from "./Garagem";
import { mockarApi, renderizarComProvedores, sessaoDe } from "../test/render";

function veiculo(sobrescreve: Partial<GarageVehicle> = {}): GarageVehicle {
  return {
    id: "v-1",
    make: "VOLKSWAGEN",
    model: "GOL",
    year: 2018,
    createdAt: "2026-11-01T12:00:00.000Z",
    updatedAt: "2026-11-01T12:00:00.000Z",
    ...sobrescreve,
  };
}

function montar(
  vehicles: GarageVehicle[],
  extra?: (caminho: string, init?: RequestInit) => unknown
) {
  const chamadas = mockarApi((caminho, init) => {
    if (caminho === "/auth/me") {
      return sessaoDe("user");
    }
    const resposta = extra?.(caminho, init);
    if (resposta) {
      return resposta as { ok: boolean; status: number; corpo: unknown };
    }
    if (caminho === "/garage" && (init?.method ?? "GET") === "GET") {
      return { ok: true, status: 200, corpo: { vehicles } };
    }
    if (caminho === "/compatibility/makes") {
      return { ok: true, status: 200, corpo: { makes: ["VOLKSWAGEN"] } };
    }
    if (caminho === "/compatibility/models") {
      return {
        ok: true,
        status: 200,
        corpo: { models: [{ model: "GOL", yearStart: 2008, yearEnd: 2016 }] },
      };
    }
    return { ok: true, status: 200, corpo: {} };
  });

  renderizarComProvedores(
    <Routes>
      <Route path="/garagem" element={<Garagem />} />
      <Route path="/resultado" element={<p>Tela de resultado</p>} />
    </Routes>,
    { rota: "/garagem" }
  );
  return chamadas;
}

function naLista() {
  return within(screen.getByRole("list", { name: "Veículos salvos" }));
}

describe("Garagem", () => {
  it("lista os veículos salvos sem mostrar placa", async () => {
    montar([veiculo()]);

    expect(await screen.findByText("VOLKSWAGEN GOL")).toBeInTheDocument();
    expect(naLista().getByText("Ano 2018")).toBeInTheDocument();
    // RN02: nenhum dado em formato de placa aparece na lista. (A palavra
    // "placa" existe na cópia explicativa, e isso é intencional.)
    expect(
      naLista().queryByText((texto) =>
        /^[A-Z]{3}-?[0-9][A-Z0-9][0-9]{2}$/.test(texto.trim())
      )
    ).not.toBeInTheDocument();
  });

  it("liga cada veículo à compatibilidade dele", async () => {
    montar([veiculo()]);

    const link = await screen.findByRole("link", { name: /Ver LEDs compatíveis/ });
    expect(link).toHaveAttribute(
      "href",
      "/resultado?make=VOLKSWAGEN&model=GOL&year=2018"
    );
  });

  it("avisa quando a garagem está vazia", async () => {
    montar([]);

    expect(await screen.findByText("Sua garagem está vazia")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Adicionar meu primeiro veículo/ })
    ).toBeInTheDocument();
  });

  it("mostra o erro que a API devolveu", async () => {
    mockarApi((caminho) =>
      caminho === "/auth/me"
        ? sessaoDe("user")
        : { ok: false, status: 500, corpo: { error: "Garagem fora do ar." } }
    );
    renderizarComProvedores(
      <Routes>
        <Route path="/garagem" element={<Garagem />} />
      </Routes>,
      { rota: "/garagem" }
    );

    expect(await screen.findByText("Garagem fora do ar.")).toBeInTheDocument();
  });

  it("pede confirmação antes de remover", async () => {
    const chamadas = montar([veiculo()]);

    await screen.findByText("VOLKSWAGEN GOL");
    fireEvent.click(
      screen.getByRole("button", { name: /Remover VOLKSWAGEN GOL da garagem/ })
    );

    expect(await screen.findByText("Remover da garagem?")).toBeInTheDocument();
    expect(chamadas.some((c) => c.startsWith("DELETE"))).toBe(false);
  });

  it("remove depois de confirmar", async () => {
    const chamadas = montar([veiculo()], (caminho, init) =>
      caminho === "/garage/v-1" && init?.method === "DELETE"
        ? { ok: true, status: 204, corpo: null }
        : undefined
    );

    await screen.findByText("VOLKSWAGEN GOL");
    fireEvent.click(
      screen.getByRole("button", { name: /Remover VOLKSWAGEN GOL da garagem/ })
    );
    await screen.findByText("Remover da garagem?");
    fireEvent.click(screen.getByRole("button", { name: "Remover" }));

    await waitFor(() => expect(chamadas).toContain("DELETE /garage/v-1"));
  });

  it("abre o diálogo de adicionar com as duas formas de identificar", async () => {
    montar([veiculo()]);

    await screen.findByText("VOLKSWAGEN GOL");
    fireEvent.click(screen.getByRole("button", { name: /Adicionar veículo/ }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Pela placa" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Marca, modelo e ano" })).toBeInTheDocument();
  });

  it("salva veículo pela placa", async () => {
    const chamadas = montar([], (caminho, init) =>
      caminho === "/garage" && init?.method === "POST"
        ? { ok: true, status: 201, corpo: { vehicle: veiculo() } }
        : undefined
    );

    await screen.findByText("Sua garagem está vazia");
    fireEvent.click(screen.getByRole("button", { name: /Adicionar meu primeiro veículo/ }));
    await screen.findByRole("dialog");

    fireEvent.change(screen.getByLabelText("Placa"), { target: { value: "ABC1D23" } });
    fireEvent.click(screen.getByRole("button", { name: /Buscar e salvar/ }));

    await waitFor(() => expect(chamadas).toContain("POST /garage"));
  });

  it("recusa placa inválida antes de chamar a API", async () => {
    const chamadas = montar([]);

    await screen.findByText("Sua garagem está vazia");
    fireEvent.click(screen.getByRole("button", { name: /Adicionar meu primeiro veículo/ }));
    await screen.findByRole("dialog");

    fireEvent.change(screen.getByLabelText("Placa"), { target: { value: "AB" } });
    fireEvent.click(screen.getByRole("button", { name: /Buscar e salvar/ }));

    expect(await screen.findByText(/Confira a placa/)).toBeInTheDocument();
    expect(chamadas.filter((c) => c === "POST /garage")).toHaveLength(0);
  });

  // Fallback automático: falha de placa não trava o cadastro.
  it("cai para o manual quando a placa falha", async () => {
    montar([], (caminho, init) =>
      caminho === "/garage" && init?.method === "POST"
        ? { ok: false, status: 404, corpo: { error: "Placa não encontrada." } }
        : undefined
    );

    await screen.findByText("Sua garagem está vazia");
    fireEvent.click(screen.getByRole("button", { name: /Adicionar meu primeiro veículo/ }));
    await screen.findByRole("dialog");

    fireEvent.change(screen.getByLabelText("Placa"), { target: { value: "ABC1D23" } });
    fireEvent.click(screen.getByRole("button", { name: /Buscar e salvar/ }));

    expect(await screen.findByText(/Não achamos essa placa/)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Marca, modelo e ano" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });
});
