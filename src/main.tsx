import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('애플리케이션 루트 요소를 찾지 못했습니다.');

createRoot(rootElement).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
