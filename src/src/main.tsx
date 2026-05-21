import { createRoot } from 'react-dom/client'
import App from './App.tsx'

// StrictMode disabled — original prototype was Babel-standalone (no strict mode);
// double-mount breaks rAF animation loops.
createRoot(document.getElementById('root')!).render(<App />)
