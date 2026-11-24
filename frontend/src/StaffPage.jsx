// Tools I need
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


// ROW: One car in the list (JowRow)
function JobRow({ job, token, reload, role }) {
    const [notes, setNotes] = useState(job.notes);
    const [quote, setQuote] = useState(job.quote);
    const [extraQuote, setExtraQuote] = useState(job.extra_quote);
    const [extraReason, setExtraReason] = useState(job.extra_reason);
    const [showQuote, setShowQuote] = useState(false);
    const [readyAt, setReadyAt] = useState(toInput(job.ready_at));
    const pickerRef = useRef(null);


    // UPDATE (Admin + Foreman): Save status (Admin saves the note)
    function save(status) {
        api('/jobs/' + job.id, token, 'PUT', { status: status, notes: notes }).then(reload);
    }


    // UPDATE (Admin): Save the quotation
    function saveQuote() {
        api('/jobs/' + job.id + '/quote', token, 'PUT', { quote: Number(quote), extra_quote: Number(extraQuote), extra_reason: extraReason }).then(reload);
    }


    // UPDATE (Admin+Foreman): Save pickup time when picked
    function saveReady(value) {
        setReadyAt(value);
        api('/jobs/' + job.id + '/ready', token, 'PUT', { ready_at: value ? new Date(value).toISOString() : null }).then(reload);
    }

    // DELETE (Admin): remove this job
    function remove() {
        api('/jobs/' + job.id, token, 'DELETE').then(reload);
    }


    // SCREEN: What one car row look like
    return <div className={'job edge-' + COLOURS[job.status]}>
        <div>
            <div className="title">{job.service_type} · {job.car_model}</div>
            <div className="muted"><span className="plate">{job.plate_number}</span> {job.customer_name} · {job.phone_number}</div>
        </div>
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

// PAGE (Staff): Sign in, board, add jobs
export default function StaffPage() {
    const [token, setToken] = useState(sessionStorage.getItem('token') || '');
    const [role, setRole] = useState(sessionStorage.getItem('role') || '');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [form, setForm] = useState(EMPTY);
    const [view, setView] = useState('active');
    const [jobs, setJobs] = useState([]);
    const [message, setMessage] = useState('');
    const [showForm, setShowForm] = useState(false);
    // FILTER: What the staff has chosen to see
    const [statusFilter, setStatusFilter] = useState('All');
    const [modelFilter, setModelFilter] = useState('All');
    const [search, setSearch] = useState('');

    // READ (Staff): Load the list
    function load() {
        api('/jobs?view=' + view, token)
        .then(data => setJobs(data))
        .catch(() => signOut('Session expired. Please sign in again'));
    }

    // AUTO: reload when signed in or the tab changes
    useEffect(() => {
        if (token) load();
    }, [token, view]);

    // LOGIN: get the key card
    function signIn(event) {
        event.preventDefault();
        api('/login', '', 'POST', { email: email, password: password })
            .then(data => { 
                sessionStorage.setItem('token', data.access_token);
                sessionStorage.setItem('role', data.role);
                setToken(data.access_token); 
                setRole(data.role); })
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

    // CREATE (Admin): Add a new job
    function addJob(event) {
        event.preventDefault();
        api('/jobs', token, 'POST', form)
            .then(() => { setForm(EMPTY); setShowForm(false); load(); })
            .catch(() => setMessage('Could not add. Fill every box.'));
    }

    // SCREEN: Sign-in form (not signed-in)
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

    // FILTER: on the cars that pass all 3 checls ( a typed plate searches every status)
    const shown = jobs.filter(job =>
        (search !== '' || statusFilter === 'All' || job.status === statusFilter) &&
        (modelFilter === 'All' || job.car_model === modelFilter) &&
        job.plate_number.includes(search.toUpperCase().replace(/\s/g, ''))
    );

    // SCREEN: The board (signed-in)
    return <section>
        {/* SCREEN: Who is signed in, and Log out */}
        <div className="row account">
            <span className="muted">Signed in as {role}</span>
            <button className="small" onClick={() => signOut()}>Log out</button>
        </div>

        {/* SCREEN: Summary card (Car count, status chips) */}
        <div className="hero">
            <p>Workshop Job Tracker</p>
            <div className="big">{jobs.length} cars</div>
            <p>{view === 'active' ? 'in the workshop now' : 'collected'}</p>
            <div className="row">
                {['All', ...STATUSES.slice(0, 5)].map(name=>
                    <button key={name} className={'chip' + (statusFilter == name ? ' on' : '')} onClick={() => setStatusFilter(name)}>
                       {name} {name === 'All' ? jobs.length : jobs.filter(job => job.status === name).length} 
                    </button>
                )}
            </div>
        </div>

        {/* SCREEN (Admin): + Job button and new-job form */}
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

        {/* SCREEN: tabs on the left, filters on the right */}
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

        {/* SCREEN: Nothing matches */}
        {shown.length === 0 ? <p className="muted">No car match. Try All or clear search.</p> : null}

        {/* SCREEN: The list of cars */}
        {shown.map(job => <JobRow key={job.id} job={job} token={token} reload={load} role={role} />)}
    </section>;
}
