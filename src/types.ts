export type Employee = {
  id: number;
  nome: string;
  whatsapp: string | null;
  funcao?: string | null;
};

export type LoginResponse = {
  token: string;
  employee: Employee;
};

export type LocationPayload = {
  latitude: number;
  longitude: number;
  accuracy?: number;
};

export type EmployeeAlert = {
  type: string;
  severity: "info" | "warning";
  message: string;
};

export type AlertsResponse = {
  date: string;
  registros: Array<{
    id: number;
    dataHora: string;
    tipoMensagem: string;
    latitude?: string | null;
    longitude?: string | null;
  }>;
  alerts: EmployeeAlert[];
};
