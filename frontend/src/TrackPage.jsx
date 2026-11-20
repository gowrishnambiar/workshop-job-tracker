// Tools I need
import { useState } from 'react';
import { COLOURS, SST_RATE } from './statuses.js';
import { api } from './api.js';


// Show money as RM with 2 decimels
function money(amount) {
    return 'RM ' + Number(amount).toFixed(2);
}


// The quotation
function QuoteBox({ job}) {
    const quote = Number(job.quote);
    const extra = Number(job.extra_quote);
    if (quote === 0) return <p className="muted">Quotation coming soon</p>;
    return <div className="quote-box">
        <h3>Quotation</h3>
        <div className="line"><span>{job.service_type}</span><span>{money(quote)}</span></div>
        <div className="line muted"><span>SST 8%</span><span>{money(quote * SST_RATE)}</span></div>
        <div className="line total"><span>Total</span><span>{money(quote * (1 + SST_RATE))}</span></div>
        {extra > 0 ? <div>
            <h3>Extra work found</h3>
            <div className="line"><span>{job.extra_reason}</span><span>{money(extra)}</span></div>
            <div className="line muted"><span>SST 8%</span><span>{money(extra * SST_RATE)}</span></div>
            <div className="line total"><span>Extra total</span><span>{money(extra * (1 + SST_RATE))}</span></div>
            <p>Your Decision: <strong>{job.extra_decision}</strong></p>
        </div> : null}
    </div>;
}


// The customer page
export default function TrackPage() {
    const [plate, setPlate] = useState('');
    const [last4, setLast4] = useState('');
    const [job, setJob] = useState(null);
    const [message, setMessage] = useState('');

// Check button: ask the backend
function check(event) {
    event.preventDefault();
    setMessage('Checking...');
    api('/track', '', 'POST', {plate_number: plate.trim(), last4: last4 })
        .then(data => {setJob(data); setMessage(''); })
        .catch(() => {setJob(null); setMessage('No job found for this plate.'); });
}    

// What the customer sees
return <section className="narrow track">
    <h1>Where is my car?</h1>
    <form onSubmit={check}>
        <input value={plate} onChange={e => setPlate(e.target.value)} placeholder="Plate Number" />
        <input value={last4} onChange={e => setLast4(e.target.value)} placeholder="Last 4 digit of your phone number" maxLength={4} inputMode="numeric" />
        <button>Check</button>
    </form>
    <p className="muted">{message}</p>
    {job ? <div className="panel">
        <h2> Hi {job.customer_name}, here's your update</h2>
        <div className={'banner ' + COLOURS[job.status]}><strong>{job.status}</strong></div>
        <p>{job.plate_number} · {job.car_model}</p>
        {job.notes ? <p>Note: {job.notes}</p> :null}
        <QuoteBox job={job} />
        <p className="muted">Updated at {new Date(job.updated_at).toLocaleString('en-MY')}</p>
    </div> : null}
</section>
}