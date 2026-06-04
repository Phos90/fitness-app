import React, { useState, useRef, useEffect } from "react";

// Supabase client
const SUPABASE_URL = "https://pchbpkftertgmfmknefo.supabase.co";
const SUPABASE_KEY = "sb_publishable_YRThGeqGG3-LEGCYNyUbiw_OLQNYh6E";

async function sbFetch(path, options = {}) {
  let session = JSON.parse(localStorage.getItem('sb_session') || 'null');
  
  // Refresh token se scaduto o mancante
  if (session?.refresh_token) {
    const exp = session.expires_at || 0;
    const nowSec = Math.floor(Date.now() / 1000);
    if (nowSec >= exp - 60) {
      try {
        const r = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
          body: JSON.stringify({ refresh_token: session.refresh_token })
        });
        const newSession = await r.json();
        if (newSession.access_token) {
          localStorage.setItem('sb_session', JSON.stringify(newSession));
          session = newSession;
        }
      } catch(e) { console.error('Token refresh failed:', e); }
    }
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${session?.access_token || SUPABASE_KEY}`,
    ...options.headers
  };
  const res = await fetch(SUPABASE_URL + path, { ...options, headers });
  return res;
}

async function sbAuth(email, password, type = 'login') {
  const endpoint = type === 'login' ? '/auth/v1/token?grant_type=password' : '/auth/v1/signup';
  const res = await fetch(SUPABASE_URL + endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (data.access_token) localStorage.setItem('sb_session', JSON.stringify(data));
  return data;
}

function getSession() {
  try { return JSON.parse(localStorage.getItem('sb_session') || 'null'); } catch { return null; }
}

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


// FoodRow — riga risultato con bottone preferiti e aggiungi
function FoodRow({ food, onAdd, onToggleFav, isFav }) {
  return (
    <div style={{ background: "#F2F2F7", borderRadius: 12, marginBottom: 8, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, cursor: "pointer" }} onClick={() => onAdd(food)}>
        <div style={{ fontSize: 16, color: "#1C1C1E", marginBottom: 4, lineHeight: 1.3 }}>{food.nome}</div>
        <div style={{ display: "flex", gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#F59E0B" }}>{food.calorie} kcal</span>
          <span style={{ fontSize: 13, color: "#2563EB" }}>P {food.proteine_g}g</span>
          <span style={{ fontSize: 13, color: "#F59E0B" }}>C {food.carboidrati_g}g</span>
          <span style={{ fontSize: 13, color: "#EF4444" }}>G {food.grassi_g}g</span>
        </div>
      </div>
      <button onClick={onToggleFav} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", padding: "4px", flexShrink: 0 }}>
        {isFav ? "⭐" : "☆"}
      </button>
    </div>
  );
}

// FoodEditor — modifica grammi (ricalcola tutto) o singoli valori + salva nei preferiti
function FoodEditor({ food, onSave, onClose, onToggleFav, isFav }) {
  const rGrams = React.useRef(null);
  const rKcal = React.useRef(null);
  const rProt = React.useRef(null);
  const rCarb = React.useRef(null);
  const rGras = React.useRef(null);

  // Calcola i valori per 100g dall'alimento corrente (per poter ricalcolare)
  // Cerca grammi nel nome (es. "yogurt 150g") altrimenti assume 100g
  const gMatch = food.nome?.match(/(\d+(?:\.\d+)?)\s*g/i);
  const currentGrams = gMatch ? parseFloat(gMatch[1]) : 100;
  const kcal100 = Math.round(food.calorie / currentGrams * 100);
  const prot100 = Math.round(food.proteine_g / currentGrams * 100 * 10) / 10;
  const carb100 = Math.round(food.carboidrati_g / currentGrams * 100 * 10) / 10;
  const fat100 = Math.round(food.grassi_g / currentGrams * 100 * 10) / 10;

  function handleSave() {
    const newGrams = parseFloat(rGrams.current?.value) || currentGrams;
    const ratio = newGrams / 100;
    const gramsChanged = newGrams !== currentGrams;
    const zucc100 = Math.round((food.zuccheri_g || 0) / currentGrams * 100 * 10) / 10;
    const fibr100 = Math.round((food.fibre_g || 0) / currentGrams * 100 * 10) / 10;
    onSave({
      nome: food.nome.replace(/\d+(?:\.\d+)?\s*g/i, '').trim() + ` ${newGrams}g`,
      calorie: gramsChanged ? Math.round(kcal100 * ratio) : (parseFloat(rKcal.current?.value) || food.calorie),
      proteine_g: gramsChanged ? Math.round(prot100 * ratio * 10) / 10 : (parseFloat(rProt.current?.value) || food.proteine_g),
      carboidrati_g: gramsChanged ? Math.round(carb100 * ratio * 10) / 10 : (parseFloat(rCarb.current?.value) || food.carboidrati_g),
      grassi_g: gramsChanged ? Math.round(fat100 * ratio * 10) / 10 : (parseFloat(rGras.current?.value) || food.grassi_g),
      zuccheri_g: gramsChanged ? Math.round(zucc100 * ratio * 10) / 10 : (parseFloat(rZucc.current?.value) || 0),
      fibre_g: gramsChanged ? Math.round(fibr100 * ratio * 10) / 10 : (parseFloat(rFibre.current?.value) || 0),
    });
  }

  return (
    <div style={{ background: "#EFF6FF", padding: "12px 14px 14px", borderTop: "1px solid #E5E5EA" }}>
      {/* Grammi — campo principale */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: "#6C6C70", fontWeight: 600, marginBottom: 4, textTransform: "uppercase" }}>Grammi (ricalcola tutto)</div>
        <input ref={rGrams} type="number" inputMode="decimal" defaultValue={currentGrams}
          style={{ width: "100%", padding: "10px 12px", border: "2px solid #1DB95440", borderRadius: 10, fontSize: 20, textAlign: "center", background: "white", outline: "none", boxSizing: "border-box", fontWeight: 700, color: "#1C1C1E" }} />
      </div>
      {/* Valori singoli — modificabili manualmente */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
        {[["kcal",rKcal,food.calorie,"#F59E0B"],["P g",rProt,food.proteine_g,"#2563EB"],["C g",rCarb,food.carboidrati_g,"#F59E0B"],["G g",rGras,food.grassi_g,"#EF4444"],["Zucc",rZucc,food.zuccheri_g||0,"#F59E0B"],["Fibre",rFibre,food.fibre_g||0,"#10B981"]].map(([lbl,ref,val,col]) => (
          <div key={lbl}>
            <div style={{ fontSize: 11, color: col, fontWeight: 600, marginBottom: 4 }}>{lbl}</div>
            <input ref={ref} type="number" inputMode="decimal" defaultValue={val}
              style={{ width: "100%", padding: "8px 4px", border: "1.5px solid " + col + "40", borderRadius: 10, fontSize: 16, textAlign: "center", background: "white", outline: "none", boxSizing: "border-box" }} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={handleSave}
          style={{ flex: 2, background: "#1DB954", color: "white", border: "none", borderRadius: 12, padding: "12px", fontSize: 16, fontWeight: 600, cursor: "pointer" }}>
          Salva
        </button>
        <button type="button" onClick={onToggleFav}
          style={{ flex: 1, background: isFav ? "#FEF9C3" : "#F2F2F7", border: "none", borderRadius: 12, padding: "12px", fontSize: 20, cursor: "pointer" }}>
          {isFav ? "⭐" : "☆"}
        </button>
        <button type="button" onClick={onClose}
          style={{ flex: 1, background: "#F2F2F7", color: "#6C6C70", border: "none", borderRadius: 12, padding: "12px", fontSize: 16, cursor: "pointer" }}>
          ✕
        </button>
      </div>
    </div>
  );
}

// SearchInput isolato — stato locale per evitare re-render del parent durante la digitazione
function SearchInput({ onSearch, loading }) {
  const [val, setVal] = React.useState('');
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
      <input
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => e.key === "Enter" && onSearch(val)}
        placeholder="Es. petto di pollo 150g"
        style={{ flex: 1, padding: "14px 16px", border: "1.5px solid #E5E5EA", borderRadius: 12, fontSize: 17, color: "#1C1C1E", background: "white", outline: "none", boxSizing: "border-box", minHeight: 50 }} />
      <button onClick={() => onSearch(val)}
        style={{ background: "#1DB954", color: "white", border: "none", borderRadius: 12, padding: "0 20px", fontSize: 17, fontWeight: 600, cursor: "pointer", minHeight: 50, flexShrink: 0 }}>
        {loading ? "..." : "Cerca"}
      </button>
    </div>
  );
}

// Pannello obiettivi — schermata modal
function GoalsPanel({ tKcal, tP, tC, tF, goals, onSave, onClose, C, T, S }) {
  const rKcal = React.useRef(null);
  const rPctP = React.useRef(null);
  const rPctC = React.useRef(null);
  const rPctF = React.useRef(null);

  const defaultKcal = goals?.kcal || tKcal;
  const defaultPctP = goals?.pctP || Math.round((tP * 4 / tKcal) * 100);
  const defaultPctC = goals?.pctC || Math.round((tC * 4 / tKcal) * 100);
  const defaultPctF = goals?.pctF || Math.round((tF * 9 / tKcal) * 100);

  function calcGrams(kcal, pctP, pctC, pctF) {
    return {
      kcal: Math.round(kcal),
      proteine_g: Math.round((kcal * pctP / 100) / 4),
      carboidrati_g: Math.round((kcal * pctC / 100) / 4),
      grassi_g: Math.round((kcal * pctF / 100) / 9),
      pctP, pctC, pctF,
    };
  }

  const [preview, setPreview] = React.useState(() => calcGrams(defaultKcal, defaultPctP, defaultPctC, defaultPctF));

  function update() {
    const kcal = parseFloat(rKcal.current?.value) || defaultKcal;
    const pP = parseFloat(rPctP.current?.value) || defaultPctP;
    const pC = parseFloat(rPctC.current?.value) || defaultPctC;
    const pF = parseFloat(rPctF.current?.value) || defaultPctF;
    setPreview(calcGrams(kcal, pP, pC, pF));
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "flex-end" }}>
      <div style={{ background: "white", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 480, margin: "0 auto", padding: "24px 20px 44px", maxHeight: "85vh", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>Obiettivi giornalieri</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: C.textTertiary }}>✕</button>
        </div>

        {/* Kcal target */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: C.textSecondary, fontWeight: 600, marginBottom: 8, textTransform: "uppercase" }}>Calorie target</div>
          <input ref={rKcal} type="number" inputMode="decimal" defaultValue={defaultKcal} onBlur={update}
            style={{ width: "100%", padding: "14px 16px", border: `2px solid ${C.green}`, borderRadius: 14, fontSize: 28, fontWeight: 700, color: C.text, textAlign: "center", outline: "none", boxSizing: "border-box" }} />
          <div style={{ fontSize: 13, color: C.textSecondary, textAlign: "center", marginTop: 6 }}>kcal / giorno</div>
        </div>

        {/* Percentuali macro */}
        <div style={{ fontSize: 13, color: C.textSecondary, fontWeight: 600, marginBottom: 12, textTransform: "uppercase" }}>Distribuzione macro (%)</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
          {[
            ["Proteine", rPctP, defaultPctP, "#2563EB", 4, "P×4"],
            ["Carboidrati", rPctC, defaultPctC, "#F59E0B", 4, "C×4"],
            ["Grassi", rPctF, defaultPctF, "#EF4444", 9, "G×9"],
          ].map(([lbl, ref, def, col, kcalPerG, formula]) => (
            <div key={lbl} style={{ background: col + "10", borderRadius: 14, padding: "12px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 12, color: col, fontWeight: 600, marginBottom: 8 }}>{lbl}</div>
              <input ref={ref} type="number" inputMode="decimal" defaultValue={def} onBlur={update}
                style={{ width: "100%", background: "white", border: `1.5px solid ${col}40`, borderRadius: 10, fontSize: 22, fontWeight: 700, color: col, textAlign: "center", padding: "8px 4px", outline: "none", boxSizing: "border-box" }} />
              <div style={{ fontSize: 11, color: col, marginTop: 4 }}>%</div>
              {/* Formula esplicativa */}
              <div style={{ fontSize: 10, color: col + "99", marginTop: 6, lineHeight: 1.4 }}>
                {preview.kcal} × {def}% ÷ {kcalPerG}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: col, marginTop: 2 }}>
                = {Math.round((preview.kcal * def / 100) / kcalPerG)}g
              </div>
            </div>
          ))}
        </div>

        {/* Preview ricalcolato */}
        <div style={{ background: C.bg, borderRadius: 14, padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: C.textSecondary, fontWeight: 600, marginBottom: 12, textTransform: "uppercase" }}>Riepilogo grammi</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
            {[
              ["Kcal", preview.kcal, "kcal", C.text],
              ["Proteine", preview.proteine_g, "g", "#2563EB"],
              ["Carbo", preview.carboidrati_g, "g", "#F59E0B"],
              ["Grassi", preview.grassi_g, "g", "#EF4444"],
            ].map(([lbl, val, unit, col]) => (
              <div key={lbl} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: col }}>{val}</div>
                <div style={{ fontSize: 11, color: C.textTertiary }}>{unit}</div>
                <div style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}>{lbl}</div>
              </div>
            ))}
          </div>
          {(() => {
            const tot = preview.pctP + preview.pctC + preview.pctF;
            return tot !== 100 ? (
              <div style={{ marginTop: 10, fontSize: 12, color: C.red, textAlign: "center" }}>
                ⚠️ Le percentuali sommano {tot}% — devono fare 100%
              </div>
            ) : null;
          })()}
        </div>

        <button type="button" onClick={() => onSave(preview)}
          style={{ width: "100%", background: C.green, color: "white", border: "none", borderRadius: 14, padding: "16px", fontSize: 17, fontWeight: 700, cursor: "pointer" }}>
          Salva obiettivi
        </button>
      </div>
    </div>
  );
}

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
  const [photoMode, setPhotoMode] = useState(null);
  const [favorites, setFavoritesRaw] = useState(() => {
    try { const s = localStorage.getItem('favorites'); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const setFavorites = (v) => {
    const next = typeof v === 'function' ? v(favorites) : v;
    setFavoritesRaw(next);
    try { localStorage.setItem('favorites', JSON.stringify(next)); } catch {}
  };
  const [editingFoodId, setEditingFoodId] = useState(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGoals, setShowGoals] = useState(false);
  const [goals, setGoalsRaw] = useState(() => {
    try { const s = localStorage.getItem('goals'); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const setGoals = (v) => {
    setGoalsRaw(v);
    try { localStorage.setItem('goals', JSON.stringify(v)); } catch {}
  };
  const [expandedMeal, setExpandedMeal] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [session, setSession] = useState(() => getSession());
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [recentFoods, setRecentFoodsRaw] = useState(() => {
    try { const s = localStorage.getItem('recentFoods'); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const setRecentFoods = (v) => {
    const next = typeof v === 'function' ? v(recentFoods) : v;
    setRecentFoodsRaw(next);
    try { localStorage.setItem('recentFoods', JSON.stringify(next)); } catch {}
  };
  const [showCopyDay, setShowCopyDay] = useState(false);
  const [copyCalMonth, setCopyCalMonth] = useState(() => {
    const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() };
  });
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

  const todayKey = new Date().toISOString().split('T')[0];
  const isToday = selectedMealDate >= todayKey; // oggi o futuro = modificabile (per UI)
  const isPast = selectedMealDate < todayKey; // solo passato = sola lettura

  const totals = Object.values(meals).flat().reduce((a, f) => ({
    calorie: a.calorie + (f.calorie || 0),
    proteine: a.proteine + (f.proteine_g || 0),
    carboidrati: a.carboidrati + (f.carboidrati_g || 0),
    grassi: a.grassi + (f.grassi_g || 0),
    zuccheri: a.zuccheri + (f.zuccheri_g || 0),
    fibre: a.fibre + (f.fibre_g || 0),
  }), { calorie: 0, proteine: 0, carboidrati: 0, grassi: 0, zuccheri: 0, fibre: 0 });

  const round50 = v => Math.round(v / 50) * 50;
  const round5 = v => Math.round(v / 5) * 5;
  const tKcal = goals?.kcal || round50(dieta?.media_settimanale?.kcal || 1499);
  const tP = goals?.proteine_g || round5(dieta?.media_settimanale?.proteine_g || 89);
  const tC = goals?.carboidrati_g || round5(dieta?.media_settimanale?.carboidrati_g || 183);
  const tF = goals?.grassi_g || round5(dieta?.media_settimanale?.grassi_g || 45);

  function addWeight() {
    if (!newWeight) return;
    const entry = { date: new Date().toLocaleDateString("it-IT"), value: parseFloat(newWeight) };
    setWeightHistory(p => [...p, entry]);
    saveWeightToCloud(entry.date, entry.value);
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

  function toggleFavorite(food) {
    setFavorites(prev => {
      const exists = prev.find(f => f.nome === food.nome);
      const updated = exists ? prev.filter(f => f.nome !== food.nome) : [...prev, { ...food, id: Date.now() }];
      saveFavoritesToCloud(updated);
      return updated;
    });
  }
  function isFavorite(food) {
    return favorites.some(f => f.nome === food.nome);
  }

  // ─── SUPABASE SYNC ───────────────────────────────────────────────────────────
  // Salva automaticamente un singolo pasto su Supabase
  async function saveMealToCloud(mealName, foods) {
    if (!session) return;
    try {
      const uid = session.user?.id;
      const date = selectedMealDate;
      // Prima prova PATCH (aggiorna record esistente)
      const patchRes = await sbFetch(
        `/rest/v1/meals?user_id=eq.${uid}&date=eq.${date}&meal_name=eq.${encodeURIComponent(mealName)}`,
        { method: 'PATCH', headers: { 'Prefer': 'return=representation' },
          body: JSON.stringify({ foods, updated_at: new Date().toISOString() }) }
      );
      const patched = await patchRes.json();
      // Se PATCH non ha trovato nulla, fa INSERT
      if (!Array.isArray(patched) || patched.length === 0) {
        await sbFetch(`/rest/v1/meals`, {
          method: 'POST',
          body: JSON.stringify({ user_id: uid, date, meal_name: mealName, foods, updated_at: new Date().toISOString() })
        });
      }
    } catch(e) { console.error('Auto-save meal error:', e); }
  }

  // Salva peso su Supabase
  async function saveWeightToCloud(date, value) {
    if (!session) return;
    try {
      const uid = session.user?.id;
      await sbFetch(`/rest/v1/weight_history`, {
        method: 'POST',
        headers: { 'Prefer': 'return=minimal' },
        body: JSON.stringify({ user_id: uid, date, value })
      });
    } catch(e) { console.error('Auto-save weight error:', e); }
  }

  // Salva preferiti su Supabase
  async function saveFavoritesToCloud(newFavorites) {
    if (!session) return;
    try {
      const uid = session.user?.id;
      await sbFetch(`/rest/v1/favorites?user_id=eq.${uid}`, { method: 'DELETE' });
      for (const f of newFavorites) {
        await sbFetch(`/rest/v1/favorites`, {
          method: 'POST',
          body: JSON.stringify({ user_id: uid, food: f })
        });
      }
    } catch(e) { console.error('Auto-save favorites error:', e); }
  }

  async function syncToCloud() {
    if (!session) return;
    setSyncing(true);
    try {
      const uid = session.user?.id;
      const todayStr = new Date().toISOString().split('T')[0];

      // Salva pasti del giorno corrente
      for (const [mealName, foods] of Object.entries(meals)) {
        await sbFetch(`/rest/v1/meals`, {
          method: 'POST',
          headers: { 'Prefer': 'resolution=merge-duplicates' },
          body: JSON.stringify({ user_id: uid, date: selectedMealDate, meal_name: mealName, foods, updated_at: new Date().toISOString() })
        });
      }

      // Salva peso
      for (const w of weightHistory) {
        await sbFetch(`/rest/v1/weight_history`, {
          method: 'POST',
          headers: { 'Prefer': 'resolution=ignore-duplicates' },
          body: JSON.stringify({ user_id: uid, date: w.date, value: w.value })
        });
      }

      // Salva preferiti
      await sbFetch(`/rest/v1/favorites?user_id=eq.${uid}`, { method: 'DELETE' });
      for (const f of favorites) {
        await sbFetch(`/rest/v1/favorites`, {
          method: 'POST',
          body: JSON.stringify({ user_id: uid, food: f })
        });
      }

      // Salva composizione corporea
      await sbFetch(`/rest/v1/body_data`, {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify({ user_id: uid, ...bodyData, updated_at: new Date().toISOString() })
      });

      // Salva workout assignments
      await sbFetch(`/rest/v1/workout_assignments`, {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify({ user_id: uid, assignments: workoutAssignments, updated_at: new Date().toISOString() })
      });

    } catch(e) { console.error('Sync error:', e); }
    setSyncing(false);
  }

  async function loadFromCloud() {
    if (!session) return;
    setSyncing(true);
    try {
      const uid = session.user?.id;

      // Carica pasti del giorno selezionato
      const mealsRes = await sbFetch(`/rest/v1/meals?user_id=eq.${uid}&date=eq.${selectedMealDate}`);
      const mealsData = await mealsRes.json();
      if (mealsData.length > 0) {
        const newMeals = { Colazione: [], Spuntino: [], Pranzo: [], Merenda: [], Cena: [] };
        mealsData.forEach(m => { newMeals[m.meal_name] = m.foods; });
        setMeals(newMeals);
      }

      // Carica peso
      const weightRes = await sbFetch(`/rest/v1/weight_history?user_id=eq.${uid}&order=created_at.asc`);
      const weightData = await weightRes.json();
      if (weightData.length > 0) setWeightHistory(weightData.map(w => ({ date: w.date, value: parseFloat(w.value) })));

      // Carica preferiti
      const favRes = await sbFetch(`/rest/v1/favorites?user_id=eq.${uid}`);
      const favData = await favRes.json();
      if (favData.length > 0) setFavorites(favData.map(f => f.food));

      // Carica composizione corporea
      const bodyRes = await sbFetch(`/rest/v1/body_data?user_id=eq.${uid}`);
      const bodyArr = await bodyRes.json();
      if (bodyArr.length > 0) setBodyData({ fat: bodyArr[0].fat || '', lean: bodyArr[0].lean || '', water: bodyArr[0].water || '' });

      // Carica workout
      const wkRes = await sbFetch(`/rest/v1/workout_assignments?user_id=eq.${uid}`);
      const wkArr = await wkRes.json();
      if (wkArr.length > 0) setWorkoutAssignments(wkArr[0].assignments || {});

    } catch(e) { console.error('Load error:', e); }
    setSyncing(false);
  }

  // Auto-sync quando cambia il giorno selezionato
  useEffect(() => {
    if (session) loadFromCloud();
  }, [selectedMealDate, session]);

  async function handleAuth() {
    setAuthLoading(true); setAuthError('');
    const data = await sbAuth(authEmail, authPassword, authMode);
    if (data.access_token) {
      setSession(data);
      await loadFromCloud();
    } else {
      setAuthError(data.error_description || data.msg || 'Errore di accesso');
    }
    setAuthLoading(false);
  }

  function handleLogout() {
    localStorage.removeItem('sb_session');
    setSession(null);
  }

  async function copyMealsFromDay(sourceDate) {
    try {
      const s = localStorage.getItem('meals_' + sourceDate);
      if (!s) { alert('Nessun pasto trovato per quel giorno'); return; }
      const sourceMeals = JSON.parse(s);
      // Copia ogni pasto riassegnando gli id
      const copied = {};
      Object.entries(sourceMeals).forEach(([mealName, foods]) => {
        copied[mealName] = foods.map(f => ({ ...f, id: Date.now() + Math.random() }));
      });
      setMeals(copied);
      setShowCopyDay(false);
      alert(`Pasti copiati da ${new Date(sourceDate + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}`);
    } catch(e) {
      alert('Errore nel copiare i pasti');
    }
  }

  async function searchFood(query) {
    if (!query.trim()) return;
    setFoodLoading(true); setFoodResults([]);

    const qMatch = query.match(/(\d+(?:\.\d+)?)\s*g/i);
    const grams = qMatch ? parseFloat(qMatch[1]) : null;
    const ratio = grams ? grams / 100 : 1;
    const searchName = query.replace(/\d+(?:\.\d+)?\s*g/i, '').replace(/^\d+\s+/, '').trim();

    try {
      // Lancia OFF e Claude in parallelo — prende il primo che risponde con risultati
      const offPromise = fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "openfoodfacts", query: searchName.split(' ').sort((a,b) => b.length-a.length).join(' '), fields: "product_name,brands,nutriments,quantity" })
      }).then(r => r.json()).then(data => {
        const products = (data.products || []).filter(p => p.nutriments?.['energy-kcal_100g'] != null && p.product_name);
        if (products.length === 0) return null;
        // Mostra tutti i risultati (max 5) — l'utente sceglie quello giusto
        return products.slice(0, 5).map(p => {
          const n = p.nutriments;
          const brand = p.brands ? ` · ${p.brands.split(',')[0].trim()}` : '';
          return {
            nome: p.product_name + brand + (grams ? ` ${grams}g` : ' (100g)'),
            calorie: Math.round((n['energy-kcal_100g'] || 0) * ratio),
            proteine_g: Math.round((n['proteins_100g'] || 0) * ratio * 10) / 10,
            carboidrati_g: Math.round((n['carbohydrates_100g'] || 0) * ratio * 10) / 10,
            grassi_g: Math.round((n['fat_100g'] || 0) * ratio * 10) / 10,
            zuccheri_g: Math.round((n['sugars_100g'] || 0) * ratio * 10) / 10,
            fibre_g: Math.round((n['fiber_100g'] || n['fibers_100g'] || 0) * ratio * 10) / 10,
            _source: 'off',
          };
        });
      }).catch(() => null);

      const claudePromise = fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 300,
          messages: [{ role: "user", content: `Valori nutrizionali per: "${query}".
- Se grammi specificati: trova per 100g e moltiplica. Es. "150g" = x1.5
- Se unità (es. "15 pomodorini", "2 uova"): stima peso totale e calcola
- Se nessuna quantità: usa porzione standard
Rispondi SOLO JSON array puro:
[{"nome":"nome + quantità","calorie":numero,"proteine_g":numero,"carboidrati_g":numero,"grassi_g":numero,"zuccheri_g":numero,"fibre_g":numero}]` }]
        })
      }).then(r => r.json()).then(data => {
        const text = data.content?.map(c => c.text || "").join("") || "";
        return JSON.parse(text.replace(/```json|```/g, "").trim());
      }).catch(() => null);

      // Prende il primo risultato valido
      const result = await Promise.any([
        offPromise.then(r => r || Promise.reject()),
        claudePromise.then(r => r || Promise.reject()),
      ]);
      setFoodResults(result);
    } catch (e) {
      setFoodResults([{ nome: "Errore — riprova", calorie: 0, proteine_g: 0, carboidrati_g: 0, grassi_g: 0 }]);
    } finally {
      setFoodLoading(false);
    }
  }

    async function searchFoodByPhoto(file, meal) {
    if (!file) return;
    setFoodLoading(true);
    setFoodResults([]);
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const mediaType = file.type?.startsWith("image/") ? file.type : "image/jpeg";
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 800,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
              { type: "text", text: `Analizza questa immagine.
- Se è un'ETICHETTA nutrizionale: leggi i valori per 100g indicati e proporzionali alla porzione/quantità del prodotto se visibile (es. vasetto 150g → moltiplica x1.5). Se non vedi la quantità totale, riporta i valori per 100g indicando "per 100g" nel nome.
- Se è un ALIMENTO o piatto: riconosci cosa è, stima il peso visivo e calcola i macro per QUELLA quantità stimata.
Rispondi SOLO con JSON array puro, zero testo extra, zero backtick:
[{"nome":"nome + quantità","calorie":numero,"proteine_g":numero,"carboidrati_g":numero,"grassi_g":numero}]` }
            ]
          }]
        })
      });
      const result = await res.json();
      const text = result.content?.map(c => c.text || "").join("") || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      if (parsed.length === 0) throw new Error("empty");
      setFoodResults(parsed);
    } catch (e) {
      setFoodResults([{ nome: "❌ Impossibile riconoscere — riprova con foto più nitida", calorie: 0, proteine_g: 0, carboidrati_g: 0, grassi_g: 0 }]);
    } finally {
      setFoodLoading(false);
    }
  }

  function addFood(meal, food) {
    const newFood = { ...food, id: Date.now() };
    const updatedMealFoods = [...(meals[meal] || []), newFood];
    setMeals(p => ({ ...p, [meal]: updatedMealFoods }));
    saveMealToCloud(meal, updatedMealFoods);
    setAddingMeal(null); setFoodSearch(""); setFoodResults([]);
    setRecentFoods(prev => {
      const filtered = prev.filter(f => f.nome !== food.nome);
      return [{ nome: food.nome, calorie: food.calorie, proteine_g: food.proteine_g, carboidrati_g: food.carboidrati_g, grassi_g: food.grassi_g }, ...filtered].slice(0, 20);
    });
  }
  function removeFood(meal, id) {
    const updated = (meals[meal] || []).filter(f => f.id !== id);
    setMeals(p => ({ ...p, [meal]: updated }));
    saveMealToCloud(meal, updated);
  }
  function updateFood(meal, id, k, v) { setMeals(p => ({ ...p, [meal]: p[meal].map(f => f.id === id ? { ...f, [k]: parseFloat(v) || 0 } : f) })); }

;

  // ─── DESIGN SYSTEM ──────────────────────────────────────────────────────────
  const C = {
    green: "#1DB954",
    greenLight: "#E8F8EF",
    greenDark: "#0E8C3C",
    blue: "#2563EB",
    blueLight: "#EFF6FF",
    orange: "#F59E0B",
    orangeLight: "#FFFBEB",
    red: "#EF4444",
    redLight: "#FEF2F2",
    bg: "#F2F2F7",
    card: "#FFFFFF",
    text: "#1C1C1E",
    textSecondary: "#6C6C70",
    textTertiary: "#AEAEB2",
    border: "#E5E5EA",
    nav: "#FFFFFF",
  };

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
               <div style={{ fontSize: 12, color: C.textTertiary, marginTop: 2 }}>{session?.user?.email}</div>
             </div>
             <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
               <div style={{ width: 50, height: 50, borderRadius: 25, background: C.green, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 20, fontWeight: 700 }}>FL</div>
               <div style={{ display: "flex", gap: 6 }}>
                 <button onClick={() => setShowGoals(true)}
                   style={{ background: C.orange + "20", color: C.orange, border: "none", borderRadius: 8, padding: "5px 8px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>⚙️</button>
                 <button onClick={syncToCloud} disabled={syncing}
                   style={{ background: C.blue + "20", color: C.blue, border: "none", borderRadius: 8, padding: "5px 8px", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: syncing ? 0.6 : 1 }}>
                   {syncing ? "⏳" : "☁️"}
                 </button>
                 <button onClick={handleLogout}
                   style={{ background: C.red + "20", color: C.red, border: "none", borderRadius: 8, padding: "5px 8px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Esci</button>
               </div>
             </div>
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

          {/* Target dieta */}
          <div style={{ ...S.card, marginBottom: 12 }}>
            <div style={{ ...S.cardPad, borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ ...T.subhead, fontWeight: 700 }}>Target giornaliero</div>
              <button onClick={() => setShowGoals(true)}
                style={{ background: C.orange + "20", color: C.orange, border: "none", borderRadius: 8, padding: "5px 10px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                ✏️ Modifica
              </button>
            </div>
            <div style={{ ...S.cardPad, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
              {[
                ["Kcal", tKcal, "kcal", C.text],
                ["Proteine", tP + "g", "", "#2563EB"],
                ["Carbo", tC + "g", "", "#F59E0B"],
                ["Grassi", tF + "g", "", "#EF4444"],
              ].map(([lbl, val, unit, col]) => (
                <div key={lbl} style={{ textAlign: "center", padding: "8px 4px", background: col + "10", borderRadius: 10 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: col }}>{val}</div>
                  {unit && <div style={{ fontSize: 11, color: C.textTertiary }}>{unit}</div>}
                  <div style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}>{lbl}</div>
                </div>
              ))}
            </div>
            {goals && (
              <div style={{ padding: "6px 16px 10px", display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[["P", goals.pctP, "#2563EB"], ["C", goals.pctC, "#F59E0B"], ["G", goals.pctF, "#EF4444"]].map(([k, pct, col]) => (
                  <span key={k} style={{ fontSize: 12, color: col, background: col + "15", borderRadius: 6, padding: "2px 8px" }}>{k} {pct}%</span>
                ))}
                <span style={{ fontSize: 12, color: C.textTertiary }}>— personalizzato</span>
              </div>
            )}
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
    const pctKcal = tKcal > 0 ? (totals.calorie/tKcal)*100 : 0;
    const isOverTarget = pctKcal > 100;
    const ringColor = isOverTarget ? C.red : C.green;
    const ringPct = isOverTarget ? 100 : pctKcal; // se sfora, riempie tutto il cerchio
    return (
      <div style={S.page}>
        {/* Header fisso */}
        <div style={{ background: C.card, padding: "56px 20px 16px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ ...S.row, marginBottom: 14 }}>
            <div>
              <div style={T.title1}>Alimentazione</div>
              <div style={{ ...T.subhead, color: isToday ? C.green : C.textSecondary, fontWeight: 500, marginTop: 2 }}>
                {new Date(selectedMealDate + "T12:00:00").toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setShowCopyDay(s => !s); setShowCalendar(false); }}
                style={{ width: 44, height: 44, borderRadius: 12, border: `1.5px solid ${showCopyDay ? C.blue : C.border}`, background: showCopyDay ? C.blueLight : C.bg, cursor: "pointer", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
                📋
              </button>
              <button onClick={() => { setShowCalendar(s => !s); setShowCopyDay(false); }}
                style={{ width: 44, height: 44, borderRadius: 12, border: `1.5px solid ${showCalendar ? C.green : C.border}`, background: showCalendar ? C.greenLight : C.bg, cursor: "pointer", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
                📅
              </button>
            </div>
          </div>
          {showCopyDay && (
            <div style={{ background: C.blueLight, borderRadius: 14, border: `1px solid ${C.blue}30`, overflow: "hidden", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: `1px solid ${C.blue}20` }}>
                <button onClick={() => setCopyCalMonth(m => { const d = new Date(m.year, m.month-1); return { year: d.getFullYear(), month: d.getMonth() }; })} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer" }}>‹</button>
                <span style={T.headline}>{new Date(copyCalMonth.year, copyCalMonth.month).toLocaleDateString("it-IT", { month: "long", year: "numeric" })}</span>
                <button onClick={() => setCopyCalMonth(m => { const d = new Date(m.year, m.month+1); return { year: d.getFullYear(), month: d.getMonth() }; })} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer" }}>›</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
                {["Lu","Ma","Me","Gi","Ve","Sa","Do"].map(d => <div key={d} style={{ textAlign: "center", padding: "6px 0", fontSize: 11, color: C.textTertiary, fontWeight: 600 }}>{d}</div>)}
              </div>
              {(() => {
                const first = new Date(copyCalMonth.year, copyCalMonth.month, 1);
                const last = new Date(copyCalMonth.year, copyCalMonth.month+1, 0);
                const offset = (first.getDay()+6)%7;
                const rows = Math.ceil((offset+last.getDate())/7);
                return Array.from({ length: rows }, (_, r) => (
                  <div key={r} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
                    {Array.from({ length: 7 }, (_, c) => {
                      const dn = r*7+c-offset+1;
                      if (dn<1||dn>last.getDate()) return <div key={c} style={{ padding: "10px 0" }}/>;
                      const dk = `${copyCalMonth.year}-${String(copyCalMonth.month+1).padStart(2,"0")}-${String(dn).padStart(2,"0")}`;
                      const has = (() => { try { const s = localStorage.getItem("meals_"+dk); return s&&Object.values(JSON.parse(s)).flat().length>0; } catch { return false; } })();
                      return (
                        <button key={c} onClick={() => has && copyMealsFromDay(dk)} disabled={!has}
                          style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 0", background: "transparent", border: "none", cursor: has ? "pointer" : "default", opacity: has ? 1 : 0.3 }}>
                          <span style={{ fontSize: 15, color: C.text, fontWeight: dk===new Date().toISOString().split("T")[0] ? 700 : 400 }}>{dn}</span>
                          {has && <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.blue, marginTop: 2 }}/>}
                          {!has && <div style={{ width: 5, height: 5, marginTop: 2 }}/>}
                        </button>
                      );
                    })}
                  </div>
                ));
              })()}
              <div style={{ padding: "8px 12px", borderTop: `1px solid ${C.blue}20`, textAlign: "center" }}>
                <span style={{ fontSize: 12, color: C.blue }}>Tocca un giorno 🔵 per copiare i pasti</span>
              </div>
            </div>
          )}
          {/* Bottone calendario */}
          <button onClick={() => setShowCalendar(s => !s)}
            style={{ width: "100%", background: showCalendar ? C.green : C.bg, border: `1.5px solid ${showCalendar ? C.green : C.border}`, borderRadius: 12, padding: "12px 16px", fontSize: 16, fontWeight: 600, color: showCalendar ? "white" : C.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>📅</span>
            <span>Calendario</span>

          </button>

          {/* Calendario mensile a griglia */}
          {showCalendar && (
            <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, overflow: "hidden", marginTop: 8 }}>
              {/* Header mese */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: `1px solid ${C.border}` }}>
                <button onClick={() => setCalMonth(m => { const d = new Date(m.year, m.month - 1); return { year: d.getFullYear(), month: d.getMonth() }; })}
                  style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: C.text, padding: "0 8px" }}>‹</button>
                <span style={{ ...T.headline }}>
                  {new Date(calMonth.year, calMonth.month).toLocaleDateString("it-IT", { month: "long", year: "numeric" })}
                </span>
                <button onClick={() => setCalMonth(m => { const d = new Date(m.year, m.month + 1); return { year: d.getFullYear(), month: d.getMonth() }; })}
                  style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: C.text, padding: "0 8px" }}>›</button>
              </div>
              {/* Intestazione giorni settimana */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: `1px solid ${C.border}` }}>
                {["Lu","Ma","Me","Gi","Ve","Sa","Do"].map(d => (
                  <div key={d} style={{ textAlign: "center", padding: "8px 0", ...T.caption, fontWeight: 600 }}>{d}</div>
                ))}
              </div>
              {/* Griglia giorni */}
              {(() => {
                const firstDay = new Date(calMonth.year, calMonth.month, 1);
                const lastDay = new Date(calMonth.year, calMonth.month + 1, 0);
                // Lunedì = 0, offset per partire da lunedì
                const startOffset = (firstDay.getDay() + 6) % 7;
                const totalCells = startOffset + lastDay.getDate();
                const rows = Math.ceil(totalCells / 7);
                const todayStr = new Date().toISOString().split("T")[0];
                return Array.from({ length: rows }, (_, row) => (
                  <div key={row} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: row < rows-1 ? `1px solid ${C.border}` : "none" }}>
                    {Array.from({ length: 7 }, (_, col) => {
                      const dayNum = row * 7 + col - startOffset + 1;
                      if (dayNum < 1 || dayNum > lastDay.getDate()) {
                        return <div key={col} style={{ padding: "10px 0" }} />;
                      }
                      const dk = `${calMonth.year}-${String(calMonth.month+1).padStart(2,"0")}-${String(dayNum).padStart(2,"0")}`;
                      const isSel = dk === selectedMealDate;
                      const isT = dk === todayStr;
                      const hasMeals = (() => { try { const s = localStorage.getItem("meals_" + dk); return s && Object.values(JSON.parse(s)).flat().length > 0; } catch { return false; } })();
                      return (
                        <button key={col} onClick={() => { loadMealsForDate(dk); setShowCalendar(false); }}
                          style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 0", background: isSel ? C.green : "transparent", border: "none", cursor: "pointer", position: "relative" }}>
                          <span style={{ fontSize: 15, fontWeight: isT || isSel ? 700 : 400, color: isSel ? "white" : isT ? C.green : C.text }}>
                            {dayNum}
                          </span>
                          {hasMeals && <div style={{ width: 5, height: 5, borderRadius: "50%", background: isSel ? "white" : C.green, marginTop: 2 }} />}
                          {!hasMeals && <div style={{ width: 5, height: 5, marginTop: 2 }} />}
                        </button>
                      );
                    })}
                  </div>
                ));
              })()}
              {/* Bottone oggi */}
              <div style={{ padding: 12, borderTop: `1px solid ${C.border}` }}>
                <button onClick={() => { const t = new Date().toISOString().split("T")[0]; loadMealsForDate(t); setCalMonth({ year: new Date().getFullYear(), month: new Date().getMonth() }); setShowCalendar(false); }}
                  style={{ ...S.btnOutline(C.green), padding: "10px" }}>Vai ad oggi</button>
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: "16px 16px 0" }}>

          {/* Ring calorie */}
          {/* Ring calorie */}
          <div style={{ ...S.card, ...S.cardPad, display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <svg width={100} height={100}>
                <circle cx={50} cy={50} r={42} fill="none" stroke={isOverTarget ? C.redLight : C.border} strokeWidth={10} />
                <circle cx={50} cy={50} r={42} fill="none" stroke={ringColor} strokeWidth={10}
                  strokeDasharray={`${(ringPct / 100) * 263.9} 263.9`} strokeDashoffset={0} strokeLinecap="round" transform="rotate(-90 50 50)" />
                <text x={50} y={46} textAnchor="middle" fontSize={20} fontWeight={700} fill={isOverTarget ? C.red : C.text}>{totals.calorie}</text>
                <text x={50} y={62} textAnchor="middle" fontSize={11} fill={isOverTarget ? C.red : C.textSecondary}>/ {tKcal}</text>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ ...T.headline, marginBottom: 2 }}>Calorie oggi</div>
              <div style={{ ...T.footnote, marginBottom: 12 }}>{isOverTarget ? `⚠️ +${Math.round(totals.calorie - tKcal)} kcal sforato` : tKcal - totals.calorie > 0 ? `${Math.round(tKcal - totals.calorie)} kcal rimanenti` : "✓ Obiettivo raggiunto!"}</div>
              {[["Proteine", totals.proteine, tP, C.blue], ["Carboidrati", totals.carboidrati, tC, C.orange], ["Grassi", totals.grassi, tF, C.red]].map(([lbl, eaten, target, color]) => (
                <div key={lbl} style={{ marginBottom: 8 }}>
                  <div style={{ ...S.row, marginBottom: 3 }}>
                    <span style={T.footnote}>{lbl}{lbl === "Carboidrati" && totals.zuccheri > 0 ? <span style={{ color: C.textTertiary }}> (di cui {Math.round(totals.zuccheri)}g zuccheri)</span> : null}</span>
                    <span style={{ ...T.footnote, fontWeight: 600, color }}>{Math.round(eaten)}g / {target}g</span>
                  </div>
                  <MacroBar eaten={eaten} target={target} color={color} />
                </div>
              ))}
              {totals.fibre > 0 && (
                <div style={{ marginBottom: 4 }}>
                  <div style={{ ...S.row }}>
                    <span style={{ ...T.footnote, color: C.textSecondary }}>🌿 Fibre</span>
                    <span style={{ ...T.footnote, color: C.green }}>{Math.round(totals.fibre)}g</span>
                  </div>
                </div>
              )}
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
            const isOpen = addingMeal === meal || expandedMeal === meal;
            return (
              <div key={meal} style={{ ...S.card }}>
                 {/* Header accordion */}
                 <div style={{ display: "flex", alignItems: "center", minHeight: 64 }}>
                   {/* Tap area — apre/chiude */}
                   <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 14, padding: "0 16px", cursor: "pointer", minHeight: 64 }}
                     onClick={() => setExpandedMeal(isOpen && addingMeal !== meal ? null : meal)}>
                     <span style={{ fontSize: 28, flexShrink: 0 }}>{MEALICONS[meal]}</span>
                     <div style={{ flex: 1 }}>
                       <div style={{ fontSize: 17, fontWeight: 600, color: C.text }}>{meal}</div>
                       <div style={{ fontSize: 13, color: mealKcal > 0 ? C.green : C.textTertiary, marginTop: 1 }}>
                         {mealKcal > 0 ? `${mealKcal} kcal · ${items.length} aliment${items.length === 1 ? "o" : "i"}` : "Nessun alimento"}
                       </div>
                     </div>
                     {/* Chevron grande */}
                     <span style={{ fontSize: 28, color: C.textTertiary, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.25s", lineHeight: 1, flexShrink: 0 }}>⌄</span>
                   </div>
                   {/* + separato */}
                   {!isPast && (
                     <button type="button" onClick={e => { e.stopPropagation(); setAddingMeal(addingMeal === meal ? null : meal); setExpandedMeal(meal); setFoodResults([]); }}
                       style={{ width: 52, minHeight: 64, background: C.greenLight, border: "none", borderLeft: `1px solid ${C.green}30`, borderRadius: "0 16px 16px 0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                       <span style={{ color: C.green, fontSize: 32, lineHeight: 1, fontWeight: 300 }}>+</span>
                     </button>
                   )}
                 </div>
                {/* Lista alimenti — accordion */}
                {isOpen && items.length > 0 && (
                  <div style={{ borderTop: `1px solid ${C.border}` }}>
                    {items.map(food => (
                      <div key={food.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <div style={{ ...S.cardPad, ...S.row }}>
                          <div style={{ flex: 1 }}>
                            <div style={T.body}>{food.nome}</div>
                            <div style={T.footnote}>{food.calorie} kcal · P {food.proteine_g}g · C {food.carboidrati_g}g{food.zuccheri_g ? ` (${food.zuccheri_g}g zucc)` : ""} · G {food.grassi_g}g{food.fibre_g ? ` · 🌿 ${food.fibre_g}g` : ""}</div>
                          </div>
                          {isToday && (
                            <div style={{ display: "flex", gap: 6 }}>
                              <button onClick={() => setEditingFoodId(editingFoodId === food.id ? null : food.id)}
                                style={{ ...S.btnSmall(C.blue), minHeight: 36 }}>✏️</button>
                              <button onClick={() => { removeFood(meal, food.id); setEditingFoodId(null); }}
                                style={{ ...S.btnSmall(C.red), minHeight: 36 }}>✕</button>
                            </div>
                          )}
                        </div>
                        {editingFoodId === food.id && (
                          <FoodEditor food={food} meal={meal}
                            onSave={(updated) => {
                              const newFoods = (meals[meal] || []).map(f => f.id === food.id ? { ...f, ...updated } : f);
                              setMeals(prev => ({ ...prev, [meal]: newFoods }));
                              saveMealToCloud(meal, newFoods);
                              setEditingFoodId(null);
                            }}
                            onClose={() => setEditingFoodId(null)}
                            onToggleFav={() => toggleFavorite(food)}
                            isFav={isFavorite(food)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {addingMeal === meal && !isPast && (
                  <div style={{ ...S.cardPad, borderTop: `1px solid ${C.border}` }}>
                    {/* Modalità ricerca — label-based per iOS compatibility */}
                    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                      {/* Cerca testo */}
                      <button onClick={() => { setPhotoMode(null); setFoodResults([]); }}
                        style={{ flex: 1, ...S.btnSmall(!photoMode ? C.green : C.textTertiary), justifyContent: "center", gap: 4 }}>
                        <span style={{ fontSize: 18 }}>🔍</span>
                        <span style={{ fontSize: 14 }}>Cerca</span>
                      </button>
                      {/* Foto — input visibile con opacity 0 sopra il bottone, iOS safe */}
                      <div style={{ flex: 1, position: "relative" }}>
                        <div style={{ ...S.btnSmall(photoMode === "camera" ? C.green : C.textTertiary), justifyContent: "center", gap: 4, display: "flex", alignItems: "center", pointerEvents: "none" }}>
                          <span style={{ fontSize: 18 }}>📷</span>
                          <span style={{ fontSize: 14 }}>Foto</span>
                        </div>
                        <input type="file" accept="image/*" capture="environment"
                          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }}
                          onChange={e => {
                            const f = e.target.files?.[0];
                            if (f) { setFoodResults([]); setPhotoMode("camera"); searchFoodByPhoto(f, meal); }
                          }} />
                      </div>
                      {/* Galleria — input visibile con opacity 0 sopra il bottone, iOS safe */}
                      <div style={{ flex: 1, position: "relative" }}>
                        <div style={{ ...S.btnSmall(photoMode === "gallery" ? C.green : C.textTertiary), justifyContent: "center", gap: 4, display: "flex", alignItems: "center", pointerEvents: "none" }}>
                          <span style={{ fontSize: 18 }}>🖼️</span>
                          <span style={{ fontSize: 14 }}>Galleria</span>
                        </div>
                        <input type="file" accept="image/*"
                          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }}
                          onChange={e => {
                            const f = e.target.files?.[0];
                            if (f) { setFoodResults([]); setPhotoMode("gallery"); searchFoodByPhoto(f, meal); }
                          }} />
                      </div>
                    </div>

                    {/* Campo testo */}
                    {!photoMode && (
                      <SearchInput onSearch={q => { setFoodSearch(q); searchFood(q); }} loading={foodLoading} />
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

                    {/* Recenti — mostrati quando non c'è ricerca attiva */}
                    {recentFoods.length > 0 && foodResults.length === 0 && !foodLoading && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 12, color: "#AEAEB2", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>🕐 Recenti</div>
                        {recentFoods.slice(0, 5).map((food, i) => (
                          <FoodRow key={i} food={food}
                            onAdd={f => { addFood(meal, f); setAddingMeal(null); }}
                            onToggleFav={() => toggleFavorite(food)}
                            isFav={isFavorite(food)} />
                        ))}
                      </div>
                    )}

                    {/* Bottone preferiti */}
                    {favorites.length > 0 && foodResults.length === 0 && !foodLoading && (
                      <button type="button" onClick={() => setShowFavorites(s => !s)}
                        style={{ width: "100%", background: showFavorites ? "#FFFBEB" : "#F2F2F7", border: `1.5px solid ${showFavorites ? "#F59E0B" : "#E5E5EA"}`, borderRadius: 12, padding: "12px 16px", fontSize: 16, fontWeight: 600, color: showFavorites ? "#F59E0B" : "#6C6C70", cursor: "pointer", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span>⭐ Preferiti ({favorites.length})</span>
                        <span style={{ fontSize: 14 }}>{showFavorites ? "▲" : "▼"}</span>
                      </button>
                    )}
                    {/* Lista preferiti */}
                    {showFavorites && foodResults.length === 0 && !foodLoading && (
                      <div style={{ background: "#FFFBEB", borderRadius: 12, border: "1px solid #F59E0B30", marginBottom: 10, overflow: "hidden" }}>
                        {favorites.map((food, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", padding: "12px 14px", borderBottom: i < favorites.length - 1 ? "1px solid #F59E0B20" : "none", gap: 10 }}>
                            <div style={{ flex: 1 }} onClick={() => { addFood(meal, food); setShowFavorites(false); setAddingMeal(null); }}>
                              <div style={{ fontSize: 15, fontWeight: 600, color: "#1C1C1E", marginBottom: 3 }}>{food.nome}</div>
                              <div style={{ display: "flex", gap: 10 }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: "#F59E0B" }}>{food.calorie} kcal</span>
                                <span style={{ fontSize: 13, color: "#2563EB" }}>P {food.proteine_g}g</span>
                                <span style={{ fontSize: 13, color: "#6C6C70" }}>C {food.carboidrati_g}g</span>
                                <span style={{ fontSize: 13, color: "#EF4444" }}>G {food.grassi_g}g</span>
                              </div>
                            </div>
                            <button type="button" onClick={() => toggleFavorite(food)}
                              style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", padding: "4px", color: "#AEAEB2", flexShrink: 0 }}>✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Risultati ricerca */}
                    {!foodLoading && foodResults.map((food, i) => (
                      <FoodRow key={i} food={food} onAdd={f => { addFood(meal, f); setFoodResults([]); setAddingMeal(null); }} onToggleFav={() => toggleFavorite(food)} isFav={isFavorite(food)} />
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

  // Schermata login se non autenticato
  if (!session) {
    return (
      <div style={{ background: C.bg, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif", maxWidth: 480, margin: "0 auto", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: "100%" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>💪</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: C.text }}>Fitness App</div>
            <div style={{ fontSize: 17, color: C.textSecondary, marginTop: 4 }}>Il tuo trainer personale</div>
          </div>
          <div style={{ background: C.card, borderRadius: 20, padding: 24 }}>
            {/* Toggle login/registrazione */}
            <div style={{ display: "flex", background: C.bg, borderRadius: 12, padding: 4, marginBottom: 24 }}>
              {["login","register"].map(mode => (
                <button key={mode} onClick={() => { setAuthMode(mode); setAuthError(''); }}
                  style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: authMode === mode ? C.card : "transparent", color: authMode === mode ? C.text : C.textSecondary, fontWeight: authMode === mode ? 600 : 400, fontSize: 16, cursor: "pointer" }}>
                  {mode === "login" ? "Accedi" : "Registrati"}
                </button>
              ))}
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: C.textSecondary, marginBottom: 6 }}>Email</div>
              <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)}
                placeholder="la-tua@email.com"
                style={{ ...S.input }} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, color: C.textSecondary, marginBottom: 6 }}>Password</div>
              <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)}
                placeholder="••••••••"
                style={{ ...S.input }} />
            </div>
            {authError && <div style={{ background: C.redLight, borderRadius: 10, padding: "10px 14px", fontSize: 14, color: C.red, marginBottom: 14 }}>{authError}</div>}
            <button onClick={handleAuth} disabled={authLoading || !authEmail || !authPassword}
              style={{ ...S.btn(authLoading ? C.textTertiary : C.green) }}>
              {authLoading ? "Caricamento..." : authMode === "login" ? "Accedi" : "Crea account"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif", maxWidth: 480, margin: "0 auto", minHeight: "100vh", position: "relative" }}>
      {activeTab === "profilo" && <TabProfilo />}
      {activeTab === "dieta" && <TabDieta />}
      {activeTab === "allenamento" && <TabAllenamento />}
      {activeTab === "editor" && <TabEditor />}
      {showGoals && (
        <GoalsPanel tKcal={tKcal} tP={tP} tC={tC} tF={tF} goals={goals}
          onSave={(g) => { setGoals(g); setShowGoals(false); }}
          onClose={() => setShowGoals(false)}
          C={C} T={T} S={S} />
      )}

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

