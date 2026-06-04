/* ===== Interactive Date + Time picker ===== */
const { useState, useEffect, useRef, useMemo } = React;

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function Icon({ name, size = 16, stroke = 1.7 }) {
  const p = {
    chevL: <polyline points="15 18 9 12 15 6" />,
    chevR: <polyline points="9 18 15 12 9 6" />,
    chevD: <polyline points="6 9 12 15 18 9" />,
    cal: <><rect x="3" y="4" width="18" height="17" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></>,
    check: <polyline points="20 6 9 17 4 12" />,
    x: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    up: <polyline points="6 15 12 9 18 15" />,
    img: <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></>,
    upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>,
    tag: <><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>,
    link: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>,
    badge: <path d="M20 6 9 17l-5-5" />,
  }[name];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">{p}</svg>
  );
}

function sameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function startOfDay(d){ const x = new Date(d); x.setHours(0,0,0,0); return x; }

function formatDT(d) {
  if (!d) return "";
  const wd = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()];
  const mo = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()];
  const hh = String(d.getHours()).padStart(2,"0");
  const mm = String(d.getMinutes()).padStart(2,"0");
  return `${wd}, ${d.getDate()} ${mo} ${d.getFullYear()}  ·  ${hh}:${mm}`;
}

function DateTimePicker({ value, onChange, invalid }) {
  const [open, setOpen] = useState(false);
  const today = useMemo(() => startOfDay(new Date()), []);
  const [view, setView] = useState(() => value ? new Date(value.getFullYear(), value.getMonth(), 1) : new Date(today.getFullYear(), today.getMonth(), 1));
  const [draft, setDraft] = useState(value || null);
  const [hour, setHour] = useState(value ? value.getHours() : 10);
  const [minute, setMinute] = useState(value ? value.getMinutes() - (value.getMinutes()%5) : 0);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e){ if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (open) {
      setDraft(value || null);
      setHour(value ? value.getHours() : 10);
      setMinute(value ? value.getMinutes() - (value.getMinutes()%5) : 0);
      setView(value ? new Date(value.getFullYear(), value.getMonth(), 1) : new Date(today.getFullYear(), today.getMonth(), 1));
    }
  }, [open]);

  const grid = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    let lead = (first.getDay() + 6) % 7;
    const cells = [];
    const startDate = new Date(first);
    startDate.setDate(first.getDate() - lead);
    for (let i = 0; i < 42; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      cells.push(d);
    }
    return cells;
  }, [view]);

  function pick(d) {
    if (startOfDay(d) < today) return;
    setDraft(startOfDay(d));
  }
  function apply() {
    const base = draft || today;
    const result = new Date(base.getFullYear(), base.getMonth(), base.getDate(), hour, minute, 0, 0);
    onChange(result);
    setOpen(false);
  }

  const hours = Array.from({length:24}, (_,i)=>i);
  const mins = Array.from({length:12}, (_,i)=>i*5);

  return (
    <div className="select" ref={ref}>
      <button type="button" className={`select-btn ${value?"":"placeholder"} ${open?"open":""} ${invalid?"invalid":""}`} onClick={() => setOpen(o=>!o)}>
        <span style={{display:"flex",alignItems:"center",gap:8,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          <span style={{color: value? "var(--accent)":"var(--text-3)", display:"flex"}}><Icon name="cal" size={15}/></span>
          {value ? formatDT(value) : "Select airing date & time"}
        </span>
      </button>
      {open && (
        <div className="dt-pop">
          <div className="cal-head">
            <button type="button" className="nav-btn" onClick={()=>setView(new Date(view.getFullYear(), view.getMonth()-1, 1))}><Icon name="chevL" size={15}/></button>
            <div className="mlabel">{MONTHS[view.getMonth()]} {view.getFullYear()}</div>
            <button type="button" className="nav-btn" onClick={()=>setView(new Date(view.getFullYear(), view.getMonth()+1, 1))}><Icon name="chevR" size={15}/></button>
          </div>
          <div className="dow">{WEEKDAYS.map(d=><span key={d}>{d}</span>)}</div>
          <div className="days">
            {grid.map((d,i) => {
              const other = d.getMonth() !== view.getMonth();
              const isToday = sameDay(d, today);
              const isSel = sameDay(d, draft);
              const past = startOfDay(d) < today;
              return (
                <button key={i} type="button" disabled={past}
                  className={`day ${other?"other":""} ${isToday?"today":""} ${isSel?"sel":""}`}
                  onClick={()=>pick(d)}>{d.getDate()}</button>
              );
            })}
          </div>
          <div className="time-row">
            <span style={{color:"var(--text-3)",display:"flex"}}><Icon name="clock" size={14}/></span>
            <span className="tl">Time</span>
            <select className="time-sel" value={hour} onChange={e=>setHour(+e.target.value)}>
              {hours.map(h=><option key={h} value={h}>{String(h).padStart(2,"0")}</option>)}
            </select>
            <span style={{color:"var(--text-3)"}}>:</span>
            <select className="time-sel" value={minute} onChange={e=>setMinute(+e.target.value)}>
              {mins.map(m=><option key={m} value={m}>{String(m).padStart(2,"0")}</option>)}
            </select>
            <span style={{marginLeft:"auto",fontSize:11,color:"var(--text-3)"}}>24h</span>
          </div>
          <div className="dt-actions">
            <button type="button" className="btn btn-ghost btn-sm btn-block" onClick={()=>setOpen(false)}>Cancel</button>
            <button type="button" className="btn btn-primary btn-sm btn-block" disabled={!draft} onClick={apply}>Set date</button>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { DateTimePicker, Icon, formatDT });
