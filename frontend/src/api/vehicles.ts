import { api } from "./client";

export interface GarageVehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  createdAt: string;
  updatedAt: string;
}

export function listVehicles(): Promise<{ vehicles: GarageVehicle[] }> {
  return api<{ vehicles: GarageVehicle[] }>("/garage");
}

// O backend aceita placa OU marca/modelo/ano — a placa é resolvida lá, e
// nunca é gravada (RN02).
export function addVehicleByPlate(plate: string): Promise<{ vehicle: GarageVehicle }> {
  return api<{ vehicle: GarageVehicle }>("/garage", { method: "POST", body: { plate } });
}

export function addVehicleByDetails(
  make: string,
  model: string,
  year: number
): Promise<{ vehicle: GarageVehicle }> {
  return api<{ vehicle: GarageVehicle }>("/garage", {
    method: "POST",
    body: { make, model, year },
  });
}

export function updateVehicle(
  id: string,
  dados: { make?: string; model?: string; year?: number }
): Promise<{ vehicle: GarageVehicle }> {
  return api<{ vehicle: GarageVehicle }>(`/garage/${id}`, { method: "PATCH", body: dados });
}

export function removeVehicle(id: string): Promise<void> {
  return api<void>(`/garage/${id}`, { method: "DELETE" });
}
