import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search, Plus, Calendar, Check, X, MessageCircle, Lock, Unlock,
  Store, ArrowRight, ArrowUpDown, AlertCircle, ShieldCheck, Home
} from "lucide-react";
import { supabase } from "./supabaseClient";

/* ---------------------------------------------------------------- */
/* Global stylesheet                                                  */
/* ---------------------------------------------------------------- */

const GlobalStyle = () => (
  <style>{`
    .lfy-page { background:#FAF9F5; color:#1C2333; }
    .lfy-header { background:#1C2333; color:#fff; }
    .lfy-header-sub { color:#B8B9C5; }
    .lfy-header-select { background:#2A3348; border:1px solid #3A4258; color:#fff; }
    .lfy-tabbar { background:#151B29; }
    .lfy-tabbar-btn { color:#B8B9C5; }
    .lfy-tabbar-btn.active { background:#fff; color:#1C2333; }

    .lfy-card { background:#fff; border:1px solid #E5E3D8; }
    .lfy-card-hover:hover { border-color:#B8934A; }

    .lfy-label { color:#3A3A34; }
    .lfy-required { color:#C4443B; }
    .lfy-error { color:#C4443B; }
    .lfy-muted { color:#8A8B82; }

    .lfy-input, .lfy-select, .lfy-textarea {
      background:#fff; border:1px solid #DCDACF; color:#1C2333; font-size:16px;
    }
    .lfy-input:focus, .lfy-select:focus, .lfy-textarea:focus {
      outline:none; border-color:#B8934A; box-shadow:0 0 0 1px #B8934A;
    }
    .lfy-select:disabled { background:#F5F4EE; }
    .lfy-input:disabled { background:#F5F4EE; color:#8A8B82; }

    button { min-height: 40px; touch-action: manipulation; }
    input[type="checkbox"] { min-width: 20px; min-height: 20px; }
    input, select, textarea { font-size: 16px; }

    .lfy-btn-primary { background:#1C2333; color:#fff; }
    .lfy-btn-primary:hover { background:#2A3348; }
    .lfy-btn-gold { background:#B8934A; color:#fff; }
    .lfy-btn-gold:hover { background:#A5813F; }
    .lfy-btn-green { background:#2E9C5B; color:#fff; }
    .lfy-btn-outline { background:#fff; color:#3A3A34; border:1px solid #DCDACF; }
    .lfy-btn-outline:hover { border-color:#B8934A; }
    .lfy-btn-gold-outline { background:#fff; color:#B8934A; border:1px solid #B8934A; }
    .lfy-btn-gold-outline:hover { background:#B8934A; color:#fff; }

    .lfy-chip { background:#F3F1E8; color:#3A3A34; }

    .lfy-status-filter { background:#fff; color:#3A3A34; border:1px solid #DCDACF; }
    .lfy-status-filter.active { background:#1C2333; color:#fff; border-color:#1C2333; }

    .lfy-divider { border-top:1px solid #EFEEE5; }
    .lfy-tab-panel-bar { background:#F0EFE6; }
    .lfy-tab-panel-btn { color:#8A8B82; }
    .lfy-tab-panel-btn.active { background:#fff; color:#1C2333; }

    .lfy-success-text { color:#2E9C5B; }
    .lfy-gold-text { color:#B8934A; }
  `}</style>
);

/* ---------------------------------------------------------------- */
/* Static config                                                     */
/* ---------------------------------------------------------------- */

const ADMIN_PASSWORD = "tira2018";
const BRANCHES = ["טירה", "טמרה"];

const SERVICE_TYPES = ["תיקון", "סוללה", "סוללה+אטימה", "חריטה", "הזמנה", "אחר"];

const ITEM_TYPES = [
  "שעון", "צמיד לאישה", "צמיד לגבר", "תיק/ארנק נשים", "תיק/ארנק גברים",
  "טבעת נשים", "טבעת גברים", "שרשרת נשים", "שרשרת גברים", "עגילים",
  "מזוודה", "מצית", "עט", "בושם"
];

const WARRANTY_OPTIONS = ["יש אחריות", "אין אחריות", "תיקון חוזר"];
const PAYMENT_METHODS = ["כרטיס אשראי", "מזומן", "העברה", "ביט", "זיכוי"];

const STATUS_OPTIONS = [
  "נמצא בחנות - עדיין לא תוקן",
  "נמצא בחנות - מוכן",
  "יצא עם עלאא",
  "יצא עם סוכן",
  "אי אפשר לתקן",
  "לקוח ביקש לא לתקן",
  "הלקוח אסף את הפריט"
];

const STATUS_WITH_EXIT_DATE = ["יצא עם עלאא", "יצא עם סוכן"];
const CALL_RESULTS = ["ענה", "לא ענה ונשלחה הודעה"];

const STATUS_COLORS = {
  "נמצא בחנות - עדיין לא תוקן": { bg: "#FDF3E7", text: "#9A5B13", dot: "#D98A2B" },
  "נמצא בחנות - מוכן": { bg: "#E9F6EE", text: "#1F6B3F", dot: "#2E9C5B" },
  "יצא עם עלאא": { bg: "#EAF1FB", text: "#1E4C8A", dot: "#3B72C4" },
  "יצא עם סוכן": { bg: "#EEF0FA", text: "#3A3985", dot: "#5E5CC4" },
  "אי אפשר לתקן": { bg: "#FBEAEA", text: "#96271F", dot: "#C4443B" },
  "לקוח ביקש לא לתקן": { bg: "#F2F2F0", text: "#55564F", dot: "#8A8B82" },
  "הלקוח אסף את הפריט": { bg: "#FBEAF5", text: "#96235F", dot: "#D63F96" }
};

const SELECTED_BLUE = { bg: "#EAF1FB", text: "#1E4C8A", border: "#3B72C4" };

/* ---------------------------------------------------------------- */
/* DB <-> UI mapping                                                  */
/* ---------------------------------------------------------------- */

const rowToTicket = (row) => ({
  id: row.id,
  ticketNumber: row.ticket_number || "",
  branch: row.branch,
  serviceType: row.service_type || "",
  itemType: row.item_type || "",
  warranty: row.warranty || "",
  quantity: row.quantity === null || row.quantity === undefined ? "" : String(row.quantity),
  itemDescription: row.item_description || "",
  faultDescription: row.fault_description || "",
  customerName: row.customer_name || "",
  sellerName: row.seller_name || "",
  openDate: { value: row.open_date, confirmed: !!row.open_date_confirmed },
  phonePrimary: row.phone_primary || "",
  phoneSecondary: row.phone_secondary || "",
  repairCost: row.repair_cost === null || row.repair_cost === undefined ? "" : String(row.repair_cost),
  paidAmount: row.paid_amount === null || row.paid_amount === undefined ? "" : String(row.paid_amount),
  paymentMethod: row.payment_method || "",
  notes2: row.notes2 || "",
  status: row.status || "",
  leftDate: { value: row.left_date, confirmed: !!row.left_date_confirmed },
  contact1: {
    made: row.contact1?.made || false,
    employee: row.contact1?.employee || "",
    date: { value: row.contact1?.date || null, confirmed: !!row.contact1?.dateConfirmed },
    result: row.contact1?.result || "",
    notes: row.contact1?.notes || ""
  },
  contact2: {
    made: row.contact2?.made || false,
    employee: row.contact2?.employee || "",
    date: { value: row.contact2?.date || null, confirmed: !!row.contact2?.dateConfirmed },
    result: row.contact2?.result || "",
    notes: row.contact2?.notes || ""
  },
  pickedUpDate: { value: row.picked_up_date, confirmed: !!row.picked_up_date_confirmed },
  photoUrl: row.photo_url || null,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const contactToJson = (c) => ({
  made: c.made, employee: c.employee, date: c.date.value,
  dateConfirmed: c.date.confirmed, result: c.result, notes: c.notes
});

/* ---------------------------------------------------------------- */
/* Helpers                                                            */
/* ---------------------------------------------------------------- */

const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtDate = (iso) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};
const num = (v) => (v === "" || v === null || v === undefined ? null : Number(v));
const isDraftTicket = (t) =>
  !t.customerName?.trim() || !t.phonePrimary || t.phonePrimary.length !== 10 || !t.itemType || !t.serviceType;

/* ---------------------------------------------------------------- */
/* Small building blocks (unchanged from the prototype)               */
/* ---------------------------------------------------------------- */

function Field({ label, required, children, error }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="lfy-label text-sm font-medium">
        {label}{required && <span className="lfy-required mr-1">*</span>}
      </label>
      {children}
      {error && <span className="lfy-error text-xs flex items-center gap-1"><AlertCircle size={12} /> {error}</span>}
    </div>
  );
}

function TextInput(props) {
  return (
    <input {...props} style={{ colorScheme: "light", ...(props.style || {}) }}
      className={`lfy-input w-full rounded-lg px-3 py-2 text-sm transition-colors ${props.className || ""}`} />
  );
}

function Textarea(props) {
  return <textarea {...props} className="lfy-textarea w-full rounded-lg px-3 py-2 text-sm outline-none" />;
}

function Select({ value, onChange, options, placeholder, disabled }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
      style={{ colorScheme: "light" }} className="lfy-select w-full rounded-lg px-3 py-2 text-sm transition-colors">
      <option value="">{placeholder || "בחר..."}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function PillChoice({ value, onChange, options, colorMap }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const selected = value === o;
        const c = colorMap ? colorMap[o] : SELECTED_BLUE;
        return (
          <button type="button" key={o} onClick={() => onChange(o)}
            style={selected
              ? { backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border || c.dot}` }
              : { backgroundColor: "#fff", color: "#3A3A34", border: "1px solid #DCDACF" }}
            className="px-3 py-1.5 rounded-full text-sm transition-colors font-medium">
            {selected && <Check size={12} className="inline ml-1 -mt-0.5" />}
            {o}
          </button>
        );
      })}
    </div>
  );
}

function DateField({ field, onChange }) {
  const displayValue = field.confirmed ? field.value : todayISO();
  return (
    <div className="flex items-center gap-2">
      <input type="date" value={displayValue || todayISO()}
        onChange={(e) => onChange({ value: e.target.value, confirmed: true })}
        style={{ colorScheme: "light" }} className="lfy-input rounded-lg px-3 py-2 text-sm" />
      {field.confirmed ? (
        <span className="lfy-success-text flex items-center gap-1 text-xs font-medium"><Check size={14} /> אושר</span>
      ) : (
        <button type="button" onClick={() => onChange({ value: todayISO(), confirmed: true })}
          className="lfy-btn-gold-outline text-xs font-medium rounded-full px-2 py-1 transition-colors">
          אשר תאריך (היום)
        </button>
      )}
    </div>
  );
}

function SaveBar({ onSave, saved, saving }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <button type="button" onClick={onSave} disabled={saving} className="lfy-btn-primary rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors">
        {saving ? "שומר..." : "שמור"}
      </button>
      {saved && <span className="lfy-success-text text-sm font-medium flex items-center gap-1"><Check size={14} /> נשמר</span>}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Login + branch selection                                          */
/* ---------------------------------------------------------------- */

function LoginScreen({ onSuccess }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const submit = () => {
    if (pw === ADMIN_PASSWORD) onSuccess();
    else setError("סיסמה שגויה");
  };
  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center p-4" style={{ background: "#1C2333" }}>
      <GlobalStyle />
      <div className="rounded-2xl p-8 max-w-sm w-full flex flex-col gap-4" style={{ background: "#fff" }}>
        <div className="text-center">
          <div className="font-bold text-xl" style={{ color: "#1C2333" }}>לפאייט</div>
          <div className="lfy-muted text-sm">ניהול תיקונים והזמנות</div>
        </div>
        <Field label="סיסמה" error={error}>
          <TextInput type="password" value={pw} onChange={(e) => { setPw(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && submit()} dir="ltr" autoFocus />
        </Field>
        <button onClick={submit} className="lfy-btn-gold rounded-lg px-4 py-2.5 text-sm font-semibold">כניסה</button>
      </div>
    </div>
  );
}

function BranchSelectScreen({ onSelect }) {
  return (
    <div dir="rtl" className="lfy-page min-h-screen flex items-center justify-center p-4">
      <GlobalStyle />
      <div className="lfy-card rounded-2xl p-8 max-w-sm w-full flex flex-col gap-4">
        <div className="text-center">
          <Store className="lfy-gold-text mx-auto mb-2" size={28} />
          <div className="font-bold text-lg" style={{ color: "#1C2333" }}>באיזה סניף אתם עובדים?</div>
          <div className="lfy-muted text-xs mt-1">אפשר להחליף סניף בכל שלב מהתפריט העליון</div>
        </div>
        <div className="flex flex-col gap-2">
          {BRANCHES.map((b) => (
            <button key={b} onClick={() => onSelect(b)} className="lfy-btn-outline rounded-lg px-4 py-3 text-sm font-semibold transition-colors">
              {b}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Ticket Form                                                        */
/* ---------------------------------------------------------------- */

const FORM_TABS = [
  { key: "info", label: "1+2 · פרטי קריאה" },
  { key: "status", label: "3 · סטטוס" },
  { key: "followup", label: "4 · טיפול אחרי תיקון" },
  { key: "pickup", label: "5 · איסוף" }
];

function TicketForm({
  ticket, employees, isAdmin, onCancel, addEmployee, removeEmployee, existingNumbers,
  onDirtyChange, saveInfo, saveStatus, saveFollowup, savePickup, setTicketNumberAdmin, uploadPhoto
}) {
  const [t, setT] = useState(ticket);
  const [tab, setTab] = useState("info");
  const [errors, setErrors] = useState({});
  const [savedTab, setSavedTab] = useState(null);
  const [savingTab, setSavingTab] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");

  useEffect(() => setT(ticket), [ticket.id, ticket.updatedAt]);

  useEffect(() => {
    const dirty = JSON.stringify(t) !== JSON.stringify(ticket);
    onDirtyChange(dirty, t);
  }, [t, ticket]);

  const update = (patch) => setT((prev) => ({ ...prev, ...patch }));
  const updateNested = (key, patch) => setT((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const flashSaved = (tabKey) => {
    setSavedTab(tabKey);
    setTimeout(() => setSavedTab((cur) => (cur === tabKey ? null : cur)), 1800);
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setPhotoError("");
    try {
      const url = await uploadPhoto(file);
      update({ photoUrl: url });
    } catch (err) {
      setPhotoError("שגיאה בהעלאת התמונה, נסו שוב");
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const validateInfo = () => {
    const e = {};
    if (!/^\d{4}$/.test(t.ticketNumber)) e.ticketNumber = "יש להזין 4 ספרות בדיוק";
    else if (existingNumbers.includes(t.ticketNumber) && t.ticketNumber !== ticket.ticketNumber) e.ticketNumber = "מספר קריאה כבר קיים במערכת";
    if (!t.serviceType) e.serviceType = "שדה חובה";
    if (!t.itemType) e.itemType = "שדה חובה";
    if (!t.warranty) e.warranty = "שדה חובה";
    if (!t.quantity || Number(t.quantity) < 1) e.quantity = "יש להזין כמות תקינה";
    if (!t.itemDescription.trim()) e.itemDescription = "שדה חובה";
    if (!t.faultDescription.trim()) e.faultDescription = "שדה חובה";
    if (!t.customerName.trim()) e.customerName = "שדה חובה";
    if (!t.sellerName) e.sellerName = "שדה חובה";
    if (!t.openDate.confirmed) e.openDate = "יש לאשר תאריך";
    if (!/^\d{10}$/.test(t.phonePrimary)) e.phonePrimary = "יש להזין 10 ספרות בדיוק";
    if (t.paidAmount === "" || Number(t.paidAmount) < 0) e.paidAmount = "שדה חובה";
    if (Number(t.paidAmount) > 0 && !t.paymentMethod) e.paymentMethod = "חובה כשיש סכום ששולם";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSaveInfo = async () => {
    if (!validateInfo()) return;
    setSavingTab("info");
    try {
      if (isAdmin && t.ticketNumber !== ticket.ticketNumber) {
        await setTicketNumberAdmin(t.id, t.ticketNumber);
      }
      await saveInfo(t);
      flashSaved("info");
      setShowSummary(true);
    } catch (err) {
      setErrors((prev) => ({ ...prev, ticketNumber: err.message || "שגיאה בשמירה" }));
    } finally {
      setSavingTab(null);
    }
  };

  const handleSaveStatus = async () => {
    setSavingTab("status");
    try { await saveStatus(t); flashSaved("status"); if (t.status === "הלקוח אסף את הפריט") setTab("pickup"); }
    finally { setSavingTab(null); }
  };

  const onStatusChange = (v) => {
    setT((prev) => ({ ...prev, status: v }));
    if (v === "הלקוח אסף את הפריט") setTab("pickup");
  };

  const handleSaveFollowup = async () => {
    setSavingTab("followup");
    try { await saveFollowup(t); flashSaved("followup"); } finally { setSavingTab(null); }
  };

  const handleSavePickup = async () => {
    setSavingTab("pickup");
    try { await savePickup(t); flashSaved("pickup"); } finally { setSavingTab(null); }
  };

  const waMessage = () => [
    `*קריאה #${t.ticketNumber}* — לפאייט (${t.branch})`,
    `סוג טיפול: ${t.serviceType}`,
    `פריט: ${t.itemType}`,
    `תיאור: ${t.itemDescription}`,
    `כמות: ${t.quantity}`,
    `תקלה: ${t.faultDescription}`,
    `אחריות: ${t.warranty}`,
    `לקוח: ${t.customerName}`,
    `תאריך פתיחה: ${fmtDate(t.openDate.value)}`,
    t.repairCost ? `עלות תיקון: ${t.repairCost} ₪` : null,
    `שולם: ${t.paidAmount || 0} ₪${t.paymentMethod ? " (" + t.paymentMethod + ")" : ""}`
  ].filter(Boolean).join("\n");

  const sendWhatsApp = () => {
    const digits = t.phonePrimary.replace(/\D/g, "");
    const intl = digits.startsWith("0") ? "972" + digits.slice(1) : digits;
    window.open(`https://wa.me/${intl}?text=${encodeURIComponent(waMessage())}`, "_blank");
  };

  return (
    <div className="flex flex-col gap-4 max-w-3xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <button onClick={onCancel} className="lfy-muted flex items-center gap-1 text-sm">
          <ArrowRight size={16} /> חזרה לרשימה
        </button>
        <div className="font-bold text-lg" style={{ color: "#1C2333" }}>קריאה #{t.ticketNumber} · {t.branch}</div>
      </div>

      <div className="lfy-tab-panel-bar flex gap-1 rounded-lg p-1 overflow-x-auto">
        {FORM_TABS.map((f) => (
          <button key={f.key} onClick={() => setTab(f.key)}
            className={`lfy-tab-panel-btn whitespace-nowrap px-3 py-2 rounded-md text-sm font-medium transition-colors ${tab === f.key ? "active" : ""}`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="lfy-card rounded-xl p-4 flex flex-col gap-4">
        {tab === "info" && (
          <>
            <Field label="מספר קריאה (4 ספרות, אוטומטי)" required error={errors.ticketNumber}>
              <TextInput value={t.ticketNumber}
                onChange={(e) => update({ ticketNumber: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                disabled={!isAdmin} dir="ltr" placeholder="1000" />
              {!isAdmin
                ? <span className="lfy-muted text-xs">המספר מוקצה אוטומטית. רק במצב מנהל אפשר לדרוס אותו — למשל להזנת קריאה ישנה מהנייר.</span>
                : <span className="lfy-muted text-xs">מצב מנהל: אפשר לשנות את המספר האוטומטי.</span>}
            </Field>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="שם לקוח" required error={errors.customerName}>
                <TextInput value={t.customerName} onChange={(e) => update({ customerName: e.target.value })} />
              </Field>
              <Field label="שם מוכרת" required error={errors.sellerName}>
                <Select value={t.sellerName} onChange={(v) => update({ sellerName: v })} options={employees} placeholder="בחר עובדת..." />
              </Field>
            </div>

            <Field label="סוג טיפול" required error={errors.serviceType}>
              <PillChoice value={t.serviceType} onChange={(v) => update({ serviceType: v })} options={SERVICE_TYPES} />
            </Field>

            {t.serviceType === "הזמנה" && (
              <Field label="תמונה" error={photoError}>
                <div className="flex items-center gap-3 flex-wrap">
                  {t.photoUrl && (
                    <img src={t.photoUrl} alt="תמונת הזמנה" className="rounded-lg object-cover" style={{ width: 96, height: 96 }} />
                  )}
                  <label className="lfy-btn-outline rounded-lg px-3 py-2 text-sm font-medium cursor-pointer">
                    {uploadingPhoto ? "מעלה..." : t.photoUrl ? "החלף תמונה" : "צלם / העלה תמונה"}
                    <input type="file" accept="image/*" onChange={handlePhotoChange} disabled={uploadingPhoto} className="hidden" />
                  </label>
                  {t.photoUrl && !uploadingPhoto && (
                    <button type="button" onClick={() => update({ photoUrl: null })} className="lfy-muted text-xs">הסר תמונה</button>
                  )}
                </div>
              </Field>
            )}

            <Field label="סוג פריט" required error={errors.itemType}>
              <Select value={t.itemType} onChange={(v) => update({ itemType: v })} options={ITEM_TYPES} placeholder="בחר פריט..." />
            </Field>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="אחריות" required error={errors.warranty}>
                <PillChoice value={t.warranty} onChange={(v) => update({ warranty: v })} options={WARRANTY_OPTIONS} />
              </Field>
              <Field label="כמות פריטים" required error={errors.quantity}>
                <TextInput type="number" min="1" value={t.quantity} onChange={(e) => update({ quantity: e.target.value })} />
              </Field>
            </div>

            <Field label="תיאור פריט (מותג, צבע וכו')" required error={errors.itemDescription}>
              <TextInput value={t.itemDescription} onChange={(e) => update({ itemDescription: e.target.value })} />
            </Field>

            <Field label="תיאור תקלה" required error={errors.faultDescription}>
              <Textarea value={t.faultDescription} onChange={(e) => update({ faultDescription: e.target.value })} rows={3} />
            </Field>

            <Field label="תאריך פתיחה" required error={errors.openDate}>
              <DateField field={t.openDate} onChange={(v) => update({ openDate: v })} />
            </Field>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="טלפון ראשי (10 ספרות)" required error={errors.phonePrimary}>
                <TextInput value={t.phonePrimary} onChange={(e) => update({ phonePrimary: e.target.value.replace(/\D/g, "").slice(0, 10) })} dir="ltr" />
              </Field>
              <Field label="טלפון משני">
                <TextInput value={t.phoneSecondary} onChange={(e) => update({ phoneSecondary: e.target.value.replace(/\D/g, "").slice(0, 10) })} dir="ltr" />
              </Field>
            </div>

            <div className="lfy-divider pt-3 flex flex-col gap-3">
              <div className="text-sm font-semibold" style={{ color: "#1C2333" }}>שלב 2 — סטטוס כספי</div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="עלות תיקון">
                  <TextInput type="number" value={t.repairCost} onChange={(e) => update({ repairCost: e.target.value })} />
                </Field>
                <Field label="שולם" required error={errors.paidAmount}>
                  <TextInput type="number" value={t.paidAmount} onChange={(e) => update({ paidAmount: e.target.value })} />
                </Field>
              </div>
              <Field label="אופן תשלום" required={Number(t.paidAmount) > 0} error={errors.paymentMethod}>
                <Select value={t.paymentMethod} onChange={(v) => update({ paymentMethod: v })} options={PAYMENT_METHODS} />
              </Field>
              <Field label="הערות">
                <TextInput value={t.notes2} onChange={(e) => update({ notes2: e.target.value })} />
              </Field>
            </div>

            {isAdmin && (
              <div className="lfy-divider pt-3 flex flex-col gap-2">
                <div className="lfy-muted text-xs flex items-center gap-1"><ShieldCheck size={12} /> ניהול רשימת עובדות ({t.branch}) — מצב מנהל</div>
                <div className="flex flex-wrap gap-2 items-center">
                  {employees.map((emp) => (
                    <span key={emp} className="lfy-chip text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      {emp}
                      <button onClick={() => removeEmployee(emp)} className="lfy-muted"><X size={12} /></button>
                    </span>
                  ))}
                  <input value={newEmployeeName} onChange={(e) => setNewEmployeeName(e.target.value)} placeholder="הוספת עובדת..."
                    style={{ colorScheme: "light" }} className="lfy-input text-xs rounded-full px-2 py-1 outline-none w-28" />
                  <button onClick={() => { if (newEmployeeName.trim()) { addEmployee(newEmployeeName.trim()); setNewEmployeeName(""); } }}
                    className="lfy-gold-text text-xs font-medium">+ הוסף</button>
                </div>
              </div>
            )}

            <SaveBar onSave={handleSaveInfo} saved={savedTab === "info"} saving={savingTab === "info"} />
          </>
        )}

        {tab === "status" && (
          <>
            <Field label="סטטוס קריאה" required>
              <PillChoice value={t.status} onChange={onStatusChange} options={STATUS_OPTIONS} colorMap={STATUS_COLORS} />
            </Field>
            {STATUS_WITH_EXIT_DATE.includes(t.status) && (
              <Field label="תאריך יציאה" required>
                <DateField field={t.leftDate} onChange={(v) => update({ leftDate: v })} />
              </Field>
            )}
            <SaveBar onSave={handleSaveStatus} saved={savedTab === "status"} saving={savingTab === "status"} />
          </>
        )}

        {tab === "followup" && (
          <>
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input type="checkbox" checked={t.contact1.made} onChange={(e) => updateNested("contact1", { made: e.target.checked })} style={{ accentColor: "#B8934A" }} className="w-4 h-4" />
              יצרנו קשר עם הלקוח
            </label>
            {t.contact1.made && (
              <div className="flex flex-col gap-4 pr-4 mr-1" style={{ borderRight: "2px solid #EFEEE5" }}>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="שם עובדת" required>
                    <Select value={t.contact1.employee} onChange={(v) => updateNested("contact1", { employee: v })} options={employees} />
                  </Field>
                  <Field label="תאריך" required>
                    <DateField field={t.contact1.date} onChange={(v) => updateNested("contact1", { date: v })} />
                  </Field>
                </div>
                <Field label="תוצאה" required>
                  <PillChoice value={t.contact1.result} onChange={(v) => updateNested("contact1", { result: v })} options={CALL_RESULTS} />
                </Field>
                <Field label="הערות">
                  <TextInput value={t.contact1.notes} onChange={(e) => updateNested("contact1", { notes: e.target.value })} />
                </Field>

                {t.contact1.result === "לא ענה ונשלחה הודעה" && (
                  <div className="lfy-divider pt-4 flex flex-col gap-4">
                    <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                      <input type="checkbox" checked={t.contact2.made} onChange={(e) => updateNested("contact2", { made: e.target.checked })} style={{ accentColor: "#B8934A" }} className="w-4 h-4" />
                      יצרנו קשר עם הלקוח פעם נוספת
                    </label>
                    {t.contact2.made && (
                      <div className="flex flex-col gap-4 pr-4 mr-1" style={{ borderRight: "2px solid #EFEEE5" }}>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <Field label="שם עובדת" required>
                            <Select value={t.contact2.employee} onChange={(v) => updateNested("contact2", { employee: v })} options={employees} />
                          </Field>
                          <Field label="תאריך" required>
                            <DateField field={t.contact2.date} onChange={(v) => updateNested("contact2", { date: v })} />
                          </Field>
                        </div>
                        <Field label="תוצאה" required>
                          <PillChoice value={t.contact2.result} onChange={(v) => updateNested("contact2", { result: v })} options={CALL_RESULTS} />
                        </Field>
                        <Field label="הערות">
                          <TextInput value={t.contact2.notes} onChange={(e) => updateNested("contact2", { notes: e.target.value })} />
                        </Field>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <SaveBar onSave={handleSaveFollowup} saved={savedTab === "followup"} saving={savingTab === "followup"} />
          </>
        )}

        {tab === "pickup" && (
          <>
            <Field label="הלקוח אסף את הפריט">
              <DateField field={t.pickedUpDate} onChange={(v) => update({ pickedUpDate: v })} />
            </Field>
            <SaveBar onSave={handleSavePickup} saved={savedTab === "pickup"} saving={savingTab === "pickup"} />
          </>
        )}
      </div>

      {showSummary && (
        <div className="fixed inset-0 flex items-center justify-center z-30 p-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setShowSummary(false)}>
          <div className="lfy-card rounded-xl max-w-md w-full p-5 flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
            <div className="font-bold" style={{ color: "#1C2333" }}>דוח סיכום — קריאה #{t.ticketNumber}</div>
            <pre className="whitespace-pre-wrap text-sm rounded-lg p-3" style={{ background: "#FAF9F5", border: "1px solid #EFEEE5" }}>{waMessage()}</pre>
            <div className="flex gap-2">
              <button onClick={sendWhatsApp} className="lfy-btn-green flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold">
                <MessageCircle size={16} /> שלח בוואטסאפ ללקוח
              </button>
              <button onClick={() => setShowSummary(false)} className="lfy-btn-outline rounded-lg px-4 py-2 text-sm">סגור</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Ticket card + list                                                */
/* ---------------------------------------------------------------- */

function TicketCard({ t, onOpen }) {
  const colors = STATUS_COLORS[t.status] || { bg: "#F2F2F0", text: "#55564F", dot: "#8A8B82" };
  return (
    <button onClick={() => onOpen(t.id)} className="lfy-card lfy-card-hover w-full text-right rounded-xl p-4 transition-colors flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-bold text-base" style={{ color: "#1C2333" }}>#{t.ticketNumber}</span>
        <span className="lfy-muted flex items-center gap-1 text-xs"><Store size={12} /> {t.branch}</span>
      </div>
      <div className="text-sm" style={{ color: "#3A3A34" }}>{t.itemType || "—"} · {t.serviceType || "—"}</div>
      <div className="lfy-muted text-sm">{t.customerName || "—"}</div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ backgroundColor: colors.bg, color: colors.text }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full ml-1" style={{ backgroundColor: colors.dot }} />
          {t.status || "ללא סטטוס"}
        </span>
        <span className="lfy-muted text-xs flex items-center gap-1"><Calendar size={12} /> {fmtDate(t.openDate.value)}</span>
      </div>
    </button>
  );
}

/* ---------------------------------------------------------------- */
/* Search view                                                        */
/* ---------------------------------------------------------------- */

function SearchView({ tickets, onOpen }) {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("ticketNumber");
  const [sortDir, setSortDir] = useState("asc");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const results = useMemo(() => {
    let list = [...tickets];
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter((t) =>
        t.ticketNumber.includes(s) || t.phonePrimary.includes(s) || t.phoneSecondary.includes(s) || t.customerName.toLowerCase().includes(s)
      );
    }
    if (statusFilter !== "all") list = list.filter((t) => t.status === statusFilter);
    if (serviceTypeFilter !== "all") list = list.filter((t) => t.serviceType === serviceTypeFilter);
    if (fromDate) list = list.filter((t) => (t.openDate.value || "") >= fromDate);
    if (toDate) list = list.filter((t) => (t.openDate.value || "") <= toDate);

    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "ticketNumber") cmp = a.ticketNumber.localeCompare(b.ticketNumber);
      if (sortBy === "openDate") cmp = (a.openDate.value || "").localeCompare(b.openDate.value || "");
      if (sortBy === "status") cmp = (a.status || "").localeCompare(b.status || "");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [tickets, q, statusFilter, serviceTypeFilter, sortBy, sortDir, fromDate, toDate]);

  return (
    <div className="flex flex-col gap-4">
      <div className="lfy-input flex items-center gap-2 rounded-lg px-3 py-2">
        <Search size={16} className="lfy-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש לפי טלפון / מספר קריאה / שם לקוח"
          style={{ colorScheme: "light" }} className="flex-1 outline-none text-sm bg-transparent" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setStatusFilter("all")}
          className={`lfy-status-filter whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium ${statusFilter === "all" ? "active" : ""}`}>
          הכל
        </button>
        {STATUS_OPTIONS.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`lfy-status-filter whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium ${statusFilter === s ? "active" : ""}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        <span className="lfy-label text-sm font-medium">סוג טיפול</span>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setServiceTypeFilter("all")}
            className={`lfy-status-filter whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium ${serviceTypeFilter === "all" ? "active" : ""}`}>
            הכל
          </button>
          {SERVICE_TYPES.map((s) => (
            <button key={s} onClick={() => setServiceTypeFilter(s)}
              className={`lfy-status-filter whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium ${serviceTypeFilter === s ? "active" : ""}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="מיון">
          <div className="flex gap-2">
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ colorScheme: "light" }} className="lfy-select flex-1 rounded-lg px-3 py-2 text-sm">
              <option value="ticketNumber">מספר קריאה</option>
              <option value="openDate">תאריך פתיחה</option>
              <option value="status">סטטוס</option>
            </select>
            <button onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))} className="lfy-btn-outline flex items-center gap-1 rounded-lg px-3 py-2 text-sm">
              <ArrowUpDown size={14} /> {sortDir === "asc" ? "עולה" : "יורד"}
            </button>
          </div>
        </Field>
        <div />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="מתאריך פתיחה"><TextInput type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></Field>
        <Field label="עד תאריך פתיחה"><TextInput type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></Field>
      </div>

      <div className="lfy-muted text-xs">{results.length} תוצאות</div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {results.map((t) => <TicketCard key={t.id} t={t} onOpen={onOpen} />)}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Main App                                                           */
/* ---------------------------------------------------------------- */

const AUTH_KEY = "lafa-repairs-auth";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(() => localStorage.getItem(AUTH_KEY) === "true");
  const [branch, setBranch] = useState(null);

  const [tickets, setTickets] = useState([]);
  const [employeesByBranch, setEmployeesByBranch] = useState({ טירה: [], טמרה: [] });

  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminPrompt, setShowAdminPrompt] = useState(false);
  const [adminPw, setAdminPw] = useState("");

  const [view, setView] = useState("list");
  const [editingId, setEditingId] = useState(null);

  const [formDirty, setFormDirty] = useState(false);
  const [liveDraft, setLiveDraft] = useState(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [pendingNav, setPendingNav] = useState("list");

  const fetchTickets = useCallback(async () => {
    const { data, error } = await supabase.from("repair_tickets").select("*").order("created_at");
    if (!error && data) setTickets(data.map(rowToTicket));
  }, []);

  const fetchEmployees = useCallback(async () => {
    const { data } = await supabase.from("repair_employees").select("branch,name").order("name");
    const grouped = { טירה: [], טמרה: [] };
    (data || []).forEach((r) => grouped[r.branch]?.push(r.name));
    setEmployeesByBranch(grouped);
  }, []);

  useEffect(() => {
    (async () => {
      await Promise.all([fetchTickets(), fetchEmployees()]);
      setLoading(false);
    })();

    const channel = supabase
      .channel("repair_tickets_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "repair_tickets" }, () => fetchTickets())
      .on("postgres_changes", { event: "*", schema: "public", table: "repair_employees" }, () => fetchEmployees())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [fetchTickets, fetchEmployees]);

  const handleLogin = () => {
    setAuthed(true);
    localStorage.setItem(AUTH_KEY, "true");
  };

  const openTicket = (id) => { setEditingId(id); setView("form"); };

  const newTicket = async () => {
    const { data, error } = await supabase.rpc("create_repair_ticket", { p_branch: branch });
    if (error) { alert("שגיאה ביצירת קריאה: " + error.message); return; }
    const row = Array.isArray(data) ? data[0] : data;
    await fetchTickets();
    setEditingId(row.id);
    setView("form");
  };

  const setTicketNumberAdmin = async (id, ticketNumber) => {
    const { error } = await supabase.rpc("set_ticket_number_admin", { p_id: id, p_ticket_number: ticketNumber });
    if (error) throw new Error(error.message.includes("כבר קיים") ? error.message : "מספר קריאה כבר קיים במערכת");
  };

  const saveInfo = async (t) => {
    const { error } = await supabase.rpc("save_ticket_info", {
      p_id: t.id, p_service_type: t.serviceType, p_item_type: t.itemType, p_warranty: t.warranty,
      p_quantity: num(t.quantity), p_item_description: t.itemDescription, p_fault_description: t.faultDescription,
      p_customer_name: t.customerName, p_seller_name: t.sellerName, p_open_date: t.openDate.value,
      p_open_date_confirmed: t.openDate.confirmed, p_phone_primary: t.phonePrimary, p_phone_secondary: t.phoneSecondary,
      p_repair_cost: num(t.repairCost), p_paid_amount: num(t.paidAmount), p_payment_method: t.paymentMethod, p_notes2: t.notes2,
      p_photo_url: t.photoUrl || null
    });
    if (error) throw error;
    await fetchTickets();
  };

  const uploadTicketPhoto = async (ticketId, branchName, file) => {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${branchName}/${ticketId}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("repair-photos").upload(path, file, { upsert: true });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from("repair-photos").getPublicUrl(path);
    return data.publicUrl;
  };

  const saveStatus = async (t) => {
    const { error } = await supabase.rpc("save_ticket_status", {
      p_id: t.id, p_status: t.status, p_left_date: t.leftDate.value, p_left_date_confirmed: t.leftDate.confirmed
    });
    if (error) throw error;
    await fetchTickets();
  };

  const saveFollowup = async (t) => {
    const { error } = await supabase.rpc("save_ticket_followup", {
      p_id: t.id, p_contact1: contactToJson(t.contact1), p_contact2: contactToJson(t.contact2)
    });
    if (error) throw error;
    await fetchTickets();
  };

  const savePickup = async (t) => {
    const { error } = await supabase.rpc("save_ticket_pickup", {
      p_id: t.id, p_picked_up_date: t.pickedUpDate.value, p_picked_up_date_confirmed: t.pickedUpDate.confirmed
    });
    if (error) throw error;
    await fetchTickets();
  };

  const deleteTicket = async (id) => {
    await supabase.rpc("delete_repair_ticket", { p_id: id });
    await fetchTickets();
  };

  const addEmployee = async (name) => {
    await supabase.from("repair_employees").insert({ branch, name });
    await fetchEmployees();
  };
  const removeEmployee = async (name) => {
    await supabase.from("repair_employees").delete().eq("branch", branch).eq("name", name);
    await fetchEmployees();
  };

  const requestNavigate = (target) => {
    if (view === "form" && formDirty) {
      setPendingNav(target);
      setShowLeaveModal(true);
    } else {
      setView(target);
      if (target !== "form") setEditingId(null);
    }
  };

  const resolveLeaveSaveDraft = async () => {
    if (liveDraft) {
      try {
        if (isAdmin && liveDraft.ticketNumber && liveDraft.ticketNumber !== (tickets.find((x) => x.id === liveDraft.id)?.ticketNumber)) {
          await setTicketNumberAdmin(liveDraft.id, liveDraft.ticketNumber).catch(() => {});
        }
        await Promise.all([saveInfo(liveDraft), saveStatus(liveDraft), saveFollowup(liveDraft), savePickup(liveDraft)]);
      } catch (e) { /* best effort draft save */ }
    }
    setShowLeaveModal(false);
    setFormDirty(false);
    setEditingId(null);
    setView(pendingNav);
  };

  const resolveLeaveDelete = async () => {
    if (editingId) await deleteTicket(editingId);
    setShowLeaveModal(false);
    setFormDirty(false);
    setEditingId(null);
    setView(pendingNav);
  };

  const openTicketsForBranch = useMemo(
    () => tickets.filter((t) => t.branch === branch && !t.pickedUpDate.confirmed),
    [tickets, branch]
  );
  const allTicketsForBranch = useMemo(() => tickets.filter((t) => t.branch === branch), [tickets, branch]);
  const draftsForBranch = useMemo(
    () => tickets.filter((t) => t.branch === branch && !t.pickedUpDate.confirmed && isDraftTicket(t)),
    [tickets, branch]
  );

  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("ticketNumber");

  const filteredList = useMemo(() => {
    let list = openTicketsForBranch;
    if (statusFilter !== "all") list = list.filter((t) => t.status === statusFilter);
    list = [...list].sort((a, b) => {
      if (sortBy === "ticketNumber") return a.ticketNumber.localeCompare(b.ticketNumber);
      if (sortBy === "openDate") return (a.openDate.value || "").localeCompare(b.openDate.value || "");
      if (sortBy === "status") return (a.status || "").localeCompare(b.status || "");
      return 0;
    });
    return list;
  }, [openTicketsForBranch, statusFilter, sortBy]);

  const editingTicket = tickets.find((t) => t.id === editingId);

  const submitAdminPw = () => {
    if (adminPw === ADMIN_PASSWORD) { setIsAdmin(true); setShowAdminPrompt(false); setAdminPw(""); }
    else setAdminPw("");
  };

  if (loading) return <div className="lfy-page min-h-screen flex items-center justify-center text-sm"><GlobalStyle />טוען...</div>;
  if (!authed) return <LoginScreen onSuccess={handleLogin} />;
  if (!branch) return <BranchSelectScreen onSelect={setBranch} />;

  return (
    <div dir="rtl" className="lfy-page min-h-screen" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <GlobalStyle />
      <div className="lfy-header px-4 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="font-bold text-lg tracking-wide">לפאייט · תיקונים והזמנות</div>
            <div className="lfy-header-sub text-xs flex items-center gap-1"><Store size={12} /> סניף {branch}</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => requestNavigate("list")} className="lfy-btn-outline flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium">
              <Home size={16} /> דף הבית
            </button>
            <select value={branch} onChange={(e) => { setBranch(e.target.value); requestNavigate("list"); }}
              style={{ colorScheme: "light" }} className="lfy-header-select rounded-lg px-2 py-1.5 text-sm">
              {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <button onClick={() => (isAdmin ? setIsAdmin(false) : setShowAdminPrompt(true))}
              style={isAdmin ? { background: "#B8934A", borderColor: "#B8934A", color: "#fff" } : { border: "1px solid #3A4258", color: "#B8B9C5" }}
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium">
              {isAdmin ? <Unlock size={14} /> : <Lock size={14} />} מצב מנהל
            </button>
            {view === "list" && (
              <button onClick={newTicket} className="lfy-btn-gold flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold">
                <Plus size={16} /> קריאה חדשה
              </button>
            )}
          </div>
        </div>
        {view !== "form" && (
          <div className="lfy-tabbar max-w-5xl mx-auto flex gap-1 mt-3 rounded-lg p-1 w-fit">
            <button onClick={() => requestNavigate("list")} className={`lfy-tabbar-btn px-3 py-1.5 rounded-md text-sm font-medium ${view === "list" ? "active" : ""}`}>קריאות פתוחות</button>
            <button onClick={() => requestNavigate("drafts")} className={`lfy-tabbar-btn px-3 py-1.5 rounded-md text-sm font-medium ${view === "drafts" ? "active" : ""}`}>
              טיוטות{draftsForBranch.length > 0 ? ` (${draftsForBranch.length})` : ""}
            </button>
            <button onClick={() => requestNavigate("search")} className={`lfy-tabbar-btn px-3 py-1.5 rounded-md text-sm font-medium ${view === "search" ? "active" : ""}`}>חיפוש</button>
          </div>
        )}
      </div>

      <div className="max-w-5xl mx-auto p-4">
        {view === "list" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="lfy-input flex items-center gap-2 rounded-lg px-3 py-2 w-fit">
                <ArrowUpDown size={16} className="lfy-muted" />
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ colorScheme: "light" }} className="outline-none text-sm bg-transparent">
                  <option value="ticketNumber">מיון: מספר קריאה</option>
                  <option value="openDate">מיון: תאריך פתיחה</option>
                  <option value="status">מיון: סטטוס</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              <button onClick={() => setStatusFilter("all")}
                className={`lfy-status-filter whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium ${statusFilter === "all" ? "active" : ""}`}>
                הכל ({openTicketsForBranch.length})
              </button>
              {STATUS_OPTIONS.map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`lfy-status-filter whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium ${statusFilter === s ? "active" : ""}`}>
                  {s}
                </button>
              ))}
            </div>

            {filteredList.length === 0 ? (
              <div className="lfy-muted text-center py-16">
                <div className="text-sm">אין קריאות פתוחות להצגה בסניף {branch}</div>
                <button onClick={newTicket} className="lfy-gold-text mt-3 font-semibold text-sm">+ פתיחת קריאה ראשונה</button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredList.map((t) => <TicketCard key={t.id} t={t} onOpen={openTicket} />)}
              </div>
            )}
          </div>
        )}

        {view === "drafts" && (
          <div className="flex flex-col gap-4">
            <div className="lfy-muted text-sm">
              קריאות עם פרטים חסרים (שם לקוח, טלפון תקין, סוג פריט או סוג טיפול) — כולל טיוטות שנשמרו בעת יציאה מהטופס.
            </div>
            {draftsForBranch.length === 0 ? (
              <div className="lfy-muted text-center py-16 text-sm">אין טיוטות פתוחות בסניף {branch}</div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {draftsForBranch.map((t) => <TicketCard key={t.id} t={t} onOpen={openTicket} />)}
              </div>
            )}
          </div>
        )}

        {view === "search" && <SearchView tickets={allTicketsForBranch} onOpen={openTicket} />}

        {view === "form" && editingTicket && (
          <TicketForm
            ticket={editingTicket}
            employees={employeesByBranch[branch]}
            isAdmin={isAdmin}
            onCancel={() => requestNavigate("list")}
            addEmployee={addEmployee}
            removeEmployee={removeEmployee}
            existingNumbers={tickets.filter((x) => x.id !== editingId).map((x) => x.ticketNumber)}
            onDirtyChange={(dirty, draft) => { setFormDirty(dirty); setLiveDraft(draft); }}
            saveInfo={saveInfo}
            saveStatus={saveStatus}
            saveFollowup={saveFollowup}
            savePickup={savePickup}
            setTicketNumberAdmin={setTicketNumberAdmin}
            uploadPhoto={(file) => uploadTicketPhoto(editingTicket.id, branch, file)}
          />
        )}
      </div>

      {showAdminPrompt && (
        <div className="fixed inset-0 flex items-center justify-center z-40 p-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setShowAdminPrompt(false)}>
          <div className="lfy-card rounded-xl max-w-xs w-full p-5 flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
            <div className="font-bold flex items-center gap-2" style={{ color: "#1C2333" }}><ShieldCheck size={18} /> כניסת מנהל</div>
            <TextInput type="password" value={adminPw} onChange={(e) => setAdminPw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitAdminPw()} placeholder="סיסמת מנהל" dir="ltr" autoFocus />
            <button onClick={submitAdminPw} className="lfy-btn-primary rounded-lg px-4 py-2 text-sm font-semibold">אישור</button>
          </div>
        </div>
      )}

      {showLeaveModal && (
        <div className="fixed inset-0 flex items-center justify-center z-40 p-4" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="lfy-card rounded-xl max-w-sm w-full p-5 flex flex-col gap-3">
            <div className="font-bold flex items-center gap-2" style={{ color: "#1C2333" }}>
              <AlertCircle size={18} /> יש שינויים שלא נשמרו
            </div>
            <div className="lfy-muted text-sm">
              יצאתם מקריאה #{liveDraft?.ticketNumber || "—"} לפני שנשמרה. מה לעשות עם השינויים?
            </div>
            <div className="flex flex-col gap-2 mt-1">
              <button onClick={resolveLeaveSaveDraft} className="lfy-btn-gold rounded-lg px-4 py-2.5 text-sm font-semibold">
                שמור כטיוטה והמשך
              </button>
              <button onClick={resolveLeaveDelete} className="rounded-lg px-4 py-2.5 text-sm font-semibold" style={{ background: "#FBEAEA", color: "#96271F" }}>
                מחק את הקריאה
              </button>
              <button onClick={() => setShowLeaveModal(false)} className="lfy-btn-outline rounded-lg px-4 py-2 text-sm">
                ביטול — המשך לערוך
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
