import React from 'react';

function Produk() {
  return (
    <div>
      <ul className="nav-list">
        <li><a href="/">Home</a></li>
        <li><a href="/produk">Produk</a></li>
        <li><a href="/kategori">Kategori</a></li>
      </ul>
      <h2 className="page-title">Halaman Produk</h2>
      <p>Daftar produk inventaris.</p>
    </div>
  );
}

export default Produk;
