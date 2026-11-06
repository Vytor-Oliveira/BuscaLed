import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import Garagem from "./Garagem";

const perfil = { id: "u-1", name: "Carlos Silva", email: "c@example.com", role: "user" as const };

const veiculos = [
  { id: "v-1", make: "VOLKSWAGEN", model: "GOL", year: 2018, createdAt: "", updatedAt: "" },
  { id: "v-2", make: "HONDA", model: "CIVIC", year: 2019, createdAt: "", updatedAt: "" },
];

function mockApi(
  resolver: (url: string, init?: RequestInit) => { ok: boolean; status: number; corpo: unknown }
): string[] {
  const chamadas: string[] = [];
  globalThis.fetch = ((url: string, init?: RequestInit) => {
    chamadas.push(`${init?.method ?? "GET"} ${new URL(String(url)).pathname}`);
    const r = resolver(String(url), init);
    return Promise.resolve({ ok: r.ok, status: r.status, json: () => Promise.resolve(r.corpo) });
  }) as unknown as typeof fetch;
  return chamadas;
}

const sessao = { ok: true, status: 200, corpo: { user: perfil } };

function montar(entrada = "/garagem") {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[entrada]}>
        <Routes>
          <Route path="/garagem" element={<Garagem />} />
          <Route path="/resultado" element={<p>Vitrine</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

describe("Garagem", () => {
  it("lista os veículos salvos", async () => {
    mockApi((url) =>
      url.includes("/garage") ? { ok: true, status: 200, corpo: { vehicles: veiculos } } : sessao
    );
    montar();

    expect(await screen.findByText("VOLKSWAGEN GOL")).toBeInTheDocument();
    expect(screen.getByText("HONDA CIVIC")).toBeInTheDocument();
  });

  it("avisa quando a garagem está vazia", async () => {
    mockApi((url) =>
      url.includes("/garage") ? { ok: true, status: 200, corpo: { vehicles: [] } } : sessao
    );
    montar();

    expect(await screen.findByText("Nenhum veículo salvo ainda.")).toBeInTheDocument();
  });

  it("leva para a vitrine com o veículo escolhido", async () => {
    mockApi((url) =>
      url.includes("/garage") ? { ok: true, status: 200, corpo: { vehicles: veiculos } } : sessao
    );
    montar();

    await screen.findByText("VOLKSWAGEN GOL");
    fireEvent.click(screen.getAllByRole("button", { name: /Buscar LED/ })[0]);

    await waitFor(() => expect(screen.getByText("Vitrine")).toBeInTheDocument());
  });

  // A Home manda a placa por query quando a pessoa busca sem ter conta.
  it("já abre o formulário quando vem com placa na URL", async () => {
    mockApi((url) =>
      url.includes("/garage") ? { ok: true, status: 200, corpo: { vehicles: [] } } : sessao
    );
    montar("/garagem?placa=ABC1D23");

    expect(await screen.findByLabelText(/Placa/)).toHaveValue("ABC1D23");
  });

  it("remove um veículo da lista", async () => {
    mockApi((url, init) => {
      if (init?.method === "DELETE") return { ok: true, status: 204, corpo: null };
      return url.includes("/garage")
        ? { ok: true, status: 200, corpo: { vehicles: veiculos } }
        : sessao;
    });
    montar();

    await screen.findByText("VOLKSWAGEN GOL");
    fireEvent.click(screen.getByRole("button", { name: "Remover VOLKSWAGEN GOL" }));

    await waitFor(() => expect(screen.queryByText("VOLKSWAGEN GOL")).not.toBeInTheDocument());
    expect(screen.getByText("HONDA CIVIC")).toBeInTheDocument();
  });

  it("mostra o erro que a API devolveu ao adicionar", async () => {
    mockApi((url, init) => {
      if (init?.method === "POST") {
        return { ok: false, status: 404, corpo: { error: "Placa não encontrada." } };
      }
      return url.includes("/garage")
        ? { ok: true, status: 200, corpo: { vehicles: [] } }
        : sessao;
    });
    montar("/garagem?placa=ZZZ9Z99");

    const campo = await screen.findByLabelText(/Placa/);
    fireEvent.change(campo, { target: { value: "ZZZ9Z99" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar veículo" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Placa não encontrada.");
    });
  });
});
