import { createRoot } from 'react-dom/client';
import { App } from './components/App';

const rootEl = document.getElementById('react-root');
if (rootEl) {
  const root = createRoot(rootEl);
  root.render(<App />);
}
