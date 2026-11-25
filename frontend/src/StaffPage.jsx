// ===== SETUP =====
import { useState, useEffect, useRef } from 'react';
import { STATUSES, COLOURS } from './statuses.js';
import { api } from './api.js';

// SHAPE: A blank new-job form
const EMPTY = { plate_number: '', car_model: '', customer_name: '', phone: '', service_type: '' };


// HELPER: turn the saved time into a picker's format (Malaysia time)
function toInput(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
}


// ROW: One car in the list (JobRow)
function JobRow({ job, token, reload, role }) {

    // ===== 1. JOBS =====
    // STATE: the note being typed
    const [notes, setNotes] = useState(job.notes);

    // UPDATE (Admin + Foreman): Save status (Admin saves the note)
    function save(status) {
        api('/jobs/' + job.id, token, 'PUT', { status: status, notes: notes }).then(reload);
    }

    // DELETE (Admin): remove this job
    function remove() {
        api('/jobs/' + job.id, token, 'DELETE').then(reload);
    }

    // ===== 3. PICKUP TIME =====
    // STATE: the picup time and the hidden calender input
    const [readyAt, setReadyAt] = useState(toInput(job.ready_at));
    const pickerRef = useRef(null);


    // UPDATE (Admin+Foreman): Save pickup time when picked
    function saveReady(value) {
        setReadyAt(value);
        api('/jobs/' + job.id + '/ready', token, 'PUT', { ready_at: value ? new Date(value).toISOString() : null }).then(reload);
    }


    // ==== 4. QUOTATION + EXTRAS =====
    //STATE: quotation panel open/closed, main job parts + labour, the new extra being typed
    const [showQuote, setShowQuote] = useState(false);
    const [quote, setQuote] = useState(job.quote);
    const [labour, setLabour] = useState(job.labour);
    const [newDesc, setNewDesc] = useState('');
    const [newParts, setNewParts] = useState('');
    const [newLabour, setNewLabour] = useState('');


    // UPDATE (Admin): Save the quotation (main job parts + labour)
    function saveQuote() {
        api('/jobs/' + job.id + '/quote', token, 'PUT', { quote: Number(quote), labour: Number(labour) }).then(reload);
    }


    // CREATE (Admin): add an extra
    function addExtra() {
        api('/jobs/' + job.id + '/extras', token, 'POST', { description: newDesc, parts: Number(newParts), labour: Number(newLabour) })
            .then(() => { setNewDesc(''); setNewParts(''); setNewLabour(''); reload(); });
    }


    // DELETE (Admin): remove one extra
    function removeExtra(id) {
        api('/extras/' + id, token, 'DELETE').then(reload)
    }


    // FOREMAN: split the extras by customer's decision
    const approved = job.extras.filter(extra => extra.decision === 'Approved');
    const waiting = job.extras.filter(extra => extra.decision === 'Pending');
    const declined = job.extras.filter(extra => extra.decision === 'Declined');

    // ===== SCREEN: What one car row look like =====
    return <div className={'job edge-' + COLOURS[job.status]}>

        {/* 1. JOBS: car info */}
        <div>
            <div className="title">{job.service_type} · {job.car_model}</div>
            <div className="muted"><span className="plate">{job.plate_number}</span> {job.customer_name} · {job.phone_number}</div>
        </div>

        {/* Row 1: status (1), pickup (3), quotation (4), delete (1) */}
        <div className="actions">
            <select className={'status ' + COLOURS[job.status]} value={job.status} onChange={e => save(e.target.value)}>
                {STATUSES.map(name => <option key={name}>{name}</option>)}
            </select>
            <div className="pickup-time">
                <button type="button" className="small" onClick={() => pickerRef.current.showPicker()}>
                    {readyAt ? 'Pickup: ' + new Date(readyAt).toLocaleString('en-MY', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'Set pickup time'}
                </button>
                <input ref={pickerRef} className="hidden-picker" type="datetime-local" value={readyAt} onChange={e => saveReady(e.target.value)} />
            </div>
            {role === 'Admin' ? <button className="small" onClick={() => setShowQuote(!showQuote)}>Quotation</button> : null}
            {role === 'Admin' && job.status !== 'Collected' ? <button className="small danger icon" onClick={remove} aria-label="Delete job" title="Delete job">🗑</button> : null}
        </div>

        {/* 1. JOBS (Admin): note for the customer */}
        {role === 'Admin' ? <div className="note-row">
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Note for the customer" />
            <button className="small" onClick={() => save(job.status)}>Save</button>
        </div> : null}

        {/* 4. QUOTATION (Admin): main job + extras */}
        {role === 'Admin' && showQuote ? <div className="quote">
            <div className="item"><span className="muted">Main job</span><strong>{job.service_type}</strong></div>
            <label>Parts (RM)<input type="number" value={quote} onChange={e => setQuote(e.target.value)} /></label>
            <label>Labour (RM)<input type="number" value={labour} onChange={e => setLabour(e.target.value)} /></label>
            <button className="small" onClick={saveQuote}>Save</button>

            {/* Extra found: one line each, with the customer's decision */}
            <div className="extras">
                <span className="muted">Extra work found</span>
                {job.extras.map(extra => <div key={extra.id} className="extra">
                    <span>{extra.description}</span>
                    <span>RM {Number(extra.parts).toFixed(2)}</span>
                    <span>RM {Number(extra.labour).toFixed(2)}</span>
                    <span className={'badge badge-' + extra.decision.toLowerCase()}>{extra.decision}</span>
                    <button className="small danger icon" onClick={() => removeExtra(extra.id)} aria-label="Remove extra">🗑</button>
                </div>)}

                {/* Add a new extra */}
                <div className="extra">
                    <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Describe the extra work" />
                    <input type="number" value={newParts} onChange={e => setNewParts(e.target.value)} placeholder="Parts" />
                    <input type="number" value={newLabour} onChange={e => setNewLabour(e.target.value)} placeholder="Labour" />
                    <button className="small" onClick={addExtra}>+ Add</button>
                </div>
            </div>
        </div> : null}

        {/* 4. QUOTATION (Foreman): the work the customer has agreed to */}
        {role === 'Foreman' ? <div className="work">
            <div><strong>Complete this work:</strong> {[job.service_type, ...approved.map(extra => extra.description)].join(' · ')}</div>
            {waiting.length ? <div className="muted">Waiting for customer: {waiting.map(extra => extra.description).join(' · ')}</div> : null}
            {declined.length ? <div className="muted">Not approved: {declined.map(extra => extra.description).join(' · ')}</div> : null}
        </div> : null}
    </div>;
}


// ===== PAGE (Staff): Sign in, board, add jobs =====
export default function StaffPage() {
    // ===== LOGIN =====
    // STATE: the key card, role and the sign-in form
    const [token, setToken] = useState(sessionStorage.getItem('token') || '');
    const [role, setRole] = useState(sessionStorage.getItem('role') || '');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');

    // LOGIN: get the key card and remember it in this browser tab
    function signIn(event) {
        event.preventDefault();
        api('/login', '', 'POST', { email: email, password: password })
            .then(data => {
                sessionStorage.setItem('token', data.access_token);
                sessionStorage.setItem('role', data.role);
                setToken(data.access_token);
                setRole(data.role);
            })
            .catch(() => setMessage('Sign in failed.'));
    }


    // LOGOUT: forget the key card and go back to the sign-in form
    function signOut(text = '') {
        sessionStorage.clear();
        setToken('');
        setRole('');
        setJobs([]);
        setPassword('');
        setMessage(text);
    }


    // ===== 1. JOBS =====
    // STATE: the list, Active/Completed tab, the + Job form
    const [jobs, setJobs] = useState([]);
    const [view, setView] = useState('active');
    const [form, setForm] = useState(EMPTY);
    const [showForm, setShowForm] = useState(false);


    // READ (Staff): load the list (log out if the key card has expired)
    function load() {
        api('/jobs?view=' + view, token)
            .then(data => setJobs(data))
            .catch(() => signOut('Session expired. Please sign in again'));
    }

    // AUTO: reload when signed in or the tab changes
    useEffect(() => {
        if (token) load();
    }, [token, view]);


    // CREATE (Admin): Add a new job
    function addJob(event) {
        event.preventDefault();
        api('/jobs', token, 'POST', form)
            .then(() => { setForm(EMPTY); setShowForm(false); load(); })
            .catch(() => setMessage('Could not add. Fill every box.'));
    }


    // ===== FILTERS =====
    // STATE: what the staff has chosen to see
    const [statusFilter, setStatusFilter] = useState('All');
    const [modelFilter, setModelFilter] = useState('All');
    const [search, setSearch] = useState('');


    // ===== SCREEN: sign-in form (not signed in) =====
    if (!token) return <section className="narrow track">
        <h1>Staff sign in</h1>
        <form onSubmit={signIn}>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
            <button>Sign in</button>
        </form>
        <p className="muted">{message}</p>
    </section>;

    // FILTER: car models for the dropdown (no repeats, A to Z)
    const models = [...new Set(jobs.map(job => job.car_model))].sort();

    // FILTER: only the cars that pass all 3 checls ( a typed plate searches every status)
    const shown = jobs.filter(job =>
        (search !== '' || statusFilter === 'All' || job.status === statusFilter) &&
        (modelFilter === 'All' || job.car_model === modelFilter) &&
        job.plate_number.includes(search.toUpperCase().replace(/\s/g, ''))
    );

    // ===== SCREEN: The board (signed-in) =====
    return <section>

        {/* LOGIN: Who is signed in, and Log out */}
        <div className="row account">
            <span className="muted">Signed in as {role}</span>
            <button className="small" onClick={() => signOut()}>Log out</button>
        </div>

        {/* 1. JOBS: Summary card (car count) + FILTERS: status buttons) */}
        <div className="hero">
            <p>Workshop Job Tracker</p>
            <div className="big">{jobs.length} cars</div>
            <p>{view === 'active' ? 'in the workshop now' : 'collected'}</p>
            <div className="row">
                {['All', ...STATUSES.slice(0, 5)].map(name =>
                    <button key={name} className={'chip' + (statusFilter == name ? ' on' : '')} onClick={() => setStatusFilter(name)}>
                        {name} {name === 'All' ? jobs.length : jobs.filter(job => job.status === name).length}
                    </button>
                )}
            </div>
        </div>

        {/* 1. JOBS (Admin): + Job button and new-job form */}
        {role === 'Admin' ? <button className="add" onClick={() => setShowForm(!showForm)}>+ Job</button> : null}
        {showForm ? <form className="panel" onSubmit={addJob}>
            <input value={form.plate_number} onChange={e => setForm({ ...form, plate_number: e.target.value })} placeholder="Plate" />
            <input value={form.car_model} onChange={e => setForm({ ...form, car_model: e.target.value })} placeholder="Car model" />
            <input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} placeholder="Customer name" />
            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Phone" />
            <input value={form.service_type} onChange={e => setForm({ ...form, service_type: e.target.value })} placeholder="Service" />
            <button>Add job</button>
        </form> : null}
        <p className="muted">{message}</p>

        {/* 1. JOBS: Active/Completed tabs + FILTERS: model and plate search */}
        <div className="toolbar">
            <nav className="row tabs">
                <button className={view === 'active' ? 'on' : ''} onClick={() => { setView('active'); setStatusFilter('All'); }}>Active</button>
                <button className={view === 'completed' ? 'on' : ''} onClick={() => { setView('completed'); setStatusFilter('All'); }}>Completed</button>
            </nav>
            <div className="row filters">
                <select value={modelFilter} onChange={e => setModelFilter(e.target.value)}>
                    <option value="All">All models</option>
                    {models.map(model => <option key={model}>{model}</option>)}
                </select>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search plate" maxLength={12} />
            </div>
        </div>

        {/* FILTERS: nothing matches */}
        {shown.length === 0 ? <p className="muted">No car match. Try All or clear search.</p> : null}

        {/* 1. JOBS: the list of cars (one JobRow each) */}
        {shown.map(job => <JobRow key={job.id} job={job} token={token} reload={load} role={role} />)}
    </section>;
}
