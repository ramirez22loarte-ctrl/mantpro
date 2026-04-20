import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "./supabase.js";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";

// ── PARÁMETROS POR DISCIPLINA ────────────────────────────────
const DEFAULT_PARAMS = {
  "Mecánico": [
    { name: "Caudal", unit: "L/S" },
    { name: "Presión", unit: "PSI" },
    { name: "T° Lado Libre Motor", unit: "°C" },
    { name: "T° Lado Acople Motor", unit: "°C" },
    { name: "T° Lado Libre Bomba", unit: "°C" },
    { name: "T° Lado Acople Bomba", unit: "°C" },
    { name: "Vibración Axial Bomba", unit: "mm/s" },
    { name: "Vibración Axial Motor", unit: "mm/s" },
    { name: "Vibración Lado Libre Motor", unit: "mm/s" },
    { name: "Vibración Lado Acople Motor", unit: "mm/s" },
    { name: "Vibración Lado Libre Bomba", unit: "mm/s" },
    { name: "Vibración Lado Acople Bomba", unit: "mm/s" },
  ],
  "Eléctrico": [
    { name: "Corriente Fase I", unit: "A" },
    { name: "Corriente Fase II", unit: "A" },
    { name: "Corriente Fase III", unit: "A" },
    { name: "Voltaje 1-2", unit: "V" },
    { name: "Voltaje 2-3", unit: "V" },
    { name: "Voltaje 1-3", unit: "V" },
    { name: "Frecuencia", unit: "Hz" },
    { name: "Potencia", unit: "W" },
    { name: "Horómetro", unit: "hrs" },
    { name: "Corriente Nominal Motor", unit: "A" },
  ],
  "Instrumentación": [
    { name: "RTD01", unit: "°C" },
    { name: "RTD02", unit: "°C" },
    { name: "RTD03", unit: "°C" },
    { name: "RTD04", unit: "°C" },
    { name: "RTD05", unit: "°C" },
    { name: "RTD06", unit: "°C" },
    { name: "RTD07", unit: "°C" },
    { name: "RTD08", unit: "°C" },
  ],
};

const DISCIPLINES = ["Mecánico", "Eléctrico", "Instrumentación"];
const PRIORITIES = ["Crítica", "Alta", "Media", "Baja"];
const STATUSES = ["Abierta", "En Progreso", "En Revisión", "Cerrada"];
const D_ICON = { "Mecánico": "⚙️", "Eléctrico": "⚡", "Instrumentación": "📡" };
const D_COLOR = { "Mecánico": "#f97316", "Eléctrico": "#facc15", "Instrumentación": "#22d3ee" };
const P_COLOR = { "Crítica": "#ef4444", "Alta": "#f97316", "Media": "#eab308", "Baja": "#22c55e" };
const S_COLOR = {
  "Abierta": { bg: "#1e3a5f", text: "#60a5fa", dot: "#3b82f6" },
  "En Progreso": { bg: "#1e3a2a", text: "#34d399", dot: "#10b981" },
  "En Revisión": { bg: "#3a2a1e", text: "#fbbf24", dot: "#f59e0b" },
  "Cerrada": { bg: "#2a1e3a", text: "#a78bfa", dot: "#8b5cf6" },
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{background:#060b14;color:#e2e8f0;font-family:'DM Sans',sans-serif}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#060b14}::-webkit-scrollbar-thumb{background:#1e293b;border-radius:2px}
input,textarea,select{outline:none;font-family:'DM Sans',sans-serif;color:#e2e8f0}
.btn{cursor:pointer;border:none;border-radius:7px;font-family:'DM Sans',sans-serif;font-weight:500;transition:all .15s}
.btn:hover{filter:brightness(1.12)}.btn:disabled{opacity:.4;cursor:not-allowed}
.nav{cursor:pointer;padding:7px 11px;border-radius:7px;transition:all .15s;display:flex;align-items:center;gap:9px;font-size:13px;color:#64748b;white-space:nowrap}
.nav:hover{background:#111c30;color:#cbd5e1}.nav.on{background:#0f2040;color:#60a5fa;font-weight:600}
.inp{background:#07111f;border:1px solid #1a2740;border-radius:7px;padding:9px 12px;font-size:13.5px;width:100%;transition:border .15s}
.inp:focus{border-color:#3b82f6}
.card{background:#0b1629;border:1px solid #14213a;border-radius:12px;padding:18px}
.row{background:#0b1629;border:1px solid #14213a;border-radius:10px;padding:13px 16px;cursor:pointer;transition:all .18s}
.row:hover{border-color:#2563eb;transform:translateY(-1px)}
.tag{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:99px;font-size:11px;font-weight:600}
.ov{position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:200;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px)}
.mod{background:#0b1629;border:1px solid #1a2740;border-radius:14px;width:720px;max-width:96vw;max-height:92vh;overflow-y:auto;padding:26px}
.fd{animation:fd .25s ease}@keyframes fd{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.ptable{width:100%;border-collapse:collapse;font-size:12.5px}
.ptable th{padding:8px 10px;text-align:left;color:#475569;font-weight:600;border-bottom:1px solid #14213a;font-size:11px;text-transform:uppercase;letter-spacing:.05em}
.ptable td{padding:7px 10px;border-bottom:1px solid #0a1120;vertical-align:middle}
.spin{width:18px;height:18px;border:2px solid #1e293b;border-top-color:#3b82f6;border-radius:50%;animation:sp .7s linear infinite;display:inline-block}
@keyframes sp{to{transform:rotate(360deg)}}
`;

function Lbl({ l, children }) {
  return <div><div style={{ fontSize: 10, color: "#334155", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>{l}</div>{children}</div>;
}
function STag({ status }) {
  const sc = S_COLOR[status] || S_COLOR["Abierta"];
  return <span className="tag" style={{ background: sc.bg, color: sc.text }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: sc.dot, display: "inline-block" }} />{status}</span>;
}
function Spinner() { return <div className="spin" />; }

// ── DB HELPERS ───────────────────────────────────────────────
const db = {
  async login(email, password) {
    const { data, error } = await supabase.from("users").select("*").eq("email", email).eq("password", password).single();
    return { data, error };
  },
  async getLocations() { const { data } = await supabase.from("locations").select("*").order("name"); return data || []; },
  async getEquipment() { const { data } = await supabase.from("equipment").select("*").order("name"); return data || []; },
  async getJIs() { const { data } = await supabase.from("job_instructions").select("*").order("code"); return data || []; },
  async getUsers() { const { data } = await supabase.from("users").select("*").order("name"); return data || []; },
  async getOTs(userId, isAdmin) {
    let q = supabase.from("work_orders").select("*").order("created_at", { ascending: false });
    if (!isAdmin) q = q.eq("assigned_to", userId);
    const { data } = await q;
    return data || [];
  },
  async getParams(otId) { const { data } = await supabase.from("parameters").select("*").eq("ot_id", otId).order("sort_order"); return data || []; },
  async getReadings(otId) { const { data } = await supabase.from("readings").select("*, parameters(name, unit, sort_order)").eq("ot_id", otId).order("created_at"); return data || []; },
  async getComments(otId) { const { data } = await supabase.from("comments").select("*, users(name, role, discipline)").eq("ot_id", otId).order("created_at"); return data || []; },
  async getAllReadings() { const { data } = await supabase.from("readings").select("*, parameters(name, unit), work_orders(discipline)").order("created_at"); return data || []; },
  async createLocation(loc) { const { data } = await supabase.from("locations").insert(loc).select().single(); return data; },
  async createEquipment(eq) { const { data } = await supabase.from("equipment").insert(eq).select().single(); return data; },
  async createJI(ji) { const { data } = await supabase.from("job_instructions").insert(ji).select().single(); return data; },
  async createOT(ot, params) {
    const { data: otData } = await supabase.from("work_orders").insert(ot).select().single();
    if (otData && params.length) {
      await supabase.from("parameters").insert(params.map((p, i) => ({ ...p, ot_id: otData.id, sort_order: i })));
    }
    return otData;
  },
  async updateOTStatus(id, status) { await supabase.from("work_orders").update({ status }).eq("id", id); },
  async addReading(r) { const { data } = await supabase.from("readings").insert(r).select().single(); return data; },
  async addComment(c) { const { data } = await supabase.from("comments").insert(c).select("*, users(name, role, discipline)").single(); return data; },
  async createUser(u) { const { data, error } = await supabase.from('users').insert(u).select().single(); return { data, error }; },
  async createOTsBulk(ots, params) {
    const results = [];
    for (const ot of ots) {
      try {
        const { data: otData } = await supabase.from('work_orders').insert(ot).select().single();
        if (otData) {
          const disc = ot.discipline;
          const defaultParams = (DEFAULT_PARAMS[disc] || []).map((p, i) => ({ ...p, ot_id: otData.id, expected: '', sort_order: i }));
          if (defaultParams.length) await supabase.from('parameters').insert(defaultParams);
          results.push({ ok: true, id: otData.id });
        }
      } catch(e) { results.push({ ok: false, id: ot.id, error: e.message }); }
    }
    return results;
  },
};

// ── NEW USER MODAL ────────────────────────────────────────────
function NewUser({ onClose, onSave }) {
  const [f, setF] = useState({ name: "", email: "", password: "", role: "tecnico", discipline: "Mecánico" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const s = (k, v) => setF(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!f.name || !f.email || !f.password) { setErr("Nombre, email y contraseña son obligatorios."); return; }
    setSaving(true); setErr("");
    const { data, error } = await db.createUser({ ...f, discipline: f.role === "admin" ? null : f.discipline });
    if (error) { setErr("Error: email ya existe o datos inválidos."); setSaving(false); return; }
    onSave(data);
    setSaving(false);
  };

  return (
    <div className="ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="mod fd" style={{ width: 420 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 16, color: "#f1f5f9" }}>👤 Nuevo Usuario</div>
          <button className="btn" onClick={onClose} style={{ background: "#111c30", color: "#64748b", padding: "5px 11px" }}>✕</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <Lbl l="Nombre completo *"><input className="inp" placeholder="Juan Pérez" value={f.name} onChange={e => s("name", e.target.value)} /></Lbl>
          <Lbl l="Email *"><input className="inp" placeholder="usuario@empresa.com" value={f.email} onChange={e => s("email", e.target.value)} /></Lbl>
          <Lbl l="Contraseña *"><input className="inp" type="password" placeholder="Contraseña" value={f.password} onChange={e => s("password", e.target.value)} /></Lbl>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Lbl l="Rol"><select className="inp" value={f.role} onChange={e => s("role", e.target.value)}><option value="tecnico">Técnico</option><option value="admin">Administrador</option></select></Lbl>
            {f.role === "tecnico" && <Lbl l="Disciplina"><select className="inp" value={f.discipline} onChange={e => s("discipline", e.target.value)}>{["Mecánico","Eléctrico","Instrumentación"].map(d => <option key={d}>{d}</option>)}</select></Lbl>}
          </div>
          {err && <div style={{ fontSize: 12, color: "#f87171", background: "#3b0f0f", padding: "8px 12px", borderRadius: 7 }}>{err}</div>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button className="btn" onClick={onClose} style={{ background: "#111c30", color: "#64748b", padding: "8px 16px", fontSize: 13 }}>Cancelar</button>
            <button className="btn" onClick={submit} disabled={saving} style={{ background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", color: "#fff", padding: "8px 20px", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
              {saving ? "Creando..." : "Crear Usuario"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


// ── EXCEL IMPORT MODAL ───────────────────────────────────────
function ExcelImport({ onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [done, setDone] = useState(false);
  const fileRef = useRef();

  const DISC_MAP = {
    "mecánico": "Mecánico", "mecanico": "Mecánico",
    "electricidad": "Eléctrico", "eléctrico": "Eléctrico", "electrico": "Eléctrico", "elec": "Eléctrico",
    "instrumentación": "Instrumentación", "instrumentacion": "Instrumentación", "inst": "Instrumentación",
  };

  const parseExcel = async (f) => {
    setLoading(true);
    setStatus("Leyendo Excel...");
    const buf = await f.arrayBuffer();
    const XLSX = window.XLSX;
    if (!XLSX) { setStatus("⚠️ Error: librería Excel no cargada."); setLoading(false); return; }
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];

    // Encabezados en fila 12 (índice 11 en base 0)
    // Datos desde fila 13 (índice 12 en base 0)
    // C(2) = Tag, E(4) = N° OT, G(6) = Disciplina, H(7) = Descripción
    const ref = XLSX.utils.decode_range(ws["!ref"] || "A1:Z1000");
    const maxRow = ref.e.r;
    const DATA_START_ROW = 12; // fila 13 en base 0

    const mapped = [];
    const seen = new Set();

    for (let r = DATA_START_ROW; r <= maxRow; r++) {
      const cellE = ws[XLSX.utils.encode_cell({ r, c: 4 })]; // col E = N° OT
      const cellG = ws[XLSX.utils.encode_cell({ r, c: 6 })]; // col G = Disciplina
      const cellC = ws[XLSX.utils.encode_cell({ r, c: 2 })]; // col C = Tag equipo
      const cellH = ws[XLSX.utils.encode_cell({ r, c: 7 })]; // col H = Descripción

      if (!cellE || !cellG) continue;

      const otNum = String(cellE.v).trim();
      const discRaw = String(cellG.v || "").trim().toLowerCase();
      const tag = cellC ? String(cellC.v).trim() : "";
      const desc = cellH ? String(cellH.v).trim() : "";

      if (!otNum || otNum === "" || !/^\d+$/.test(otNum)) continue;

      const disc = DISC_MAP[discRaw] ||
        (discRaw.includes("mec") ? "Mecánico" :
         discRaw.includes("elec") ? "Eléctrico" :
         discRaw.includes("inst") ? "Instrumentación" : "Mecánico");

      const key = otNum + "|" + disc;
      if (!seen.has(key)) {
        seen.add(key);
        mapped.push({ otNum, disc, tag, desc });
      }
    }

    setPreview(mapped.slice(0, 300));
    setLoading(false);
    if (mapped.length === 0) {
      setStatus("⚠️ No se encontraron OTs. Verifica que los datos empiecen en la fila 13.");
    } else {
      setStatus(`✅ Se encontraron ${mapped.length} órdenes de trabajo únicas.`);
    }
  };

  const handleFile = async (f) => {
    setFile(f);
    setPreview([]);
    setDone(false);
    await parseExcel(f);
  };

  const importOTs = async () => {
    if (!preview.length) return;
    setLoading(true);
    setStatus("Importando OTs...");
    let ok = 0, fail = 0, errMsg = "";
    for (const row of preview) {
      const id = row.otNum;
      const ot = {
        id,
        title: row.desc || ("OT " + id),
        discipline: row.disc,
        priority: "Media",
        status: "Abierta",
        description: "Tag: " + row.tag + " | " + (row.desc || ""),
        created_at: new Date().toISOString().split("T")[0],
        equipment_id: null,
        location_id: null,
        assigned_to: null,
        job_instruction_id: null,
        due_date: null,
      };
      const { data: otData, error } = await supabase.from("work_orders").insert(ot).select().single();
      if (otData) {
        const defaultParams = (DEFAULT_PARAMS[row.disc] || []).map((p, i) => ({
          name: p.name, unit: p.unit, expected: "", ot_id: otData.id, sort_order: i
        }));
        if (defaultParams.length) await supabase.from("parameters").insert(defaultParams);
        ok++;
      } else {
        fail++;
        if (error && !errMsg) errMsg = error.message;
      }
      setStatus("Importando... " + (ok + fail) + "/" + preview.length);
    }
    setLoading(false);
    setDone(true);
    setStatus("✅ " + ok + " OTs importadas. " + (fail > 0 ? "⚠️ " + fail + " fallaron: " + errMsg : ""));
    onImported();
  };

  return (
    <div className="ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="mod fd" style={{ width: 700 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 16, color: "#f1f5f9" }}>📥 Importar OTs desde Excel</div>
          <button className="btn" onClick={onClose} style={{ background: "#111c30", color: "#64748b", padding: "5px 11px" }}>✕</button>
        </div>

        {/* Upload area */}
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          style={{ border: "2px dashed #1a2740", borderRadius: 10, padding: 28, textAlign: "center", cursor: "pointer", marginBottom: 16, background: "#060b14", transition: "border .2s" }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "#3b82f6"}
          onMouseLeave={e => e.currentTarget.style.borderColor = "#1a2740"}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
          <div style={{ fontSize: 14, color: "#64748b" }}>
            {file ? <span style={{ color: "#34d399", fontWeight: 600 }}>{file.name}</span> : "Arrastra tu Excel aquí o haz clic para seleccionar"}
          </div>
          <div style={{ fontSize: 11, color: "#334155", marginTop: 4 }}>Soporta .xlsx y .xls</div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }}
            onChange={e => { const f = e.target.files[0]; if (f) handleFile(f); }} />
        </div>

        {loading && <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, color: "#64748b", fontSize: 13 }}><Spinner /> {status}</div>}
        {!loading && status && <div style={{ fontSize: 13, color: done ? "#34d399" : "#60a5fa", marginBottom: 12, padding: "8px 12px", background: "#060b14", borderRadius: 7 }}>{status}</div>}

        {preview.length > 0 && !done && (
          <div>
            <div style={{ fontSize: 12, color: "#475569", marginBottom: 8 }}>Vista previa — primeras {Math.min(preview.length, 10)} OTs:</div>
            <div style={{ overflowX: "auto", marginBottom: 14 }}>
              <table className="ptable">
                <thead><tr>{["N° OT","Disciplina","Tag Equipo","Descripción"].map(h => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {preview.slice(0, 10).map((r, i) => (
                    <tr key={i}>
                      <td style={{ color: "#3b82f6", fontFamily: "Syne,sans-serif", fontSize: 11, fontWeight: 700 }}>{r.otNum}</td>
                      <td><span style={{ color: D_COLOR[r.disc] }}>{D_ICON[r.disc]} {r.disc}</span></td>
                      <td style={{ color: "#64748b", fontSize: 11 }}>{r.tag?.slice(0, 30)}</td>
                      <td style={{ color: "#94a3b8", fontSize: 11 }}>{r.desc?.slice(0, 50)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn" onClick={onClose} style={{ background: "#111c30", color: "#64748b", padding: "8px 16px", fontSize: 13 }}>Cancelar</button>
              <button className="btn" onClick={importOTs} style={{ background: "linear-gradient(135deg,#065f46,#0f766e)", color: "#34d399", padding: "8px 20px", fontSize: 13 }}>
                ⬆️ Importar {preview.length} OTs
              </button>
            </div>
          </div>
        )}
        {done && <div style={{ display: "flex", justifyContent: "flex-end" }}><button className="btn" onClick={onClose} style={{ background: "#0f2040", color: "#60a5fa", padding: "8px 20px", fontSize: 13 }}>Cerrar</button></div>}
      </div>
    </div>
  );
}

// ── TECH OT SEARCH ────────────────────────────────────────────
function TechOTSearch({ user, onFound }) {
  const [otNum, setOtNum] = useState("");
  const [disc, setDisc] = useState(user.discipline || "Mecánico");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const search = async () => {
    if (!otNum.trim()) return;
    setLoading(true); setErr("");
    const { data } = await supabase.from("work_orders").select("*").eq("id", otNum.trim()).single();
    if (data) onFound(data);
    else setErr("No se encontró la OT. Verifica el número.");
    setLoading(false);
  };

  return (
    <div className="ov" onClick={e => e.target === e.currentTarget && null}>
      <div className="mod fd" style={{ width: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
          <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 17, color: "#f1f5f9" }}>Buscar Orden de Trabajo</div>
          <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>Ingresa el número de tu OT para acceder a los parámetros</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <Lbl l="N° Orden de Trabajo">
            <input className="inp" placeholder="Ej: 2000194307" value={otNum}
              onChange={e => setOtNum(e.target.value)}
              onKeyDown={e => e.key === "Enter" && search()}
              style={{ fontFamily: "Syne,sans-serif", fontSize: 16, letterSpacing: "0.05em" }} />
          </Lbl>
          <Lbl l="Tu Disciplina">
            <select className="inp" value={disc} onChange={e => setDisc(e.target.value)}>
              {["Mecánico","Eléctrico","Instrumentación"].map(d => <option key={d}>{d}</option>)}
            </select>
          </Lbl>
          {err && <div style={{ fontSize: 12, color: "#f87171", background: "#3b0f0f", padding: "8px 12px", borderRadius: 7 }}>{err}</div>}
          <button className="btn" onClick={search} disabled={loading || !otNum.trim()}
            style={{ background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", color: "#fff", padding: "12px", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {loading ? <><Spinner /> Buscando...</> : "🔍 Buscar OT"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── LOGIN ─────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const go = async () => {
    if (!email || !pass) return;
    setLoading(true); setErr("");
    const { data, error } = await db.login(email, pass);
    if (data) onLogin(data);
    else setErr("Credenciales incorrectas.");
    setLoading(false);
  };

  return (
    <div style={{ background: "linear-gradient(160deg,#03111f 60%,#003a6b 100%)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{CSS}</style>
      <div style={{ width: 380, background: "#0b1629", border: "1px solid #14213a", borderRadius: 16, padding: 36 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ margin: "0 auto 20px", textAlign: "center" }}>
            <svg width="160" height="52" viewBox="0 0 200 65" xmlns="http://www.w3.org/2000/svg">
              <rect width="200" height="65" rx="10" fill="#0076BE"/>
              <text x="100" y="38" fontFamily="Arial,sans-serif" fontSize="32" fontWeight="900" fill="white" textAnchor="middle" letterSpacing="2">xylem</text>
              <text x="100" y="55" fontFamily="Arial,sans-serif" fontSize="9" fill="white" textAnchor="middle" letterSpacing="1" opacity="0.85">LET'S SOLVE WATER</text>
            </svg>
          </div>
          <div style={{ fontSize: 13, color: "#60a5fa", marginTop: 0, fontWeight: 600, letterSpacing: "0.05em" }}>Portal de Mantenimiento Industrial</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Lbl l="Correo electrónico"><input className="inp" placeholder="usuario@empresa.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && go()} /></Lbl>
          <Lbl l="Contraseña"><input className="inp" type="password" placeholder="••••••••" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === "Enter" && go()} /></Lbl>
          {err && <div style={{ fontSize: 12, color: "#f87171", background: "#3b0f0f", padding: "8px 12px", borderRadius: 7 }}>{err}</div>}
          <button className="btn" onClick={go} disabled={loading} style={{ background: "#0076BE", color: "#fff", padding: "12px", fontSize: 14, marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 8 }}>
            {loading ? <><Spinner /> Ingresando...</> : "Ingresar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── OT ROW ───────────────────────────────────────────────────
function OTRow({ ot, equipment, onClick }) {
  const eq = equipment.find(e => e.id === ot.equipment_id);
  return (
    <div className="row" onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 36, height: 36, background: "#060b14", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>{D_ICON[ot.discipline]}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "Syne,sans-serif", fontSize: 11, color: "#3b82f6", fontWeight: 700 }}>{ot.id}</span>
          <STag status={ot.status} />
          <span style={{ fontSize: 10, color: P_COLOR[ot.priority] }}>● {ot.priority}</span>
        </div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "#f1f5f9", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ot.title}</div>
        <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{eq?.name || "—"} · Vence: {ot.due_date || "—"}</div>
      </div>
      <div style={{ fontSize: 20, flexShrink: 0 }}>{D_ICON[ot.discipline]}</div>
    </div>
  );
}

// ── OT DETAIL ────────────────────────────────────────────────
function OTDetail({ ot, equipment, locations, jis, users, user, isAdmin, onClose, onStatusChange }) {
  const [params, setParams] = useState([]);
  const [readings, setReadings] = useState([]);
  const [comments, setComments] = useState([]);
  const [vals, setVals] = useState({});
  const [comment, setComment] = useState("");
  const [tab, setTab] = useState("params");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(ot.status);

  const eq = equipment.find(e => e.id === ot.equipment_id);
  const loc = locations.find(l => l.id === ot.location_id);
  const ji = jis.find(j => j.id === ot.job_instruction_id);
  const sc = S_COLOR[status] || S_COLOR["Abierta"];

  useEffect(() => {
    const loadParams = async () => {
      let p = await db.getParams(ot.id);
      // Check if existing params match discipline - if not, delete and recreate
      if (p && p.length > 0) {
        const expectedNames = (DEFAULT_PARAMS[ot.discipline] || []).map(d => d.name);
        const hasCorrectParams = p.some(param => expectedNames.includes(param.name));
        if (!hasCorrectParams) {
          // Wrong discipline params - delete and recreate
          await supabase.from("parameters").delete().eq("ot_id", ot.id);
          p = [];
        }
      }
      if (!p || p.length === 0) {
        const disc = ot.discipline;
        const defaults = (DEFAULT_PARAMS[disc] || []).map((dp, i) => ({
          name: dp.name, unit: dp.unit, expected: "", ot_id: ot.id, sort_order: i
        }));
        if (defaults.length) {
          const { data } = await supabase.from("parameters").insert(defaults).select();
          p = data || defaults.map((d, i) => ({ ...d, id: i + 1 }));
        }
      }
      setParams(p || []);
    };
    loadParams();
    db.getReadings(ot.id).then(setReadings);
    db.getComments(ot.id).then(setComments);
  }, [ot.id]);

  const lastReading = (paramId) => {
    const r = readings.filter(r => r.parameter_id === paramId);
    return r[r.length - 1];
  };

  const allReadingsForParam = (paramId) => {
    return readings.filter(r => r.parameter_id === paramId);
  };

  const saveAll = async () => {
    setSaving(true);
    const entries = Object.entries(vals).filter(([, v]) => v.trim());
    for (const [pid, val] of entries) {
      const r = await db.addReading({ parameter_id: parseInt(pid), ot_id: ot.id, value: val, recorded_by: user.id });
      if (r) setReadings(prev => [...prev, r]);
    }
    setVals({});
    setSaving(false);
  };

  const postComment = async () => {
    if (!comment.trim()) return;
    const c = await db.addComment({ ot_id: ot.id, user_id: user.id, text: comment });
    if (c) setComments(prev => [...prev, c]);
    setComment("");
  };

  const changeStatus = async (s) => {
    await db.updateOTStatus(ot.id, s);
    setStatus(s);
    onStatusChange(ot.id, s);
  };

  const TABS = [{ k: "params", l: "📏 Parámetros" }, { k: "comments", l: "💬 Comentarios" }, { k: "info", l: "ℹ️ Info" }, { k: "ji", l: "📖 Procedimiento" }];

  const closeAndExport = async () => {
    // 1. Save all pending parameter readings
    setSaving(true);
    const entries = Object.entries(vals).filter(([, v]) => v && v.trim());
    for (const [pid, val] of entries) {
      const r = await db.addReading({ parameter_id: parseInt(pid), ot_id: ot.id, value: val, recorded_by: user.id });
      if (r) setReadings(prev => [...prev, r]);
    }
    setVals({});

    // 2. Close OT
    await changeStatus("Cerrada");

    // 3. Generate PDF
    const allR = await db.getReadings(ot.id);
    const allC = await db.getComments(ot.id);

    const printWindow = window.open("", "_blank");
    const paramRows = params.map(p => {
      const rs = allR.filter(r => r.parameter_id === p.id);
      const lastR = rs[rs.length - 1];
      return "<tr><td style='padding:8px 12px;border-bottom:1px solid #eee;font-weight:500'>" + p.name + " (" + p.unit + ")</td><td style='padding:8px 12px;border-bottom:1px solid #eee;color:" + (lastR ? "#065f46" : "#999") + ";font-weight:700'>" + (lastR ? lastR.value + " " + p.unit : "Sin datos") + "</td><td style='padding:8px 12px;border-bottom:1px solid #eee;color:#666;font-size:11px'>" + (lastR ? new Date(lastR.created_at).toLocaleString("es-CO") : "—") + "</td></tr>";
    }).join("");

    const commentRows = allC.map(c => "<tr><td style='padding:8px 12px;border-bottom:1px solid #eee;color:#666;font-size:11px'>" + new Date(c.created_at).toLocaleString("es-CO") + "</td><td style='padding:8px 12px;border-bottom:1px solid #eee'>" + c.text + "</td></tr>").join("");

    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>OT ${ot.id}</title><style>
      body{font-family:Arial,sans-serif;margin:30px;color:#111}
      h1{font-size:20px;margin-bottom:4px}
      h2{font-size:14px;color:#0076BE;margin:20px 0 8px;border-bottom:2px solid #0076BE;padding-bottom:4px}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:16px;border-bottom:3px solid #0076BE}
      .logo{font-size:28px;font-weight:900;color:#0076BE;letter-spacing:2px}
      .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:#e0f2fe;color:#0076BE}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th{background:#0076BE;color:white;padding:8px 12px;text-align:left;font-size:11px}
      tr:nth-child(even) td{background:#f8fafc}
      .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}
      .info-item{background:#f8fafc;padding:10px 14px;border-radius:6px;border-left:3px solid #0076BE}
      .info-label{font-size:10px;color:#666;text-transform:uppercase;letter-spacing:0.05em}
      .info-value{font-size:13px;font-weight:600;color:#111;margin-top:2px}
      @media print{body{margin:15px}}
    </style></head><body>
    <div class="header">
      <div><div class="logo">xylem</div><div style="font-size:10px;color:#666;margin-top:2px">LET'S SOLVE WATER</div></div>
      <div style="text-align:right"><div style="font-size:18px;font-weight:700">Cierre de Orden de Trabajo</div><div style="font-size:11px;color:#666;margin-top:2px">Generado: ${new Date().toLocaleString("es-CO")}</div></div>
    </div>
    <h1>${ot.title}</h1>
    <div style="margin-bottom:16px"><span class="badge">${ot.id}</span> &nbsp; <span class="badge" style="background:#dcfce7;color:#065f46">${ot.discipline}</span> &nbsp; <span class="badge" style="background:#ede9fe;color:#5b21b6">✅ Cerrada</span></div>
    <div class="info-grid">
      <div class="info-item"><div class="info-label">Descripción</div><div class="info-value">${ot.title}</div></div>
      <div class="info-item"><div class="info-label">Disciplina</div><div class="info-value">${ot.discipline}</div></div>
      <div class="info-item"><div class="info-label">Fecha Inicio</div><div class="info-value">${ot.created_at || "—"}</div></div>
      <div class="info-item"><div class="info-label">Fecha Cierre</div><div class="info-value">${new Date().toLocaleDateString("es-CO")}</div></div>
    </div>
    <h2>📏 Parámetros Medidos</h2>
    <table><thead><tr><th>Parámetro</th><th>Valor Registrado</th><th>Fecha / Hora</th></tr></thead><tbody>${paramRows}</tbody></table>
    ${allC.length > 0 ? `<h2>💬 Comentarios</h2><table><thead><tr><th style="width:160px">Fecha</th><th>Comentario</th></tr></thead><tbody>${commentRows}</tbody></table>` : ""}
    <div style="margin-top:30px;padding-top:16px;border-top:1px solid #eee;display:flex;justify-content:space-between;font-size:11px;color:#666">
      <div>Técnico responsable: ${user.name}</div>
      <div>MantPRO — Xylem · Sistema de Gestión de Mantenimiento</div>
    </div>
    <script>window.onload=()=>{window.print();}</script>
    </body></html>`);
    printWindow.document.close();
    setSaving(false);
  };

  return (
    <div className="ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="mod fd">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 6 }}>
              <span className="tag" style={{ background: sc.bg, color: sc.text }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: sc.dot, display: "inline-block" }} />{status}</span>
              <span className="tag" style={{ background: "#111", color: P_COLOR[ot.priority], border: `1px solid ${P_COLOR[ot.priority]}33` }}>● {ot.priority}</span>
              <span className="tag" style={{ background: "#111c30", color: D_COLOR[ot.discipline] }}>{D_ICON[ot.discipline]} {ot.discipline}</span>
            </div>
            <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 15, color: "#f1f5f9" }}>{ot.title}</div>
            <div style={{ fontSize: 11, color: "#475569", marginTop: 3 }}>{ot.id} · {eq?.name}</div>
          </div>
          <button className="btn" onClick={onClose} style={{ background: "#111c30", color: "#64748b", padding: "5px 12px", flexShrink: 0 }}>✕</button>
        </div>

        <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid #14213a", paddingBottom: 10, flexWrap: "wrap" }}>
          {TABS.map(t => (
            <button key={t.k} className="btn" onClick={() => setTab(t.k)}
              style={{ padding: "5px 13px", fontSize: 12, background: tab === t.k ? "#0f2040" : "transparent", color: tab === t.k ? "#60a5fa" : "#475569", border: `1px solid ${tab === t.k ? "#1d4ed8" : "transparent"}` }}>
              {t.l}
            </button>
          ))}
        </div>

        {tab === "params" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: D_COLOR[ot.discipline], fontWeight: 600 }}>
                {D_ICON[ot.discipline]} Parámetros {ot.discipline} — {params.length} campos
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn" onClick={saveAll} disabled={saving || Object.values(vals).every(v => !v?.trim()) || status === "Cerrada"}
                  style={{ background: "linear-gradient(135deg,#065f46,#0f766e)", color: "#34d399", padding: "7px 16px", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                  {saving ? <><Spinner /> Guardando...</> : "💾 Guardar"}
                </button>
                {status !== "Cerrada" ? (
                  <button className="btn" onClick={closeAndExport} disabled={saving}
                    style={{ background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", color: "#fff", padding: "7px 16px", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                    {saving ? <><Spinner /> Procesando...</> : "✅ Cerrar OT y Descargar PDF"}
                  </button>
                ) : (
                  <button className="btn" onClick={closeAndExport}
                    style={{ background: "#0f2040", color: "#60a5fa", padding: "7px 16px", fontSize: 13 }}>
                    📄 Descargar PDF
                  </button>
                )}
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#060b14" }}>
                    <th style={{ padding: "10px 14px", textAlign: "left", color: "#475569", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #1a2740", width: "40%" }}>
                      Parámetro
                    </th>
                    <th style={{ padding: "10px 14px", textAlign: "left", color: "#475569", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #1a2740", width: "20%" }}>
                      Última lectura
                    </th>
                    <th style={{ padding: "10px 14px", textAlign: "left", color: "#475569", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #1a2740", width: "40%" }}>
                      Ingresar Información
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {params.map((p, idx) => {
                    const last = lastReading(p.id);
                    return (
                      <tr key={p.id} style={{ background: idx % 2 === 0 ? "#0b1629" : "#060b14", borderBottom: "1px solid #0f172a" }}>
                        <td style={{ padding: "11px 14px", color: "#f1f5f9", fontWeight: 500 }}>
                          {p.name}
                          <span style={{ color: "#475569", fontSize: 11, marginLeft: 6 }}>({p.unit})</span>
                        </td>
                        <td style={{ padding: "11px 14px" }}>
                          {allReadingsForParam(p.id).length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                              {allReadingsForParam(p.id).map((r, ri) => (
                                <div key={ri}>
                                  <span style={{ color: "#34d399", fontWeight: 700 }}>{r.value} {p.unit}</span>
                                  <span style={{ color: "#334155", fontSize: 10, marginLeft: 5 }}>{new Date(r.created_at).toLocaleDateString("es-CO")}</span>
                                </div>
                              ))}
                            </div>
                          ) : <span style={{ color: "#334155", fontSize: 11 }}>Sin datos</span>}
                        </td>
                        <td style={{ padding: "7px 14px" }}>
                          <input
                            className="inp"
                            style={{ padding: "8px 12px", fontSize: 13, background: vals[p.id] ? "#0f2040" : "#07111f", borderColor: vals[p.id] ? "#3b82f6" : "#1a2740" }}
                            placeholder={"Valor en " + p.unit}
                            value={vals[p.id] || ""}
                            onChange={e => setVals(prev => ({ ...prev, [p.id]: e.target.value }))}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "comments" && (
          <div>
            {comments.length === 0
              ? <div style={{ color: "#334155", textAlign: "center", padding: 20, fontSize: 13 }}>Sin comentarios aún.</div>
              : <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                {comments.map(c => (
                  <div key={c.id} style={{ background: "#060b14", borderRadius: 8, padding: "10px 13px", borderLeft: `3px solid ${c.users?.discipline ? D_COLOR[c.users.discipline] : "#3b82f6"}` }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 5, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>{c.users?.name}</span>
                      <span style={{ fontSize: 10, color: "#475569" }}>{c.users?.role === "admin" ? "Admin" : `Téc. ${c.users?.discipline}`}</span>
                      <span style={{ fontSize: 10, color: "#334155", marginLeft: "auto" }}>{new Date(c.created_at).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}</span>
                    </div>
                    <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>{c.text}</p>
                  </div>
                ))}
              </div>}
            <div style={{ borderTop: "1px solid #14213a", paddingTop: 12 }}>
              <textarea className="inp" rows={3} placeholder="Escribe una novedad técnica..." value={comment} onChange={e => setComment(e.target.value)} style={{ resize: "vertical", marginBottom: 8 }} />
              <button className="btn" onClick={postComment} disabled={!comment.trim()} style={{ background: "linear-gradient(135deg,#1d4ed8,#6d28d9)", color: "#fff", padding: "8px 16px", fontSize: 13 }}>Agregar comentario</button>
            </div>
          </div>
        )}

        {tab === "info" && (
          <div>
            <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6, marginBottom: 14 }}>{ot.description || "Sin descripción."}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
              {[{ l: "Equipo", v: eq?.name }, { l: "Ubicación", v: loc?.name }, { l: "Vence", v: ot.due_date }, { l: "Creada", v: ot.created_at }].map(i => (
                <div key={i.l} style={{ background: "#060b14", borderRadius: 7, padding: "9px 11px" }}>
                  <div style={{ fontSize: 10, color: "#334155", textTransform: "uppercase", marginBottom: 3 }}>{i.l}</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#cbd5e1" }}>{i.v || "—"}</div>
                </div>
              ))}
            </div>
            {isAdmin && (
              <div>
                <div style={{ fontSize: 11, color: "#475569", marginBottom: 7 }}>Cambiar estado:</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {STATUSES.map(s => { const c = S_COLOR[s]; return (
                    <button key={s} className="btn" onClick={() => changeStatus(s)}
                      style={{ fontSize: 11, padding: "5px 11px", background: status === s ? c.bg : "#111c30", color: status === s ? c.text : "#475569", border: `1px solid ${status === s ? c.dot : "transparent"}` }}>{s}</button>
                  ); })}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "ji" && (
          <div>
            {ji ? (
              <div>
                <div style={{ display: "flex", gap: 7, marginBottom: 10 }}>
                  <span style={{ fontFamily: "Syne,sans-serif", fontSize: 11, color: "#3b82f6", fontWeight: 700 }}>{ji.code}</span>
                  <span className="tag" style={{ background: ji.risk === "Alto" ? "#3b0f0f" : ji.risk === "Medio" ? "#3a2a1e" : "#1e3a2a", color: ji.risk === "Alto" ? "#f87171" : ji.risk === "Medio" ? "#fbbf24" : "#34d399" }}>Riesgo {ji.risk}</span>
                </div>
                <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 14, color: "#f1f5f9", marginBottom: 12 }}>{ji.title}</div>
                {(ji.steps || []).map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "#060b14", borderRadius: 7, padding: "9px 12px", marginBottom: 6 }}>
                    <div style={{ width: 22, height: 22, background: "#0f2040", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#3b82f6", fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                    <span style={{ fontSize: 13, color: "#94a3b8" }}>{s}</span>
                  </div>
                ))}
              </div>
            ) : <div style={{ color: "#334155", textAlign: "center", padding: 24 }}>Sin procedimiento asignado.</div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── NEW OT MODAL ─────────────────────────────────────────────
function NewOT({ equipment, locations, jis, users, onClose, onSave }) {
  const [f, setF] = useState({ title: "", equipment_id: "", location_id: "", discipline: "Mecánico", priority: "Media", assigned_to: "", job_instruction_id: "", due_date: "", description: "" });
  const [saving, setSaving] = useState(false);
  const s = (k, v) => setF(p => ({ ...p, [k]: v }));
  const previewParams = DEFAULT_PARAMS[f.discipline] || [];

  const submit = async () => {
    if (!f.title) return;
    setSaving(true);
    const id = "OT-" + Date.now().toString().slice(-6);
    const params = previewParams.map((p, i) => ({ name: p.name, unit: p.unit, expected: "", sort_order: i }));
    const ot = await db.createOT({
      id, title: f.title, discipline: f.discipline, priority: f.priority,
      equipment_id: parseInt(f.equipment_id) || null, location_id: parseInt(f.location_id) || null,
      assigned_to: parseInt(f.assigned_to) || null, job_instruction_id: parseInt(f.job_instruction_id) || null,
      due_date: f.due_date || null, description: f.description, status: "Abierta",
      created_at: new Date().toISOString().split("T")[0]
    }, params);
    if (ot) onSave(ot);
    setSaving(false);
  };

  return (
    <div className="ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="mod fd">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 16, color: "#f1f5f9" }}>+ Nueva Orden de Trabajo</div>
          <button className="btn" onClick={onClose} style={{ background: "#111c30", color: "#64748b", padding: "5px 11px" }}>✕</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <Lbl l="Título *"><input className="inp" placeholder="Título de la OT" value={f.title} onChange={e => s("title", e.target.value)} /></Lbl>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Lbl l="Disciplina"><select className="inp" value={f.discipline} onChange={e => s("discipline", e.target.value)}>{DISCIPLINES.map(d => <option key={d}>{d}</option>)}</select></Lbl>
            <Lbl l="Prioridad"><select className="inp" value={f.priority} onChange={e => s("priority", e.target.value)}>{PRIORITIES.map(p => <option key={p}>{p}</option>)}</select></Lbl>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Lbl l="Equipo"><select className="inp" value={f.equipment_id} onChange={e => s("equipment_id", e.target.value)}><option value="">Seleccionar</option>{equipment.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></Lbl>
            <Lbl l="Ubicación"><select className="inp" value={f.location_id} onChange={e => s("location_id", e.target.value)}><option value="">Seleccionar</option>{locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></Lbl>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Lbl l="Técnico"><select className="inp" value={f.assigned_to} onChange={e => s("assigned_to", e.target.value)}><option value="">Seleccionar</option>{users.filter(u => u.role === "tecnico").map(u => <option key={u.id} value={u.id}>{u.name} ({u.discipline})</option>)}</select></Lbl>
            <Lbl l="Fecha límite"><input className="inp" type="date" value={f.due_date} onChange={e => s("due_date", e.target.value)} /></Lbl>
          </div>
          <Lbl l="Job Instruction"><select className="inp" value={f.job_instruction_id} onChange={e => s("job_instruction_id", e.target.value)}><option value="">Sin instrucción</option>{jis.map(j => <option key={j.id} value={j.id}>{j.code} — {j.title}</option>)}</select></Lbl>
          <Lbl l="Descripción"><textarea className="inp" rows={2} value={f.description} onChange={e => s("description", e.target.value)} style={{ resize: "vertical" }} /></Lbl>
          <div style={{ background: "#060b14", borderRadius: 9, padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: D_COLOR[f.discipline], marginBottom: 8 }}>{D_ICON[f.discipline]} Parámetros precargados — {f.discipline} ({previewParams.length})</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {previewParams.map((p, i) => <span key={i} style={{ background: "#0b1629", border: "1px solid #14213a", borderRadius: 5, padding: "3px 8px", fontSize: 11, color: "#64748b" }}>{p.name} ({p.unit})</span>)}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn" onClick={onClose} style={{ background: "#111c30", color: "#64748b", padding: "8px 16px", fontSize: 13 }}>Cancelar</button>
            <button className="btn" onClick={submit} disabled={!f.title || saving}
              style={{ background: f.title && !saving ? "linear-gradient(135deg,#1d4ed8,#7c3aed)" : "#111c30", color: f.title && !saving ? "#fff" : "#475569", padding: "8px 20px", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
              {saving ? <><Spinner /> Creando...</> : "Crear OT"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── NEW EQUIPMENT ─────────────────────────────────────────────
function NewEquip({ locations, onClose, onSave }) {
  const [f, setF] = useState({ code: "", name: "", type: "", area: "", subarea: "", discipline: "Mecánico", status: "Operativo", location_id: null });
  const [saving, setSaving] = useState(false);
  const s = (k, v) => setF(p => ({ ...p, [k]: v }));
  const submit = async () => {
    setSaving(true);
    const data = await db.createEquipment({ ...f, location_id: null });
    if (data) onSave(data);
    setSaving(false);
  };
  return (
    <div className="ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="mod fd" style={{ width: 460 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 16, color: "#f1f5f9" }}>🏭 Nuevo Equipo</div>
          <button className="btn" onClick={onClose} style={{ background: "#111c30", color: "#64748b", padding: "5px 11px" }}>✕</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Lbl l="Código *"><input className="inp" placeholder="BOM-102" value={f.code} onChange={e => s("code", e.target.value)} /></Lbl>
            <Lbl l="Tipo"><input className="inp" placeholder="Bomba, Motor..." value={f.type} onChange={e => s("type", e.target.value)} /></Lbl>
          </div>
          <Lbl l="Nombre *"><input className="inp" placeholder="Nombre del equipo" value={f.name} onChange={e => s("name", e.target.value)} /></Lbl>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Lbl l="Área"><input className="inp" placeholder="Área" value={f.area} onChange={e => s("area", e.target.value)} /></Lbl>
            <Lbl l="Sub-área"><input className="inp" placeholder="Sub-área" value={f.subarea} onChange={e => s("subarea", e.target.value)} /></Lbl>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Lbl l="Disciplina"><select className="inp" value={f.discipline} onChange={e => s("discipline", e.target.value)}>{DISCIPLINES.map(d => <option key={d}>{d}</option>)}</select></Lbl>
            <Lbl l="Estado"><select className="inp" value={f.status} onChange={e => s("status", e.target.value)}><option>Operativo</option><option>En mantenimiento</option><option>Fuera de servicio</option></select></Lbl>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button className="btn" onClick={onClose} style={{ background: "#111c30", color: "#64748b", padding: "8px 16px", fontSize: 13 }}>Cancelar</button>
            <button className="btn" onClick={submit} disabled={!f.code || saving} style={{ background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", color: "#fff", padding: "8px 18px", fontSize: 13 }}>{saving ? "Guardando..." : "Guardar"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── NEW LOCATION ──────────────────────────────────────────────
function NewLoc({ onClose, onSave }) {
  const [f, setF] = useState({ name: "", area: "", level: "" });
  const [saving, setSaving] = useState(false);
  const submit = async () => { setSaving(true); const data = await db.createLocation(f); if (data) onSave(data); setSaving(false); };
  return (
    <div className="ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="mod fd" style={{ width: 400 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 16, color: "#f1f5f9" }}>📍 Nueva Ubicación</div>
          <button className="btn" onClick={onClose} style={{ background: "#111c30", color: "#64748b", padding: "5px 11px" }}>✕</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Lbl l="Nombre *"><input className="inp" placeholder="Planta C" value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} /></Lbl>
          <Lbl l="Área"><input className="inp" placeholder="Producción..." value={f.area} onChange={e => setF(p => ({ ...p, area: e.target.value }))} /></Lbl>
          <Lbl l="Nivel"><input className="inp" placeholder="Nivel 1..." value={f.level} onChange={e => setF(p => ({ ...p, level: e.target.value }))} /></Lbl>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button className="btn" onClick={onClose} style={{ background: "#111c30", color: "#64748b", padding: "8px 16px", fontSize: 13 }}>Cancelar</button>
            <button className="btn" onClick={submit} disabled={!f.name || saving} style={{ background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", color: "#fff", padding: "8px 18px", fontSize: 13 }}>{saving ? "Guardando..." : "Guardar"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── NEW JI ────────────────────────────────────────────────────
function NewJI({ onClose, onSave }) {
  const [f, setF] = useState({ code: "", title: "", discipline: "Mecánico", risk: "Medio" });
  const [steps, setSteps] = useState([""]);
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    setSaving(true);
    const data = await db.createJI({ ...f, steps: steps.filter(s => s.trim()) });
    if (data) onSave(data);
    setSaving(false);
  };
  return (
    <div className="ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="mod fd">
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 16, color: "#f1f5f9" }}>📖 Nueva Job Instruction</div>
          <button className="btn" onClick={onClose} style={{ background: "#111c30", color: "#64748b", padding: "5px 11px" }}>✕</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Lbl l="Código"><input className="inp" placeholder="JI-MEC-002" value={f.code} onChange={e => setF(p => ({ ...p, code: e.target.value }))} /></Lbl>
            <Lbl l="Riesgo"><select className="inp" value={f.risk} onChange={e => setF(p => ({ ...p, risk: e.target.value }))}><option>Bajo</option><option>Medio</option><option>Alto</option></select></Lbl>
          </div>
          <Lbl l="Título *"><input className="inp" value={f.title} onChange={e => setF(p => ({ ...p, title: e.target.value }))} /></Lbl>
          <Lbl l="Disciplina"><select className="inp" value={f.discipline} onChange={e => setF(p => ({ ...p, discipline: e.target.value }))}>{DISCIPLINES.map(d => <option key={d}>{d}</option>)}</select></Lbl>
          <div>
            <div style={{ fontSize: 10, color: "#334155", marginBottom: 7, textTransform: "uppercase" }}>Pasos</div>
            {steps.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 7, marginBottom: 6 }}>
                <div style={{ width: 22, height: 36, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#3b82f6", fontWeight: 700 }}>{i + 1}</div>
                <input className="inp" placeholder={`Paso ${i + 1}`} value={s} onChange={e => setSteps(prev => prev.map((v, j) => j === i ? e.target.value : v))} />
                {steps.length > 1 && <button className="btn" onClick={() => setSteps(prev => prev.filter((_, j) => j !== i))} style={{ background: "#3b0f0f", color: "#f87171", padding: "0 9px" }}>✕</button>}
              </div>
            ))}
            <button className="btn" onClick={() => setSteps(p => [...p, ""])} style={{ background: "#111c30", color: "#60a5fa", padding: "5px 13px", fontSize: 12, marginTop: 3 }}>+ Paso</button>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button className="btn" onClick={onClose} style={{ background: "#111c30", color: "#64748b", padding: "8px 16px", fontSize: 13 }}>Cancelar</button>
            <button className="btn" onClick={submit} disabled={!f.title || saving} style={{ background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", color: "#fff", padding: "8px 18px", fontSize: 13 }}>{saving ? "Guardando..." : "Guardar"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MAIN APP ─────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [locations, setLocations] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [jis, setJis] = useState([]);
  const [users, setUsers] = useState([]);
  const [ots, setOts] = useState([]);
  const [allReadings, setAllReadings] = useState([]);
  const [page, setPage] = useState("dashboard");
  const [selOT, setSelOT] = useState(null);
  const [modal, setModal] = useState(null);
  const [sideOpen, setSideOpen] = useState(true);
  const [loading, setLoading] = useState(false);

  const isAdmin = user?.role === "admin";
  const myOTs = isAdmin ? ots : ots.filter(o => o.assigned_to === user?.id);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      db.getLocations().then(setLocations),
      db.getEquipment().then(setEquipment),
      db.getJIs().then(setJis),
      db.getUsers().then(setUsers),
      db.getOTs(user.id, isAdmin).then(setOts),
      db.getAllReadings().then(setAllReadings),
    ]).finally(() => setLoading(false));
  }, [user]);

  const kpiData = DISCIPLINES.map(d => ({
    d: d.slice(0, 4),
    Abiertas: myOTs.filter(o => o.discipline === d && o.status === "Abierta").length,
    Progreso: myOTs.filter(o => o.discipline === d && o.status === "En Progreso").length,
    Cerradas: myOTs.filter(o => o.discipline === d && o.status === "Cerrada").length,
  }));

  const stats = {
    total: myOTs.length,
    open: myOTs.filter(o => o.status === "Abierta").length,
    prog: myOTs.filter(o => o.status === "En Progreso").length,
    closed: myOTs.filter(o => o.status === "Cerrada").length,
    crit: myOTs.filter(o => o.priority === "Crítica").length,
  };

  const closeModal = () => { setModal(null); setSelOT(null); };

  if (!user) return <Login onLogin={u => { setUser(u); }} />;

  const ADMIN_NAV = [
    { k: "dashboard", i: "📊", l: "Dashboard" },
    { k: "ots", i: "📋", l: "Órdenes de Trabajo" },
    { k: "equipment", i: "🏭", l: "Equipos" },
    { k: "ji", i: "📖", l: "Job Instructions" },
    { k: "kpi", i: "📈", l: "Indicadores KPI" },
    { k: "dashboard_op", i: "📡", l: "Dashboard Operativo" },
    { k: "verificacion", i: "✅", l: "Verificación" },
    { k: "users", i: "👥", l: "Usuarios" },
  ];
  const TECH_NAV = [
    { k: "dashboard", i: "📊", l: "Mi Dashboard" },
    { k: "ots", i: "📋", l: "Mis Órdenes" },
    { k: "kpi", i: "📈", l: "Historial" },
  ];
  const NAV = isAdmin ? ADMIN_NAV : TECH_NAV;
  const curNav = NAV.find(n => n.k === page);

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", background: "#060b14", minHeight: "100vh", color: "#e2e8f0", display: "flex" }}>
      <style>{CSS}</style>

      {/* Sidebar */}
      <div style={{ width: sideOpen ? 224 : 58, background: "#070e1b", borderRight: "1px solid #111c30", display: "flex", flexDirection: "column", transition: "width .22s", overflow: "hidden", flexShrink: 0, position: "sticky", top: 0, height: "100vh" }}>
        <div style={{ padding: "16px 12px", borderBottom: "1px solid #111c30", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🔧</div>
          {sideOpen && <div><div style={{ fontFamily: "Syne,sans-serif", fontSize: 14, fontWeight: 800, color: "#f1f5f9" }}>MantPRO</div><div style={{ fontSize: 9, color: "#334155" }}>CMMS INDUSTRIAL</div></div>}
        </div>
        <nav style={{ padding: "10px 6px", flex: 1, display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
          {NAV.map(n => (
            <div key={n.k} className={`nav${page === n.k ? " on" : ""}`} onClick={() => setPage(n.k)}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>{n.i}</span>
              {sideOpen && <span>{n.l}</span>}
            </div>
          ))}
        </nav>
        <div style={{ padding: "8px 6px", borderTop: "1px solid #111c30" }}>
          {sideOpen && <div style={{ padding: "6px 10px", marginBottom: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#f1f5f9" }}>{user.name}</div>
            <div style={{ fontSize: 10, color: "#475569" }}>{isAdmin ? "Administrador" : `Técnico · ${user.discipline}`}</div>
          </div>}
          <div className="nav" onClick={() => setUser(null)}><span style={{ flexShrink: 0 }}>🚪</span>{sideOpen && <span>Salir</span>}</div>
          <div className="nav" onClick={() => setSideOpen(p => !p)}><span style={{ flexShrink: 0 }}>{sideOpen ? "◀" : "▶"}</span>{sideOpen && <span>Colapsar</span>}</div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
        <div style={{ background: "#070e1b", borderBottom: "1px solid #111c30", padding: "12px 22px", display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ flex: 1, fontFamily: "Syne,sans-serif", fontSize: 16, fontWeight: 700, color: "#f1f5f9" }}>{curNav?.i} {curNav?.l}</div>
          {loading && <Spinner />}
          {isAdmin && page === "ots" && <>
            <button className="btn" onClick={() => setModal("importExcel")} style={{ background: "#0f2040", color: "#34d399", padding: "7px 14px", fontSize: 13 }}>📥 Importar Excel</button>
            <button className="btn" onClick={() => setModal("newOT")} style={{ background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", color: "#fff", padding: "7px 16px", fontSize: 13 }}>+ Nueva OT</button>
          </>}
          {isAdmin && page === "equipment" && <button className="btn" onClick={() => setModal("newEquip")} style={{ background: "#0f2040", color: "#60a5fa", padding: "7px 14px", fontSize: 13 }}>+ Equipo</button>}
          {isAdmin && page === "locations" && <button className="btn" onClick={() => setModal("newLoc")} style={{ background: "#0f2040", color: "#60a5fa", padding: "7px 14px", fontSize: 13 }}>+ Ubicación</button>}
          {isAdmin && page === "ji" && <button className="btn" onClick={() => setModal("newJI")} style={{ background: "#0f2040", color: "#60a5fa", padding: "7px 14px", fontSize: 13 }}>+ Instrucción</button>}
          {isAdmin && page === "users" && <button className="btn" onClick={() => setModal("newUser")} style={{ background: "#0f2040", color: "#60a5fa", padding: "7px 14px", fontSize: 13 }}>+ Usuario</button>}
          {!isAdmin && <button className="btn" onClick={() => setModal("searchOT")} style={{ background: "linear-gradient(135deg,#065f46,#0f766e)", color: "#34d399", padding: "7px 16px", fontSize: 13 }}>🔍 Buscar OT</button>}
        </div>

        <div style={{ padding: 20, flex: 1 }}>
          {/* DASHBOARD */}
          {page === "dashboard" && (
            <div className="fd">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10, marginBottom: 18 }}>
                {[{ l: "Total OTs", v: stats.total, c: "#3b82f6", i: "📋" }, { l: "Abiertas", v: stats.open, c: "#60a5fa", i: "🔵" }, { l: "En Progreso", v: stats.prog, c: "#10b981", i: "🟢" }, { l: "Cerradas", v: stats.closed, c: "#8b5cf6", i: "✅" }, { l: "Críticas", v: stats.crit, c: "#ef4444", i: "🔴" }].map(s => (
                  <div key={s.l} className="card" style={{ borderLeft: `3px solid ${s.c}` }}>
                    <div style={{ fontSize: 18, marginBottom: 5 }}>{s.i}</div>
                    <div style={{ fontFamily: "Syne,sans-serif", fontSize: 24, fontWeight: 800, color: s.c }}>{s.v}</div>
                    <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{s.l}</div>
                  </div>
                ))}
              </div>
              {isAdmin && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 18 }}>
                  {DISCIPLINES.map(d => (
                    <div key={d} className="row card" onClick={() => setPage("ots")} style={{ borderLeft: `3px solid ${D_COLOR[d]}` }}>
                      <div style={{ fontSize: 20, marginBottom: 6 }}>{D_ICON[d]}</div>
                      <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 13, color: "#f1f5f9" }}>{d}</div>
                      <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{myOTs.filter(o => o.discipline === d).length} OTs · {DEFAULT_PARAMS[d].length} params/OT</div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ fontSize: 11, fontWeight: 600, color: "#334155", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Órdenes Recientes</div>
              {myOTs.slice(0, 5).map(ot => <OTRow key={ot.id} ot={ot} equipment={equipment} onClick={() => { setSelOT(ot); setModal("otDetail"); }} />)}
            </div>
          )}

          {page === "ots" && (
            <div className="fd" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {myOTs.length === 0 ? <div style={{ textAlign: "center", color: "#334155", padding: 40 }}>No hay órdenes. {isAdmin && "Crea la primera con '+ Nueva OT'."}</div>
                : myOTs.map(ot => <OTRow key={ot.id} ot={ot} equipment={equipment} onClick={() => { setSelOT(ot); setModal("otDetail"); }} />)}
            </div>
          )}

          {page === "equipment" && isAdmin && (
            <div className="fd">
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <button className="btn" onClick={() => setModal("importEquip")} style={{ background: "#0f2040", color: "#34d399", padding: "7px 14px", fontSize: 13 }}>📥 Importar Excel</button>
                <button className="btn" onClick={() => setModal("newEquip")} style={{ background: "#0f2040", color: "#60a5fa", padding: "7px 14px", fontSize: 13 }}>+ Nuevo Equipo</button>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="ptable">
                  <thead><tr>{["TAG / Código","Tipo","Área","Sub-área","Disciplina","Acciones"].map(h => <th key={h}>{h}</th>)}</tr></thead>
                  <tbody>
                    {equipment.map(eq => (
                      <tr key={eq.id}>
                        <td style={{ color: "#3b82f6", fontFamily: "Syne,sans-serif", fontWeight: 700 }}>{eq.code}</td>
                        <td style={{ color: "#cbd5e1" }}>{eq.type || "—"}</td>
                        <td style={{ color: "#94a3b8" }}>{eq.area || "—"}</td>
                        <td style={{ color: "#94a3b8" }}>{eq.subarea || "—"}</td>
                        <td><span style={{ color: D_COLOR[eq.discipline], fontSize: 12 }}>{D_ICON[eq.discipline]} {eq.discipline}</span></td>
                        <td>
                          <button className="btn" onClick={async () => {
                            if (!window.confirm("¿Eliminar equipo " + eq.code + "?")) return;
                            await supabase.from("equipment").delete().eq("id", eq.id);
                            setEquipment(prev => prev.filter(e => e.id !== eq.id));
                          }} style={{ background: "#3b0f0f", color: "#f87171", padding: "3px 10px", fontSize: 11 }}>Eliminar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}



          {page === "ji" && isAdmin && (
            <div className="fd" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {jis.map(ji => (
                <div key={ji.id} className="card">
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                    <span style={{ fontFamily: "Syne,sans-serif", fontSize: 11, color: "#3b82f6", fontWeight: 700 }}>{ji.code}</span>
                    <span className="tag" style={{ background: "#111c30", color: D_COLOR[ji.discipline] }}>{D_ICON[ji.discipline]} {ji.discipline}</span>
                    <span className="tag" style={{ background: ji.risk === "Alto" ? "#3b0f0f" : ji.risk === "Medio" ? "#3a2a1e" : "#1e3a2a", color: ji.risk === "Alto" ? "#f87171" : ji.risk === "Medio" ? "#fbbf24" : "#34d399" }}>Riesgo {ji.risk}</span>
                  </div>
                  <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 14, color: "#f1f5f9", marginBottom: 10 }}>{ji.title}</div>
                  {(ji.steps || []).map((s, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, marginBottom: 6 }}>
                      <div style={{ width: 20, height: 20, background: "#0f2040", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#3b82f6", fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                      <span style={{ fontSize: 13, color: "#94a3b8" }}>{s}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {page === "kpi" && (
            <div className="fd" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {isAdmin && (
                <div className="card">
                  <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 13, color: "#64748b", marginBottom: 14 }}>OTs por Disciplina y Estado</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={kpiData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#111c30" />
                      <XAxis dataKey="d" stroke="#334155" fontSize={12} />
                      <YAxis stroke="#334155" fontSize={12} />
                      <Tooltip contentStyle={{ background: "#0b1629", border: "1px solid #1a2740", borderRadius: 8, color: "#e2e8f0" }} />
                      <Legend />
                      <Bar dataKey="Abiertas" fill="#3b82f6" radius={[4,4,0,0]} />
                      <Bar dataKey="Progreso" fill="#10b981" radius={[4,4,0,0]} />
                      <Bar dataKey="Cerradas" fill="#8b5cf6" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="card">
                <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 13, color: "#64748b", marginBottom: 12 }}>📋 Historial Completo de Lecturas</div>
                <div style={{ overflowX: "auto" }}>
                  <table className="ptable">
                    <thead><tr>{["OT","Disciplina","Parámetro","Valor","Fecha"].map(h => <th key={h}>{h}</th>)}</tr></thead>
                    <tbody>
                      {allReadings.slice(-30).reverse().map((r, i) => (
                        <tr key={i}>
                          <td style={{ color: "#3b82f6", fontFamily: "Syne,sans-serif", fontSize: 11 }}>{r.ot_id}</td>
                          <td><span style={{ color: D_COLOR[r.work_orders?.discipline], fontSize: 13 }}>{D_ICON[r.work_orders?.discipline]}</span></td>
                          <td style={{ color: "#cbd5e1" }}>{r.parameters?.name}</td>
                          <td style={{ color: "#34d399", fontWeight: 700 }}>{r.value} {r.parameters?.unit}</td>
                          <td style={{ color: "#64748b", fontSize: 11 }}>{new Date(r.created_at).toLocaleDateString("es-CO")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {page === "dashboard_op" && isAdmin && <DashboardOperativo allReadings={allReadings} />}

          {page === "verificacion" && isAdmin && (
            <div className="fd">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <div style={{ fontSize: 13, color: "#64748b" }}>
                  {allReadings.length} lecturas registradas en total
                </div>
                <button className="btn" onClick={() => {
                  const XLSX = window.XLSX;
                  if (!XLSX) { alert("Error: librería Excel no cargada"); return; }
                  const rows = allReadings.map(r => ({
                    "N° OT": r.ot_id || "",
                    "Disciplina": r.work_orders?.discipline || "",
                    "Parámetro": r.parameters?.name || "",
                    "Unidad": r.parameters?.unit || "",
                    "Valor": r.value || "",
                    "Fecha": r.created_at ? new Date(r.created_at).toLocaleString("es-CO") : "",
                  }));
                  const ws = XLSX.utils.json_to_sheet(rows);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, "Lecturas");
                  XLSX.writeFile(wb, "verificacion_parametros_" + new Date().toLocaleDateString("es-CO").replace(/\//g, "-") + ".xlsx");
                }} style={{ background: "linear-gradient(135deg,#065f46,#0f766e)", color: "#34d399", padding: "8px 18px", fontSize: 13 }}>
                  📥 Descargar Excel
                </button>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="ptable">
                  <thead>
                    <tr>
                      {["N° OT","Disciplina","Parámetro","Unidad","Valor","Fecha"].map(h => <th key={h}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {allReadings.slice().reverse().map((r, i) => (
                      <tr key={i}>
                        <td style={{ color: "#3b82f6", fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 11 }}>{r.ot_id}</td>
                        <td><span style={{ color: D_COLOR[r.work_orders?.discipline] || "#64748b", fontSize: 11 }}>{D_ICON[r.work_orders?.discipline] || ""} {r.work_orders?.discipline || "—"}</span></td>
                        <td style={{ color: "#cbd5e1", fontSize: 12 }}>{r.parameters?.name || "—"}</td>
                        <td style={{ color: "#64748b", fontSize: 11 }}>{r.parameters?.unit || "—"}</td>
                        <td style={{ color: "#34d399", fontWeight: 700, fontSize: 13 }}>{r.value}</td>
                        <td style={{ color: "#475569", fontSize: 11 }}>{r.created_at ? new Date(r.created_at).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" }) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {page === "users" && isAdmin && (
            <div className="fd" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12 }}>
              {users.map(u => (
                <div key={u.id} className="card" style={{ position: "relative" }}>
                  {u.id !== user.id && (
                    <button className="btn" onClick={async () => {
                      if (!window.confirm("¿Eliminar usuario " + u.name + "?")) return;
                      const { error } = await supabase.from("users").delete().eq("id", u.id);
                      if (!error) setUsers(prev => prev.filter(x => x.id !== u.id));
                    }} style={{ position: "absolute", top: 10, right: 10, background: "#3b0f0f", color: "#f87171", padding: "3px 8px", fontSize: 11, borderRadius: 5 }}>✕</button>
                  )}
                  <div style={{ width: 42, height: 42, background: u.role === "admin" ? "linear-gradient(135deg,#1d4ed8,#7c3aed)" : "linear-gradient(135deg,#065f46,#0f766e)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 10 }}>
                    {u.role === "admin" ? "👨‍💼" : "👷"}
                  </div>
                  <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 13, color: "#f1f5f9" }}>{u.name}</div>
                  <div style={{ fontSize: 11, color: "#475569", marginTop: 3 }}>{u.email}</div>
                  <div style={{ marginTop: 8 }}>
                    <span className="tag" style={{ background: u.role === "admin" ? "#1e1e3a" : "#1e3a2a", color: u.role === "admin" ? "#a78bfa" : "#34d399" }}>
                      {u.role === "admin" ? "Admin" : "Técnico · " + u.discipline}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {modal === "otDetail" && selOT && (
        <OTDetail ot={selOT} equipment={equipment} locations={locations} jis={jis} users={users} user={user} isAdmin={isAdmin}
          onClose={closeModal}
          onStatusChange={(id, status) => setOts(prev => prev.map(o => o.id === id ? { ...o, status } : o))} />
      )}
      {modal === "newOT" && <NewOT equipment={equipment} locations={locations} jis={jis} users={users} onClose={closeModal} onSave={ot => { setOts(p => [ot, ...p]); closeModal(); }} />}
      {modal === "newEquip" && <NewEquip locations={locations} onClose={closeModal} onSave={eq => { setEquipment(p => [...p, eq]); closeModal(); }} />}
      {modal === "newLoc" && <NewLoc onClose={closeModal} onSave={loc => { setLocations(p => [...p, loc]); closeModal(); }} />}
      {modal === "newJI" && <NewJI onClose={closeModal} onSave={ji => { setJis(p => [...p, ji]); closeModal(); }} />}
      {modal === "newUser" && <NewUser onClose={closeModal} onSave={u => { setUsers(p => [...p, u]); closeModal(); }} />}
      {modal === "importExcel" && <ExcelImport onClose={closeModal} onImported={async () => { const data = await db.getOTs(user.id, isAdmin); setOts(data); }} />}
      {modal === "importEquip" && <ImportEquip onClose={closeModal} onSave={eq => setEquipment(p => [...p, eq])} />}
      {modal === "searchOT" && <TechOTSearch user={user} onFound={ot => { setSelOT(ot); setModal("otDetail"); }} />}
    </div>
  );
}
