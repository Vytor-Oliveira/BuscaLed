import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SearchesPerDay } from "../../../api/analytics";
import { formatarInteiro } from "../../../lib/formato";

interface Props {
  dados: SearchesPerDay[];
}

function rotuloDoDia(dia: string): string {
  // "YYYY-MM-DD" já vem no fuso de São Paulo pelo backend; construir Date com
  // a string crua jogaria para UTC e deslocaria o rótulo um dia.
  const [, mes, data] = dia.split("-");
  return `${data}/${mes}`;
}

function CaixaDeDica({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }
  const valor = payload[0]?.value ?? 0;
  return (
    <div className="rounded-[var(--radius-sm)] border border-line-strong bg-raised px-3 py-2 shadow-lg">
      <p className="text-[12px] font-semibold uppercase tracking-wider text-subtle">
        {label ? rotuloDoDia(label) : ""}
      </p>
      <p data-numeros className="mt-0.5 text-[15px] font-bold text-ink">
        {formatarInteiro(valor)} {valor === 1 ? "busca" : "buscas"}
      </p>
    </div>
  );
}

/**
 * Série única: o título já diz o que é, então não existe legenda. Um só matiz,
 * malha recessiva e marca fina — a leitura é a tendência, não o valor exato de
 * cada ponto (esse vem no hover).
 */
export function GraficoBuscas({ dados }: Props) {
  // O backend devolve a serie inteira, com os dias vazios em zero e agrupada
  // no fuso de Brasilia: preencher de novo aqui usaria o dia do navegador.
  const serie = dados;
  const vazio = serie.every((d) => d.count === 0);

  if (vazio) {
    return (
      <div className="grid h-56 place-items-center rounded-[var(--radius-sm)] bg-sunken">
        <p className="max-w-[34ch] px-4 text-center text-[13.5px] leading-snug text-muted">
          Nenhuma busca de compatibilidade neste período. O gráfico aparece quando
          alguém consultar um veículo.
        </p>
      </div>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={serie} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="preenchimentoBuscas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand-600)" stopOpacity={0.26} />
              <stop offset="100%" stopColor="var(--brand-600)" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey="day"
            tickFormatter={rotuloDoDia}
            tick={{ fill: "var(--text-subtle)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tick={{ fill: "var(--text-subtle)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            width={44}
          />
          <Tooltip
            content={<CaixaDeDica />}
            cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="count"
            name="Buscas"
            stroke="var(--brand-600)"
            strokeWidth={2}
            fill="url(#preenchimentoBuscas)"
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
