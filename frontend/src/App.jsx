import React, { useState, useEffect } from 'react';
import Kategori from './pages/Kategori';
import Home from './pages/Home';
import Produk from './pages/Produk';

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Handler intercepting link clicks for SPA feel without reloading
  useEffect(() => {
    const handleClick = (e) => {
      const target = e.target.closest('a');
      if (target && target.getAttribute('href')?.startsWith('/')) {
        e.preventDefault();
        const href = target.getAttribute('href');
        window.history.pushState({}, '', href);
        setCurrentPath(href);
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Router
  if (currentPath === '/kategori') {
    return <Kategori />;
  }

  if (currentPath === '/produk') {
    return <Produk />;
  }

  // Default route: if root or any other path, render Kategori (or Home)
  // To allow localhost:3000/kategori as well as default landing
  return <Kategori />;
}

export default App;
