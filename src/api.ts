import type { AlertsResponse, Employee, LocationPayload, LoginResponse } from "./types";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

function getApiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const url = getApiUrl(path);
  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "X-Employee-Token": token } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    throw new Error(`Não foi possível conectar em ${url}. Verifique se o backend está rodando e se o CORS permite este app.`);
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.message || `Erro ${response.status}`);
  }

  return data as T;
}

export function loginEmployee(cpf: string, whatsapp: string) {
  return request<LoginResponse>("/api/employee/login", {
    method: "POST",
    body: JSON.stringify({ cpf, whatsapp }),
  });
}

export function getEmployee(token: string) {
  return request<Employee>("/api/employee/me", {}, token);
}

export function getAlerts(token: string) {
  return request<AlertsResponse>("/api/employee/alerts", {}, token);
}

export function registerPonto(token: string, location: LocationPayload) {
  return request<{ message: string; locationMessage?: string }>("/api/employee/ponto/register", {
    method: "POST",
    body: JSON.stringify(location),
  }, token);
}

export function requestAdjustment(
  token: string,
  payload: {
    requestedDataHora: string;
    tipoSolicitado: string;
    reason: string;
  } & Partial<LocationPayload>,
) {
  return request<{ message: string }>("/api/employee/ponto/adjustment-request", {
    method: "POST",
    body: JSON.stringify(payload),
  }, token);
}

export function submitSickLeave(
  token: string,
  payload: {
    startDate: string;
    endDate: string;
    reason?: string;
    fileName: string;
    fileMimeType: string;
    fileSize: number;
    fileData: string;
  },
) {
  return request<{ message: string }>("/api/employee/sick-leave", {
    method: "POST",
    body: JSON.stringify(payload),
  }, token);
}
