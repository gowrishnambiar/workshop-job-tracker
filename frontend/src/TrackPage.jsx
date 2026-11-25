// Tools I need
import { useState } from 'react';
import { COLOURS, SST_RATE } from './statuses.js';
import { api } from './api.js';


// HELPER: show money as RM with 2 decimals
function money(amount) {
    return 'RM ' + Number(amount).toFixed(2);
}

// HELPER: add up one price column (part / labour) of a extra list
function sum(list,field) {
    let total = 0;
    for (const extra of list) {
        total = total + Number(extra[field]);
    }
    return total;
}


// SCREEN: quotation box (main job + extras, SST on labour only)
function QuoteBox({ job, onDecide }) {
    const parts = Number(job.quote);
    const labour = Number(job.labour);
    if (parts + labour === 0) return <p className="muted">Quotation coming soon</p>;

    // Split the extras by the customer's decision
    const approved = job.extras.filter(extra => extra.decision === 'Approved');
    const waiting = job.extras.filter(extra => extra.decision === 'Pending');

    // Totals: main job + approved extras only. SST on labour only.
    const allParts = parts + sum(approved, 'parts');
    const allLabour = labour + sum(approved, 'labour');
    const sst = allLabour * SST_RATE;
    const toPay = allParts + allLabour + sst;

    // What the waiting extras would add, with their SST
    const waitingTotal = sum(waiting, 'parts') + sum(waiting, 'labour') * (1 + SST_RATE);

    return <div className="quote-box">
        <h3>Quotation</h3>

        {/* Main job */}
        <div className="q-item">
            <div className="line"><strong>{job.service_type}</strong></div>
            <div className="line muted"><span>Parts</span><span>{money(parts)}</span></div>
            <div className="line muted"><span>Labour</span><span>{money(labour)}</span></div>
        </div>

        {/* Extras: each with its decision, buttons only while waiting */}
        {job.extras.map(extra => <div key={extra.id} className="q-item">
            <div className="line">
                <strong>{extra.description}</strong>
                <span className={'badge badge-' + extra.decision.toLowerCase()}>{extra.decision === 'Pending' ? 'Your decision' : extra.decision}</span>
            </div>
            <div className="line muted"><span>Parts</span><span>{money(extra.parts)}</span></div>
            <div className="line muted"><span>Labour</span><span>{money(extra.labour)}</span></div>
            {extra.decision === 'Pending' ? <div className="row">
                <button onClick={() => onDecide(extra.id, 'Approved')}>Approve</button>
                <button className="danger" onClick={() => onDecide(extra.id, 'Declined')}>Decline</button>
            </div> : null}
        </div>)}

        {/* Totals: approved items only */}
        <div className="line total"><span>Parts</span><span>{money(allParts)}</span></div>
        <div className="line"><span>Labour</span><span>{money(allLabour)}</span></div>
        <div className="line muted"><span>SST 8% (on labour only)</span><span>{money(sst)}</span></div>
        <div className="line total grand"><span>Total to pay</span><span>{money(toPay)}</span></div>
        {waiting.length ? <p className="wait">+ {money(waitingTotal)} if you approve the items waiting for you</p> : null}
        <p className="muted">Only approved items are charged. Parts already include sales tax.</p>

        <button className="download" disabled>Download Quotation (coming soon)</button>
    </div>;
}


// PAGE (Customer): Track my car
export default function TrackPage() {
    const [plate, setPlate] = useState('');
    const [last4, setLast4] = useState('');
    const [job, setJob] = useState(null);
    const [message, setMessage] = useState('');


// READ (Customer): Check button and find my car
function check(event) {
    event.preventDefault();
    setMessage('Checking...');
    api('/track', '', 'POST', {plate_number: plate.trim(), last4: last4 })
        .then(data => {setJob(data); setMessage(''); })
        .catch(() => {setJob(null); setMessage('No job found for this plate.'); });
}    


// UPDATE (Customer): Approve or decline one extra
function decide(extraID, choice) {
    api('/track/extras/' + extraID + '/decision', '', 'POST', { plate_number: plate.trim(), last4: last4, decision: choice})
        .then(updated => setJob({ ...job, extras: job.extras.map(extra => extra.id === updated.id ? updated : extra) }))
        .catch(() => setMessage('Could not save your decision. Please try again.'));
} 


// SCREEN: What the customer sees
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
        <QuoteBox job={job} onDecide={decide} />
        {job.ready_at ? <p className="pickup">
            Ready for pickup: <strong>{new Date(job.ready_at).toLocaleString('en-MY', { weekday: 'long', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</strong>
        </p> : null}
        <p className="muted">Updated at {new Date(job.updated_at).toLocaleString('en-MY', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} </p>
    </div> : null}
</section>
}