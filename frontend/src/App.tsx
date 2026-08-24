const STEPS = [
  { title: "Busca pelo carro", description: "Informe a placa ou selecione Marca/Modelo/Ano." },
  { title: "Encontra o LED certo", description: "O motor cruza os dados com o catálogo Shocklight." },
  { title: "Pedido estruturado", description: "O pedido é enviado ao representante por e-mail." },
];

export default function App() {
  return (
    <main>
      <h1>BuscaLED</h1>
      <p>Descubra qual LED serve no seu carro. Sem tabelas. Sem WhatsApp. Em segundos.</p>

      <section aria-label="Como funciona">
        <h2>Como funciona</h2>
        <ol>
          {STEPS.map((step) => (
            <li key={step.title}>
              <strong>{step.title}</strong>
              <p>{step.description}</p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
