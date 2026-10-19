/* ===== CRM Blast Request — main app ===== */

const PHASES = ["Pre Heat", "Pre-order", "Selling", "Sustenance"];
const PHASE_DOTS = { "Pre Heat": "#ea580c", "Pre-order": "#2563eb", "Selling": "#16a34a", "Sustenance": "#7c3aed" };
const PLACEMENTS = ["SMS Blast", "Email Blast", "WhatsApp Blast"];
const PLACEMENT_DOTS = { "SMS Blast": "#0891b2", "Email Blast": "#2563eb", "WhatsApp Blast": "#16a34a" };
const DEPARTMENTS = ["Brand", "Sales", "GTM & Product", "Internet Product", "Internet Business", "E-commerce", "Customer Service"];
const DRIVE_URL = "https://drive.google.com/drive/folders/1qni31LE-EhwV0lT-nWBi0MgxM7ElV8Tm?usp=sharing";

const CHANNEL_CFG = {
  "SMS Blast": {
    headline: { max: 100, required: true, hint: "Max 100 characters including spaces & emoji" },
    readMore: { max: 120, required: true, hint: "Max 120 characters including spaces & emoji" },
    button: true, buttonMax: 12,
    material: { maxMB: 2, specTitle: "SMS image requirements", lines: [
      "Aspect ratio 9:5 or 16:9 · width ≥ 576px",
      "Recommended: 576×320px or 1088×612px",
      "Max size 2MB · formats JPG, PNG, JPEG"]
    }
  },
  "Email Blast": {
    headline: { max: 50, required: true, hint: "Max 50 characters including spaces & emoji" },
    readMore: { max: 100000, required: false, optional: true, hint: "Unlimited length · optional for Email" },
    button: true,
    material: { maxMB: 5, specTitle: "Email image requirements", lines: [
      "Recommended content width 600px (1200px for retina @2x)",
      "Formats JPG or PNG · max 5MB"]
    }
  },
  "WhatsApp Blast": {
    headline: null,
    readMore: { max: 1024, required: true, hint: "Max 1024 characters including spaces & emoji" },
    button: true,
    material: { maxMB: 5, specTitle: "WhatsApp image requirements", lines: [
      "Recommended aspect ratio 1080 × 523",
      "Formats JPG or PNG · max 5MB"]
    }
  }
};

const BUTTON_MAX = 25;
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwFOtHDDvBp-U75g2gSGmoM4QDiX_zWBGiC6uhHiU7A7yvYOYwjT3nQfqI0zMK1pza5UA/exec";
const MAX_BLASTS = 10;          // samakan dengan MAX_ITEMS di Code.gs
const MAX_TOTAL_MATERIAL_MB = 30; // batas aman payload Apps Script (base64 ~1.33x)

const emptyCommon = { product: "", phase: "", department: "", requestBy: "" };
const ITEM_FIELDS = ["airing", "placement", "headline", "readMore", "button", "landing", "dmp", "material"];

let blastSeq = 0;
function newItem(from) {
  blastSeq += 1;
  return {
    airing: null, placement: "", headline: "", readMore: "", button: "", landing: "", material: null,
    ...(from || {}),
    dmp: from && from.dmp ? [...from.dmp] : [],
    id: "b" + blastSeq
  };
}

function validateCommon(c) {
  const e = {};
  if (!c.product.trim()) e.product = "Required.";
  if (!c.phase) e.phase = "Select a phase.";
  if (!c.department) e.department = "Select a department.";
  if (!c.requestBy.trim()) e.requestBy = "Required.";
  return e;
}

function validateItem(it) {
  const e = {};
  const cfg = it.placement ? CHANNEL_CFG[it.placement] : null;
  if (!it.airing) e.airing = "Pick an airing date & time.";
  if (!it.placement) e.placement = "Select a placement.";
  if (cfg) {
    if (cfg.headline && cfg.headline.required && !it.headline.trim()) e.headline = "Headline is required.";
    if (cfg.readMore.required && !it.readMore.trim()) e.readMore = "Required.";
    if (cfg.button && !it.button.trim()) e.button = "Button label is required.";
    if (cfg.button && it.button.trim() && cfg.buttonMax && [...it.button].length > cfg.buttonMax) e.button = `Max ${cfg.buttonMax} characters.`;
    if (!it.material) e.material = "Upload a creative material.";
  }
  if (!it.dmp.length) e.dmp = "Add at least one DMP tag.";
  if (!it.landing.trim()) e.landing = "Required.";
  else if (!/^([a-z]+:\/\/)?[\w.-]+\.[a-z]{2,}.*$/i.test(it.landing.trim())) e.landing = "Enter a valid URL.";
  return e;
}

async function fileUrlToBase64(url) {
  const resp = await fetch(url);
  const blob = await resp.blob();
  const base64 = await new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload  = () => res(reader.result.split(",")[1]);
    reader.onerror = () => rej(new Error("Gagal baca file"));
    reader.readAsDataURL(blob);
  });
  return { base64, mime: blob.type };
}

function App() {
  const [view, setView] = useState("new"); // "new" | "myRequests"
  const [common, setCommon] = useState(emptyCommon);
  const [items, setItems] = useState(() => [newItem()]);
  const [errors, setErrors] = useState({ common: {}, items: {} });
  const [submitted, setSubmitted] = useState(null);
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false); // cegah double-click kirim 2x

  function setC(k, v) {
    setCommon((c) => ({ ...c, [k]: v }));
    setErrors((e) => ({ ...e, common: { ...e.common, [k]: undefined } }));
  }

  // Semua perubahan item lewat id-nya — copy & creative selalu nempel di blast yang sama.
  function updateItem(id, patch) {
    setItems((list) => list.map((it) => it.id === id ? { ...it, ...patch } : it));
    setErrors((e) => {
      const cur = { ...(e.items[id] || {}) };
      Object.keys(patch).forEach((k) => delete cur[k]);
      return { ...e, items: { ...e.items, [id]: cur } };
    });
  }

  function changePlacement(id, p) {
    updateItem(id, { placement: p, headline: "", readMore: "", button: "", material: null });
  }

  function addItem() {
    setItems((list) => {
      if (list.length >= MAX_BLASTS) return list;
      const last = list[list.length - 1];
      // Prefill yang biasanya sama antar blast; copy & creative dikosongkan.
      return [...list, newItem(last ? { airing: last.airing, landing: last.landing, dmp: last.dmp } : null)];
    });
  }

  function duplicateItem(id) {
    setItems((list) => {
      if (list.length >= MAX_BLASTS) return list;
      const i = list.findIndex((it) => it.id === id);
      const copy = newItem(list[i]);
      return [...list.slice(0, i + 1), copy, ...list.slice(i + 1)];
    });
  }

  function removeItem(id) {
    setItems((list) => list.length > 1 ? list.filter((it) => it.id !== id) : list);
  }

  function resetAll() {
    setCommon(emptyCommon);
    setItems([newItem()]);
    setErrors({ common: {}, items: {} });
  }

  async function submit() {
    if (submittingRef.current) return;

    const ce = validateCommon(common);
    const ie = {};
    items.forEach((it) => { const e = validateItem(it); if (Object.keys(e).length) ie[it.id] = e; });
    setErrors({ common: ce, items: ie });

    const firstAnchor =
      ["product", "phase", "department", "requestBy"].find((k) => ce[k]) ||
      items.reduce((found, it) => found || (ie[it.id] && ITEM_FIELDS.filter((k) => ie[it.id][k]).map((k) => `${it.id}-${k}`)[0]), null);
    if (firstAnchor) {
      const el = document.querySelector(`[data-anchor="${firstAnchor}"]`);
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 120, behavior: "smooth" });
      return;
    }

    const totalMB = items.reduce((s, it) => s + (it.material ? it.material.size : 0), 0) / 1048576;
    if (totalMB > MAX_TOTAL_MATERIAL_MB) {
      alert(`Total ukuran creative ${totalMB.toFixed(1)}MB — maksimal ${MAX_TOTAL_MATERIAL_MB}MB per submission. Pecah jadi beberapa submission.`);
      return;
    }

    // Snapshot data saat ini — copy & creative yang dikirim selalu dari blast yang sama
    const snapshot = {
      common: { ...common },
      items: items.map((it) => ({ ...it, dmp: [...it.dmp] }))
    };
    submittingRef.current = true;
    setLoading(true);
    try {
      const payloadItems = await Promise.all(snapshot.items.map(async (it) => {
        const mat = it.material && it.material.url ? await fileUrlToBase64(it.material.url) : null;
        return {
          airing:         it.airing ? it.airing.toISOString() : null,
          placement:      it.placement,
          headline:       it.headline,
          readMore:       it.readMore,
          button:         it.button,
          landing:        it.landing,
          dmp:            it.dmp,
          materialName:   it.material ? it.material.name : null,
          materialBase64: mat ? mat.base64 : null,
          materialMime:   mat ? mat.mime : null,
        };
      }));

      const res = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({ ...snapshot.common, items: payloadItems }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Server error");

      // tickets dari server urutannya sama dengan items
      setSubmitted({ ...snapshot, tickets: (json.tickets || []).map((t) => t.ticket) });
      window.scrollTo({ top: 0, behavior: "auto" });
    } catch (err) {
      alert("Gagal submit: " + err.message + "\nCoba lagi atau hubungi admin.");
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  if (submitted) return <Success result={submitted}
    onNew={() => {setSubmitted(null);resetAll();setView("new");}} />;

  if (view === "myRequests") return <MyRequests onBack={() => setView("new")} />;

  const readyCount = items.filter((it) => !Object.keys(validateItem(it)).length).length;
  const ce = errors.common;

  return (
    <div>
      <Topbar requester={common.requestBy} onMyRequests={() => setView("myRequests")} />
      <div className="page">
        <div className="page-head">
          <h1>vivo User Operation Request</h1>
          <p>Fill in the campaign once, then add as many blasts as you need. Each blast has its own channel, copy and creative — and gets its own ticket.</p>
        </div>

        {/* Campaign — diisi sekali untuk semua blast */}
        <section className="card">
          <div className="card-head"><span className="card-num">1</span><h2>Campaign details</h2>
            <span className="sub">— shared by every blast below</span></div>
          <div className="card-body">
            <div className="grid">
              <div data-anchor="product">
                <Field label="Product name" required error={ce.product}>
                  <TextInput value={common.product} invalid={!!ce.product}
                    placeholder="e.g. X300 Ultra" onChange={(v) => setC("product", v)} />
                </Field>
              </div>
              <div data-anchor="phase">
                <Field label="Phase" required error={ce.phase}>
                  <Select value={common.phase} options={PHASES} dotColors={PHASE_DOTS}
                    placeholder="Select phase" invalid={!!ce.phase}
                    onChange={(v) => setC("phase", v)} />
                </Field>
              </div>
              <div data-anchor="department">
                <Field label="Department" required error={ce.department}>
                  <Select value={common.department} options={DEPARTMENTS}
                    placeholder="Select department" invalid={!!ce.department}
                    onChange={(v) => setC("department", v)} />
                </Field>
              </div>
              <div data-anchor="requestBy">
                <Field label="Request by" required error={ce.requestBy}>
                  <TextInput value={common.requestBy} invalid={!!ce.requestBy}
                    placeholder="Your name" onChange={(v) => setC("requestBy", v)} />
                </Field>
              </div>
            </div>
          </div>
        </section>

        {items.map((it, i) =>
          <BlastItem key={it.id} index={i} item={it} errors={errors.items[it.id] || {}}
            canRemove={items.length > 1} canAdd={items.length < MAX_BLASTS}
            onChange={(patch) => updateItem(it.id, patch)}
            onPlacement={(p) => changePlacement(it.id, p)}
            onDuplicate={() => duplicateItem(it.id)}
            onRemove={() => removeItem(it.id)} />
        )}

        {items.length < MAX_BLASTS ?
          <button type="button" className="add-blast" onClick={addItem}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add another blast
            <span className="muted">({items.length}/{MAX_BLASTS})</span>
          </button> :
          <div className="placeholder-note">Maximum {MAX_BLASTS} blasts per submission.</div>
        }
      </div>

      <div className="footer-bar">
        <div className="footer-inner">
          <div className="status">
            <b>{items.length}</b> blast{items.length > 1 ? "s" : ""} · <b>{readyCount}</b> ready
          </div>
          <div className="grow"></div>
          <button className="btn btn-ghost" type="button" onClick={resetAll}>Clear</button>
          <button className="btn btn-primary" type="button" onClick={submit} disabled={loading} style={loading ? {opacity:.7,cursor:"not-allowed"} : {}}>
            {loading ? "Submitting…" : <><span>Submit {items.length > 1 ? `${items.length} requests` : "request"}</span> <Icon name="chevR" size={15} /></>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===== Satu kartu blast: channel + copy + creative ===== */
function BlastItem({ index, item, errors, canRemove, canAdd, onChange, onPlacement, onDuplicate, onRemove }) {
  const cfg = item.placement ? CHANNEL_CFG[item.placement] : null;
  const a = (k) => `${item.id}-${k}`;

  return (
    <section className="card">
      <div className="card-head">
        <span className="card-num">{index + 2}</span>
        <h2>Blast {index + 1}</h2>
        {item.placement && <span className="sub">— {item.placement}</span>}
        <div className="card-actions">
          {canAdd &&
            <button type="button" className="btn btn-ghost btn-sm" onClick={onDuplicate}>Duplicate</button>}
          {canRemove &&
            <button type="button" className="btn btn-ghost btn-sm btn-danger" onClick={onRemove}>Remove</button>}
        </div>
      </div>
      <div className="card-body">
        <div className="grid">
          <div className="col-2" data-anchor={a("airing")}>
            <Field label="Airing date & time" required error={errors.airing}
              hint="When this blast should go live.">
              <DateTimePicker value={item.airing} invalid={!!errors.airing}
                onChange={(v) => onChange({ airing: v })} />
            </Field>
          </div>
          <div className="col-2" data-anchor={a("placement")}>
            <Field label="Placement" required error={errors.placement}>
              <Select value={item.placement} options={PLACEMENTS} dotColors={PLACEMENT_DOTS}
                placeholder="Select a blast channel" invalid={!!errors.placement}
                onChange={onPlacement} />
            </Field>
          </div>
        </div>

        {!cfg ?
          <div className="placeholder-note" style={{ marginTop: 14 }}>Select a placement to configure the message fields and image specs for this blast.</div> :
          <React.Fragment>
            <div className="channel-banner" style={{ marginTop: 14 }}>
              <Icon name="badge" size={15} />
              <span>Configured for <span className="chip">{item.placement}</span></span>
              <span style={{ marginLeft: "auto", opacity: .85, fontSize: 11.5 }}>
                {cfg.headline ? `Headline ${cfg.headline.required ? "req" : "opt"} · ` : "No headline · "}
                Read More {cfg.readMore.optional ? "opt" : "req"}
              </span>
            </div>
            <div className="grid">
              {cfg.headline &&
                <div className="col-2" data-anchor={a("headline")}>
                  <Field label="Headline" required={cfg.headline.required} optional={!cfg.headline.required}
                    error={errors.headline} hint={cfg.headline.hint}
                    counter={<Counter value={[...item.headline].length} max={cfg.headline.max} />}>
                    <LimitedText value={item.headline} max={cfg.headline.max} invalid={!!errors.headline}
                      placeholder="Compelling one-liner…" onChange={(v) => onChange({ headline: v })} />
                  </Field>
                </div>
              }

              <div className="col-2" data-anchor={a("readMore")}>
                <Field label="Read More" required={cfg.readMore.required} optional={cfg.readMore.optional}
                  error={errors.readMore} hint={cfg.readMore.hint}
                  counter={cfg.readMore.max < 100000 ?
                    <Counter value={[...item.readMore].length} max={cfg.readMore.max} /> :
                    null}>
                  <LimitedText area rows={4} value={item.readMore}
                    max={cfg.readMore.max < 100000 ? cfg.readMore.max : null}
                    invalid={!!errors.readMore}
                    placeholder="Body copy of the blast…" onChange={(v) => onChange({ readMore: v })} />
                </Field>
              </div>

              {cfg.button &&
                <div data-anchor={a("button")}>
                  <Field label="Button label" required error={errors.button}
                    counter={<Counter value={[...item.button].length} max={cfg.buttonMax ?? BUTTON_MAX} />}>
                    <LimitedText value={item.button} max={cfg.buttonMax ?? BUTTON_MAX} invalid={!!errors.button}
                      placeholder="e.g. Shop now" onChange={(v) => onChange({ button: v })} />
                  </Field>
                </div>
              }

              <div data-anchor={a("landing")} className={cfg.button ? "" : "col-2"}>
                <Field label="Landing page link" required error={errors.landing}>
                  <PrefixInput prefix={<Icon name="link" size={13} />} value={item.landing}
                    invalid={!!errors.landing} placeholder="vivo.com/v50"
                    onChange={(v) => onChange({ landing: v })} />
                </Field>
              </div>

              <div className="col-2" data-anchor={a("dmp")}>
                <Field label="DMP tags" required error={errors.dmp}
                  hint="Type a tag and press Enter or comma. Used for audience targeting.">
                  <TagInput value={item.dmp} invalid={!!errors.dmp}
                    placeholder="e.g. V60 Lite, V70 FE, User Who Interest at Photography, Active User at Least 24 Months"
                    onChange={(v) => onChange({ dmp: v })} />
                </Field>
              </div>

              <div className="col-2" data-anchor={a("material")}>
                <Field label="Creative material" required error={errors.material}>
                  <FileUpload file={item.material} invalid={!!errors.material}
                    onFile={(f) => onChange({ material: f })}
                    accept={["image/jpeg", "image/png"]} maxMB={cfg.material.maxMB}
                    specTitle={cfg.material.specTitle} specLines={cfg.material.lines} driveUrl={DRIVE_URL} />
                </Field>
              </div>
            </div>
          </React.Fragment>
        }
      </div>
    </section>
  );
}

function Topbar({ requester, onMyRequests }) {
  return (
    <div className="topbar">
      <span className="brand-name">User Operation Team</span>
      <span className="crumb">/ Demand requests / New</span>
      <span className="spacer"></span>
      {onMyRequests &&
        <button type="button" className="topbar-link" onClick={onMyRequests}>
          <Icon name="cal" size={13} /> My requests
        </button>
      }
    </div>
  );
}

function Success({ result, onNew }) {
  const { common, items, tickets } = result;
  const n = items.length;
  return (
    <div>
      <Topbar requester={common.requestBy} />
      <div className="success-wrap">
        <div className="success-card">
          <div className="success-top">
            <div className="check-badge"><Icon name="check" size={26} stroke={2.4} /></div>
            <h2>{n > 1 ? `${n} blast requests submitted` : "Blast request submitted"}</h2>
            <p>Your demand has been logged and routed to the CRM operations queue.</p>
            <div className="ticket-list">
              {items.map((it, i) =>
                <div key={it.id} className="ticket">{it.placement} <b>{tickets[i] || "—"}</b></div>
              )}
            </div>
          </div>
          <div className="summary">
            <div className="sum-group-title">Campaign</div>
            <Row k="Product name" v={common.product} />
            <Row k="Phase" v={<span className="pill" style={{ background: "#fff", border: `1px solid ${PHASE_DOTS[common.phase]}33`, color: PHASE_DOTS[common.phase] }}>{common.phase}</span>} />
            <Row k="Department" v={common.department} />
            <Row k="Request by" v={common.requestBy} />

            {items.map((it, i) => {
              const cfg = CHANNEL_CFG[it.placement];
              return (
                <React.Fragment key={it.id}>
                  <div className="sum-group-title">Blast {i + 1} · {tickets[i] || "—"}</div>
                  <Row k="Placement" v={<span className="pill" style={{ background: "#fff", border: `1px solid ${PLACEMENT_DOTS[it.placement]}33`, color: PLACEMENT_DOTS[it.placement] }}>{it.placement}</span>} />
                  <Row k="Airing date & time" v={formatDT(it.airing)} />
                  {cfg.headline && <Row k="Headline" v={it.headline || <em className="muted">—</em>} />}
                  <Row k="Read More" v={it.readMore || <em className="muted">—</em>} />
                  {cfg.button && <Row k="Button label" v={it.button} />}
                  <Row k="Landing page" v={it.landing} />
                  <Row k="DMP tags" v={<span>{it.dmp.map((t) => <span key={t} className="pill">{t}</span>)}</span>} />
                  <Row k="Creative" v={it.material ?
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <img src={it.material.url} style={{ width: 46, height: 32, borderRadius: 4, objectFit: "cover", border: "1px solid var(--border)" }} />
                      {it.material.name} · {(it.material.size / 1048576).toFixed(2)} MB
                    </span> :
                    "—"} />
                </React.Fragment>
              );
            })}
          </div>
          <div className="success-actions">
            <button className="btn btn-ghost" onClick={() => window.print()}>Print / save PDF</button>
            <div style={{ flex: 1 }}></div>
            <button className="btn btn-primary" onClick={onNew}>Submit another</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div className="sum-row">
      <div className="sum-k">{k}</div>
      <div className="sum-v">{v}</div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

/* ===== My Requests — view + edit existing requests ===== */

function MyRequests({ onBack }) {
  const [name, setName] = useState("");
  const [requests, setRequests] = useState(null);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState("");
  const [selected, setSelected] = useState(null); // request object being edited

  async function lookup() {
    if (!name.trim()) return;
    setLoadingList(true);
    setListError("");
    setRequests(null);
    try {
      const url = APPS_SCRIPT_URL + "?action=myRequests&name=" + encodeURIComponent(name.trim());
      const res = await fetch(url);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load requests");
      setRequests(json.requests || []);
    } catch (err) {
      setListError(err.message || "Something went wrong.");
    } finally {
      setLoadingList(false);
    }
  }

  if (selected) {
    return <ReviseForm request={selected} onBack={() => setSelected(null)} onDone={() => { setSelected(null); lookup(); }} />;
  }

  return (
    <div>
      <Topbar requester={name} />
      <div className="page">
        <div className="page-head">
          <h1>My requests</h1>
          <p>Look up requests you've submitted to view their status or make a revision.</p>
        </div>

        <section className="card">
          <div className="card-head"><span className="card-num"><Icon name="badge" size={15} /></span><h2>Find your requests</h2></div>
          <div className="card-body">
            <div className="grid">
              <div className="col-2">
                <Field label="Your name" hint="Enter the exact name you used when submitting (Request by field).">
                  <TextInput value={name} placeholder="e.g. Janu"
                    onChange={setName} />
                </Field>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <button type="button" className="btn btn-primary" onClick={lookup} disabled={loadingList || !name.trim()}
                style={loadingList ? { opacity: .7, cursor: "not-allowed" } : {}}>
                {loadingList ? "Searching…" : "Find my requests"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={onBack}>Back to new request</button>
            </div>
          </div>
        </section>

        {listError &&
          <div className="card">
            <div className="card-body">
              <div className="field-err"><Icon name="x" size={12} /> {listError}</div>
            </div>
          </div>
        }

        {requests && requests.length === 0 &&
          <div className="card">
            <div className="card-body">
              <div className="placeholder-note">No requests found for "{name}". Check the spelling matches exactly what you entered when submitting.</div>
            </div>
          </div>
        }

        {requests && requests.length > 0 &&
          <section className="card">
            <div className="card-head"><span className="card-num">{requests.length}</span><h2>Your requests</h2></div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {requests.map((r) => <RequestRow key={r.rowIndex} r={r} onEdit={() => setSelected(r)} />)}
            </div>
          </section>
        }
      </div>
    </div>
  );
}

function RequestRow({ r, onEdit }) {
  const statusColors = {
    DONE: "#16a34a", FAILED: "#dc2626", "IN PROGRESS": "#2563eb", PENDING: "#6b7280"
  };
  const sc = statusColors[r.status] || "#6b7280";

  return (
    <div className="request-row">
      <div className="request-row-main">
        <div className="request-row-top">
          <span className="ticket-tag">{r.ticket}</span>
          <span className="pill" style={{ background: "#fff", border: `1px solid ${sc}33`, color: sc }}>{r.status}</span>
          {r.isLocked && <span className="pill" style={{ background: "#fff", border: "1px solid #d1d5db", color: "#6b7280" }}>Locked</span>}
        </div>
        <div className="request-row-title">{r.product} <span className="muted">· {r.placement}</span></div>
        <div className="request-row-sub">{r.airingLabel} · {r.timeLabel}</div>
      </div>
      <div>
        {r.isLocked ?
          <button type="button" className="btn btn-ghost btn-sm" disabled style={{ opacity: .5, cursor: "not-allowed" }}>Locked</button> :
          <button type="button" className="btn btn-primary btn-sm" onClick={onEdit}>Revise</button>
        }
      </div>
    </div>
  );
}

function ReviseForm({ request, onBack, onDone }) {
  const [data, setData] = useState({
    airing: parseAiringLabelToDate(request.airingLabel, request.timeLabel),
    product: request.product || "",
    phase: request.phase || "",
    headline: request.headline || "",
    readMore: request.readMore || "",
    dmp: request.dmp ? request.dmp.split(",").map((s) => s.trim()).filter(Boolean) : [],
    button: request.button || "",
    landing: request.landing || "",
    material: null, // gambar baru, kalau diisi akan replace yang lama
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const set = (k, v) => setData((d) => ({ ...d, [k]: v }));
  const cfg = CHANNEL_CFG[request.placement];

  async function submit() {
    setLoading(true);
    setError("");
    try {
      let materialBase64 = null;
      let materialMime = null;
      if (data.material && data.material.url) {
        const resp = await fetch(data.material.url);
        const blob = await resp.blob();
        materialMime = blob.type;
        materialBase64 = await new Promise((res, rej) => {
          const reader = new FileReader();
          reader.onload = () => res(reader.result.split(",")[1]);
          reader.onerror = () => rej(new Error("Failed to read file"));
          reader.readAsDataURL(blob);
        });
      }

      const payload = {
        action: "revise",
        no: request.no,
        rowIndex: request.rowIndex,
        airing: data.airing ? data.airing.toISOString() : null,
        product: data.product,
        phase: data.phase,
        headline: data.headline,
        readMore: data.readMore,
        dmp: data.dmp,
        button: data.button,
        landing: data.landing,
        materialName: data.material ? data.material.name : null,
        materialBase64,
        materialMime,
      };

      const res = await fetch(APPS_SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to update request");

      setDone(true);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div>
        <Topbar requester={request.requestBy} />
        <div className="success-wrap">
          <div className="success-card">
            <div className="success-top">
              <div className="check-badge"><Icon name="check" size={26} stroke={2.4} /></div>
              <h2>Request revised</h2>
              <p>Your changes to <b>{request.ticket}</b> have been saved.</p>
            </div>
            <div className="success-actions">
              <div style={{ flex: 1 }}></div>
              <button className="btn btn-primary" onClick={onDone}>Back to my requests</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Topbar requester={request.requestBy} />
      <div className="page">
        <div className="page-head">
          <h1>Revise request <span className="muted">— {request.ticket}</span></h1>
          <p>Locked fields (placement, department, request by) can't be changed here. Contact the operations team if those need to change.</p>
        </div>

        <section className="card">
          <div className="card-head"><span className="card-num">1</span><h2>Campaign details</h2></div>
          <div className="card-body">
            <div className="grid">
              <div className="col-2">
                <Field label="Airing date & time" required hint="When the blast should go live.">
                  <DateTimePicker value={data.airing} onChange={(v) => set("airing", v)} />
                </Field>
              </div>
              <div>
                <Field label="Product name" required>
                  <TextInput value={data.product} onChange={(v) => set("product", v)} placeholder="e.g. X300 Ultra" />
                </Field>
              </div>
              <div>
                <Field label="Phase" required>
                  <Select value={data.phase} options={PHASES} dotColors={PHASE_DOTS}
                    placeholder="Select phase" onChange={(v) => set("phase", v)} />
                </Field>
              </div>
              <div>
                <Field label="Placement" hint="Locked — contact ops to change channel.">
                  <div className="input" style={{ background: "#f9fafb", color: "#6b7280", cursor: "not-allowed" }}>{request.placement}</div>
                </Field>
              </div>
              <div>
                <Field label="Department" hint="Locked.">
                  <div className="input" style={{ background: "#f9fafb", color: "#6b7280", cursor: "not-allowed" }}>{request.department}</div>
                </Field>
              </div>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-head"><span className="card-num">2</span><h2>Message content</h2></div>
          <div className="card-body">
            <div className="grid">
              {cfg && cfg.headline &&
                <div className="col-2">
                  <Field label="Headline" required={cfg.headline.required} hint={cfg.headline.hint}
                    counter={<Counter value={[...data.headline].length} max={cfg.headline.max} />}>
                    <LimitedText value={data.headline} max={cfg.headline.max}
                      placeholder="Compelling one-liner…" onChange={(v) => set("headline", v)} />
                  </Field>
                </div>
              }
              <div className="col-2">
                <Field label="Read More" hint={cfg ? cfg.readMore.hint : ""}
                  counter={cfg && cfg.readMore.max < 100000 ? <Counter value={[...data.readMore].length} max={cfg.readMore.max} /> : null}>
                  <LimitedText area rows={4} value={data.readMore}
                    max={cfg && cfg.readMore.max < 100000 ? cfg.readMore.max : null}
                    placeholder="Body copy of the blast…" onChange={(v) => set("readMore", v)} />
                </Field>
              </div>
              {cfg && cfg.button &&
                <div>
                  <Field label="Button label" counter={<Counter value={[...data.button].length} max={cfg.buttonMax ?? BUTTON_MAX} />}>
                    <LimitedText value={data.button} max={cfg.buttonMax ?? BUTTON_MAX} placeholder="e.g. Shop now" onChange={(v) => set("button", v)} />
                  </Field>
                </div>
              }
              <div className={cfg && cfg.button ? "" : "col-2"}>
                <Field label="Landing page link">
                  <PrefixInput prefix={<Icon name="link" size={13} />} value={data.landing}
                    placeholder="vivo.com/v50" onChange={(v) => set("landing", v)} />
                </Field>
              </div>
              <div className="col-2">
                <Field label="DMP tags" hint="Type a tag and press Enter or comma.">
                  <TagInput value={data.dmp} placeholder="Add tag…" onChange={(v) => set("dmp", v)} />
                </Field>
              </div>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-head"><span className="card-num">3</span><h2>Creative material</h2></div>
          <div className="card-body">
            <Field label="Replace material" hint="Leave empty to keep the current file.">
              <FileUpload file={data.material} onFile={(f) => set("material", f)}
                accept={["image/jpeg", "image/png"]} maxMB={cfg ? cfg.material.maxMB : 5}
                specTitle={cfg ? cfg.material.specTitle : "Image requirements"}
                specLines={cfg ? cfg.material.lines : []} />
            </Field>
            {request.materialLink &&
              <div style={{ marginTop: 10, fontSize: 13 }}>
                Current file: <a href={request.materialLink} target="_blank" rel="noreferrer">{request.materialLink}</a>
              </div>
            }
          </div>
        </section>

        {error && <div className="card"><div className="card-body"><div className="field-err"><Icon name="x" size={12} /> {error}</div></div></div>}
      </div>

      <div className="footer-bar">
        <div className="footer-inner">
          <div className="status">Editing <b>{request.ticket}</b></div>
          <div className="grow"></div>
          <button type="button" className="btn btn-ghost" onClick={onBack}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={loading}
            style={loading ? { opacity: .7, cursor: "not-allowed" } : {}}>
            {loading ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Parse "Tuesday, June 9, 2026" + "10:00" back into a Date object
function parseAiringLabelToDate(dateLabel, timeLabel) {
  try {
    const d = new Date(dateLabel);
    if (isNaN(d.getTime())) return null;
    const [hh, mm] = (timeLabel || "00:00").split(":").map(Number);
    d.setHours(hh || 0, mm || 0, 0, 0);
    return d;
  } catch (e) {
    return null;
  }
}
