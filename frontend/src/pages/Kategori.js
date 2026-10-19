import axios from 'axios';
import React, { useEffect, useState } from 'react';

function Kategori() {
  const [kategori, setKategori] = useState([]);

  useEffect(() => {
    const serverA = 'http://localhost:4000/api/kategori/';
    const serverB = 'http://localhost:3100/apiserverb/kategori/';

    axios.get(serverA)
      .then(res => res.data.status && setKategori(res.data.data))
      .catch(err => {
        axios.get(serverB)
          .then(res => res.data.status && setKategori(res.data.data))
          .catch(err => {
            console.error('Kedua server gagal:', err);
          });
      });
  }, []);

  return (
    <div>
      <ul className="nav-list">
        <li><a href="/">Home</a></li>
        <li><a href="/produk">Produk</a></li>
        <li><a href="/kategori">Kategori</a></li>
      </ul>

      <h2 className="page-title">Data kategori</h2>

      <table className="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Nama</th>
          </tr>
        </thead>
        <tbody>
          {kategori.map((item, index) => (
            <tr key={index}>
              <td>{item.id || item.id_kategori}</td>
              <td>{item.nama_kategori || item.nama}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Kategori;
