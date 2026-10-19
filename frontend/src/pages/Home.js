import React from 'react';

function Home() {
  return (
    <div>
      <ul className="nav-list">
        <li><a href="/">Home</a></li>
        <li><a href="/produk">Produk</a></li>
        <li><a href="/kategori">Kategori</a></li>
      </ul>
      <h2 className="page-title">Halaman Home</h2>
      <p>Selamat datang di Aplikasi Fallback Mechanism Frontend React JS.</p>
      <p>Silakan klik menu <a href="/kategori" style={{ color: '#0066cc', textDecoration: 'underline' }}>Kategori</a> untuk menguji mekanisme fallback.</p>
    </div>
  );
}

export default Home;
