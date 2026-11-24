// Tools I need
import { useState } from 'react';
import TrackPage from './TrackPage';
import StaffPage from './StaffPage';

// PAGE SWTICH: Track my car or Staff
export default function App() {
  const [page, setPage] = useState('track');
  return <main>
    <nav className="row tabs">
      <button className={page === 'track' ? 'on' : ''} onClick={() => setPage('track')}>Track My Car</button>
      <button className={page === 'staff' ? 'on' : ''} onClick={() => setPage('staff')}>Staff</button>
      </nav>
      {page === 'track' ? <TrackPage /> : <StaffPage />}
  </main>;
}