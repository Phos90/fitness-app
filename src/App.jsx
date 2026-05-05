import { useState, useRef } from "react";

// Mobile-first CSS — iPhone HIG compliant
if (typeof document !== 'undefined' && !document.getElementById('ios-style')) {
  const s = document.createElement('style');
  s.id = 'ios-style';
  s.textContent = [
    '* { -webkit-tap-highlight-color: transparent; box-sizing: border-box; -webkit-font-smoothing: antialiased; }',
    'html, body { font-size: 17px; }',
    'input, textarea, select, button { font-size: 17px !important; font-family: inherit; }',
    'button { min-height: 44px; min-width: 44px; cursor: pointer; }',
    'input, textarea { min-height: 44px; }',
    '::-webkit-scrollbar { display: none; }',
  ].join('');
  document.head?.appendChild(s);
}

// Inject global mobile-first styles
const MOBILE_STYLE = `
  * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
  input, textarea, select { font-size: 16px !important; }
  button { min-height: 44px; cursor: pointer; }
`;
if (typeof document !== 'undefined' && !document.getElementById('mobile-style')) {
  const s = document.createElement('style');
  s.id = 'mobile-style';
  s.textContent = MOBILE_STYLE;
  document.head?.appendChild(s);
}

// ─── SYSTEM PROMPT ALLENAMENTO (no dieta) ───────────────────────────────────
const SYSTEM_PROMPT_PT = `Sei un personal trainer con 30 anni di esperienza sul campo.
Il tuo approccio è quello del collettivo Project Invictus: evidence-based, scientifico, pragmatico, senza broscience.

La dieta è gestita da un nutrizionista esterno — NON generare MAI piani alimentari, calorie o macro. Questo non è il tuo compito.
Il tuo compito è esclusivamente il piano di allenamento personalizzato.

BASE DI CONOSCENZA
I tuoi piani di allenamento partono dalla conoscenza metodologica dei testi di Project Invictus.
Usali come punto di partenza non esaustivo — non come regole fisse da copiare.
Questo significa che conosci e applichi dove pertinente:
- Periodizzazione a blocchi (mesocicli, deload, overreaching controllato)
- Metodologie di volume/intensità: multifrequenza, full body, push/pull, upper/lower, PHAT, metodo Hatfield
- Progressione dei parametri allenanti: volume, intensità, densità, frequenza, TUT
- Scelta degli esercizi: fondamentali multiarticolari come base, complementari e isolamento come supporto
- Adattamento continuo alla specificità dell'atleta in base ai feedback reali
Non copii le schede dai libri — le usi come ispirazione metodologica per costruire qualcosa
di specifico per questa persona, che evolve nel tempo in base ai progressi reali.

DATI UTENTE FISSI:
- Nome: Flavio, 35 anni, 75kg, 178cm, uomo
- Sedentario da 2 anni (stop completo)
- Epitrocleite gomito destro (trattata con infiltrazione, al momento asintomatica)
- Vuole: sala pesi + corsa a Villa Pamphili
- Disponibilità: 3 giorni a settimana
- Palestra: zona Colli Portuensi Roma

PRINCIPI INVARIABILI:
- Infortuni = vincoli assoluti, sempre adattare gli esercizi — mai ignorarli
- Chi riprende dopo 2+ anni: suggerisci partenza conservativa come default, ma se l'utente indica esplicitamente un numero di sessioni diverso, rispetta sempre la sua scelta e costruisci il piano di conseguenza
- Rispetta il tipo di allenamento preferito dall'atleta
- La costanza batte l'intensità
- Manubri preferiti al bilanciere per il gomito; usa straps dove necessario

Quando generi la scheda restituisci SOLO questo JSON senza nulla prima o dopo:
{
  "piano": {
    "obiettivo": "string",
    "durata_settimane": number,
    "note_generali": "string con ragionamento scientifico",
    "fasi": [{"numero":1,"nome":"string","settimane":"string","allenamenti_settimana":number,"split":"string","note":"string"}]
  },
  "scheda_allenamento": {
    "giorni_settimana": [
      {
        "tipo": "corsa|palestra",
        "titolo": "string",
        "descrizione": "string",
        "esercizi": [
          {"nome":"string","serie":number,"ripetizioni":"string","recupero_secondi":number,"note_tecniche":"string"}
        ]
      }
    ]
  }
}`;

// ─── PIANO ALLENAMENTO PRE-CARICATO ─────────────────────────────────────────
const PIANO_DEFAULT = {
  piano: {
    obiettivo: "Ricomposizione corporea — recupero massa muscolare e perdita grasso viscerale dopo 2 anni di stop",
    durata_settimane: 16,
    note_generali: "Partenza conservativa con 2 sessioni/settimana per riattivare tendini e articolazioni. Progressione a 3 sessioni dalla settimana 5. Epitrocleite gestita con adattamenti specifici per ogni esercizio.",
    fasi: [
      { numero: 1, nome: "Riattivazione", settimane: "1-4", allenamenti_settimana: 2, note: "2 sessioni invece di 3 — i tendini si adattano più lentamente dei muscoli. Dopo 2 anni di stop, partire a 3 sessioni è il modo più sicuro per riacutizzare l'epitrocleite." },
      { numero: 2, nome: "Costruzione", settimane: "5-10", allenamenti_settimana: 3, note: "Aggiunta terza sessione dopo riattivazione tendinea. Proteine e calorie della dieta rimangono invariate — la nutrizionista aggiornerà la dieta quando necessario." },
      { numero: 3, nome: "Ottimizzazione", settimane: "11-16", allenamenti_settimana: 3, note: "Intensità crescente. Comunicare alla nutrizionista l'aumento del volume per eventuale aggiustamento calorico." },
    ]
  },
  scheda_allenamento: {
    giorni_settimana: [
      { tipo: "palestra", titolo: "Total Body A", descrizione: "Fase 1 — Riattivazione neuromuscolare. Carichi al 60-65% del massimale. Tecnica prima del peso.", esercizi: [
        { nome: "Riscaldamento — cyclette o camminata veloce", serie: 1, ripetizioni: "10 minuti", recupero_secondi: 0, note_tecniche: "FC 100-110 bpm. Mai saltare dopo 2 anni di stop." },
        { nome: "Goblet squat con manubrio", serie: 3, ripetizioni: "10-12", recupero_secondi: 90, note_tecniche: "Manubrio al petto, presa simmetrica. Non forzare la flessione del gomito destro. Cosce parallele al suolo." },
        { nome: "Panca piana con manubri", serie: 4, ripetizioni: "10-12", recupero_secondi: 90, note_tecniche: "OBBLIGATORIO manubri (no bilanciere) — riducono lo stress sul gomito destro. Presa neutra o prona." },
        { nome: "Lat machine presa larga", serie: 3, ripetizioni: "10-12", recupero_secondi: 90, note_tecniche: "Usa straps se la presa affatica il gomito destro. Non stringere eccessivamente con la mano destra." },
        { nome: "Romanian deadlift con manubri", serie: 3, ripetizioni: "10-12", recupero_secondi: 90, note_tecniche: "Manubri ai lati, schiena dritta, cerniera all'anca. Usa straps se il gomito dà fastidio." },
        { nome: "Plank frontale su avambracci", serie: 3, ripetizioni: "20-30 secondi", recupero_secondi: 60, note_tecniche: "Appoggio sugli avambracci — zero stress sul gomito. Corpo rigido." },
        { nome: "Defaticamento — stretching", serie: 1, ripetizioni: "10 minuti", recupero_secondi: 0, note_tecniche: "Focus su quadricipiti, femorali, petto, schiena." },
      ]},
      { tipo: "corsa", titolo: "Corsa a Villa Pamphili", descrizione: "Fase 1 — Interval walking/running. No corsa continua.", esercizi: [
        { nome: "Riscaldamento — camminata normale", serie: 1, ripetizioni: "5 minuti", recupero_secondi: 0, note_tecniche: "Sempre camminata a freddo. Non partire di corsa." },
        { nome: "Interval: 1 min corsa leggera + 2 min camminata veloce", serie: 6, ripetizioni: "18 minuti totali", recupero_secondi: 0, note_tecniche: "Sett 1-2: quasi trottare. Sett 3-4: aumenta leggermente. FC max 140-150 bpm." },
        { nome: "Defaticamento — camminata lenta", serie: 1, ripetizioni: "5 minuti", recupero_secondi: 0, note_tecniche: "Non fermarti bruscamente." },
      ]},
    ]
  }
};

// ─── DIETA BISICCHIA PRE-CALCOLATA ───────────────────────────────────────────
const DIETA_BISICCHIA = {
  fonte: "Dott.ssa Elisa Bisicchia — Biologa Nutrizionista",
  data_caricamento: "14/04/2026",
  pdf_url: "https://drive.google.com/file/d/1FDHpb3R5ArwLxrPBEImPkniSNNZjYGAm/view?usp=share_link",
  media_settimanale: { kcal: 1499, proteine_g: 89, carboidrati_g: 183, grassi_g: 45 },
  note: "Dieta ipocalorica con deficit ~500 kcal. Struttura a liste intercambiabili. Olio EVO 25g/die.",
  giorni: [
    { giorno: "Lunedì", kcal: 1701, p: 122, c: 163, g: 60 },
    { giorno: "Martedì", kcal: 1454, p: 81, c: 203, g: 34 },
    { giorno: "Mercoledì", kcal: 1412, p: 81, c: 177, g: 41 },
    { giorno: "Giovedì", kcal: 1508, p: 89, c: 175, g: 49 },
    { giorno: "Venerdì", kcal: 1544, p: 56, c: 207, g: 54 },
    { giorno: "Sabato", kcal: 1488, p: 111, c: 175, g: 37 },
    { giorno: "Domenica", kcal: 1389, p: 84, c: 177, g: 38 },
  ]
};

const MOTIVATIONAL_QUOTES = [
  { text: "Il corpo ottiene ciò che la mente crede.", author: "Napoleon Hill" },
  { text: "Non contare i giorni. Fai sì che i giorni contino.", author: "Muhammad Ali" },
  { text: "La disciplina è il ponte tra obiettivi e risultati.", author: "Jim Rohn" },
  { text: "Ogni allenamento è un deposito nel conto della tua salute.", author: "Anonimo" },
  { text: "Non fermarti quando sei stanco. Fermati quando hai finito.", author: "Anonimo" },
  { text: "Il successo non è definitivo, il fallimento non è fatale.", author: "Winston Churchill" },
  { text: "La forza non viene dal corpo. Viene dalla volontà.", author: "Gandhi" },
];

export default function App() {
  const f = { fontFamily: "Georgia, serif" };
  const [activeTab, setActiveTab] = useState("profilo");
  const [piano, setPiano] = useState(PIANO_DEFAULT.piano);
  const [schedaAllenamento, setSchedaAllenamento] = useState(PIANO_DEFAULT.scheda_allenamento);
  const [dieta, setDieta] = useState(DIETA_BISICCHIA);
  const [dietaCaricata, setDietaCaricata] = useState(true);
  const [uploadingDieta, setUploadingDieta] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [pdfUrlInput, setPdfUrlInput] = useState("");
  const [editingPdfUrl, setEditingPdfUrl] = useState(false);
  const [pianoOpen, setPianoOpen] = useState(false);
  const [pianoComment, setPianoComment] = useState("");
  const [pianoUpdateLoading, setPianoUpdateLoading] = useState(false);

  const [editorPiano, setEditorPiano] = useState(null); // working copy in editor
  const [editorScheda, setEditorScheda] = useState(null); // working copy scheda
  const [editorSaved, setEditorSaved] = useState(false);
  const [weightHistory, setWeightHistoryRaw] = useState(() => {
    try { const s = localStorage.getItem('weightHistory'); return s ? JSON.parse(s) : [{ date: "14/04/2026", value: 75 }]; } catch { return [{ date: "14/04/2026", value: 75 }]; }
  });
  const setWeightHistory = (v) => { const next = typeof v === 'function' ? v(weightHistory) : v; setWeightHistoryRaw(next); try { localStorage.setItem('weightHistory', JSON.stringify(next)); } catch {} };
  const [newWeight, setNewWeight] = useState("");
  const [editingBody, setEditingBody] = useState(false);
  const [bodyData, setBodyData] = useState({ fat: "", lean: "", water: "" });
  const [profileBlocks, setProfileBlocks] = useState([
    { id: "physical", title: "Dati fisici", color: "#E1F5EE" },
    { id: "goal", title: "Obiettivo", color: "#E6F1FB" },
    { id: "piano", title: "Il mio piano", color: "#EEEDFE" },
    { id: "dieta_block", title: "Dieta", color: "#FAEEDA" },
    { id: "health", title: "Salute", color: "#FAECE7" },
  ]);
  const [dragIdx, setDragIdx] = useState(null);
  const todayKey = new Date().toISOString().split('T')[0];
  const [selectedMealDate, setSelectedMealDate] = useState(new Date().toISOString().split('T')[0]);
  const [meals, setMealsRaw] = useState(() => {
    try { const s = localStorage.getItem('meals_' + new Date().toISOString().split('T')[0]); return s ? JSON.parse(s) : { Colazione: [], Spuntino: [], Pranzo: [], Merenda: [], Cena: [] }; } catch { return { Colazione: [], Spuntino: [], Pranzo: [], Merenda: [], Cena: [] }; }
  });
  const setMeals = (v) => { const next = typeof v === 'function' ? v(meals) : v; setMealsRaw(next); try { localStorage.setItem('meals_' + selectedMealDate, JSON.stringify(next)); } catch {} };
  const [addingMeal, setAddingMeal] = useState(null);
  const [foodSearch, setFoodSearch] = useState("");
  const [foodResults, setFoodResults] = useState([]);
  const [foodLoading, setFoodLoading] = useState(false);
  const [editingFood, setEditingFood] = useState(null);
  const [photoMode, setPhotoMode] = useState(null); // "camera" | "gallery"
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const [selectedDay, setSelectedDay] = useState(1);
  const [calWeekOffset, setCalWeekOffset] = useState(0);
  const [workoutNotes, setWorkoutNotes] = useState({});
  const [workoutMood, setWorkoutMood] = useState({});
  const [exerciseData, setExerciseData] = useState({});
  const [savedSessions, setSavedSessionsRaw] = useState(() => {
    try { const s = localStorage.getItem('savedSessions'); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });
  const setSavedSessions = (v) => { const next = typeof v === 'function' ? v(savedSessions) : v; setSavedSessionsRaw(next); try { localStorage.setItem('savedSessions', JSON.stringify(next)); } catch {} };
  const [feedbackText, setFeedbackText] = useState({});
  const [adaptiveLoading, setAdaptiveLoading] = useState(false);
  const [adaptiveResponse, setAdaptiveResponse] = useState({});
  const [extraOpen, setExtraOpen] = useState(false);
  const [extraType, setExtraType] = useState(null); // "palestra" | "altra"
  const [extraAttivita, setExtraAttivita] = useState({ nome: "", tempo: "", calorie: "", km: "" });
  const [extraEsercizi, setExtraEsercizi] = useState([{ nome: "", peso: "", serie: "", rip: "", recupero: "" }]);
  const [extraSaved, setExtraSaved] = useState({});
  const [extraExpanded, setExtraExpanded] = useState({});
  const [extraEditing, setExtraEditing] = useState({});
  const [workoutAssignments, setWorkoutAssignmentsRaw] = useState(() => {
    try { const s = localStorage.getItem('workoutAssignments'); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });
  const setWorkoutAssignments = (v) => { const next = typeof v === 'function' ? v(workoutAssignments) : v; setWorkoutAssignmentsRaw(next); try { localStorage.setItem('workoutAssignments', JSON.stringify(next)); } catch {} };
  const [selectedWorkoutToken, setSelectedWorkoutToken] = useState(null);
  const [dayMenu, setDayMenu] = useState(null); // { dk, wInfo } — context menu for assigned day
  const PROGRAM_START = new Date("2026-04-21"); // inizio percorso
  const [streak] = useState(0);
  const fileInputRef = useRef(null);
  const todayQuote = MOTIVATIONAL_QUOTES[new Date().getDay() % MOTIVATIONAL_QUOTES.length];

  const today = new Date();
  const dayNames = ["Dom","Lun","Mar","Mer","Gio","Ven","Sab"];
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - today.getDay() + i + calWeekOffset * 7);
    return d;
  });

  function getPhaseAndWeek() {
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weekNum = Math.floor((today - PROGRAM_START) / msPerWeek) + 1;
    const phase = piano?.fasi?.find(f => {
      const [start, end] = (f.settimane || "1-4").split("-").map(Number);
      return weekNum >= start && weekNum <= end;
    }) || piano?.fasi?.[0];
    return { weekNum: Math.max(1, weekNum), phase };
  }

  function getWorkoutsForPhase(phase) {
    if (!phase) return [];
    const n = phase.allenamenti_settimana || 2;
    if (n <= 2) return [
      { id: "palestra", label: "Palestra", color: "#1D9E75", emoji: "🏋" },
      { id: "corsa", label: "Corsa", color: "#378ADD", emoji: "🏃" },
    ];
    return [
      { id: "push", label: "Push", color: "#1D9E75", emoji: "🏋" },
      { id: "corsa", label: "Corsa", color: "#378ADD", emoji: "🏃" },
      { id: "pull", label: "Pull+Gambe", color: "#854F0B", emoji: "💪" },
    ];
  }

  function dateKey(d) {
    return d.toISOString().split("T")[0];
  }

  function getDaySchedule(dayDate) {
    // Schedule is driven ONLY by user assignments, never by day-of-week defaults
    return null;
  }

  function getDotColor(tipo) {
    return tipo === "palestra" ? "#1D9E75" : tipo === "corsa" ? "#378ADD" : tipo === "extra" ? "#EF9F27" : "#ddd";
  }

  function getBlockValue(id) {
    switch (id) {
      case "physical": return "Uomo · 35 anni · 178 cm";
      case "goal": return "Ricomposizione corporea";
      case "piano": return `${piano.fasi?.length} fasi · ${piano.durata_settimane} sett.`;
      case "dieta_block": return dietaCaricata ? `${dieta.fonte?.split("—")[0].trim()} · ${dieta.media_settimanale?.kcal} kcal/die` : "Nessuna dieta caricata";
      case "health": return "Epitrocleite gomito destro (trattata)";
      default: return "—";
    }
  }

  function loadMealsForDate(dateKey) {
    setSelectedMealDate(dateKey);
    try {
      const s = localStorage.getItem('meals_' + dateKey);
      setMealsRaw(s ? JSON.parse(s) : { Colazione: [], Spuntino: [], Pranzo: [], Merenda: [], Cena: [] });
    } catch {
      setMealsRaw({ Colazione: [], Spuntino: [], Pranzo: [], Merenda: [], Cena: [] });
    }
  }

  const isToday = selectedMealDate === new Date().toISOString().split('T')[0];

  const totals = Object.values(meals).flat().reduce((a, f) => ({
    calorie: a.calorie + (f.calorie || 0), proteine: a.proteine + (f.proteine_g || 0),
    carboidrati: a.carboidrati + (f.carboidrati_g || 0), grassi: a.grassi + (f.grassi_g || 0)
  }), { calorie: 0, proteine: 0, carboidrati: 0, grassi: 0 });

  const round50 = v => Math.round(v / 50) * 50;
  const round5 = v => Math.round(v / 5) * 5;
  const tKcal = round50(dieta?.media_settimanale?.kcal || 1499);
  const tP = round5(dieta?.media_settimanale?.proteine_g || 89);
  const tC = round5(dieta?.media_settimanale?.carboidrati_g || 183);
  const tF = round5(dieta?.media_settimanale?.grassi_g || 45);

  function addWeight() {
    if (!newWeight) return;
    setWeightHistory(p => [...p, { date: new Date().toLocaleDateString("it-IT"), value: parseFloat(newWeight) }]);
    setNewWeight("");
  }

  async function handleDietaUpload(file) {
    if (!file) return;
    setUploadingDieta(true);
    setUploadProgress("Lettura del PDF in corso...");
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target.result.split(",")[1];
        setUploadProgress("Analisi della dieta con Claude...");
        try {
          const res = await fetch("/api/claude", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "claude-sonnet-4-6",
              max_tokens: 1000,
              messages: [{
                role: "user",
                content: [
                  { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
                  { type: "text", text: `Analizza questo piano alimentare. Calcola calorie e macro medi settimanali includendo i grassi intrinseci di tutti gli alimenti, non solo l'olio. Rispondi SOLO con questo JSON senza nulla prima o dopo:
{
  "fonte": "nome professionista o struttura",
  "data_caricamento": "${new Date().toLocaleDateString("it-IT")}",
  "pdf_url": "",
  "media_settimanale": {"kcal": numero, "proteine_g": numero, "carboidrati_g": numero, "grassi_g": numero},
  "note": "breve descrizione del tipo di dieta",
  "giorni": [
    {"giorno": "Lunedì", "kcal": numero, "p": numero, "c": numero, "g": numero},
    {"giorno": "Martedì", "kcal": numero, "p": numero, "c": numero, "g": numero},
    {"giorno": "Mercoledì", "kcal": numero, "p": numero, "c": numero, "g": numero},
    {"giorno": "Giovedì", "kcal": numero, "p": numero, "c": numero, "g": numero},
    {"giorno": "Venerdì", "kcal": numero, "p": numero, "c": numero, "g": numero},
    {"giorno": "Sabato", "kcal": numero, "p": numero, "c": numero, "g": numero},
    {"giorno": "Domenica", "kcal": numero, "p": numero, "c": numero, "g": numero}
  ]
}` }
                ]
              }]
            })
          });
          const result = await res.json();
          const text = result.content?.map(c => c.text || "").join("") || "";
          const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
          setDieta(parsed);
          setDietaCaricata(true);
          setUploadProgress("✓ Dieta caricata! Ora incolla il link al PDF Google Drive.");
          setEditingPdfUrl(true);
        } catch (e) {
          setUploadProgress("Errore nell'analisi. Riprova.");
        }
        setUploadingDieta(false);
      };
      reader.readAsDataURL(file);
    } catch (e) {
      setUploadProgress("Errore nella lettura del file.");
      setUploadingDieta(false);
    }
  }

  async function requestAdaptivePlan(sessionKey) {
    setAdaptiveLoading(true);
    const session = savedSessions[sessionKey];
    const feedback = feedbackText[sessionKey] || "";
    const exercises = exerciseData;
    try {
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: `PT esperto. Analizza feedback sessione, suggerisci prossima. Atleta: Flavio 35a 75kg, epitrocleite dx trattata. NO dieta. Max 120 parole. Formato: 1)Valutazione 2)Cambiamenti 3)Prossimo obiettivo.`,
          messages: [{
            role: "user",
            content: `Sessione del ${session?.date || "oggi"}.
Feedback: ${feedback || "nessun feedback specifico"}.
Carichi usati: ${JSON.stringify(exercises)}.
Umore: ${["scarso","nella media","ottimo"][workoutMood[selectedDay] || 1]}.
Note: ${workoutNotes[selectedDay] || "nessuna"}.
Cosa mi suggerisci per la prossima sessione?`
          }]
        })
      });
      const result = await res.json();
      const text = result.content?.map(c => c.text || "").join("") || "";
      setAdaptiveResponse(p => ({ ...p, [sessionKey]: text }));
    } catch(e) {
      setAdaptiveResponse(p => ({ ...p, [sessionKey]: "Errore nella richiesta. Riprova." }));
    }
    setAdaptiveLoading(false);
  }

  async function updatePianoFromComment() {
    if (!pianoComment.trim()) return;
    setPianoUpdateLoading(true);
    try {
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 3000,
          system: `PT esperto. Utente: Flavio 35a 75kg 178cm, epitrocleite dx trattata, sala pesi + corsa. Rispondi SOLO JSON puro:
{"piano":{"obiettivo":"","durata_settimane":16,"note_generali":"","fasi":[{"numero":1,"nome":"","settimane":"1-4","allenamenti_settimana":3,"note":""}]},"scheda_allenamento":{"giorni_settimana":[{"tipo":"palestra","titolo":"","descrizione":"","esercizi":[{"nome":"","serie":3,"ripetizioni":"10-12","recupero_secondi":90,"note_tecniche":""}]},{"tipo":"corsa","titolo":"","descrizione":"","esercizi":[{"nome":"","serie":1,"ripetizioni":"30 min","recupero_secondi":0,"note_tecniche":""}]}]}}`,
          messages: [{
            role: "user",
            content: `Fasi attuali: ${JSON.stringify(piano.fasi)}\n\nModifica richiesta: ${pianoComment}\n\nRispondi SOLO con JSON puro.`
          }]
        })
      });
      const result = await res.json();
      const text = result.content?.map(c => c.text || "").join("") || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      if (parsed.piano) setPiano(parsed.piano);
      if (parsed.scheda_allenamento) setSchedaAllenamento(parsed.scheda_allenamento);
      setPianoComment("");
    } catch(e) {
      console.error("updatePiano error:", e);
    }
    setPianoUpdateLoading(false);
  }

  async function searchFood(query) {
    if (!query.trim()) return;
    setFoodLoading(true); setFoodResults([]);
    try {
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 300,
          messages: [{ role: "user", content: `Valori nutrizionali esatti per: "${query}". Se è un prodotto specifico con etichetta (es. "Fage 0% 150g"), dai UN solo risultato preciso. Se è un alimento generico senza quantità (es. "pollo"), dai 2 varianti con porzioni tipiche. Rispondi SOLO con JSON array:
[{"nome":"nome con quantità","calorie":numero,"proteine_g":numero,"carboidrati_g":numero,"grassi_g":numero}]` }]
        })
      });
      const result = await res.json();
      const text = result.content?.map(c => c.text || "").join("") || "";
      setFoodResults(JSON.parse(text.replace(/```json|```/g, "").trim()));
    } catch (e) {
      setFoodResults([{ nome: "Errore nella ricerca", calorie: 0, proteine_g: 0, carboidrati_g: 0, grassi_g: 0 }]);
    }
    setFoodLoading(false);
  }

  async function searchFoodByPhoto(file, meal) {
    if (!file) return;
    setFoodLoading(true);
    setFoodResults([]);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target.result.split(",")[1];
        const mediaType = file.type || "image/jpeg";
        const res = await fetch("/api/claude", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-6",
            max_tokens: 1000,
            messages: [{
              role: "user",
              content: [
                { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
                { type: "text", text: `Analizza questa immagine. Se è un alimento o un piatto, riconosci cosa è e stima i valori nutrizionali. Se è un'etichetta nutrizionale, leggi i valori esatti. Rispondi SOLO con questo JSON array senza nulla prima o dopo:
[{"nome":"nome preciso con quantità stimata","calorie":numero,"proteine_g":numero,"carboidrati_g":numero,"grassi_g":numero}]
Dai 2-3 varianti realistiche (es. porzione piccola, media, grande). Valori riferiti alla quantità stimata visivamente.` }
              ]
            }]
          })
        });
        const result = await res.json();
        const text = result.content?.map(c => c.text || "").join("") || "";
        setFoodResults(JSON.parse(text.replace(/```json|```/g, "").trim()));
        setFoodLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (e) {
      setFoodResults([{ nome: "Errore nel riconoscimento", calorie: 0, proteine_g: 0, carboidrati_g: 0, grassi_g: 0 }]);
      setFoodLoading(false);
    }
  }

  function addFood(meal, food) {
    setMeals(p => ({ ...p, [meal]: [...p[meal], { ...food, id: Date.now() }] }));
    setAddingMeal(null); setFoodSearch(""); setFoodResults([]);
  }
  function removeFood(meal, id) { setMeals(p => ({ ...p, [meal]: p[meal].filter(f => f.id !== id) })); }
  function updateFood(meal, id, k, v) { setMeals(p => ({ ...p, [meal]: p[meal].map(f => f.id === id ? { ...f, [k]: parseFloat(v) || 0 } : f) })); }

;

  const T = {
    title1: { fontSize: 28, fontWeight: 700, color: C.text, letterSpacing: -0.5 },
    title2: { fontSize: 22, fontWeight: 700, color: C.text, letterSpacing: -0.3 },
    title3: { fontSize: 18, fontWeight: 600, color: C.text },
    headline: { fontSize: 17, fontWeight: 600, color: C.text },
    body: { fontSize: 17, fontWeight: 400, color: C.text },
    callout: { fontSize: 16, fontWeight: 400, color: C.text },
    subhead: { fontSize: 15, fontWeight: 400, color: C.text },
    footnote: { fontSize: 13, fontWeight: 400, color: C.textSecondary },
    caption: { fontSize: 12, fontWeight: 400, color: C.textTertiary },
    label: { fontSize: 11, fontWeight: 500, color: C.textTertiary, textTransform: "uppercase", letterSpacing: 0.8 },
    num: { fontSize: 34, fontWeight: 700, color: C.text, letterSpacing: -1 },
    numLarge: { fontSize: 52, fontWeight: 700, color: C.text, letterSpacing: -2 },
  };

  const S = {
    card: { background: C.card, borderRadius: 16, marginBottom: 12, overflow: "hidden" },
    cardPad: { padding: "16px 16px" },
    page: { padding: "0 0 110px 0", minHeight: "100vh", background: C.bg },
    row: { display: "flex", alignItems: "center", justifyContent: "space-between" },
    btn: (color = C.green) => ({
      background: color, color: "white", border: "none", borderRadius: 12,
      padding: "14px 20px", fontSize: 17, fontWeight: 600, cursor: "pointer",
      width: "100%", display: "block", textAlign: "center", minHeight: 50,
    }),
    btnOutline: (color = C.green) => ({
      background: "transparent", color, border: `1.5px solid ${color}`, borderRadius: 12,
      padding: "13px 20px", fontSize: 17, fontWeight: 500, cursor: "pointer",
      width: "100%", display: "block", textAlign: "center", minHeight: 50,
    }),
    btnSmall: (color = C.green) => ({
      background: color + "18", color, border: `1px solid ${color}30`, borderRadius: 10,
      padding: "8px 14px", fontSize: 15, fontWeight: 600, cursor: "pointer",
      minHeight: 36, display: "inline-flex", alignItems: "center",
    }),
    input: {
      width: "100%", padding: "14px 16px", border: `1.5px solid ${C.border}`,
      borderRadius: 12, fontSize: 17, color: C.text, background: C.card,
      outline: "none", boxSizing: "border-box", minHeight: 50,
    },
    divider: { height: 1, background: C.border, margin: "0 16px" },
    tag: (color = C.green) => ({
      background: color + "18", color, borderRadius: 20, padding: "4px 10px",
      fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center",
    }),
  };

  const MEALICONS = { Colazione: "☀️", Spuntino: "🍎", Pranzo: "🍽️", Merenda: "🥜", Cena: "🌙" };

  function MacroBar({ eaten, target, color }) {
    const pct = Math.min(100, target > 0 ? (eaten / target) * 100 : 0);
    return (
      <div style={{ height: 6, background: C.border, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: pct + "%", height: "100%", background: color, borderRadius: 3, transition: "width 0.3s" }} />
      </div>
    );
  }

  function Section({ title, action, actionLabel, children }) {
    return (
      <div style={{ marginBottom: 4 }}>
        {title && (
          <div style={{ ...S.row, padding: "8px 16px 4px" }}>
            <span style={T.label}>{title}</span>
            {action && <button onClick={action} style={{ ...T.footnote, background: "none", border: "none", color: C.green, fontWeight: 600, cursor: "pointer", padding: 0 }}>{actionLabel}</button>}
          </div>
        )}
        <div style={S.card}>{children}</div>
      </div>
    );
  }

  function ListRow({ icon, label, value, chevron, onPress, danger, last }) {
    return (
      <div onClick={onPress} style={{ ...S.cardPad, ...S.row, borderBottom: last ? "none" : `1px solid ${C.border}`, cursor: onPress ? "pointer" : "default", gap: 12 }}>
        {icon && <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>}
        <div style={{ flex: 1 }}>
          <div style={{ ...T.body, color: danger ? C.red : C.text }}>{label}</div>
          {value && <div style={T.footnote}>{value}</div>}
        </div>
        {chevron && <span style={{ color: C.textTertiary, fontSize: 18 }}>›</span>}
      </div>
    );
  }

  // ─── PROFILO TAB ─────────────────────────────────────────────────────────────
  function TabProfilo() {
    const { weekNum, phase } = getPhaseAndWeek();
    return (
      <div style={S.page}>
        {/* Header */}
        <div style={{ background: C.card, padding: "56px 20px 20px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ ...S.row, marginBottom: 4 }}>
            <div>
              <div style={T.title1}>Ciao, Flavio 👋</div>
              <div style={{ ...T.subhead, color: C.textSecondary }}>Settimana {weekNum} · {phase?.nome || "In corso"}</div>
            </div>
            <div style={{ width: 50, height: 50, borderRadius: 25, background: C.green, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 20, fontWeight: 700 }}>FL</div>
          </div>
        </div>

        <div style={{ padding: "16px 16px 0" }}>

          {/* Stats rapide */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            {[
              { label: "Peso", value: weightHistory.length ? weightHistory[weightHistory.length-1].value + " kg" : "— kg", icon: "⚖️", color: C.blue },
              { label: "BMI", value: weightHistory.length ? (weightHistory[weightHistory.length-1].value / (1.78*1.78)).toFixed(1) : "—", icon: "📊", color: C.orange },
              { label: "TDEE", value: "~2003 kcal", icon: "🔥", color: C.red },
              { label: "Fase", value: phase?.nome?.split(" ")[0] || "—", icon: "📅", color: C.green },
            ].map(item => (
              <div key={item.label} style={{ ...S.card, ...S.cardPad, marginBottom: 0 }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{item.icon}</div>
                <div style={{ ...T.headline, color: item.color }}>{item.value}</div>
                <div style={T.caption}>{item.label}</div>
              </div>
            ))}
          </div>

          {/* Grafico peso */}
          <Section title="Andamento peso" actionLabel="+ Aggiungi" action={() => {}}>
            <div style={S.cardPad}>
              {weightHistory.length < 2 ? (
                <div style={{ ...T.footnote, textAlign: "center", padding: "20px 0" }}>Aggiungi almeno 2 pesate per vedere il grafico</div>
              ) : (
                <svg viewBox={`0 0 ${(weightHistory.length-1)*60+40} 80`} style={{ width: "100%", height: 80 }}>
                  {weightHistory.map((p, i) => {
                    const vals = weightHistory.map(x => x.value);
                    const mn = Math.min(...vals)-1, mx = Math.max(...vals)+1;
                    const x = i * 60 + 20;
                    const y = 70 - ((p.value-mn)/(mx-mn)) * 60;
                    return (
                      <g key={i}>
                        {i > 0 && (() => {
                          const prev = weightHistory[i-1];
                          const px = (i-1)*60+20;
                          const py = 70 - ((prev.value-mn)/(mx-mn))*60;
                          return <line x1={px} y1={py} x2={x} y2={y} stroke={C.green} strokeWidth="2" />;
                        })()}
                        <circle cx={x} cy={y} r="4" fill={C.green} />
                        <text x={x} y={y-8} textAnchor="middle" fontSize="10" fill={C.textSecondary}>{p.value}</text>
                        <text x={x} y={76} textAnchor="middle" fontSize="9" fill={C.textTertiary}>{p.date?.split("/").slice(0,2).join("/")}</text>
                      </g>
                    );
                  })}
                </svg>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <input type="number" value={newWeight} onChange={e => setNewWeight(e.target.value)} placeholder="Nuovo peso (kg)" style={{ ...S.input, flex: 1 }} />
                <button onClick={addWeight} style={{ ...S.btn(C.green), width: "auto", padding: "0 20px" }}>+</button>
              </div>
            </div>
          </Section>

          {/* Composizione corporea */}
          <Section title="Composizione corporea">
            <div style={S.cardPad}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {[["Massa grassa", "fat", "%"], ["Massa magra", "lean", "kg"], ["Acqua corp.", "water", "%"]].map(([lbl, k, unit]) => (
                  <div key={k} style={{ textAlign: "center" }}>
                    <div style={{ ...T.title2, color: bodyData[k] ? C.text : C.textTertiary }}>
                      {bodyData[k] ? bodyData[k] + unit : "—"}
                    </div>
                    <div style={T.caption}>{lbl}</div>
                  </div>
                ))}
              </div>
              {editingBody && (
                <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                  {[["Grassa%","fat"],["Magra kg","lean"],["Acqua%","water"]].map(([pl, k]) => (
                    <input key={k} type="number" placeholder={pl} value={bodyData[k]} onChange={e => setBodyData(p => ({...p, [k]: e.target.value}))} style={{ ...S.input, flex: 1, padding: "10px 8px", fontSize: 15 }} />
                  ))}
                </div>
              )}
              <button onClick={() => setEditingBody(e => !e)} style={{ ...S.btnOutline(C.green), marginTop: 12 }}>
                {editingBody ? "Chiudi" : "Modifica"}
              </button>
            </div>
          </Section>

          {/* Il mio piano */}
          <Section title="Piano allenamento">
            <div style={S.cardPad}>
              <div style={{ ...S.row, marginBottom: 12 }}>
                <div>
                  <div style={T.headline}>{piano.obiettivo}</div>
                  <div style={{ ...T.footnote, marginTop: 2 }}>{piano.durata_settimane} settimane · Solo allenamento</div>
                </div>
                <div style={{ ...S.tag(C.green) }}>In corso</div>
              </div>
              {!pianoOpen ? (
                <button onClick={() => setPianoOpen(true)} style={S.btn(C.green)}>Vedi piano completo</button>
              ) : (
                <>
                  {piano.fasi?.map((fase, fi) => (
                    <div key={fi} style={{ background: fi === 0 ? C.greenLight : C.bg, borderRadius: 12, padding: 14, marginBottom: 10 }}>
                      <div style={{ ...S.row, marginBottom: 6 }}>
                        <div style={T.headline}>Fase {fase.numero} — {fase.nome}</div>
                        {fi === 0 && <div style={S.tag(C.green)}>In corso</div>}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                        <div><div style={T.label}>Settimane</div><div style={T.body}>{fase.settimane}</div></div>
                        <div><div style={T.label}>Sessioni/sett</div><div style={T.body}>{fase.allenamenti_settimana}</div></div>
                      </div>
                      <div style={{ ...T.footnote, fontStyle: "italic" }}>{fase.note}</div>
                    </div>
                  ))}
                  <div style={{ marginTop: 8 }}>
                    <div style={{ ...T.subhead, color: C.textSecondary, marginBottom: 8 }}>Vuoi modificare il piano?</div>
                    <textarea value={pianoComment} onChange={e => setPianoComment(e.target.value)} placeholder="Es. voglio passare a 3 sessioni, ho smesso la corsa..." rows={3}
                      style={{ ...S.input, resize: "none", marginBottom: 10 }} />
                    <button onClick={updatePianoFromComment} disabled={pianoUpdateLoading || !pianoComment.trim()}
                      style={S.btn(pianoUpdateLoading || !pianoComment.trim() ? C.textTertiary : C.text)}>
                      {pianoUpdateLoading ? "Aggiornamento..." : "Aggiorna piano"}
                    </button>
                  </div>
                  <button onClick={() => setPianoOpen(false)} style={{ ...S.btnOutline(C.textSecondary), marginTop: 8 }}>Chiudi</button>
                </>
              )}
            </div>
          </Section>

          {/* Dati dieta */}
          <Section title="Dieta">
            <ListRow icon="👩‍⚕️" label={dieta.fonte || "Nessuna dieta"} value={dietaCaricata ? `${dieta.media_settimanale?.kcal} kcal/die · ${dieta.note?.substring(0,40)}...` : "Carica un PDF"} chevron last />
          </Section>

          {/* Salute */}
          <Section title="Salute">
            <ListRow icon="⚕️" label="Epitrocleite gomito destro" value="Trattata · al momento asintomatica" last />
          </Section>

        </div>
      </div>
    );
  }

  // ─── DIETA TAB ───────────────────────────────────────────────────────────────
  function TabDieta() {
    const pctKcal = Math.min(100, tKcal > 0 ? (totals.calorie/tKcal)*100 : 0);
    return (
      <div style={S.page}>
        {/* Header fisso */}
        <div style={{ background: C.card, padding: "56px 20px 16px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ ...S.row, marginBottom: 16 }}>
            <div style={T.title1}>Alimentazione</div>
            <div style={{ ...T.subhead, color: isToday ? C.green : C.textSecondary, fontWeight: 600 }}>
              {new Date(selectedMealDate + "T12:00:00").toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" })}
            </div>
          </div>
          {/* Calendario 14 giorni */}
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
            {Array.from({ length: 14 }, (_, i) => {
              const d = new Date(); d.setDate(d.getDate() - (13 - i));
              const dk = d.toISOString().split("T")[0];
              const hasMeals = (() => { try { const s = localStorage.getItem("meals_" + dk); return s && Object.values(JSON.parse(s)).flat().length > 0; } catch { return false; } })();
              const isSel = dk === selectedMealDate;
              const isT = dk === new Date().toISOString().split("T")[0];
              return (
                <button key={dk} onClick={() => loadMealsForDate(dk)} style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 10px", borderRadius: 12, border: `1.5px solid ${isSel ? C.green : C.border}`, background: isSel ? C.green : hasMeals ? C.greenLight : C.bg, cursor: "pointer", minWidth: 48 }}>
                  <span style={{ fontSize: 11, color: isSel ? "white" : C.textTertiary, fontWeight: 600, textTransform: "uppercase" }}>{d.toLocaleDateString("it-IT", { weekday: "short" })}</span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: isSel ? "white" : isT ? C.green : C.text, lineHeight: 1.2 }}>{d.getDate()}</span>
                  {hasMeals && !isSel && <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.green, marginTop: 2 }} />}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ padding: "16px 16px 0" }}>

          {/* Ring calorie */}
          <div style={{ ...S.card, ...S.cardPad, display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <svg width={100} height={100}>
                <circle cx={50} cy={50} r={42} fill="none" stroke={C.border} strokeWidth={10} />
                <circle cx={50} cy={50} r={42} fill="none" stroke={C.green} strokeWidth={10}
                  strokeDasharray={`${pctKcal * 2.64} 264`} strokeDashoffset={66} strokeLinecap="round" transform="rotate(-90 50 50)" />
                <text x={50} y={46} textAnchor="middle" fontSize={20} fontWeight={700} fill={C.text}>{totals.calorie}</text>
                <text x={50} y={62} textAnchor="middle" fontSize={11} fill={C.textSecondary}>/ {tKcal}</text>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ ...T.headline, marginBottom: 2 }}>Calorie oggi</div>
              <div style={{ ...T.footnote, marginBottom: 12 }}>{tKcal - totals.calorie > 0 ? `${tKcal - totals.calorie} kcal rimanenti` : "Obiettivo raggiunto!"}</div>
              {[["Proteine", totals.proteine, tP, C.blue], ["Carboidrati", totals.carboidrati, tC, C.orange], ["Grassi", totals.grassi, tF, C.red]].map(([lbl, eaten, target, color]) => (
                <div key={lbl} style={{ marginBottom: 8 }}>
                  <div style={{ ...S.row, marginBottom: 3 }}>
                    <span style={T.footnote}>{lbl}</span>
                    <span style={{ ...T.footnote, fontWeight: 600, color }}>{Math.round(eaten)}g / {target}g</span>
                  </div>
                  <MacroBar eaten={eaten} target={target} color={color} />
                </div>
              ))}
            </div>
          </div>

          {/* Dieta card */}
          {dietaCaricata && (
            <Section title="La tua dieta">
              <div style={S.cardPad}>
                <div style={{ ...S.row, marginBottom: 8 }}>
                  <div>
                    <div style={T.headline}>✓ {dieta.fonte}</div>
                    <div style={T.footnote}>Caricata il {dieta.data_caricamento}</div>
                  </div>
                  <button onClick={() => fileInputRef.current?.click()} style={S.btnSmall(C.green)}>Aggiorna</button>
                </div>
                <div style={{ ...T.footnote, fontStyle: "italic" }}>{dieta.note}</div>
                {dieta.pdf_url && <a href={dieta.pdf_url} target="_blank" rel="noreferrer" style={{ ...T.footnote, color: C.green, display: "block", marginTop: 8 }}>Apri PDF ›</a>}
                <input type="file" ref={fileInputRef} accept=".pdf" style={{ display: "none" }} onChange={e => handleDietaUpload(e.target.files?.[0])} />
              </div>
            </Section>
          )}

          {/* Banner sola lettura */}
          {!isToday && (
            <div style={{ background: C.orangeLight, borderRadius: 12, padding: 14, marginBottom: 12, display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ fontSize: 20 }}>📋</span>
              <div>
                <div style={{ ...T.subhead, fontWeight: 600 }}>Storico</div>
                <div style={T.footnote}>{new Date(selectedMealDate + "T12:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "long" })} — sola lettura</div>
              </div>
            </div>
          )}

          {/* Pasti */}
          {["Colazione", "Spuntino", "Pranzo", "Merenda", "Cena"].map(meal => {
            const items = meals[meal] || [];
            const mealKcal = items.reduce((a, f) => a + (f.calorie || 0), 0);
            return (
              <div key={meal} style={{ ...S.card }}>
                <div style={{ ...S.cardPad, ...S.row, cursor: "pointer" }} onClick={() => isToday && setAddingMeal(addingMeal === meal ? null : meal)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: 28 }}>{MEALICONS[meal]}</div>
                    <div>
                      <div style={T.headline}>{meal}</div>
                      <div style={T.footnote}>{mealKcal > 0 ? `${mealKcal} kcal` : "Nessun alimento"}</div>
                    </div>
                  </div>
                  {isToday && <span style={{ ...T.title2, color: C.green }}>+</span>}
                </div>
                {items.length > 0 && (
                  <div style={{ borderTop: `1px solid ${C.border}` }}>
                    {items.map(food => (
                      <div key={food.id} style={{ ...S.cardPad, borderBottom: `1px solid ${C.border}`, ...S.row }}>
                        <div style={{ flex: 1 }}>
                          <div style={T.body}>{food.nome}</div>
                          <div style={T.footnote}>{food.calorie} kcal · P {food.proteine_g}g · C {food.carboidrati_g}g · G {food.grassi_g}g</div>
                        </div>
                        {isToday && (
                          <button onClick={() => removeFood(meal, food.id)} style={{ ...S.btnSmall(C.red), minHeight: 36 }}>✕</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {addingMeal === meal && isToday && (
                  <div style={{ ...S.cardPad, borderTop: `1px solid ${C.border}` }}>
                    {/* Modalità ricerca */}
                    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                      {[
                        { id: "text", icon: "🔍", label: "Cerca" },
                        { id: "camera", icon: "📷", label: "Foto" },
                        { id: "gallery", icon: "🖼️", label: "Galleria" },
                      ].map(m => (
                        <button key={m.id} onClick={() => {
                          setPhotoMode(m.id === "text" ? null : m.id);
                          setFoodResults([]);
                          if (m.id === "camera") cameraInputRef.current?.click();
                          if (m.id === "gallery") galleryInputRef.current?.click();
                        }} style={{ flex: 1, ...S.btnSmall(photoMode === m.id || (m.id === "text" && !photoMode) ? C.green : C.textTertiary), justifyContent: "center", gap: 4 }}>
                          <span style={{ fontSize: 18 }}>{m.icon}</span>
                          <span style={{ fontSize: 14 }}>{m.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* Input nascosti per foto */}
                    <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) searchFoodByPhoto(f, meal); e.target.value = ""; }} />
                    <input ref={galleryInputRef} type="file" accept="image/*" style={{ display: "none" }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) searchFoodByPhoto(f, meal); e.target.value = ""; }} />

                    {/* Campo testo */}
                    {!photoMode && (
                      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                        <input value={foodSearch} onChange={e => setFoodSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && searchFood(foodSearch)}
                          placeholder="Es. petto di pollo 150g" style={{ ...S.input, flex: 1 }} autoFocus />
                        <button onClick={() => searchFood(foodSearch)} style={{ ...S.btn(C.green), width: "auto", padding: "0 20px" }}>
                          {foodLoading ? "..." : "Cerca"}
                        </button>
                      </div>
                    )}

                    {/* Loading foto */}
                    {foodLoading && (
                      <div style={{ textAlign: "center", padding: "20px 0" }}>
                        <div style={{ fontSize: 36, marginBottom: 8 }}>{photoMode ? "🔍" : "⏳"}</div>
                        <div style={{ ...T.footnote }}>
                          {photoMode ? "Analisi immagine in corso..." : "Ricerca in corso..."}
                        </div>
                      </div>
                    )}

                    {/* Risultati */}
                    {!foodLoading && foodResults.map((food, i) => (
                      <div key={i} onClick={() => addFood(meal, food)} style={{ ...S.cardPad, background: C.bg, borderRadius: 12, marginBottom: 8, cursor: "pointer" }}>
                        <div style={T.body}>{food.nome}</div>
                        <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
                          <span style={{ ...T.footnote, fontWeight: 600, color: C.orange }}>{food.calorie} kcal</span>
                          <span style={{ ...T.footnote, color: C.blue }}>P {food.proteine_g}g</span>
                          <span style={{ ...T.footnote, color: C.orange }}>C {food.carboidrati_g}g</span>
                          <span style={{ ...T.footnote, color: C.red }}>G {food.grassi_g}g</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── ALLENAMENTO TAB ─────────────────────────────────────────────────────────
  function TabAllenamento() {
    const { weekNum, phase } = getPhaseAndWeek();
    const workouts = getWorkoutsForPhase(phase);
    const assigned = workoutAssignments[dateKey(weekDays[selectedDay])];
    const wInfo = workouts.find(w => w.id === assigned);
    const displayScheda = (() => {
      if (!wInfo) return null;
      const tipo = wInfo.id === "push" ? "palestra" : wInfo.id === "pull" ? "palestra" : wInfo.id;
      return schedaAllenamento.giorni_settimana?.find(d => d.tipo === tipo) || null;
    })();

    return (
      <div style={S.page}>
        <div style={{ background: C.card, padding: "56px 20px 20px", borderBottom: `1px solid ${C.border}` }}>
          <div style={T.title1}>Allenamento</div>
          <div style={{ ...T.subhead, color: C.textSecondary, marginTop: 4 }}>Settimana {weekNum} · {phase?.nome}</div>
        </div>

        <div style={{ padding: "16px 16px 0" }}>

          {/* Fase corrente */}
          <div style={{ ...S.card, ...S.cardPad, background: C.greenLight, border: `1px solid ${C.green}30`, marginBottom: 12 }}>
            <div style={{ ...T.footnote, color: C.green, fontWeight: 600, marginBottom: 4 }}>FASE CORRENTE</div>
            <div style={T.title3}>{phase?.nome}</div>
            <div style={T.footnote}>{phase?.settimane} settimane · {phase?.allenamenti_settimana} sessioni/sett</div>
          </div>

          {/* Token */}
          <div style={{ ...S.card, ...S.cardPad }}>
            <div style={{ ...T.label, marginBottom: 12 }}>Scegli tipo sessione</div>
            <div style={{ display: "flex", gap: 10 }}>
              {workouts.map(w => (
                <button key={w.id} onClick={() => setSelectedWorkoutToken(selectedWorkoutToken === w.id ? null : w.id)}
                  style={{ flex: 1, padding: "14px 10px", borderRadius: 14, border: `2px solid ${selectedWorkoutToken === w.id ? w.color : C.border}`, background: selectedWorkoutToken === w.id ? w.color + "18" : C.bg, cursor: "pointer" }}>
                  <div style={{ fontSize: 28 }}>{w.emoji}</div>
                  <div style={{ ...T.subhead, fontWeight: 600, color: selectedWorkoutToken === w.id ? w.color : C.text, marginTop: 4 }}>{w.label}</div>
                </button>
              ))}
            </div>
            {selectedWorkoutToken && <div style={{ ...T.footnote, color: C.green, textAlign: "center", marginTop: 10, fontWeight: 600 }}>✓ Tocca un giorno per assegnare</div>}
          </div>

          {/* Calendario settimana */}
          <div style={S.card}>
            <div style={{ ...S.cardPad, borderBottom: `1px solid ${C.border}`, ...S.row }}>
              <button onClick={() => setCalWeekOffset(o => o-1)} style={{ ...S.btnSmall(C.textSecondary), background: "transparent", border: "none", fontSize: 22, padding: "0 8px" }}>‹</button>
              <span style={{ ...T.body, fontWeight: 600 }}>
                {weekDays[0]?.toLocaleDateString("it-IT", { day: "numeric", month: "short" })} — {weekDays[6]?.toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
              </span>
              <button onClick={() => setCalWeekOffset(o => o+1)} style={{ ...S.btnSmall(C.textSecondary), background: "transparent", border: "none", fontSize: 22, padding: "0 8px" }}>›</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0 }}>
              {weekDays.map((d, i) => {
                const dk = dateKey(d);
                const asgn = workoutAssignments[dk];
                const w = workouts.find(x => x.id === asgn);
                const isToday = dk === dateKey(new Date());
                const isSel = i === selectedDay;
                return (
                  <button key={i} onClick={() => {
                    if (selectedWorkoutToken) {
                      const newA = { ...workoutAssignments };
                      weekDays.forEach(wd => { if (newA[dateKey(wd)] === selectedWorkoutToken) delete newA[dateKey(wd)]; });
                      newA[dk] = selectedWorkoutToken;
                      setWorkoutAssignments(newA);
                      setSelectedWorkoutToken(null);
                      setSelectedDay(i);
                      setDayMenu(null);
                    } else if (asgn) {
                      setDayMenu(prev => prev?.dk === dk ? null : { dk });
                      setSelectedDay(i);
                    } else {
                      setSelectedDay(i);
                      setDayMenu(null);
                    }
                  }} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 4px", background: isSel ? C.green + "15" : "transparent", border: "none", borderRight: i < 6 ? `1px solid ${C.border}` : "none", cursor: "pointer", position: "relative" }}>
                    <span style={{ ...T.caption, fontWeight: 600, textTransform: "uppercase" }}>{dayNames[d.getDay()]}</span>
                    <span style={{ ...T.title3, color: isSel ? C.green : isToday ? C.green : C.text, marginTop: 2 }}>{d.getDate()}</span>
                    {w && <div style={{ width: 8, height: 8, borderRadius: 4, background: w.color, marginTop: 4 }} />}
                    {!w && <div style={{ width: 8, height: 8, marginTop: 4 }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Menu giorno */}
          {dayMenu && (() => {
            const menuW = workouts.find(w => w.id === workoutAssignments[dayMenu.dk]);
            if (!menuW) return null;
            return (
              <div style={{ ...S.card, ...S.cardPad, ...S.row, border: `1.5px solid ${menuW.color}30`, background: menuW.color + "08" }}>
                <div style={{ ...T.body, fontWeight: 600 }}>{menuW.emoji} {menuW.label}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { setSelectedWorkoutToken(menuW.id); const n = { ...workoutAssignments }; delete n[dayMenu.dk]; setWorkoutAssignments(n); setDayMenu(null); }} style={S.btnSmall(C.blue)}>Sposta</button>
                  <button onClick={() => { const n = { ...workoutAssignments }; delete n[dayMenu.dk]; setWorkoutAssignments(n); setDayMenu(null); }} style={S.btnSmall(C.red)}>Elimina</button>
                </div>
              </div>
            );
          })()}

          {/* Scheda esercizi */}
          {displayScheda && (
            <Section title="Scheda del giorno">
              <div style={S.cardPad}>
                <div style={{ ...T.title3, marginBottom: 4 }}>{displayScheda.titolo}</div>
                <div style={{ ...T.footnote, marginBottom: 14 }}>{displayScheda.descrizione}</div>
                {displayScheda.esercizi?.map((ex, ei) => (
                  <div key={ei} style={{ background: C.bg, borderRadius: 12, padding: 14, marginBottom: 10 }}>
                    <div style={{ ...T.body, fontWeight: 600, marginBottom: 6 }}>{ex.nome}</div>
                    <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
                      {[["Serie", ex.serie], ["Rip.", ex.ripetizioni], ["Rec.", ex.recupero_secondi ? ex.recupero_secondi + "s" : "—"]].map(([lbl, val]) => (
                        <div key={lbl} style={{ flex: 1, background: C.card, borderRadius: 10, padding: "8px 10px", textAlign: "center" }}>
                          <div style={{ ...T.num, fontSize: 20 }}>{val}</div>
                          <div style={T.caption}>{lbl}</div>
                        </div>
                      ))}
                    </div>
                    {ex.note_tecniche && <div style={{ ...T.footnote, fontStyle: "italic" }}>{ex.note_tecniche}</div>}
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>
    );
  }

  // ─── EDITOR TAB ──────────────────────────────────────────────────────────────
  function TabEditor() {
    const ep = editorPiano || JSON.parse(JSON.stringify(piano));
    const es = editorScheda || JSON.parse(JSON.stringify(schedaAllenamento));
    const setEp = fn => setEditorPiano(p => fn(p || JSON.parse(JSON.stringify(piano))));
    const setEs = fn => setEditorScheda(p => fn(p || JSON.parse(JSON.stringify(schedaAllenamento))));
    return (
      <div style={S.page}>
        <div style={{ background: C.card, padding: "56px 20px 20px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ ...S.row }}>
            <div style={T.title1}>Editor PT</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setEditorPiano(null); setEditorScheda(null); setEditorSaved(false); }} style={S.btnSmall(C.textTertiary)}>Reset</button>
              <button onClick={() => { setPiano(ep); setSchedaAllenamento(es); setEditorSaved(true); setTimeout(() => setEditorSaved(false), 2000); }} style={S.btnSmall(C.green)}>
                {editorSaved ? "✓ Salvato" : "Salva"}
              </button>
            </div>
          </div>
        </div>
        <div style={{ padding: "16px 16px 0" }}>
          <Section title="Fasi del piano">
            {ep.fasi?.map((fase, fi) => (
              <div key={fi} style={{ ...S.cardPad, borderBottom: `1px solid ${C.border}` }}>
                <div style={{ ...S.row, marginBottom: 10 }}>
                  <div style={T.headline}>Fase {fi+1}</div>
                  <button onClick={() => setEp(p => ({ ...p, fasi: p.fasi.filter((_,i) => i !== fi) }))} style={S.btnSmall(C.red)}>Rimuovi</button>
                </div>
                <input value={fase.nome || ""} onChange={e => setEp(p => ({ ...p, fasi: p.fasi.map((x,i) => i===fi ? {...x,nome:e.target.value} : x) }))} placeholder="Nome fase" style={{ ...S.input, marginBottom: 10 }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <input value={fase.settimane || ""} onChange={e => setEp(p => ({ ...p, fasi: p.fasi.map((x,i) => i===fi ? {...x,settimane:e.target.value} : x) }))} placeholder="Settimane (es. 1-4)" style={S.input} />
                  <input type="number" value={fase.allenamenti_settimana || ""} onChange={e => setEp(p => ({ ...p, fasi: p.fasi.map((x,i) => i===fi ? {...x,allenamenti_settimana:parseInt(e.target.value)||0} : x) }))} placeholder="Sessioni/sett" style={S.input} />
                </div>
                <textarea value={fase.note || ""} onChange={e => setEp(p => ({ ...p, fasi: p.fasi.map((x,i) => i===fi ? {...x,note:e.target.value} : x) }))} placeholder="Note" rows={2} style={{ ...S.input, resize: "none" }} />
              </div>
            ))}
            <div style={S.cardPad}>
              <button onClick={() => setEp(p => ({ ...p, fasi: [...(p.fasi||[]), { numero:(p.fasi?.length||0)+1, nome:"", settimane:"", allenamenti_settimana:3, note:"" }] }))} style={S.btnOutline(C.green)}>+ Aggiungi fase</button>
            </div>
          </Section>
          <Section title="Schede esercizi">
            {es.giorni_settimana?.map((scheda, si) => (
              <div key={si} style={{ borderBottom: `1px solid ${C.border}` }}>
                <div style={{ ...S.cardPad }}>
                  <div style={{ ...S.row, marginBottom: 10 }}>
                    <select value={scheda.tipo || "palestra"} onChange={e => setEs(p => ({ ...p, giorni_settimana: p.giorni_settimana.map((x,i) => i===si ? {...x,tipo:e.target.value} : x) }))} style={{ ...S.input, width: "auto", flex: 1, marginRight: 10 }}>
                      <option value="palestra">Palestra</option>
                      <option value="corsa">Corsa</option>
                    </select>
                    <button onClick={() => setEs(p => ({ ...p, giorni_settimana: p.giorni_settimana.filter((_,i) => i!==si) }))} style={S.btnSmall(C.red)}>✕</button>
                  </div>
                  <input value={scheda.titolo || ""} onChange={e => setEs(p => ({ ...p, giorni_settimana: p.giorni_settimana.map((x,i) => i===si ? {...x,titolo:e.target.value} : x) }))} placeholder="Titolo scheda" style={{ ...S.input, marginBottom: 10 }} />
                  {scheda.esercizi?.map((ex, ei) => (
                    <div key={ei} style={{ background: C.bg, borderRadius: 12, padding: 12, marginBottom: 8 }}>
                      <div style={{ ...S.row, marginBottom: 8 }}>
                        <span style={T.footnote}>Esercizio {ei+1}</span>
                        <button onClick={() => setEs(p => ({ ...p, giorni_settimana: p.giorni_settimana.map((x,i) => i===si ? {...x,esercizi:x.esercizi.filter((_,j) => j!==ei)} : x) }))} style={S.btnSmall(C.red)}>✕</button>
                      </div>
                      <input value={ex.nome || ""} onChange={e => setEs(p => ({ ...p, giorni_settimana: p.giorni_settimana.map((x,i) => i===si ? {...x,esercizi:x.esercizi.map((z,j) => j===ei ? {...z,nome:e.target.value} : z)} : x) }))} placeholder="Nome esercizio" style={{ ...S.input, marginBottom: 8 }} />
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr", gap: 8 }}>
                        {[["Serie","serie","number"],["Ripetizioni","ripetizioni","text"],["Rec(s)","recupero_secondi","number"]].map(([lbl, k, t]) => (
                          <div key={k}>
                            <div style={T.caption}>{lbl}</div>
                            <input type={t} value={ex[k] || ""} onChange={e => setEs(p => ({ ...p, giorni_settimana: p.giorni_settimana.map((x,i) => i===si ? {...x,esercizi:x.esercizi.map((z,j) => j===ei ? {...z,[k]: t==="number"?parseInt(e.target.value)||0:e.target.value} : z)} : x) }))} style={{ ...S.input, padding: "10px 10px" }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setEs(p => ({ ...p, giorni_settimana: p.giorni_settimana.map((x,i) => i===si ? {...x,esercizi:[...(x.esercizi||[]),{nome:"",serie:3,ripetizioni:"10-12",recupero_secondi:90,note_tecniche:""}]} : x) }))} style={S.btnOutline(C.green)}>+ Esercizio</button>
                </div>
              </div>
            ))}
            <div style={S.cardPad}>
              <button onClick={() => setEs(p => ({ ...p, giorni_settimana: [...(p.giorni_settimana||[]), {tipo:"palestra",titolo:"",descrizione:"",esercizi:[]}] }))} style={S.btnOutline(C.textSecondary)}>+ Aggiungi scheda</button>
            </div>
          </Section>
          <div style={{ padding: "0 0 16px" }}>
            <button onClick={() => { setPiano(ep); setSchedaAllenamento(es); setEditorSaved(true); setTimeout(() => setEditorSaved(false), 2000); }} style={S.btn(C.text)}>
              {editorSaved ? "✓ Piano salvato" : "Salva piano completo"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── NAV + RENDER ────────────────────────────────────────────────────────────
  const TABS = [
    { id: "profilo", label: "Profilo", icon: "👤" },
    { id: "dieta", label: "Dieta", icon: "🥗" },
    { id: "allenamento", label: "Training", icon: "🏋" },
    { id: "editor", label: "Editor", icon: "✏️" },
  ];

  return (
    <div style={{ background: C.bg, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif", maxWidth: 480, margin: "0 auto", minHeight: "100vh", position: "relative" }}>
      {activeTab === "profilo" && <TabProfilo />}
      {activeTab === "dieta" && <TabDieta />}
      {activeTab === "allenamento" && <TabAllenamento />}
      {activeTab === "editor" && <TabEditor />}

      {/* Tab bar */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: C.nav, borderTop: `1px solid ${C.border}`, display: "flex", paddingBottom: "env(safe-area-inset-bottom, 8px)", zIndex: 100 }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ flex: 1, background: "transparent", border: "none", padding: "8px 0 6px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer" }}>
            <span style={{ fontSize: 24 }}>{tab.icon}</span>
            <span style={{ fontSize: 10, fontWeight: activeTab === tab.id ? 700 : 400, color: activeTab === tab.id ? C.green : C.textTertiary, letterSpacing: 0.2 }}>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default App;
