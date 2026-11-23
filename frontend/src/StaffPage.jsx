// Tools I need
import { useState, useEffect, useRef } from 'react';
import { STATUSES, COLOURS } from './statuses.js';
import { api } from './api.js';

// A blank new-job form
const EMPTY = { plate_number: '', car_model: '', customer_name: '', phone: '', service_type: '' };


// Pick up time: turn the saved time into a picker's format (Malaysia time)
function toInput(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
}


// One car in the list
function JobRow({ job, token, reload, role }) {
    const [notes, setNotes] = useState(job.notes);
    const [quote, setQuote] = useState(job.quote);
    const [extraQuote, setExtraQuote] = useState(job.extra_quote);
    const [extraReason, setExtraReason] = useState(job.extra_reason);
    const [showQuote, setShowQuote] = useState(false);
    const [readyAt, setReadyAt] = useState(toInput(job.ready_at));
    const pickerRef = useRef(null);


// UPDATE: save status and note
function save(status) {
    api('/jobs/' + job.id, token, 'PUT', { status: status, notes: notes }).then(reload);
}


// ADMIN: save the quotes
function saveQuote() {
    api('/jobs/' + job.id + '/quote', token, 'PUT', { quote: Number(quote), extra_quote: Number(extraQuote), extra_reason: extraReason}).then(reload);
}


// ADMIN/FOREMAN: save pickup time
// Save pickup time: runs as soon as a date and time are picked
function saveReady(value) {
    setReadyAt(value);
    api('/jobs/' + job.id + '/ready', token, 'PUT', { ready_at: value ? new Date(value).toISOString() : null }).then(reload);
}

// DELETE: remove this job
function remove() {
    api('/jobs/' + job.id, token, 'DELETE').then(reload);
}


// What one row looks like
return <div className={'job edge-' + COLOURS[job.status]}>
    <div>
        <div className="title">{job.service_type} · {job.car_model}</div>
        <div className="muted"><span className="plate">{job.plate_number}</span> {job.customer_name} · {job.phone_number}</div>
    </div>
    <div className="actions">
        <select className={'status ' + COLOURS[job.status]} value={job.status} onChange={e => save(e.target.value)}>
            {STATUSES.map(name => <option key={name}>{name}</option>)}
        </select>
        <div className="ready">
            <button type="button" className="small" onClick={() => pickerRef.current.showPicker()}>
                {readyAt ? 'Pickup: ' + new Date(readyAt).toLocaleString('en-MY', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'Set pickup time'}
            </button>
            <input ref={pickerRef} className="hidden-picker" type="datetime-local" value={readyAt} onChange={e => saveReady(e.target.value)} />
        </div>
        {role === 'Admin' ? <button className="small" onClick={() => setShowQuote(!showQuote)}>Quotation</button> : null}
        {role === 'Admin' && job.status !== 'Collected' ? <button className="small danger icon" onClick={remove} aria-label="Delete job" title="Delete job">🗑</button> : null}
    </div>
    {/* Second row: note for the customer, Admin only */}
    {role === 'Admin' ? <div className="note-row">
        <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Note for the customer" />
        <button className="small" onClick={() => save(job.status)}>Save</button>
    </div> : null}
    {role === 'Admin' && showQuote ? <div className="quote">
        <div className="item"><span className="muted">Item</span><strong>{job.service_type}</strong></div>
        <label>Quote (RM)<input type="number" value={quote} onChange={e => setQuote(e.target.value)} /></label>
        <label>Extra (RM)<input type="number" value={extraQuote} onChange={e => setExtraQuote(e.target.value)} /></label>
        <label>Extra damage found<input value={extraReason} onChange={e => setExtraReason(e.target.value)} /></label>
        <button className="small" onClick={saveQuote}>Save quote</button>
        <span className="muted">Customer: {job.extra_decision}</span>
    </div> : null}
</div>;
}

// The staff page
export default function StaffPage() {
    const [token, setToken] = useState('');
    const [role, setRole] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [form, setForm] = useState(EMPTY);
    const [view, setView] = useState('active');
    const [jobs, setJobs] = useState([]);
    const [message, setMessage] = useState('');
    const [showForm, setShowForm] = useState(false);

// READ: load the list
function load() {
    api('/jobs?view=' + view, token).then(data => setJobs(data));
}

// Load the list when signed in or the tab changes
useEffect(() => {
    if (token) load();
}, [token, view]);

// Sign in: get the key card
function signIn(event) {
    event.preventDefault();
    api('/login', '', 'POST', { email: email, password: password })
        .then(data => { setToken(data.access_token); setRole(data.role); })
        .catch(() => setMessage('Sign in failed.'));
}

// CREATE: add a new job
function addJob(event) {
    event.preventDefault();
    api('/jobs', token, 'POST', form)
        .then(() => { setForm(EMPTY); setShowForm(false); load(); })
        .catch(() => setMessage('Could not add. Fill every box.'));
}

// Not signed in: show the sign-in form
if (!token) return <section className="narrow track">
    <h1>Staff sign in</h1>
    <form onSubmit={signIn}>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
        <button>Sign in</button>
    </form>
    <p className="muted">{message}</p>
</section>;

// Signed in: Show the board
return <section>
    <div className="hero">
        <p>Workshop Job Tracker</p>
        <div className="big">{jobs.length} cars</div>
        <p>{view === 'active' ? 'in the workshop now' : 'collected'}</p>
        <div className="row">
            {STATUSES.slice(0, 5).map(name => <span key={name} className="chip">{name} {jobs.filter(job => job.status === name).length}</span>)}
        </div>
    
    </div>
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
    <nav className="row tabs">
        <button className={view === 'active' ? 'on' : ''} onClick={() => setView('active')}>Active</button>
        <button className={view === 'completed' ? 'on' : ''} onClick={() => setView('completed')}>Completed</button>
    </nav>
    {jobs.map(job => <JobRow key={job.id} job={job} token={token} reload={load} role={role} />)}
</section>;
}
