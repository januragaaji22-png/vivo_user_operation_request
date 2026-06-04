/* ===== Field primitives ===== */

function Field({ label, required, optional, hint, error, htmlFor, counter, children }) {
  return (
    <div className="field">
      <div className="label-row">
        <label className="field-label" htmlFor={htmlFor}>
          {label}
          {required && <span className="req">*</span>}
          {optional && <span className="opt">optional</span>}
        </label>
        {counter}
      </div>
      {children}
      {hint && !error && <div className="field-hint">{hint}</div>}
      {error && <div className="field-err"><Icon name="x" size={12}/> {error}</div>}
    </div>
  );
}

function Counter({ value, max }) {
  const pct = value / max;
  const cls = value >= max ? "max" : pct > 0.85 ? "warn" : "";
  return <span className={`counter ${cls}`}>{value}<span style={{opacity:.55}}> / {max}</span></span>;
}

function TextInput({ id, value, onChange, placeholder, invalid, type="text", disabled }) {
  return (
    <input id={id} className={`input ${invalid?"invalid":""}`} type={type} value={value}
      placeholder={placeholder} disabled={disabled}
      onChange={e=>onChange(e.target.value)} autoComplete="off" />
  );
}

function PrefixInput({ id, value, onChange, placeholder, invalid, prefix }) {
  return (
    <div className={`with-prefix ${invalid?"invalid":""}`}>
      <span className="prefix">{prefix}</span>
      <input id={id} className="input" value={value} placeholder={placeholder}
        onChange={e=>onChange(e.target.value)} autoComplete="off" spellCheck="false" />
    </div>
  );
}

function LimitedText({ id, value, onChange, placeholder, max, invalid, area, rows }) {
  function handle(v){ onChange(max ? v.slice(0, max) : v); }
  if (area) {
    return (
      <textarea id={id} className={`textarea ${invalid?"invalid":""}`} value={value}
        placeholder={placeholder} rows={rows||3}
        onChange={e=>handle(e.target.value)} />
    );
  }
  return (
    <input id={id} className={`input ${invalid?"invalid":""}`} value={value}
      placeholder={placeholder} onChange={e=>handle(e.target.value)} autoComplete="off" />
  );
}

function Select({ id, value, onChange, options, placeholder, invalid, dotColors }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    function onDoc(e){ if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  return (
    <div className="select" ref={ref}>
      <button type="button" id={id}
        className={`select-btn ${value?"":"placeholder"} ${open?"open":""} ${invalid?"invalid":""}`}
        onClick={()=>setOpen(o=>!o)}>
        {value || placeholder}
        <span className="select-caret"><Icon name="chevD" size={15}/></span>
      </button>
      {open && (
        <div className="select-menu">
          {options.map(opt => (
            <div key={opt} className={`opt-row ${opt===value?"sel":""}`}
              onClick={()=>{ onChange(opt); setOpen(false); }}>
              {dotColors && <span className="opt-dot" style={{background:dotColors[opt]||"#cbd0d8"}}/>}
              {opt}
              <span className="tick"><Icon name="check" size={14}/></span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TagInput({ value, onChange, placeholder, invalid }) {
  const [text, setText] = useState("");
  const inputRef = useRef(null);
  function commit(raw) {
    const parts = raw.split(",").map(s=>s.trim()).filter(Boolean);
    if (!parts.length) return;
    const next = [...value];
    parts.forEach(p => { if (!next.includes(p)) next.push(p); });
    onChange(next);
    setText("");
  }
  function onKey(e) {
    if ((e.key === "Enter" || e.key === ",") ) { e.preventDefault(); commit(text); }
    else if (e.key === "Backspace" && !text && value.length) { onChange(value.slice(0,-1)); }
  }
  return (
    <div className={`tags ${invalid?"invalid":""}`} onClick={()=>inputRef.current && inputRef.current.focus()}>
      {value.map(t => (
        <span className="tag" key={t}>
          {t}
          <button type="button" onClick={(e)=>{e.stopPropagation(); onChange(value.filter(x=>x!==t));}}><Icon name="x" size={11}/></button>
        </span>
      ))}
      <input ref={inputRef} value={text} placeholder={value.length?"":placeholder}
        onChange={e=>setText(e.target.value)} onKeyDown={onKey} onBlur={()=>commit(text)} />
    </div>
  );
}

function FileUpload({ file, onFile, invalid, accept, maxMB, specTitle, specLines, driveUrl }) {
  const [drag, setDrag] = useState(false);
  const [err, setErr] = useState("");
  const inputRef = useRef(null);

  function validate(f) {
    setErr("");
    const extOk = /\.(jpg|jpeg|png)$/i.test(f.name);
    if (!extOk) { setErr("Only JPG, JPEG or PNG files are allowed."); return; }
    if (f.size > maxMB*1024*1024) { setErr(`File exceeds the ${maxMB}MB limit (${(f.size/1048576).toFixed(1)}MB).`); return; }
    const url = URL.createObjectURL(f);
    onFile({ name: f.name, size: f.size, url });
  }
  function onInput(e){ const f = e.target.files[0]; if (f) validate(f); }
  function onDrop(e){ e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) validate(f); }

  return (
    <div>
      {!file ? (
        <div className={`drop ${drag?"drag":""} ${invalid||err?"invalid":""}`}
          onClick={()=>inputRef.current.click()}
          onDragOver={e=>{e.preventDefault();setDrag(true);}}
          onDragLeave={()=>setDrag(false)} onDrop={onDrop}>
          <div className="drop-ico"><Icon name="upload" size={18}/></div>
          <div><b>Click to upload</b> or drag & drop</div>
          <div className="small">JPG / PNG — max {maxMB}MB</div>
          <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png" hidden onChange={onInput} />
        </div>
      ) : (
        <div className="file-card">
          <img className="file-thumb" src={file.url} alt="" />
          <div className="file-meta">
            <div className="nm">{file.name}</div>
            <div className="sz">{(file.size/1048576).toFixed(2)} MB</div>
          </div>
          <button type="button" className="file-x" onClick={()=>{onFile(null); setErr("");}}><Icon name="x" size={15}/></button>
        </div>
      )}
      {err && <div className="field-err" style={{marginTop:7}}><Icon name="x" size={12}/> {err}</div>}
      <div className="spec-box">
        <div className="st">{specTitle}</div>
        <ul>{specLines.map((l,i)=><li key={i}>{l}</li>)}</ul>
      </div>
    </div>
  );
}

Object.assign(window, { Field, Counter, TextInput, PrefixInput, LimitedText, Select, TagInput, FileUpload });
