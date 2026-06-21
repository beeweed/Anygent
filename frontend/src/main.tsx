import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import { AppProviders } from './contexts/app-providers';
import './index.css';

document.documentElement.classList.add('dark');

document.documentElement.style.colorScheme = 'dark';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
)