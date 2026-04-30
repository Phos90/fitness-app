import { useState, useRef } from "react";

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
  const [schedaAllenamento] = useState(PIANO_DEFAULT.scheda_allenamento);
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
  const [weightHistory, setWeightHistory] = useState([{ date: "14/04/2026", value: 75 }]);
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
  const [meals, setMeals] = useState({ Colazione: [], Spuntino: [], Pranzo: [], Merenda: [], Cena: [] });
  const [addingMeal, setAddingMeal] = useState(null);
  const [foodSearch, setFoodSearch] = useState("");
  const [foodResults, setFoodResults] = useState([]);
  const [foodLoading, setFoodLoading] = useState(false);
  const [editingFood, setEditingFood] = useState(null);
  const [selectedDay, setSelectedDay] = useState(1);
  const [calWeekOffset, setCalWeekOffset] = useState(0);
  const [workoutNotes, setWorkoutNotes] = useState({});
  const [workoutMood, setWorkoutMood] = useState({});
  const [exerciseData, setExerciseData] = useState({});
  const [savedSessions, setSavedSessions] = useState({});
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
  const [workoutAssignments, setWorkoutAssignments] = useState({});
  const [selectedWorkoutToken, setSelectedWorkoutToken] = useState(null);
  const [dayMenu, setDayMenu] = useState(null); // { dk, wInfo } — context menu for assigned day
  const PROGRAM_START = new Date("2026-04-21"); // inizio percorso
  const [streak] = useState(0);
  const [diaryText, setDiaryText] = useState("");
  const [diarySaved, setDiarySaved] = useState(false);
  const [selectedMedTime, setSelectedMedTime] = useState(10);
  const [medRunning, setMedRunning] = useState(false);
  const [medSeconds, setMedSeconds] = useState(0);
  const medRef = useRef(null);
  const [checkin, setCheckin] = useState({ diet: 0, training: 0, mental: 0 });
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
          const res = await fetch("https://api.anthropic.com/v1/messages", {
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
          system: `Sei un personal trainer con metodologia Project Invictus.
La dieta è gestita esternamente — NON menzionarla.
Analizza il feedback della sessione e rispondi con suggerimenti adattativi concreti per la prossima sessione.
Principi invariabili: infortuni = vincoli assoluti, progressione graduale, costanza prima dell'intensità.
Dati atleta: Flavio, 35 anni, 75kg, epitrocleite gomito destro (trattata). Fase 1 Riattivazione.
Rispondi in italiano, max 150 parole, diretto e pratico. Struttura: 1) Valutazione 2) Cosa cambia 3) Obiettivo prossima sessione.`,
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
          max_tokens: 1000,
          system: `${SYSTEM_PROMPT_PT}

Quando aggiorni il piano restituisci SOLO questo JSON senza nulla prima o dopo:
{
  "piano": {
    "obiettivo": "string",
    "durata_settimane": number,
    "note_generali": "string",
    "fasi": [{"numero":1,"nome":"string","settimane":"string","allenamenti_settimana":number,"note":"string"}]
  },
  "scheda_allenamento": {
    "giorni_settimana": [
      {"tipo":"corsa|palestra","titolo":"string","descrizione":"string","esercizi":[{"nome":"string","serie":number,"ripetizioni":"string","recupero_secondi":number,"note_tecniche":"string"}]}
    ]
  }
}`,
          messages: [{
            role: "user",
            content: `Piano attuale:
${JSON.stringify(piano, null, 2)}

Commenti e modifiche richieste:
${pianoComment}

Aggiorna il piano tenendo conto dei commenti. Se l'utente chiede esplicitamente un numero di sessioni o qualsiasi altro parametro specifico, RISPETTA quella richiesta — non applicare valori di default che contraddicono quanto richiesto. Mantieni tutto quello che non viene esplicitamente cambiato.`
          }]
        })
      });
      const result = await res.json();
      const text = result.content?.map(c => c.text || "").join("") || "";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      if (parsed.piano) setPiano(parsed.piano);
      setPianoComment("");
    } catch(e) {
      console.error(e);
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
          max_tokens: 1000,
          messages: [{ role: "user", content: `Valori nutrizionali per: "${query}". Rispondi SOLO con JSON array senza nulla prima o dopo:
[{"nome":"nome con quantità","calorie":numero,"proteine_g":numero,"carboidrati_g":numero,"grassi_g":numero}]
Dai 2-3 varianti. Valori riferiti alla quantità specificata.` }]
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

  function addFood(meal, food) {
    setMeals(p => ({ ...p, [meal]: [...p[meal], { ...food, id: Date.now() }] }));
    setAddingMeal(null); setFoodSearch(""); setFoodResults([]);
  }
  function removeFood(meal, id) { setMeals(p => ({ ...p, [meal]: p[meal].filter(f => f.id !== id) })); }
  function updateFood(meal, id, k, v) { setMeals(p => ({ ...p, [meal]: p[meal].map(f => f.id === id ? { ...f, [k]: parseFloat(v) || 0 } : f) })); }

  function startMed() {
    setMedRunning(true); setMedSeconds(selectedMedTime * 60);
    medRef.current = setInterval(() => {
      setMedSeconds(s => { if (s <= 1) { clearInterval(medRef.current); setMedRunning(false); return 0; } return s - 1; });
    }, 1000);
  }
  function stopMed() { clearInterval(medRef.current); setMedRunning(false); setMedSeconds(0); }

  const card = (extra = {}) => ({ background: "white", borderRadius: 12, border: "0.5px solid #e0e0d8", padding: 14, marginBottom: 12, ...extra });
  const selectedDayDate = weekDays[selectedDay];
  const selectedDaySchedule = getDaySchedule(selectedDayDate);

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f0", ...f }}>
      <div style={{ maxWidth: 420, margin: "0 auto", paddingBottom: 80 }}>

        {/* ══════════════════ PROFILO ══════════════════ */}
        {activeTab === "profilo" && (
          <div style={{ padding: "24px 16px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h1 style={{ fontSize: 22, fontWeight: 400, color: "#1a1a1a" }}>Il mio profilo</h1>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 500, color: "#0F6E56" }}>FL</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8, marginBottom: 14 }}>
              {[
                { label: "Età", value: "35 anni" },
                { label: "Peso", value: weightHistory[weightHistory.length-1].value + " kg" },
                { label: "BMI", value: "23.7" },
                { label: "TDEE", value: "~2003", tooltip: "Fabbisogno calorico giornaliero stimato (sedentario)" },
              ].map(m => (
                <div key={m.label} title={m.tooltip || ""} style={{ background: "white", borderRadius: 8, padding: "8px 6px", border: "0.5px solid #e0e0d8" }}>
                  <div style={{ fontSize: 9, color: "#999" }}>{m.label}{m.tooltip ? " ℹ" : ""}</div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "#1a1a1a" }}>{m.value}</div>
                </div>
              ))}
            </div>

            {/* Grafico peso */}
            <div style={card()}>
              <div style={{ fontSize: 11, color: "#999", marginBottom: 8 }}>Andamento peso</div>
              {weightHistory.length >= 2 ? (() => {
                const W = 290, H = 70, PAD = 24;
                const vals = weightHistory.map(w => w.value);
                const minV = Math.min(...vals) - 0.5, maxV = Math.max(...vals) + 0.5;
                const range = maxV - minV;
                const pts = weightHistory.map((w, i) => ({
                  x: PAD + (i / (weightHistory.length - 1)) * (W - PAD * 2),
                  y: H - PAD - ((w.value - minV) / range) * (H - PAD * 2), ...w
                }));
                return (
                  <svg width="100%" viewBox={`0 0 ${W} ${H+20}`} style={{ overflow: "visible" }}>
                    <polyline points={pts.map(p => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#1D9E75" strokeWidth="1.5" />
                    {pts.map((p, i) => (
                      <g key={i}>
                        <circle cx={p.x} cy={p.y} r={3} fill="#1D9E75" />
                        <text x={p.x} y={p.y - 7} fontSize="8" fill="#1D9E75" textAnchor="middle">{p.value}</text>
                        <text x={p.x} y={H+14} fontSize="7" fill="#bbb" textAnchor="middle">{p.date.split("/").slice(0,2).join("/")}</text>
                      </g>
                    ))}
                  </svg>
                );
              })() : (
                <div style={{ fontSize: 11, color: "#ccc", textAlign: "center", padding: "8px 0" }}>Aggiungi almeno 2 pesate per vedere il grafico</div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <input type="number" value={newWeight} onChange={e => setNewWeight(e.target.value)} placeholder="Nuovo peso (kg)" style={{ flex: 1, padding: "6px 10px", border: "0.5px solid #e0e0d8", borderRadius: 8, fontSize: 12, background: "#f9f9f6", color: "#1a1a1a", outline: "none", ...f }} />
                <button onClick={addWeight} style={{ padding: "6px 14px", background: "#1D9E75", border: "none", borderRadius: 8, color: "white", fontSize: 12, cursor: "pointer", ...f }}>+ Aggiungi</button>
              </div>
            </div>

            {/* Composizione corporea */}
            <div style={card()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: "#999" }}>Composizione corporea</div>
                <button onClick={() => setEditingBody(!editingBody)} style={{ fontSize: 11, color: "#1D9E75", background: "transparent", border: "none", cursor: "pointer", ...f }}>{editingBody ? "Salva" : "Modifica"}</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                {[{ label: "Massa grassa", key: "fat", unit: "%" }, { label: "Massa magra", key: "lean", unit: "kg" }, { label: "Acqua corp.", key: "water", unit: "%" }].map(({ label, key, unit }) => (
                  <div key={key} style={{ background: "#f9f9f6", borderRadius: 8, padding: "8px 6px", textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: "#999", marginBottom: 4 }}>{label}</div>
                    {editingBody
                      ? <input type="number" value={bodyData[key]} onChange={e => setBodyData(p => ({ ...p, [key]: e.target.value }))} placeholder="—" style={{ width: "100%", border: "none", background: "transparent", textAlign: "center", fontSize: 14, fontWeight: 500, color: "#1a1a1a", outline: "none", ...f }} />
                      : <div style={{ fontSize: 14, fontWeight: 500, color: "#1a1a1a" }}>{bodyData[key] ? bodyData[key] + unit : "—"}</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* Blocchi drag */}
            <div style={{ fontSize: 11, color: "#bbb", marginBottom: 8 }}>Trascina per riordinare</div>
            {profileBlocks.map((block, idx) => (
              <div key={block.id} draggable
                onDragStart={() => setDragIdx(idx)}
                onDragOver={e => { e.preventDefault(); if (dragIdx !== null && dragIdx !== idx) { const nb = [...profileBlocks]; const [m] = nb.splice(dragIdx, 1); nb.splice(idx, 0, m); setProfileBlocks(nb); setDragIdx(idx); } }}
                onDragEnd={() => setDragIdx(null)}
                onClick={() => { if (block.id === "piano") setPianoOpen(p => !p); }}
                style={{ background: "white", border: "0.5px solid #e0e0d8", borderRadius: 12, padding: "10px 12px", marginBottom: 8, display: "flex", alignItems: "center", gap: 10, cursor: block.id === "piano" ? "pointer" : "grab", opacity: dragIdx === idx ? 0.5 : 1 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 3, flexShrink: 0 }}>
                  {[0,1,2].map(i => <div key={i} style={{ width: 14, height: 2, background: "#ddd", borderRadius: 2 }} />)}
                </div>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: block.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "#1a1a1a" }}>{block.title}</div>
                  <div style={{ fontSize: 11, color: "#999", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{getBlockValue(block.id)}</div>
                </div>
                {block.id === "piano" && <span style={{ fontSize: 11, color: "#1D9E75", flexShrink: 0 }}>{pianoOpen ? "Chiudi" : "Apri →"}</span>}
              </div>
            ))}

            {/* Piano espanso */}
            {pianoOpen && (
              <div style={card({ marginTop: -4 })}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "#1a1a1a" }}>Il mio piano</div>
                    <div style={{ fontSize: 10, color: "#999", marginTop: 2 }}>{piano.durata_settimane} sett. · Solo allenamento</div>
                  </div>

                </div>
                {piano?.fasi?.map((fase, fi) => (
                  <div key={fi} style={{ background: fi === 0 ? "#f0faf5" : "#f9f9f6", borderRadius: 10, border: `0.5px solid ${fi === 0 ? "#b8e8d0" : "#e8e8e0"}`, padding: 12, marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: "#1a1a1a" }}>Fase {fase.numero} — {fase.nome}</span>
                      {fi === 0 && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 5, background: "#E1F5EE", color: "#0F6E56" }}>In corso</span>}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 6 }}>
                      {[["Settimane","settimane"],["Allenamenti/sett","allenamenti_settimana"]].map(([label, key]) => (
                        <div key={key}>
                          <div style={{ fontSize: 9, color: "#999", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
                          <div style={{ fontSize: 11, fontWeight: 500, color: "#1a1a1a" }}>{fase[key]}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 10, color: "#888", fontStyle: "italic", lineHeight: 1.5 }}>{fase.note}</div>
                  </div>
                ))}
                {/* Box modifica piano */}
                <div style={{ paddingTop: 4 }}>
                  <div style={{ fontSize: 11, color: "#999", marginBottom: 6 }}>Vuoi modificare il piano?</div>
                  <textarea
                    value={pianoComment}
                    onChange={e => setPianoComment(e.target.value)}
                    placeholder="Es. voglio passare a 3 sessioni, ho smesso la corsa e voglio fare nuoto, il mio gomito sta meglio..."
                    rows={3}
                    style={{ width: "100%", padding: 8, border: "0.5px solid #e0e0d8", borderRadius: 8, background: "#f9f9f6", color: "#1a1a1a", fontSize: 11, resize: "none", outline: "none", boxSizing: "border-box", ...f }}
                  />
                  <button
                    onClick={updatePianoFromComment}
                    disabled={pianoUpdateLoading || !pianoComment.trim()}
                    style={{ width: "100%", marginTop: 8, padding: 10, background: pianoUpdateLoading || !pianoComment.trim() ? "#f0f0e8" : "#1a1a1a", border: "none", borderRadius: 8, color: pianoUpdateLoading || !pianoComment.trim() ? "#999" : "white", fontSize: 12, cursor: pianoUpdateLoading || !pianoComment.trim() ? "default" : "pointer", ...f }}>
                    {pianoUpdateLoading ? "Aggiornamento in corso..." : "⟳ Aggiorna piano"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════ DIETA ══════════════════ */}
        {activeTab === "dieta" && (
          <div style={{ padding: "24px 16px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h1 style={{ fontSize: 22, fontWeight: 400, color: "#1a1a1a" }}>Alimentazione</h1>
              <span style={{ fontSize: 11, color: "#999" }}>{new Date().toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" })}</span>
            </div>

            {/* Card dieta caricata / upload */}
            <div style={{ ...card(), background: dietaCaricata ? "#f0faf5" : "white", border: `0.5px solid ${dietaCaricata ? "#b8e8d0" : "#e0e0d8"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: dietaCaricata ? 12 : 0 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "#1a1a1a" }}>
                    {dietaCaricata ? `✓ ${dieta.fonte}` : "Nessuna dieta caricata"}
                  </div>
                  {dietaCaricata && <div style={{ fontSize: 10, color: "#0F6E56", marginTop: 2 }}>Caricata il {dieta.data_caricamento}</div>}
                </div>
                <div>
                  <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={e => handleDietaUpload(e.target.files[0])} />
                  <button onClick={() => fileInputRef.current?.click()} style={{ fontSize: 11, color: "#1D9E75", border: "0.5px solid #1D9E75", borderRadius: 6, padding: "3px 10px", background: "transparent", cursor: "pointer", ...f }}>
                    {dietaCaricata ? "Aggiorna PDF" : "Carica PDF"}
                  </button>
                </div>
              </div>

              {uploadingDieta && (
                <div style={{ fontSize: 12, color: "#1D9E75", marginBottom: 8 }}>{uploadProgress}</div>
              )}

              {dietaCaricata && (
                <>
                  <div style={{ fontSize: 11, color: "#666", marginBottom: 10, fontStyle: "italic" }}>{dieta.note}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                    {[["Media kcal", dieta.media_settimanale?.kcal], ["Proteine", dieta.media_settimanale?.proteine_g + "g"], ["Carbo", dieta.media_settimanale?.carboidrati_g + "g"], ["Grassi", dieta.media_settimanale?.grassi_g + "g"]].map(([l, v]) => (
                      <div key={l} style={{ background: "white", borderRadius: 8, padding: "6px", textAlign: "center" }}>
                        <div style={{ fontSize: 9, color: "#999" }}>{l}</div>
                        <div style={{ fontSize: 12, fontWeight: 500, color: "#1a1a1a" }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {editingPdfUrl ? (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>Link Google Drive del PDF</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <input value={pdfUrlInput} onChange={e => setPdfUrlInput(e.target.value)}
                          placeholder="https://drive.google.com/..."
                          style={{ flex: 1, padding: "6px 8px", border: "0.5px solid #1D9E75", borderRadius: 6, fontSize: 11, color: "#1a1a1a", outline: "none", ...f }} />
                        <button onClick={() => { setDieta(p => ({ ...p, pdf_url: pdfUrlInput })); setEditingPdfUrl(false); }}
                          style={{ padding: "6px 12px", background: "#1D9E75", border: "none", borderRadius: 6, color: "white", fontSize: 11, cursor: "pointer", ...f }}>Salva</button>
                      </div>
                    </div>
                  ) : dieta?.pdf_url ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
                      <a href={dieta.pdf_url} target="_blank" rel="noopener noreferrer"
                        style={{ flex: 1, display: "block", padding: "8px 0", border: "0.5px solid #1D9E75", borderRadius: 8, color: "#1D9E75", fontSize: 12, textAlign: "center", textDecoration: "none", ...f }}>
                        Apri la dieta completa →
                      </a>
                      <button onClick={() => { setPdfUrlInput(dieta.pdf_url || ""); setEditingPdfUrl(true); }}
                        style={{ fontSize: 10, color: "#999", border: "0.5px solid #ddd", borderRadius: 6, padding: "4px 8px", background: "transparent", cursor: "pointer", ...f }}>modifica</button>
                    </div>
                  ) : (
                    <button onClick={() => { setPdfUrlInput(""); setEditingPdfUrl(true); }}
                      style={{ width: "100%", marginTop: 10, padding: "8px 0", border: "0.5px dashed #ccc", borderRadius: 8, background: "transparent", color: "#999", fontSize: 12, cursor: "pointer", ...f }}>
                      + aggiungi link PDF dieta
                    </button>
                  )}
                </>
              )}
              {!dietaCaricata && (
                <div style={{ fontSize: 12, color: "#999", marginTop: 8 }}>
                  Carica il PDF della tua nutrizionista — Claude estrarrà automaticamente calorie e macro per ogni giorno.
                </div>
              )}
            </div>

            {/* Tracker giornaliero */}
            <div style={card()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 11, color: "#999" }}>Target oggi</div>
                  <div style={{ fontSize: 22, fontWeight: 500, color: "#1a1a1a" }}>{tKcal} <span style={{ fontSize: 12, color: "#999", fontWeight: 400 }}>kcal</span></div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "#999" }}>Assunte</div>
                  <div style={{ fontSize: 18, fontWeight: 500, color: Math.round(totals.calorie) > tKcal ? "#E24B4A" : "#1D9E75" }}>{Math.round(totals.calorie)} <span style={{ fontSize: 11, color: "#999", fontWeight: 400 }}>kcal</span></div>
                </div>
              </div>
              {[["Proteine", totals.proteine, tP, "#1D9E75"], ["Carboidrati", totals.carboidrati, tC, "#378ADD"], ["Grassi", totals.grassi, tF, "#EF9F27"]].map(([l, v, t, c]) => (
                <div key={l} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                    <span style={{ color: "#999" }}>{l}</span>
                    <span style={{ fontWeight: 500, color: "#1a1a1a" }}>{Math.round(v)}g <span style={{ color: c }}>/ {t}g</span></span>
                  </div>
                  <div style={{ height: 4, background: "#f0f0e8", borderRadius: 2 }}><div style={{ height: 4, width: `${Math.min((v/t)*100, 100)}%`, background: c, borderRadius: 2, transition: "width 0.3s" }} /></div>
                </div>
              ))}
            </div>

            {/* Pasti tracker */}
            {["Colazione","Spuntino","Pranzo","Merenda","Cena"].map(meal => {
              const mFoods = meals[meal];
              const mKcal = Math.round(mFoods.reduce((a, f) => a + (f.calorie || 0), 0));
              return (
                <div key={meal} style={card()}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: mFoods.length ? 10 : 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#1a1a1a" }}>{meal}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 11, color: "#999" }}>{mKcal} kcal</span>
                      <button onClick={() => setAddingMeal(meal)} style={{ fontSize: 11, color: "#1D9E75", border: "0.5px solid #1D9E75", borderRadius: 6, padding: "3px 8px", background: "transparent", cursor: "pointer", ...f }}>+ aggiungi</button>
                    </div>
                  </div>
                  {mFoods.map(food => (
                    <div key={food.id} style={{ borderLeft: "2px solid #E1F5EE", paddingLeft: 8, marginBottom: 6 }}>
                      {editingFood === food.id ? (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 500, color: "#1a1a1a", marginBottom: 4 }}>{food.nome}</div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
                            {[["kcal","calorie"],["P g","proteine_g"],["C g","carboidrati_g"],["F g","grassi_g"]].map(([l, k]) => (
                              <div key={k}><div style={{ fontSize: 9, color: "#999" }}>{l}</div><input type="number" value={food[k]} onChange={e => updateFood(meal, food.id, k, e.target.value)} style={{ width: "100%", border: "none", borderBottom: "1px solid #1D9E75", background: "transparent", fontSize: 12, color: "#1a1a1a", outline: "none", ...f }} /></div>
                            ))}
                          </div>
                          <button onClick={() => setEditingFood(null)} style={{ fontSize: 10, color: "#1D9E75", background: "transparent", border: "none", cursor: "pointer", marginTop: 4, ...f }}>✓ Salva</button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontSize: 11, color: "#1a1a1a" }}>{food.nome}</div>
                            <div style={{ fontSize: 10, color: "#999" }}>{Math.round(food.calorie)}kcal · P{Math.round(food.proteine_g)}g · C{Math.round(food.carboidrati_g)}g · F{Math.round(food.grassi_g)}g</div>
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => setEditingFood(food.id)} style={{ fontSize: 10, color: "#378ADD", background: "transparent", border: "none", cursor: "pointer", ...f }}>modifica</button>
                            <button onClick={() => removeFood(meal, food.id)} style={{ fontSize: 10, color: "#E24B4A", background: "transparent", border: "none", cursor: "pointer", ...f }}>✕</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {addingMeal === meal && (
                    <div style={{ marginTop: 10, padding: 10, background: "#f9f9f6", borderRadius: 8 }}>
                      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                        <input value={foodSearch} onChange={e => setFoodSearch(e.target.value)} placeholder="Es. petto di pollo 150g" onKeyDown={e => e.key === "Enter" && searchFood(foodSearch)} style={{ flex: 1, padding: "7px 10px", border: "0.5px solid #e0e0d8", borderRadius: 8, fontSize: 12, background: "white", color: "#1a1a1a", outline: "none", ...f }} />
                        <button onClick={() => searchFood(foodSearch)} style={{ padding: "7px 12px", background: "#1D9E75", border: "none", borderRadius: 8, color: "white", fontSize: 12, cursor: "pointer", ...f }}>Cerca</button>
                        <button onClick={() => { setAddingMeal(null); setFoodSearch(""); setFoodResults([]); }} style={{ padding: "7px 10px", border: "0.5px solid #ddd", borderRadius: 8, background: "transparent", color: "#999", fontSize: 12, cursor: "pointer", ...f }}>✕</button>
                      </div>
                      {foodLoading && <div style={{ fontSize: 12, color: "#999", textAlign: "center", padding: "8px 0" }}>Ricerca in corso...</div>}
                      {foodResults.map((fr, i) => (
                        <div key={i} onClick={() => addFood(meal, fr)} style={{ padding: "8px 10px", border: "0.5px solid #e0e0d8", borderRadius: 8, marginBottom: 4, cursor: "pointer", background: "white" }}>
                          <div style={{ fontSize: 12, fontWeight: 500, color: "#1a1a1a" }}>{fr.nome}</div>
                          <div style={{ fontSize: 10, color: "#999" }}>{Math.round(fr.calorie)}kcal · P{Math.round(fr.proteine_g)}g · C{Math.round(fr.carboidrati_g)}g · F{Math.round(fr.grassi_g)}g</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ══════════════════ ALLENAMENTO ══════════════════ */}
        {activeTab === "allenamento" && (
          <div style={{ padding: "24px 16px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h1 style={{ fontSize: 22, fontWeight: 400, color: "#1a1a1a" }}>Allenamento</h1>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button onClick={() => setCalWeekOffset(p => p - 1)} style={{ background: "transparent", border: "none", color: "#999", cursor: "pointer", fontSize: 18, ...f }}>‹</button>
                <span style={{ fontSize: 10, color: "#999" }}>{weekDays[0].getDate()}/{weekDays[0].getMonth()+1} — {weekDays[6].getDate()}/{weekDays[6].getMonth()+1}</span>
                <button onClick={() => setCalWeekOffset(p => p + 1)} style={{ background: "transparent", border: "none", color: "#999", cursor: "pointer", fontSize: 18, ...f }}>›</button>
              </div>
            </div>

            {/* Fase e settimana */}
            {(() => {
              const { weekNum, phase } = getPhaseAndWeek();
              const workouts = getWorkoutsForPhase(phase);
              return (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "#1a1a1a" }}>
                      {phase?.nome ? `Fase ${phase.numero} — ${phase.nome}` : "Fase 1"} · Settimana {weekNum}
                    </div>
                    <div style={{ fontSize: 10, color: "#999" }}>{phase?.allenamenti_settimana || 2} allenamenti/sett.</div>
                  </div>

                  {/* Token allenamenti da assegnare */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: "#999", marginBottom: 6 }}>
                      {selectedWorkoutToken ? `Tocca un giorno per assegnare "${workouts.find(w=>w.id===selectedWorkoutToken)?.label}"` : "Tocca un allenamento poi un giorno per assegnarlo"}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {workouts.map(w => {
                        const assignedDay = Object.entries(workoutAssignments).find(([k,v]) => {
                          const d = new Date(k);
                          return v === w.id && d >= weekDays[0] && d <= weekDays[6];
                        });
                        const isSelected = selectedWorkoutToken === w.id;
                        const isAssigned = !!assignedDay;
                        return (
                          <button key={w.id}
                            onClick={() => {
                              if (isSelected) { setSelectedWorkoutToken(null); return; }
                              setSelectedWorkoutToken(w.id);
                            }}
                            style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 20, border: `1.5px solid ${isSelected ? w.color : isAssigned ? w.color : "#e0e0d8"}`, background: isSelected ? w.color : isAssigned ? w.color + "22" : "white", color: isSelected ? "white" : isAssigned ? w.color : "#999", fontSize: 11, cursor: "pointer", opacity: isAssigned && !isSelected ? 0.7 : 1, ...f }}>
                            <span>{w.emoji}</span>
                            <span>{w.label}</span>
                            {isAssigned && <span style={{ fontSize: 9 }}>✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Calendario */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 4, marginBottom: 14 }}>
                    {weekDays.map((d, i) => {
                      const dk = dateKey(d);
                      const assigned = workoutAssignments[dk];
                      const wInfo = workouts.find(w => w.id === assigned);
                      const isToday = d.toDateString() === today.toDateString();
                      const isSel = selectedDay === i;
                      const extraForDay = (extraSaved[`${calWeekOffset}-${i}`] || []).length > 0;
                      return (
                        <div key={i}
                          onClick={() => {
                            if (selectedWorkoutToken) {
                              const newAssign = { ...workoutAssignments };
                              weekDays.forEach(wd => {
                                const wdk = dateKey(wd);
                                if (newAssign[wdk] === selectedWorkoutToken) delete newAssign[wdk];
                              });
                              newAssign[dk] = selectedWorkoutToken;
                              setWorkoutAssignments(newAssign);
                              setSelectedWorkoutToken(null);
                              setSelectedDay(i);
                              setDayMenu(null);
                            } else if (assigned) {
                              setDayMenu(prev => prev?.dk === dk ? null : { dk });
                              setSelectedDay(i);
                            } else {
                              setSelectedDay(i);
                              setDayMenu(null);
                            }
                          }}
                          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 2px", borderRadius: 8, background: isSel ? "white" : selectedWorkoutToken ? "#f0faf5" : "transparent", border: isSel ? `1.5px solid ${wInfo?.color || "#e0e0d8"}` : selectedWorkoutToken ? "0.5px dashed #1D9E75" : "none", cursor: "pointer", transition: "background 0.15s" }}>
                          <span style={{ fontSize: 9, color: "#999" }}>{dayNames[d.getDay()]}</span>
                          <span style={{ fontSize: 13, fontWeight: isSel ? 500 : 400, color: isToday ? "#1D9E75" : "#1a1a1a" }}>{d.getDate()}</span>
                          <div style={{ display: "flex", gap: 2 }}>
                            {wInfo && <div style={{ width: 6, height: 6, borderRadius: "50%", background: wInfo.color }} />}
                            {extraForDay && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#EF9F27" }} />}
                            {!wInfo && !extraForDay && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#eee" }} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Context menu for assigned day */}
                  {dayMenu && (() => {
                    const menuAssigned = workoutAssignments[dayMenu.dk];
                    const menuW = workouts.find(w => w.id === menuAssigned);
                    if (!menuW) return null;
                    return (
                      <div style={{ background: "white", border: `1px solid ${menuW.color}`, borderRadius: 10, padding: "10px 12px", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, fontSize: 11, fontWeight: 500, color: "#1a1a1a" }}>
                          {menuW.emoji} {menuW.label} assegnato
                        </div>
                        <button
                          onClick={() => {
                            setSelectedWorkoutToken(menuW.id);
                            const newAssign = { ...workoutAssignments };
                            delete newAssign[dayMenu.dk];
                            setWorkoutAssignments(newAssign);
                            setDayMenu(null);
                          }}
                          style={{ padding: "5px 12px", border: `0.5px solid #378ADD`, borderRadius: 7, background: "transparent", color: "#378ADD", fontSize: 11, cursor: "pointer", ...f }}>
                          Sposta
                        </button>
                        <button
                          onClick={() => {
                            const newAssign = { ...workoutAssignments };
                            delete newAssign[dayMenu.dk];
                            setWorkoutAssignments(newAssign);
                            setDayMenu(null);
                          }}
                          style={{ padding: "5px 12px", border: "0.5px solid #E24B4A", borderRadius: 7, background: "transparent", color: "#E24B4A", fontSize: 11, cursor: "pointer", ...f }}>
                          Elimina
                        </button>
                      </div>
                    );
                  })()}
                </div>
              );
            })()}

            {(() => {
              const dk = dateKey(selectedDayDate);
              const assigned = workoutAssignments[dk];
              let overrideSchedule = null;
              const { phase } = getPhaseAndWeek();
              const workouts = getWorkoutsForPhase(phase);
              if (assigned === "palestra" || assigned === "push" || assigned === "pull") {
                overrideSchedule = schedaAllenamento.giorni_settimana?.find(d => d.tipo === "palestra") || null;
              } else if (assigned === "corsa") {
                overrideSchedule = schedaAllenamento.giorni_settimana?.find(d => d.tipo === "corsa") || null;
              }
              const displaySchedule = overrideSchedule || null;
              return displaySchedule ? (
              <div style={card()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "#1a1a1a" }}>{displaySchedule?.titolo}</div>
                    {displaySchedule?.descrizione && <div style={{ fontSize: 11, color: "#999", marginTop: 2, lineHeight: 1.4 }}>{displaySchedule?.descrizione}</div>}
                  </div>
                  <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: displaySchedule?.tipo === "palestra" ? "#E1F5EE" : displaySchedule?.tipo === "corsa" ? "#E6F1FB" : "#f0f0e8", color: displaySchedule?.tipo === "palestra" ? "#0F6E56" : displaySchedule?.tipo === "corsa" ? "#185FA5" : "#999", flexShrink: 0, marginLeft: 8 }}>{displaySchedule?.tipo}</span>
                </div>

                {displaySchedule?.tipo === "riposo" ? (
                  <div style={{ textAlign: "center", padding: "16px 0", color: "#bbb", fontSize: 13 }}>Giorno di riposo — recupero attivo consigliato</div>
                ) : (
                  <>
                    {displaySchedule?.esercizi?.map((ex, ei) => {
                      const key = `${calWeekOffset}-${selectedDay}-${ei}`;
                      return (
                        <div key={ei} style={{ borderTop: "0.5px solid #f0f0e8", paddingTop: 10, marginTop: 10 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 500, color: "#1a1a1a" }}>{ex.nome}</span>
                            <span style={{ fontSize: 10, color: "#999", textAlign: "right", marginLeft: 8, flexShrink: 0 }}>{ex.serie}× {ex.ripetizioni}{ex.recupero_secondi > 0 ? ` · ${ex.recupero_secondi}s` : ""}</span>
                          </div>
                          {ex.note_tecniche && <div style={{ fontSize: 10, color: "#888", background: "#f9f9f6", borderRadius: 6, padding: "4px 8px", marginBottom: 6, fontStyle: "italic", lineHeight: 1.5 }}>ℹ {ex.note_tecniche}</div>}
                          {ex.recupero_secondi > 0 && (
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <span style={{ fontSize: 10, color: "#999" }}>Peso</span>
                              <input type="number" placeholder="kg" value={exerciseData[key]?.peso || ""} onChange={e => setExerciseData(p => ({ ...p, [key]: { ...p[key], peso: e.target.value } }))} style={{ width: 50, padding: "3px 6px", border: "0.5px solid #e0e0d8", borderRadius: 6, fontSize: 11, background: "#f9f9f6", color: "#1a1a1a", outline: "none", ...f }} />
                              <span style={{ fontSize: 10, color: "#999" }}>Rip</span>
                              <input type="number" placeholder="rip" value={exerciseData[key]?.rip || ""} onChange={e => setExerciseData(p => ({ ...p, [key]: { ...p[key], rip: e.target.value } }))} style={{ width: 50, padding: "3px 6px", border: "0.5px solid #e0e0d8", borderRadius: 6, fontSize: 11, background: "#f9f9f6", color: "#1a1a1a", outline: "none", ...f }} />
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <div style={{ borderTop: "0.5px solid #f0f0e8", paddingTop: 10, marginTop: 10 }}>
                      <div style={{ fontSize: 11, color: "#999", marginBottom: 6 }}>Come ti sei sentito?</div>
                      <div style={{ display: "flex", gap: 8 }}>
                        {["😞","😐","😊"].map((e, i) => (
                          <div key={i} onClick={() => setWorkoutMood(p => ({ ...p, [selectedDay]: i }))}
                            style={{ flex: 1, padding: 8, border: `0.5px solid ${workoutMood[selectedDay] === i ? "#1D9E75" : "#e0e0d8"}`, borderRadius: 8, textAlign: "center", cursor: "pointer", fontSize: 18, background: workoutMood[selectedDay] === i ? "#E1F5EE" : "#f9f9f6" }}>{e}</div>
                        ))}
                      </div>
                    </div>

                    <textarea value={workoutNotes[selectedDay] || ""} onChange={e => setWorkoutNotes(p => ({ ...p, [selectedDay]: e.target.value }))} placeholder="Note sulla sessione..." rows={2}
                      style={{ width: "100%", marginTop: 10, padding: 8, border: "0.5px solid #e0e0d8", borderRadius: 8, background: "#f9f9f6", color: "#1a1a1a", fontSize: 11, resize: "none", outline: "none", ...f }} />

                    <button onClick={() => setSavedSessions(p => ({ ...p, [`${calWeekOffset}-${selectedDay}`]: { date: selectedDayDate.toLocaleDateString("it-IT"), savedAt: new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) } }))}
                      style={{ width: "100%", marginTop: 10, padding: 10, background: savedSessions[`${calWeekOffset}-${selectedDay}`] ? "#f0faf5" : "#1D9E75", border: savedSessions[`${calWeekOffset}-${selectedDay}`] ? "0.5px solid #1D9E75" : "none", borderRadius: 8, color: savedSessions[`${calWeekOffset}-${selectedDay}`] ? "#0F6E56" : "white", fontSize: 13, cursor: "pointer", ...f }}>
                      {savedSessions[`${calWeekOffset}-${selectedDay}`] ? `✓ Salvato alle ${savedSessions[`${calWeekOffset}-${selectedDay}`].savedAt}` : "Salva sessione"}
                    </button>

                    {savedSessions[`${calWeekOffset}-${selectedDay}`] && (
                      <div style={{ marginTop: 12, borderTop: "0.5px solid #f0f0e8", paddingTop: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 500, color: "#1a1a1a", marginBottom: 6 }}>Feedback adattivo</div>
                        <div style={{ fontSize: 11, color: "#999", marginBottom: 6 }}>Dimmi com'è andata — carichi, difficoltà, sensazioni, dolori</div>
                        <textarea
                          value={feedbackText[`${calWeekOffset}-${selectedDay}`] || ""}
                          onChange={e => setFeedbackText(p => ({ ...p, [`${calWeekOffset}-${selectedDay}`]: e.target.value }))}
                          placeholder="Es: panca fatta con 12kg per 10 rip, goblet squat facile, leggero fastidio al gomito durante la lat machine..."
                          rows={3}
                          style={{ width: "100%", padding: 8, border: "0.5px solid #e0e0d8", borderRadius: 8, background: "#f9f9f6", color: "#1a1a1a", fontSize: 11, resize: "none", outline: "none", ...f }}
                        />
                        <button
                          onClick={() => requestAdaptivePlan(`${calWeekOffset}-${selectedDay}`)}
                          disabled={adaptiveLoading}
                          style={{ width: "100%", marginTop: 8, padding: 10, background: adaptiveLoading ? "#f0f0e8" : "#1a1a1a", border: "none", borderRadius: 8, color: adaptiveLoading ? "#999" : "white", fontSize: 12, cursor: adaptiveLoading ? "default" : "pointer", ...f }}>
                          {adaptiveLoading ? "Elaborazione in corso..." : "⟳ Aggiorna piano con il tuo feedback"}
                        </button>
                        {adaptiveResponse[`${calWeekOffset}-${selectedDay}`] && (
                          <div style={{ marginTop: 10, padding: 12, background: "#f0faf5", borderRadius: 8, border: "0.5px solid #b8e8d0" }}>
                            <div style={{ fontSize: 11, fontWeight: 500, color: "#0F6E56", marginBottom: 6 }}>Suggerimento PT</div>
                            <div style={{ fontSize: 11, color: "#1a1a1a", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{adaptiveResponse[`${calWeekOffset}-${selectedDay}`]}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
              ) : (
                <div style={{ ...card(), textAlign: "center", color: "#bbb", fontSize: 13 }}>
                  {workoutAssignments[dateKey(selectedDayDate)] ? "Caricamento scheda..." : "Nessun allenamento assegnato — tocca un allenamento sopra e poi questo giorno"}
                </div>
              );
            })()}

            {/* Attività extra */}
            {(extraSaved[`${calWeekOffset}-${selectedDay}`] || []).map((act, i) => {
              const key = `${calWeekOffset}-${selectedDay}-${i}`;
              const isExpanded = extraExpanded[key];
              const isEditing = extraEditing[key];
              return (
                <div key={i} style={{ ...card(), background: "#f9f9f6", marginTop: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "#1a1a1a" }}>{act.type === "palestra" ? "🏋 Palestra extra" : `🏃 ${act.nome}`}</div>
                      <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>
                        {act.type === "altra" && <>{act.tempo && `${act.tempo} min`}{act.km && ` · ${act.km} km`}{act.calorie && ` · ${act.calorie} kcal`}{act.km && act.tempo && ` · ${Math.floor(act.tempo/act.km)}'${String(Math.round(((act.tempo/act.km)%1)*60)).padStart(2,"0")}"/km`}</>}
                        {act.type === "palestra" && `${act.esercizi?.length} esercizi`}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                      <button onClick={() => setExtraExpanded(p => ({ ...p, [key]: !p[key] }))} style={{ fontSize: 10, color: "#378ADD", background: "transparent", border: "none", cursor: "pointer", ...f }}>{isExpanded ? "chiudi" : "dettagli"}</button>
                      <button onClick={() => { setExtraEditing(p => ({ ...p, [key]: !p[key] })); setExtraExpanded(p => ({ ...p, [key]: true })); }} style={{ fontSize: 10, color: "#1D9E75", background: "transparent", border: "none", cursor: "pointer", ...f }}>{isEditing ? "chiudi" : "modifica"}</button>
                      <button onClick={() => setExtraSaved(p => ({ ...p, [`${calWeekOffset}-${selectedDay}`]: p[`${calWeekOffset}-${selectedDay}`].filter((_, j) => j !== i) }))} style={{ fontSize: 10, color: "#E24B4A", background: "transparent", border: "none", cursor: "pointer", ...f }}>✕</button>
                    </div>
                  </div>

                  {isExpanded && act.type === "altra" && (
                    <div style={{ marginTop: 10, borderTop: "0.5px solid #e0e0d8", paddingTop: 10 }}>
                      {isEditing ? (
                        <div>
                          {[["Nome attività", "nome", "text"], ["Durata (min)", "tempo", "number"], ["Calorie", "calorie", "number"], ["Distanza (km)", "km", "number"]].map(([label, k, type]) => (
                            <div key={k} style={{ marginBottom: 8 }}>
                              <div style={{ fontSize: 10, color: "#999", marginBottom: 3 }}>{label}</div>
                              <input type={type} value={act[k] || ""} onChange={e => setExtraSaved(p => ({ ...p, [`${calWeekOffset}-${selectedDay}`]: p[`${calWeekOffset}-${selectedDay}`].map((x, j) => j === i ? { ...x, [k]: e.target.value } : x) }))}
                                style={{ width: "100%", padding: "5px 8px", border: "0.5px solid #e0e0d8", borderRadius: 6, fontSize: 11, background: "white", color: "#1a1a1a", outline: "none", boxSizing: "border-box", ...f }} />
                            </div>
                          ))}
                          {act.km && act.tempo && <div style={{ fontSize: 11, color: "#0F6E56", marginTop: 4 }}>Passo: {Math.floor(act.tempo/act.km)}'{String(Math.round(((act.tempo/act.km)%1)*60)).padStart(2,"0")}"/km</div>}
                        </div>
                      ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          {[["Durata", act.tempo ? act.tempo + " min" : "—"], ["Calorie", act.calorie ? act.calorie + " kcal" : "—"], ["Distanza", act.km ? act.km + " km" : "—"], ["Passo", act.km && act.tempo ? `${Math.floor(act.tempo/act.km)}'${String(Math.round(((act.tempo/act.km)%1)*60)).padStart(2,"0")}"/km` : "—"]].map(([l, v]) => (
                            <div key={l} style={{ background: "white", borderRadius: 6, padding: "6px 8px" }}>
                              <div style={{ fontSize: 9, color: "#999" }}>{l}</div>
                              <div style={{ fontSize: 12, fontWeight: 500, color: "#1a1a1a" }}>{v}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {isExpanded && act.type === "palestra" && (
                    <div style={{ marginTop: 10, borderTop: "0.5px solid #e0e0d8", paddingTop: 10 }}>
                      {isEditing ? (
                        <div>
                          {act.esercizi?.map((ex, ei) => (
                            <div key={ei} style={{ background: "white", borderRadius: 8, padding: 8, marginBottom: 8 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                <div style={{ fontSize: 11, fontWeight: 500, color: "#1a1a1a" }}>Es. {ei + 1}</div>
                                {act.esercizi.length > 1 && <button onClick={() => setExtraSaved(p => ({ ...p, [`${calWeekOffset}-${selectedDay}`]: p[`${calWeekOffset}-${selectedDay}`].map((x, j) => j === i ? { ...x, esercizi: x.esercizi.filter((_, k) => k !== ei) } : x) }))} style={{ fontSize: 9, color: "#E24B4A", background: "transparent", border: "none", cursor: "pointer", ...f }}>✕</button>}
                              </div>
                              <input value={ex.nome} onChange={e => setExtraSaved(p => ({ ...p, [`${calWeekOffset}-${selectedDay}`]: p[`${calWeekOffset}-${selectedDay}`].map((x, j) => j === i ? { ...x, esercizi: x.esercizi.map((z, k) => k === ei ? { ...z, nome: e.target.value } : z) } : x) }))}
                                placeholder="Nome esercizio" style={{ width: "100%", padding: "5px 8px", border: "0.5px solid #e0e0d8", borderRadius: 6, fontSize: 11, marginBottom: 6, background: "#f9f9f6", color: "#1a1a1a", outline: "none", boxSizing: "border-box", ...f }} />
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 5 }}>
                                {[["kg","peso"],["serie","serie"],["rip","rip"],["rec(s)","recupero"]].map(([label, k]) => (
                                  <div key={k}><div style={{ fontSize: 9, color: "#999", marginBottom: 2 }}>{label}</div>
                                  <input type="number" value={ex[k]} onChange={e => setExtraSaved(p => ({ ...p, [`${calWeekOffset}-${selectedDay}`]: p[`${calWeekOffset}-${selectedDay}`].map((x, j) => j === i ? { ...x, esercizi: x.esercizi.map((z, k2) => k2 === ei ? { ...z, [k]: e.target.value } : z) } : x) }))}
                                    style={{ width: "100%", padding: "4px 5px", border: "0.5px solid #e0e0d8", borderRadius: 5, fontSize: 11, background: "#f9f9f6", color: "#1a1a1a", outline: "none", ...f }} /></div>
                                ))}
                              </div>
                            </div>
                          ))}
                          <button onClick={() => setExtraSaved(p => ({ ...p, [`${calWeekOffset}-${selectedDay}`]: p[`${calWeekOffset}-${selectedDay}`].map((x, j) => j === i ? { ...x, esercizi: [...x.esercizi, { nome: "", peso: "", serie: "", rip: "", recupero: "" }] } : x) }))}
                            style={{ width: "100%", padding: 7, border: "0.5px dashed #1D9E75", borderRadius: 8, background: "transparent", color: "#1D9E75", fontSize: 11, cursor: "pointer", ...f }}>+ aggiungi esercizio</button>
                        </div>
                      ) : (
                        act.esercizi?.map((ex, ei) => (
                          <div key={ei} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "0.5px solid #f0f0e8", fontSize: 11 }}>
                            <span style={{ color: "#1a1a1a", fontWeight: 500 }}>{ex.nome || `Esercizio ${ei+1}`}</span>
                            <span style={{ color: "#999" }}>{ex.serie && ex.rip ? `${ex.serie}×${ex.rip}` : ""}{ex.peso ? ` · ${ex.peso}kg` : ""}{ex.recupero ? ` · ${ex.recupero}s` : ""}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {!extraOpen ? (
              <button onClick={() => setExtraOpen(true)} style={{ width: "100%", padding: 10, border: "0.5px dashed #ccc", borderRadius: 10, background: "transparent", color: "#999", fontSize: 12, cursor: "pointer", marginTop: 8, ...f }}>+ aggiungi attività extra</button>
            ) : (
              <div style={{ ...card(), marginTop: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#1a1a1a" }}>Attività extra</div>
                  <button onClick={() => { setExtraOpen(false); setExtraType(null); setExtraAttivita({ nome: "", tempo: "", calorie: "", km: "" }); setExtraEsercizi([{ nome: "", peso: "", serie: "", rip: "", recupero: "" }]); }} style={{ fontSize: 11, color: "#999", background: "transparent", border: "none", cursor: "pointer", ...f }}>✕</button>
                </div>

                {!extraType ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <button onClick={() => setExtraType("palestra")}
                      style={{ padding: "14px 10px", border: "0.5px solid #e0e0d8", borderRadius: 10, background: "#f9f9f6", cursor: "pointer", textAlign: "center", ...f }}>
                      <div style={{ fontSize: 22, marginBottom: 4 }}>🏋</div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "#1a1a1a" }}>Allenamento pesi</div>
                      <div style={{ fontSize: 10, color: "#999", marginTop: 2 }}>Esercizi, serie, ripetizioni</div>
                    </button>
                    <button onClick={() => setExtraType("altra")}
                      style={{ padding: "14px 10px", border: "0.5px solid #e0e0d8", borderRadius: 10, background: "#f9f9f6", cursor: "pointer", textAlign: "center", ...f }}>
                      <div style={{ fontSize: 22, marginBottom: 4 }}>🏃</div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "#1a1a1a" }}>Altra attività</div>
                      <div style={{ fontSize: 10, color: "#999", marginTop: 2 }}>Corsa, ciclismo, nuoto...</div>
                    </button>
                  </div>
                ) : extraType === "altra" ? (
                  <div>
                    {[["Nome attività", "nome", "Es. Corsa, Ciclismo, Nuoto..."], ["Durata (minuti)", "tempo", "Es. 45"], ["Calorie consumate", "calorie", "Es. 320"], ["Distanza (km)", "km", "Es. 5.2"]].map(([label, key, placeholder]) => (
                      <div key={key} style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>{label}</div>
                        <input type={key === "nome" ? "text" : "number"} value={extraAttivita[key]} onChange={e => setExtraAttivita(p => ({ ...p, [key]: e.target.value }))}
                          placeholder={placeholder}
                          style={{ width: "100%", padding: "7px 10px", border: "0.5px solid #e0e0d8", borderRadius: 8, fontSize: 12, background: "#f9f9f6", color: "#1a1a1a", outline: "none", boxSizing: "border-box", ...f }} />
                      </div>
                    ))}
                    {extraAttivita.km && extraAttivita.tempo && (
                      <div style={{ padding: "8px 12px", background: "#E1F5EE", borderRadius: 8, marginBottom: 10, fontSize: 11 }}>
                        <span style={{ color: "#0F6E56", fontWeight: 500 }}>Passo calcolato: </span>
                        <span style={{ color: "#1a1a1a" }}>
                          {Math.floor(extraAttivita.tempo / extraAttivita.km)}'{String(Math.round(((extraAttivita.tempo / extraAttivita.km) % 1) * 60)).padStart(2, "0")}" /km
                        </span>
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => setExtraType(null)} style={{ flex: 1, padding: 9, border: "0.5px solid #ddd", borderRadius: 8, background: "transparent", color: "#999", fontSize: 12, cursor: "pointer", ...f }}>← Indietro</button>
                      <button onClick={() => { setExtraSaved(p => ({ ...p, [`${calWeekOffset}-${selectedDay}`]: [...(p[`${calWeekOffset}-${selectedDay}`] || []), { type: "altra", ...extraAttivita, data: selectedDayDate.toLocaleDateString("it-IT") }] })); setExtraOpen(false); setExtraType(null); setExtraAttivita({ nome: "", tempo: "", calorie: "", km: "" }); }}
                        style={{ flex: 2, padding: 9, background: "#1D9E75", border: "none", borderRadius: 8, color: "white", fontSize: 12, cursor: "pointer", ...f }}>Salva attività</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {extraEsercizi.map((ex, ei) => (
                      <div key={ei} style={{ background: "#f9f9f6", borderRadius: 8, padding: 10, marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <div style={{ fontSize: 11, fontWeight: 500, color: "#1a1a1a" }}>Esercizio {ei + 1}</div>
                          {extraEsercizi.length > 1 && (
                            <button onClick={() => setExtraEsercizi(p => p.filter((_, j) => j !== ei))} style={{ fontSize: 10, color: "#E24B4A", background: "transparent", border: "none", cursor: "pointer", ...f }}>✕</button>
                          )}
                        </div>
                        <input value={ex.nome} onChange={e => setExtraEsercizi(p => p.map((x, j) => j === ei ? { ...x, nome: e.target.value } : x))}
                          placeholder="Nome esercizio"
                          style={{ width: "100%", padding: "6px 8px", border: "0.5px solid #e0e0d8", borderRadius: 6, fontSize: 12, background: "white", color: "#1a1a1a", outline: "none", marginBottom: 8, boxSizing: "border-box", ...f }} />
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
                          {[["Peso (kg)", "peso"], ["Serie", "serie"], ["Rip.", "rip"], ["Rec. (s)", "recupero"]].map(([label, key]) => (
                            <div key={key}>
                              <div style={{ fontSize: 9, color: "#999", marginBottom: 3 }}>{label}</div>
                              <input type="number" value={ex[key]} onChange={e => setExtraEsercizi(p => p.map((x, j) => j === ei ? { ...x, [key]: e.target.value } : x))}
                                style={{ width: "100%", padding: "5px 6px", border: "0.5px solid #e0e0d8", borderRadius: 6, fontSize: 11, background: "white", color: "#1a1a1a", outline: "none", ...f }} />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    <button onClick={() => setExtraEsercizi(p => [...p, { nome: "", peso: "", serie: "", rip: "", recupero: "" }])}
                      style={{ width: "100%", padding: 8, border: "0.5px dashed #1D9E75", borderRadius: 8, background: "transparent", color: "#1D9E75", fontSize: 12, cursor: "pointer", marginBottom: 10, ...f }}>
                      + aggiungi esercizio
                    </button>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => setExtraType(null)} style={{ flex: 1, padding: 9, border: "0.5px solid #ddd", borderRadius: 8, background: "transparent", color: "#999", fontSize: 12, cursor: "pointer", ...f }}>← Indietro</button>
                      <button onClick={() => { setExtraSaved(p => ({ ...p, [`${calWeekOffset}-${selectedDay}`]: [...(p[`${calWeekOffset}-${selectedDay}`] || []), { type: "palestra", esercizi: extraEsercizi, data: selectedDayDate.toLocaleDateString("it-IT") }] })); setExtraOpen(false); setExtraType(null); setExtraEsercizi([{ nome: "", peso: "", serie: "", rip: "", recupero: "" }]); }}
                        style={{ flex: 2, padding: 9, background: "#1D9E75", border: "none", borderRadius: 8, color: "white", fontSize: 12, cursor: "pointer", ...f }}>Salva allenamento</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════ MENTE ══════════════════ */}
        {activeTab === "mente" && (
          <div style={{ padding: "24px 16px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h1 style={{ fontSize: 22, fontWeight: 400, color: "#1a1a1a" }}>Mente</h1>
              <span style={{ fontSize: 11, color: "#999" }}>{new Date().toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" })}</span>
            </div>

            <div style={card()}>
              <div style={{ fontSize: 11, color: "#999", marginBottom: 10 }}>Streak costanza</div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                <div style={{ fontSize: 40, fontWeight: 400, color: "#1D9E75" }}>{streak}</div>
                <div style={{ fontSize: 12, color: "#999", lineHeight: 1.6 }}>giorni consecutivi<br />con almeno un'attività</div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {["L","M","M","G","V","S","D"].map((d, i) => (
                  <div key={i} style={{ flex: 1, height: 28, borderRadius: 6, background: "#f0f0e8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#bbb" }}>{d}</div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: "#1D9E75", marginTop: 10, textAlign: "center" }}>Il tuo percorso inizia oggi 💪</div>
            </div>

            <div style={card()}>
              <div style={{ fontSize: 11, color: "#999", marginBottom: 8 }}>Frase del giorno</div>
              <div style={{ fontSize: 13, color: "#1a1a1a", fontStyle: "italic", lineHeight: 1.6, marginBottom: 6 }}>"{todayQuote.text}"</div>
              <div style={{ fontSize: 10, color: "#999" }}>— {todayQuote.author}</div>
            </div>

            <div style={card()}>
              <div style={{ fontSize: 11, color: "#999", marginBottom: 10 }}>Meditazione guidata</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 10 }}>
                {[5, 10, 15].map(m => (
                  <div key={m} onClick={() => !medRunning && setSelectedMedTime(m)}
                    style={{ padding: "10px 6px", border: `0.5px solid ${selectedMedTime === m ? "#1D9E75" : "#e0e0d8"}`, borderRadius: 10, textAlign: "center", cursor: "pointer", background: selectedMedTime === m ? "#E1F5EE" : "#f9f9f6" }}>
                    <div style={{ fontSize: 18, fontWeight: 500, color: "#1a1a1a" }}>{m}</div>
                    <div style={{ fontSize: 9, color: "#999" }}>minuti</div>
                  </div>
                ))}
              </div>
              {medRunning ? (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 36, fontWeight: 400, color: "#1D9E75", marginBottom: 6 }}>
                    {Math.floor(medSeconds/60).toString().padStart(2,"0")}:{(medSeconds%60).toString().padStart(2,"0")}
                  </div>
                  <div style={{ fontSize: 11, color: "#999", marginBottom: 12 }}>Inspira 4s · tieni 4s · espira 6s</div>
                  <button onClick={stopMed} style={{ padding: "8px 20px", border: "0.5px solid #E24B4A", borderRadius: 8, background: "transparent", color: "#E24B4A", fontSize: 12, cursor: "pointer", ...f }}>Interrompi</button>
                </div>
              ) : (
                <button onClick={startMed} style={{ width: "100%", padding: 10, background: "#1D9E75", border: "none", borderRadius: 8, color: "white", fontSize: 13, cursor: "pointer", ...f }}>Inizia sessione</button>
              )}
            </div>

            <div style={card()}>
              <div style={{ fontSize: 11, color: "#999", marginBottom: 12 }}>Check-in settimanale</div>
              {[["Ho rispettato la dieta?","diet"],["Ho completato gli allenamenti?","training"],["Come mi sento mentalmente?","mental"]].map(([q, k]) => (
                <div key={k} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: "#1a1a1a", marginBottom: 6 }}>{q}</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[1,2,3,4,5].map(n => (
                      <div key={n} onClick={() => setCheckin(p => ({ ...p, [k]: n }))}
                        style={{ flex: 1, padding: 5, border: `0.5px solid ${checkin[k] === n ? "#1D9E75" : "#e0e0d8"}`, borderRadius: 6, textAlign: "center", fontSize: 11, color: checkin[k] === n ? "#0F6E56" : "#999", cursor: "pointer", background: checkin[k] === n ? "#E1F5EE" : "#f9f9f6", fontWeight: checkin[k] === n ? 500 : 400 }}>{n}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={card()}>
              <div style={{ fontSize: 11, color: "#999", marginBottom: 8 }}>Diario</div>
              <textarea value={diaryText} onChange={e => { setDiaryText(e.target.value); setDiarySaved(false); }} placeholder="Come stai oggi? Scrivi quello che vuoi..." rows={3}
                style={{ width: "100%", padding: 8, border: "0.5px solid #e0e0d8", borderRadius: 8, background: "#f9f9f6", color: "#1a1a1a", fontSize: 12, resize: "none", outline: "none", ...f }} />
              <button onClick={() => setDiarySaved(true)} style={{ width: "100%", marginTop: 8, padding: 8, border: "0.5px solid #ccc", borderRadius: 8, background: diarySaved ? "#E1F5EE" : "transparent", color: diarySaved ? "#0F6E56" : "#999", fontSize: 12, cursor: "pointer", ...f }}>
                {diarySaved ? "✓ Salvato" : "Salva nota"}
              </button>
            </div>
          </div>
        )}
      </div>

        {/* ══════════════════ EDITOR ══════════════════ */}
        {activeTab === "editor" && (() => {
          const ep = editorPiano || JSON.parse(JSON.stringify(piano));
          const es = editorScheda || JSON.parse(JSON.stringify(schedaAllenamento));
          const setEp = fn => setEditorPiano(p => fn(p || JSON.parse(JSON.stringify(piano))));
          const setEs = fn => setEditorScheda(p => fn(p || JSON.parse(JSON.stringify(schedaAllenamento))));
          return (
            <div style={{ padding: "24px 16px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h1 style={{ fontSize: 22, fontWeight: 400, color: "#1a1a1a" }}>Editor Piano</h1>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { setEditorPiano(null); setEditorScheda(null); setEditorSaved(false); }}
                    style={{ fontSize: 11, color: "#999", border: "0.5px solid #ddd", borderRadius: 6, padding: "4px 10px", background: "transparent", cursor: "pointer", ...f }}>Reset</button>
                  <button onClick={() => { setPiano(ep); setEditorSaved(true); setTimeout(() => setEditorSaved(false), 2000); }}
                    style={{ fontSize: 11, color: "white", background: "#1D9E75", border: "none", borderRadius: 6, padding: "4px 12px", cursor: "pointer", ...f }}>
                    {editorSaved ? "✓ Salvato" : "Salva piano"}
                  </button>
                </div>
              </div>

              <div style={{ fontSize: 11, color: "#999", background: "#f9f9f6", borderRadius: 8, padding: "8px 12px", marginBottom: 16 }}>
                Modalità editor — modifica liberamente il piano e la scheda esercizi. Clicca "Salva piano" per applicare le modifiche.
              </div>

              {/* ── FASI ── */}
              <div style={{ fontSize: 12, fontWeight: 500, color: "#1a1a1a", marginBottom: 10 }}>Fasi del piano</div>
              {ep.fasi?.map((fase, fi) => (
                <div key={fi} style={{ background: "white", border: "0.5px solid #e0e0d8", borderRadius: 12, padding: 14, marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "#1a1a1a" }}>Fase {fi + 1}</div>
                    <button onClick={() => setEp(p => ({ ...p, fasi: p.fasi.filter((_, i) => i !== fi) }))}
                      style={{ fontSize: 10, color: "#E24B4A", background: "transparent", border: "none", cursor: "pointer", ...f }}>✕ Rimuovi</button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                    {[["Nome", "nome"], ["Settimane (es. 1-4)", "settimane"], ["Allenamenti/sett", "allenamenti_settimana"]].map(([label, key]) => (
                      <div key={key} style={{ gridColumn: key === "nome" ? "span 2" : "auto" }}>
                        <div style={{ fontSize: 9, color: "#999", marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
                        <input
                          type={key === "allenamenti_settimana" ? "number" : "text"}
                          value={fase[key] || ""}
                          onChange={e => setEp(p => ({ ...p, fasi: p.fasi.map((x, i) => i === fi ? { ...x, [key]: key === "allenamenti_settimana" ? parseInt(e.target.value) || 0 : e.target.value } : x) }))}
                          style={{ width: "100%", padding: "6px 8px", border: "0.5px solid #e0e0d8", borderRadius: 6, fontSize: 12, background: "#f9f9f6", color: "#1a1a1a", outline: "none", boxSizing: "border-box", ...f }}
                        />
                      </div>
                    ))}
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: "#999", marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.5 }}>Note</div>
                    <textarea value={fase.note || ""} onChange={e => setEp(p => ({ ...p, fasi: p.fasi.map((x, i) => i === fi ? { ...x, note: e.target.value } : x) }))}
                      rows={2} style={{ width: "100%", padding: "6px 8px", border: "0.5px solid #e0e0d8", borderRadius: 6, fontSize: 11, background: "#f9f9f6", color: "#1a1a1a", outline: "none", resize: "none", boxSizing: "border-box", ...f }} />
                  </div>
                </div>
              ))}
              <button onClick={() => setEp(p => ({ ...p, fasi: [...(p.fasi || []), { numero: (p.fasi?.length || 0) + 1, nome: "", settimane: "", allenamenti_settimana: 3, note: "" }] }))}
                style={{ width: "100%", padding: 9, border: "0.5px dashed #1D9E75", borderRadius: 10, background: "transparent", color: "#1D9E75", fontSize: 12, cursor: "pointer", marginBottom: 20, ...f }}>
                + aggiungi fase
              </button>

              {/* ── SCHEDE ESERCIZI ── */}
              <div style={{ fontSize: 12, fontWeight: 500, color: "#1a1a1a", marginBottom: 10 }}>Schede esercizi</div>
              {es.giorni_settimana?.map((scheda, si) => (
                <div key={si} style={{ background: "white", border: "0.5px solid #e0e0d8", borderRadius: 12, padding: 14, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <select value={scheda.tipo || "palestra"} onChange={e => setEs(p => ({ ...p, giorni_settimana: p.giorni_settimana.map((x, i) => i === si ? { ...x, tipo: e.target.value } : x) }))}
                        style={{ padding: "4px 8px", border: "0.5px solid #e0e0d8", borderRadius: 6, fontSize: 11, background: "#f9f9f6", color: "#1a1a1a", outline: "none", ...f }}>
                        <option value="palestra">Palestra</option>
                        <option value="corsa">Corsa</option>
                        <option value="extra">Extra</option>
                      </select>
                      <input value={scheda.titolo || ""} onChange={e => setEs(p => ({ ...p, giorni_settimana: p.giorni_settimana.map((x, i) => i === si ? { ...x, titolo: e.target.value } : x) }))}
                        placeholder="Titolo scheda" style={{ flex: 1, padding: "4px 8px", border: "0.5px solid #e0e0d8", borderRadius: 6, fontSize: 11, background: "#f9f9f6", color: "#1a1a1a", outline: "none", ...f }} />
                    </div>
                    <button onClick={() => setEs(p => ({ ...p, giorni_settimana: p.giorni_settimana.filter((_, i) => i !== si) }))}
                      style={{ fontSize: 10, color: "#E24B4A", background: "transparent", border: "none", cursor: "pointer", flexShrink: 0, marginLeft: 8, ...f }}>✕</button>
                  </div>
                  <textarea value={scheda.descrizione || ""} onChange={e => setEs(p => ({ ...p, giorni_settimana: p.giorni_settimana.map((x, i) => i === si ? { ...x, descrizione: e.target.value } : x) }))}
                    placeholder="Descrizione sessione..." rows={2}
                    style={{ width: "100%", padding: "6px 8px", border: "0.5px solid #e0e0d8", borderRadius: 6, fontSize: 11, background: "#f9f9f6", color: "#1a1a1a", outline: "none", resize: "none", boxSizing: "border-box", marginBottom: 10, ...f }} />

                  {/* Esercizi */}
                  {scheda.esercizi?.map((ex, ei) => (
                    <div key={ei} style={{ background: "#f9f9f6", borderRadius: 8, padding: 10, marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <div style={{ fontSize: 10, color: "#999" }}>Esercizio {ei + 1}</div>
                        <button onClick={() => setEs(p => ({ ...p, giorni_settimana: p.giorni_settimana.map((x, i) => i === si ? { ...x, esercizi: x.esercizi.filter((_, j) => j !== ei) } : x) }))}
                          style={{ fontSize: 9, color: "#E24B4A", background: "transparent", border: "none", cursor: "pointer", ...f }}>✕</button>
                      </div>
                      <input value={ex.nome || ""} onChange={e => setEs(p => ({ ...p, giorni_settimana: p.giorni_settimana.map((x, i) => i === si ? { ...x, esercizi: x.esercizi.map((z, j) => j === ei ? { ...z, nome: e.target.value } : z) } : x) }))}
                        placeholder="Nome esercizio"
                        style={{ width: "100%", padding: "5px 8px", border: "0.5px solid #e0e0d8", borderRadius: 6, fontSize: 12, background: "white", color: "#1a1a1a", outline: "none", marginBottom: 6, boxSizing: "border-box", ...f }} />
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 6 }}>
                        {[["Serie","serie"],["Ripetizioni","ripetizioni"],["Rec. (s)","recupero_secondi"]].map(([label, key]) => (
                          <div key={key} style={{ gridColumn: key === "ripetizioni" ? "span 2" : "auto" }}>
                            <div style={{ fontSize: 9, color: "#999", marginBottom: 2 }}>{label}</div>
                            <input type={key === "serie" || key === "recupero_secondi" ? "number" : "text"} value={ex[key] || ""}
                              onChange={e => setEs(p => ({ ...p, giorni_settimana: p.giorni_settimana.map((x, i) => i === si ? { ...x, esercizi: x.esercizi.map((z, j) => j === ei ? { ...z, [key]: key === "serie" || key === "recupero_secondi" ? parseInt(e.target.value) || 0 : e.target.value } : z) } : x) }))}
                              style={{ width: "100%", padding: "4px 6px", border: "0.5px solid #e0e0d8", borderRadius: 5, fontSize: 11, background: "white", color: "#1a1a1a", outline: "none", ...f }} />
                          </div>
                        ))}
                      </div>
                      <textarea value={ex.note_tecniche || ""} onChange={e => setEs(p => ({ ...p, giorni_settimana: p.giorni_settimana.map((x, i) => i === si ? { ...x, esercizi: x.esercizi.map((z, j) => j === ei ? { ...z, note_tecniche: e.target.value } : z) } : x) }))}
                        placeholder="Note tecniche..." rows={2}
                        style={{ width: "100%", padding: "5px 8px", border: "0.5px solid #e0e0d8", borderRadius: 6, fontSize: 10, background: "white", color: "#1a1a1a", outline: "none", resize: "none", boxSizing: "border-box", ...f }} />
                    </div>
                  ))}
                  <button onClick={() => setEs(p => ({ ...p, giorni_settimana: p.giorni_settimana.map((x, i) => i === si ? { ...x, esercizi: [...(x.esercizi || []), { nome: "", serie: 3, ripetizioni: "10-12", recupero_secondi: 90, note_tecniche: "" }] } : x) }))}
                    style={{ width: "100%", padding: 7, border: "0.5px dashed #1D9E75", borderRadius: 8, background: "transparent", color: "#1D9E75", fontSize: 11, cursor: "pointer", ...f }}>
                    + aggiungi esercizio
                  </button>
                </div>
              ))}
              <button onClick={() => setEs(p => ({ ...p, giorni_settimana: [...(p.giorni_settimana || []), { tipo: "palestra", titolo: "", descrizione: "", esercizi: [] }] }))}
                style={{ width: "100%", padding: 9, border: "0.5px dashed #ccc", borderRadius: 10, background: "transparent", color: "#999", fontSize: 12, cursor: "pointer", marginBottom: 20, ...f }}>
                + aggiungi scheda
              </button>

              {/* Salva in fondo */}
              <button onClick={() => { setPiano(ep); setEditorSaved(true); setTimeout(() => setEditorSaved(false), 2000); }}
                style={{ width: "100%", padding: 12, background: "#1a1a1a", border: "none", borderRadius: 10, color: "white", fontSize: 13, cursor: "pointer", ...f }}>
                {editorSaved ? "✓ Piano salvato" : "Salva piano"}
              </button>
            </div>
          );
        })()}

      {/* Nav */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 420, background: "white", borderTop: "0.5px solid #e0e0d8", display: "flex", justifyContent: "space-around", padding: "10px 0 14px" }}>
        {[{ id: "profilo", label: "Profilo" }, { id: "dieta", label: "Dieta" }, { id: "allenamento", label: "Allenamento" }, { id: "mente", label: "Mente" }, { id: "editor", label: "Editor" }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ background: "transparent", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "0 12px" }}>
            <div style={{ width: 20, height: 3, borderRadius: 2, background: activeTab === tab.id ? "#1D9E75" : "transparent", transition: "background 0.2s" }} />
            <span style={{ fontSize: 11, color: activeTab === tab.id ? "#1D9E75" : "#999", fontWeight: activeTab === tab.id ? 500 : 400, ...f }}>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
