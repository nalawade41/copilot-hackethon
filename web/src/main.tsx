import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { initCornerstone } from './lib/common/cornerstone-init.ts';
import './index.css';

async function bootstrap() {
  await initCornerstone();

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

bootstrap();
