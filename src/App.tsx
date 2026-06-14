import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Clock, FileUp, LogOut, MapPin, RefreshCw, Send, Settings } from "lucide-react";
import {
  getAlerts,
  getEmployee,
  loginEmployee,
  registerPonto,
  requestAdjustment,
  submitSickLeave,
} from "./api";
import type { AlertsResponse, Employee, LocationPayload } from "./types";
import { fileToBase64, formatDateTime, getCurrentLocation } from "./utils";

type Notice = {
  tone: "success" | "error" | "info";
  text: string;
};

const TOKEN_KEY = "employee-ponto-token";

function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [alerts, setAlerts] = useState<AlertsResponse | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }

    getEmployee(token)
      .then(setEmployee)
      .then(() => loadAlerts(token))
      .catch(() => logout());
  }, [token]);

  const isLoggedIn = !!token && !!employee;

  async function loadAlerts(currentToken = token) {
    const data = await getAlerts(currentToken);
    setAlerts(data);
  }

  function saveSession(nextToken: string, nextEmployee: Employee) {
    localStorage.setItem(TOKEN_KEY, nextToken);
    setToken(nextToken);
    setEmployee(nextEmployee);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setEmployee(null);
    setAlerts(null);
  }

  async function handleRegisterPonto() {
    try {
      setIsBusy(true);
      setNotice({ tone: "info", text: "Obtendo localização atual..." });
      const location = await getCurrentLocation();
      const result = await registerPonto(token, location);
      setNotice({ tone: "success", text: `${result.message}. ${result.locationMessage || ""}` });
      await loadAlerts();
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Erro ao registrar ponto." });
    } finally {
      setIsBusy(false);
    }
  }

  if (!isLoggedIn) {
    return (
      <LoginScreen
        onLogin={saveSession}
        notice={notice}
        setNotice={setNotice}
      />
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Ponto do Funcionário</p>
          <h1>{employee.nome}</h1>
          {employee.funcao && <p className="muted">{employee.funcao}</p>}
        </div>
        <button className="icon-button" onClick={logout} title="Sair">
          <LogOut size={20} />
        </button>
      </header>

      {notice && <NoticeBanner notice={notice} onClose={() => setNotice(null)} />}

      <main className="main-grid">
        <section className="primary-panel">
          <div>
            <p className="eyebrow">Registro com localização</p>
            <h2>Registrar ponto agora</h2>
            <p className="muted">
              O navegador vai pedir sua localização atual. O backend valida precisão e área permitida antes de gravar.
            </p>
          </div>
          <button className="primary-action" onClick={handleRegisterPonto} disabled={isBusy}>
            <MapPin size={22} />
            {isBusy ? "Registrando..." : "Registrar ponto"}
          </button>
        </section>

        <AlertsPanel alerts={alerts} onRefresh={() => loadAlerts().catch((error) => {
          setNotice({ tone: "error", text: error instanceof Error ? error.message : "Erro ao atualizar alertas." });
        })} />

        <AdjustmentForm token={token} setNotice={setNotice} />
        <SickLeaveForm token={token} setNotice={setNotice} />
      </main>
    </div>
  );
}

function LoginScreen({
  onLogin,
  notice,
  setNotice,
}: {
  onLogin: (token: string, employee: Employee) => void;
  notice: Notice | null;
  setNotice: (notice: Notice | null) => void;
}) {
  const [cpf, setCpf] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    try {
      setIsBusy(true);
      const result = await loginEmployee(cpf, whatsapp);
      onLogin(result.token, result.employee);
      setNotice({ tone: "success", text: "Sessão iniciada com sucesso." });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Erro ao entrar." });
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-panel" onSubmit={handleSubmit}>
        <div>
          <p className="eyebrow">Acesso do funcionário</p>
          <h1>Ponto do Funcionário</h1>
          <p className="muted">Entre com CPF e WhatsApp cadastrados no sistema.</p>
        </div>

        {notice && <NoticeBanner notice={notice} onClose={() => setNotice(null)} />}

        <label>
          CPF
          <input
            value={cpf}
            onChange={(event) => setCpf(event.target.value)}
            placeholder="000.000.000-00"
            autoComplete="username"
          />
        </label>

        <label>
          WhatsApp
          <input
            value={whatsapp}
            onChange={(event) => setWhatsapp(event.target.value)}
            placeholder="5551983165466"
            autoComplete="tel"
          />
        </label>

        <button className="primary-action" disabled={isBusy}>
          <Send size={20} />
          {isBusy ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}

function AlertsPanel({ alerts, onRefresh }: { alerts: AlertsResponse | null; onRefresh: () => void }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Alertas</p>
          <h2>Situação de hoje</h2>
        </div>
        <button className="icon-button" onClick={onRefresh} title="Atualizar alertas">
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="alert-list">
        {(alerts?.alerts || []).map((alert) => (
          <div className={`alert-item ${alert.severity}`} key={alert.type}>
            <AlertCircle size={18} />
            <span>{alert.message}</span>
          </div>
        ))}
        {!alerts && <p className="muted">Carregando alertas...</p>}
      </div>

      {alerts && (
        <div className="record-list">
          {alerts.registros.map((registro) => (
            <div className="record-row" key={registro.id}>
              <Clock size={16} />
              <span>{formatDateTime(registro.dataHora)}</span>
              <small>{registro.tipoMensagem}</small>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function AdjustmentForm({ token, setNotice }: { token: string; setNotice: (notice: Notice) => void }) {
  const [requestedDataHora, setRequestedDataHora] = useState("");
  const [tipoSolicitado, setTipoSolicitado] = useState("E");
  const [reason, setReason] = useState("");
  const [includeLocation, setIncludeLocation] = useState(true);
  const [isBusy, setIsBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    try {
      setIsBusy(true);
      let location: Partial<LocationPayload> = {};
      if (includeLocation) {
        location = await getCurrentLocation();
      }

      const result = await requestAdjustment(token, {
        requestedDataHora,
        tipoSolicitado,
        reason,
        ...location,
      });

      setRequestedDataHora("");
      setReason("");
      setNotice({ tone: "success", text: result.message });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Erro ao solicitar ajuste." });
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Correção</p>
          <h2>Solicitar ajuste</h2>
        </div>
        <Settings size={20} />
      </div>

      <form className="form-grid" onSubmit={handleSubmit}>
        <label>
          Data e hora
          <input
            type="datetime-local"
            value={requestedDataHora}
            onChange={(event) => setRequestedDataHora(event.target.value)}
            required
          />
        </label>

        <label>
          Tipo
          <select value={tipoSolicitado} onChange={(event) => setTipoSolicitado(event.target.value)}>
            <option value="E">Entrada</option>
            <option value="A">Almoço</option>
            <option value="R">Retorno</option>
            <option value="S">Saída</option>
          </select>
        </label>

        <label className="wide">
          Motivo
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Explique o que aconteceu"
            minLength={10}
            required
          />
        </label>

        <label className="checkbox-row wide">
          <input
            type="checkbox"
            checked={includeLocation}
            onChange={(event) => setIncludeLocation(event.target.checked)}
          />
          Incluir localização atual na solicitação
        </label>

        <button className="secondary-action wide" disabled={isBusy}>
          {isBusy ? "Enviando..." : "Enviar ajuste"}
        </button>
      </form>
    </section>
  );
}

function SickLeaveForm({ token, setNotice }: { token: string; setNotice: (notice: Notice) => void }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const fileLabel = useMemo(() => file ? `${file.name} (${Math.round(file.size / 1024)} KB)` : "PDF ou imagem", [file]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!file) {
      setNotice({ tone: "error", text: "Selecione o arquivo do atestado." });
      return;
    }

    try {
      setIsBusy(true);
      const fileData = await fileToBase64(file);
      const result = await submitSickLeave(token, {
        startDate,
        endDate,
        reason,
        fileName: file.name,
        fileMimeType: file.type || "application/octet-stream",
        fileSize: file.size,
        fileData,
      });

      setStartDate("");
      setEndDate("");
      setReason("");
      setFile(null);
      setNotice({ tone: "success", text: result.message });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Erro ao enviar atestado." });
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Afastamento</p>
          <h2>Enviar atestado</h2>
        </div>
        <FileUp size={20} />
      </div>

      <form className="form-grid" onSubmit={handleSubmit}>
        <label>
          Início
          <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
        </label>

        <label>
          Fim
          <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} required />
        </label>

        <label className="wide">
          Observação
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Informação adicional, se necessário"
          />
        </label>

        <label className="file-drop wide">
          <FileUp size={20} />
          <span>{fileLabel}</span>
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            required
          />
        </label>

        <button className="secondary-action wide" disabled={isBusy}>
          {isBusy ? "Enviando..." : "Enviar atestado"}
        </button>
      </form>
    </section>
  );
}

function NoticeBanner({ notice, onClose }: { notice: Notice; onClose: () => void }) {
  return (
    <div className={`notice ${notice.tone}`} role="status">
      <span>{notice.text}</span>
      <button onClick={onClose}>Fechar</button>
    </div>
  );
}

export default App;
