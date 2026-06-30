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
const emptyState = {
  airing: null, product: "", phase: "", department: "", requestBy: "",
  placement: "", headline: "", readMore: "", button: "", landing: "", dmp: [], material: null
};

function App() {
  const [view, setView] = useState("new"); // "new" | "myRequests"
  const [data, setData] = useState(emptyState);
  const [waHeadline, setWaHeadline] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(null);
  const [ticket] = useState(() => "BLST-26-" + Math.floor(1000 + Math.random() * 9000));
  const [loading, setLoading] = useState(false);

  const cfg = data.placement ? CHANNEL_CFG[data.placement] : null;
  const set = (k, v) => setData((d) => ({ ...d, [k]: v }));

  function changePlacement(p) {
    setData((d) => ({ ...d, placement: p, headline: "", readMore: "", button: "", material: null }));
    setWaHeadline(false);
    setErrors((e) => {const n = { ...e };["placement", "headline", "readMore", "button", "material"].forEach((k) => delete n[k]);return n;});
  }

  function validate() {
    const e = {};
    if (!data.airing) e.airing = "Pick an airing date & time.";
    if (!data.product.trim()) e.product = "Required.";
    if (!data.phase) e.phase = "Select a phase.";
    if (!data.department) e.department = "Select a department.";
    if (!data.requestBy.trim()) e.requestBy = "Required.";
    if (!data.placement) e.placement = "Select a placement.";
    if (cfg) {
      if (cfg.headline && cfg.headline.required && !data.headline.trim()) e.headline = "Headline is required.";
      if (cfg.readMore.required && !data.readMore.trim()) e.readMore = "Required.";
      if (cfg.button && !data.button.trim()) e.button = "Button label is required.";
      if (cfg.button && data.button.trim() && cfg.buttonMax && [...data.button].length > cfg.buttonMax) e.button = `Max ${cfg.buttonMax} characters.`;
      if (!data.material) e.material = "Upload a creative material.";
    }
    if (!data.dmp.length) e.dmp = "Add at least one DMP tag.";
    if (!data.landing.trim()) e.landing = "Required.";
    else if (!/^([a-z]+:\/\/)?[\w.-]+\.[a-z]{2,}.*$/i.test(data.landing.trim())) e.landing = "Enter a valid URL.";
    return e;
  }

  async function submit() {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      const order = ["airing", "product", "phase", "department", "requestBy", "placement", "headline", "readMore", "button", "landing", "dmp", "material"];
      const first = order.find((k) => e[k]);
      const el = document.querySelector(`[data-anchor="${first}"]`);
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 120, behavior: "smooth" });
      return;
    }

    setLoading(true);
    try {
      // Convert gambar ke Base64 kalau ada
      let materialBase64 = null;
      let materialMime   = null;
      if (data.material && data.material.url) {
        const resp   = await fetch(data.material.url);
        const blob   = await resp.blob();
        materialMime = blob.type;
        materialBase64 = await new Promise((res, rej) => {
          const reader = new FileReader();
          reader.onload  = () => res(reader.result.split(",")[1]);
          reader.onerror = () => rej(new Error("Gagal baca file"));
          reader.readAsDataURL(blob);
        });
      }

      const payload = {
        ticket,
        airing:         data.airing ? data.airing.toISOString() : null,
        product:        data.product,
        phase:          data.phase,
        department:     data.department,
        requestBy:      data.requestBy,
        placement:      data.placement,
        headline:       data.headline,
        readMore:       data.readMore,
        button:         data.button,
        landing:        data.landing,
        dmp:            data.dmp,
        materialName:   data.material ? data.material.name : null,
        materialBase64: materialBase64,
        materialMime:   materialMime,
      };

      const res = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Server error");

      setSubmitted({ ...data });
      window.scrollTo({ top: 0, behavior: "auto" });
    } catch (err) {
      alert("Gagal submit: " + err.message + "\nCoba lagi atau hubungi admin.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) return <Success data={submitted} ticket={ticket} cfg={CHANNEL_CFG[submitted.placement]}
    onNew={() => {setSubmitted(null);setData(emptyState);setWaHeadline(false);setErrors({});setView("new");}} />;

  if (view === "myRequests") return <MyRequests onBack={() => setView("new")} />;

  const filledCount = [
    data.airing, data.product.trim(), data.phase, data.department, data.requestBy.trim(),
    data.placement, data.landing.trim(), data.dmp.length, data.material].
    filter(Boolean).length;
  const totalReq = 9;

  return (
    <div>
      <Topbar requester={data.requestBy} onMyRequests={() => setView("myRequests")} />
      <div className="page">
        <div className="page-head">
          <h1>vivo User Operation Request</h1>
          <p>Submit a demand for a marketing blast. Fields adapt to the channel you choose — character limits and asset specs follow each platform's rules.</p>
        </div>

        {/* 1 — Campaign */}
        <section className="card">
          <div className="card-head"><span className="card-num">1</span><h2>Campaign details</h2></div>
          <div className="card-body">
            <div className="grid">
              <div className="col-2" data-anchor="airing">
                <Field label="Airing date & time" required error={errors.airing}
                  hint="When the blast should go live.">
                  <DateTimePicker value={data.airing} invalid={!!errors.airing}
                    onChange={(v) => {set("airing", v);setErrors((e) => ({ ...e, airing: undefined }));}} />
                </Field>
              </div>
              <div data-anchor="product">
                <Field label="Product name" required error={errors.product}>
                  <TextInput value={data.product} invalid={!!errors.product}
                    placeholder="e.g. X300 Ultra" onChange={(v) => set("product", v)} />
                </Field>
              </div>
              <div data-anchor="phase">
                <Field label="Phase" required error={errors.phase}>
                  <Select value={data.phase} options={PHASES} dotColors={PHASE_DOTS}
                    placeholder="Select phase" invalid={!!errors.phase}
                    onChange={(v) => set("phase", v)} />
                </Field>
              </div>
              <div data-anchor="department">
                <Field label="Department" required error={errors.department}>
                  <Select value={data.department} options={DEPARTMENTS}
                    placeholder="Select department" invalid={!!errors.department}
                    onChange={(v) => set("department", v)} />
                </Field>
              </div>
              <div data-anchor="requestBy">
                <Field label="Request by" required error={errors.requestBy}>
                  <TextInput value={data.requestBy} invalid={!!errors.requestBy}
                    placeholder="Your name" onChange={(v) => set("requestBy", v)} />
                </Field>
              </div>
            </div>
          </div>
        </section>

        {/* 2 — Channel */}
        <section className="card">
          <div className="card-head"><span className="card-num">2</span><h2>Channel</h2>
            <span className="sub">— sets the rules for content & assets</span></div>
          <div className="card-body">
            <div data-anchor="placement">
              <Field label="Placement" required error={errors.placement}>
                <Select value={data.placement} options={PLACEMENTS} dotColors={PLACEMENT_DOTS}
                  placeholder="Select a blast channel" invalid={!!errors.placement}
                  onChange={changePlacement} />
              </Field>
            </div>
          </div>
        </section>

        {/* 3 — Message content */}
        <section className="card">
          <div className="card-head"><span className="card-num">3</span><h2>Message content</h2></div>
          <div className="card-body">
            {!cfg ?
              <div className="placeholder-note">Select a placement above to configure the message fields for that channel.</div> :
              <React.Fragment>
                <div className="channel-banner">
                  <Icon name="badge" size={15} />
                  <span>Configured for <span className="chip">{data.placement}</span></span>
                  <span style={{ marginLeft: "auto", opacity: .85, fontSize: 11.5 }}>
                    {cfg.headline ? `Headline ${cfg.headline.required ? "req" : "opt"} · ` : "No headline · "}
                    Read More {cfg.readMore.optional ? "opt" : "req"}
                  </span>
                </div>
                <div className="grid">
                  {/* Headline */}
                  {cfg.headline && (data.placement !== "WhatsApp Blast" || waHeadline) &&
                    <div className="col-2" data-anchor="headline">
                      <Field label="Headline" required={cfg.headline.required} optional={!cfg.headline.required}
                        error={errors.headline} hint={cfg.headline.hint}
                        counter={<Counter value={[...data.headline].length} max={cfg.headline.max} />}>
                        <LimitedText value={data.headline} max={cfg.headline.max} invalid={!!errors.headline}
                          placeholder="Compelling one-liner…" onChange={(v) => set("headline", v)} />
                      </Field>
                    </div>
                  }
                  {cfg.headline && cfg.headline.toggle && !waHeadline &&
                    <div className="col-2">
                      <button type="button" className="add-toggle" onClick={() => setWaHeadline(true)}>
                        <Icon name="up" size={13} style={{ transform: "rotate(45deg)" }} /> Add optional headline for WhatsApp
                      </button>
                    </div>
                  }

                  {/* Read More */}
                  <div className="col-2" data-anchor="readMore">
                    <Field label="Read More" required={cfg.readMore.required} optional={cfg.readMore.optional}
                      error={errors.readMore} hint={cfg.readMore.hint}
                      counter={cfg.readMore.max < 100000 ?
                        <Counter value={[...data.readMore].length} max={cfg.readMore.max} /> :
                        null}>
                      <LimitedText area rows={4} value={data.readMore}
                        max={cfg.readMore.max < 100000 ? cfg.readMore.max : null}
                        invalid={!!errors.readMore}
                        placeholder="Body copy of the blast…" onChange={(v) => set("readMore", v)} />
                    </Field>
                  </div>

                  {/* Button */}
                  {cfg.button &&
                    <div data-anchor="button">
                      <Field label="Button label" required error={errors.button}
                        counter={<Counter value={[...data.button].length} max={cfg.buttonMax ?? BUTTON_MAX} />}>
                        <LimitedText value={data.button} max={cfg.buttonMax ?? BUTTON_MAX} invalid={!!errors.button}
                          placeholder="e.g. Shop now" onChange={(v) => set("button", v)} />
                      </Field>
                    </div>
                  }

                  {/* Landing page */}
                  <div data-anchor="landing" className={cfg.button ? "" : "col-2"}>
                    <Field label="Landing page link" required error={errors.landing}>
                      <PrefixInput prefix={<Icon name="link" size={13} />} value={data.landing}
                        invalid={!!errors.landing} placeholder="vivo.com/v50"
                        onChange={(v) => set("landing", v)} />
                    </Field>
                  </div>

                  {/* DMP tags */}
                  <div className="col-2" data-anchor="dmp">
                    <Field label="DMP tags" required error={errors.dmp}
                      hint="Type a tag and press Enter or comma. Used for audience targeting.">
                      <TagInput value={data.dmp} invalid={!!errors.dmp}
                        placeholder="e.g. V60 Lite, V70 FE, User Who Interest at Photography, Active User at Least 24 Months"
                        onChange={(v) => {set("dmp", v);if (v.length) setErrors((e) => ({ ...e, dmp: undefined }));}} />
                    </Field>
                  </div>
                </div>
              </React.Fragment>
            }
          </div>
        </section>

        {/* 4 — Material */}
        <section className="card">
          <div className="card-head"><span className="card-num">4</span><h2>Creative material</h2></div>
          <div className="card-body" data-anchor="material">
            {!cfg ?
              <div className="placeholder-note">Select a placement to see the image specs for that channel.</div> :
              <Field label="Material upload" required error={errors.material}>
                <FileUpload file={data.material} invalid={!!errors.material}
                  onFile={(f) => {set("material", f);if (f) setErrors((e) => ({ ...e, material: undefined }));}}
                  accept={["image/jpeg", "image/png"]} maxMB={cfg.material.maxMB}
                  specTitle={cfg.material.specTitle} specLines={cfg.material.lines} driveUrl={DRIVE_URL} />
              </Field>
            }
          </div>
        </section>
      </div>

      <div className="footer-bar">
        <div className="footer-inner">
          <div className="status">
            <b>{filledCount}</b> / {totalReq} core fields ready
            {data.placement && <span> · channel <b>{data.placement}</b></span>}
          </div>
          <div className="grow"></div>
          <button className="btn btn-ghost" type="button"
            onClick={() => {setData(emptyState);setWaHeadline(false);setErrors({});}}>Clear</button>
          <button className="btn btn-primary" type="button" onClick={submit} disabled={loading} style={loading ? {opacity:.7,cursor:"not-allowed"} : {}}>
            {loading ? "Submitting…" : <><span>Submit request</span> <Icon name="chevR" size={15} /></>}
          </button>
        </div>
      </div>
    </div>
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

function Success({ data, ticket, cfg, onNew }) {
  const headlineShown = cfg.headline && (data.placement !== "WhatsApp Blast" || data.headline.trim());
  return (
    <div>
      <Topbar requester={data.requestBy} />
      <div className="success-wrap">
        <div className="success-card">
          <div className="success-top">
            <div className="check-badge"><Icon name="check" size={26} stroke={2.4} /></div>
            <h2>Blast request submitted</h2>
            <p>Your demand has been logged and routed to the CRM operations queue.</p>
            <div className="ticket">Request ID <b>{ticket}</b></div>
          </div>
          <div className="summary">
            <div className="sum-group-title">Campaign</div>
            <Row k="Airing date & time" v={formatDT(data.airing)} />
            <Row k="Product name" v={data.product} />
            <Row k="Phase" v={<span className="pill" style={{ background: "#fff", border: `1px solid ${PHASE_DOTS[data.phase]}33`, color: PHASE_DOTS[data.phase] }}>{data.phase}</span>} />
            <Row k="Department" v={data.department} />
            <Row k="Request by" v={data.requestBy} />

            <div className="sum-group-title">Channel & message</div>
            <Row k="Placement" v={<span className="pill" style={{ background: "#fff", border: `1px solid ${PLACEMENT_DOTS[data.placement]}33`, color: PLACEMENT_DOTS[data.placement] }}>{data.placement}</span>} />
            {headlineShown && <Row k="Headline" v={data.headline || <em className="muted">—</em>} />}
            <Row k="Read More" v={data.readMore} />
            {cfg.button && <Row k="Button label" v={data.button} />}
            <Row k="Landing page" v={data.landing} />
            <Row k="DMP tags" v={<span>{data.dmp.map((t) => <span key={t} className="pill">{t}</span>)}</span>} />

            <div className="sum-group-title">Creative material</div>
            <Row k="Uploaded file" v={data.material ?
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <img src={data.material.url} style={{ width: 46, height: 32, borderRadius: 4, objectFit: "cover", border: "1px solid var(--border)" }} />
                {data.material.name} · {(data.material.size / 1048576).toFixed(2)} MB
              </span> :
              "—"} />
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
