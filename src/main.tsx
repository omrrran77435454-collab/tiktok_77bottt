import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/document.css';
import './styles/print.css';

const container = document.getElementById('root');
if (!container) throw new Error('لم يُعثر على عنصر الجذر #root');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
