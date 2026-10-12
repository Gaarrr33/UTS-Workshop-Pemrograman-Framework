// App State
let currentTransferId = null;
let currentEncryptedData = null;

// Format Rupiah
function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount);
}

// Show Alert
function showAlert(title, message, type = 'info') {
  const alertBox = document.getElementById('alertBox');
  const alertTitle = document.getElementById('alertTitle');
  const alertMessage = document.getElementById('alertMessage');

  alertTitle.innerText = title;
  alertMessage.innerText = message;
  alertBox.className = `alert-box ${type}`;
  alertBox.classList.remove('hidden');

  setTimeout(() => {
    alertBox.classList.add('hidden');
  }, 6000);
}

// Update Stage Indicator
function setStepState(stepNum, state, text) {
  const stepEl = document.getElementById(`step${stepNum}`);
  const badgeEl = document.getElementById(`badgeStep${stepNum}`);
  
  stepEl.className = 'pipeline-step';
  badgeEl.className = 'badge';

  if (state === 'active') {
    stepEl.classList.add('active');
    badgeEl.classList.add('active');
  } else if (state === 'completed') {
    stepEl.classList.add('completed');
    badgeEl.classList.add('success');
  } else if (state === 'error') {
    stepEl.classList.add('error');
    badgeEl.classList.add('danger');
  }

  badgeEl.innerText = text;
}

// Reset Pipeline Status
function resetPipeline() {
  setStepState(1, 'waiting', 'Menunggu');
  setStepState(2, 'waiting', 'Menunggu');
  setStepState(3, 'waiting', 'Menunggu');
  setStepState(4, 'waiting', 'Menunggu');
}

// Check Health of Server A & B
async function checkHealth() {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();

    const pillA = document.getElementById('statusServerA');
    if (data.upstream.serverA === 'UP') {
      pillA.className = 'status-pill online';
      pillA.querySelector('.state').innerText = 'Online';
    } else {
      pillA.className = 'status-pill offline';
      pillA.querySelector('.state').innerText = 'Offline';
    }

    const pillB = document.getElementById('statusServerB');
    if (data.upstream.serverB === 'UP') {
      pillB.className = 'status-pill online';
      pillB.querySelector('.state').innerText = 'Online';
    } else {
      pillB.className = 'status-pill offline';
      pillB.querySelector('.state').innerText = 'Offline';
    }
  } catch (err) {
    console.error('Health check error:', err);
  }
}

// Load DB A Products
async function loadSourceProducts() {
  const container = document.getElementById('sourceProductsList');
  const countBadge = document.getElementById('countDbA');

  try {
    const res = await fetch('/api/source/products');
    const json = await res.json();

    if (!json.success || !json.data.length) {
      container.innerHTML = '<p class="placeholder-text">Database A kosong. Klik "Reset/Seed DB A".</p>';
      countBadge.innerText = '0 Produk';
      return;
    }

    countBadge.innerText = `${json.data.length} Produk`;
    container.innerHTML = json.data.map(p => `
      <div class="product-item">
        <img class="product-img" src="${p.foto_produk}" alt="${p.nama_produk}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'50\\' height=\\'50\\'><rect width=\\'100%\\' height=\\'100%\\' fill=\\'%231e293b\\'/></svg>'">
        <div class="product-info">
          <div class="product-title">#${p.id} ${p.nama_produk}</div>
          <div class="product-category">Kategori: <strong>${p.nama_kategori}</strong> (ID: ${p.id_kategori})</div>
          <div class="product-price">${formatRupiah(p.harga_produk)}</div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<p class="placeholder-text error">Gagal memuat DB A: ${err.message}</p>`;
  }
}

// Load Transfer History
async function loadTransferHistory() {
  const tbody = document.getElementById('transfersTableBody');
  try {
    const res = await fetch('/api/receiver/transfers');
    const json = await res.json();

    if (!json.success || !json.data.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center">Belum ada riwayat transfer di DB B.</td></tr>';
      return;
    }

    tbody.innerHTML = json.data.map(t => `
      <tr>
        <td><strong>#${t.id}</strong></td>
        <td><code>${t.transferUuid.substring(0, 18)}...</code></td>
        <td><span class="mono-value">${t.algorithm.symmetric || 'AES-256-GCM'}</span></td>
        <td>${t.ciphertextSizeChars} karakter</td>
        <td><span class="badge success">${t.status}</span></td>
        <td>${new Date(t.createdAt).toLocaleTimeString()}</td>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="fetchTransferDetails(${t.id})">Lihat (GET)</button>
          <button class="btn btn-sm btn-success" onclick="decryptSpecificTransfer(${t.id})">Dekripsi</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load history:', err);
  }
}

// TAHAP 1 & 2: Start Transfer from DB A to DB B
async function runEncryptedTransfer() {
  resetPipeline();
  setStepState(1, 'active', 'Mengenkripsi & Mengirim...');

  try {
    const res = await fetch('/api/transfers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    const json = await res.json();

    if (!res.ok) {
      setStepState(1, 'error', 'Gagal');
      throw new Error(json.message || 'Transfer gagal');
    }

    // Step 1 done
    setStepState(1, 'completed', 'Terkirim Terenkripsi');
    // Step 2 done (saved into DB B)
    setStepState(2, 'completed', 'Tersimpan di DB B');

    currentTransferId = json.serverBResponse.transferId;
    showAlert('Transfer Berhasil!', `Data dari DB A telah dienkripsi dengan AES-256-GCM + RSA-OAEP dan disimpan ke DB B dengan ID #${currentTransferId}`, 'success');

    // Auto fetch the newly stored package
    await fetchTransferDetails(currentTransferId);
    await loadTransferHistory();
  } catch (err) {
    showAlert('Kesalahan Transfer', err.message, 'danger');
  }
}

// TAHAP 3: Get Encrypted Package from DB B
async function fetchTransferDetails(id = currentTransferId) {
  if (!id) {
    showAlert('Peringatan', 'Silakan pilih atau jalankan transfer terlebih dahulu.', 'danger');
    return;
  }

  setStepState(3, 'active', 'Mengambil dari DB B...');

  try {
    const res = await fetch(`/api/receiver/transfers/${id}`);
    const json = await res.json();

    if (!res.ok) {
      setStepState(3, 'error', 'Gagal');
      throw new Error(json.message || 'Gagal mengambil paket');
    }

    currentTransferId = id;
    currentEncryptedData = json.encryptedPackage;

    // Display in DB B panel
    document.getElementById('metaTransferId').innerText = `#${json.transferId} (${json.status})`;
    document.getElementById('metaAlgo').innerText = `${json.encryptedPackage.algorithm.symmetric} / ${json.encryptedPackage.algorithm.hash}`;
    document.getElementById('metaIv').innerText = json.encryptedPackage.iv;
    document.getElementById('metaAuthTag').innerText = json.encryptedPackage.authTag;
    document.getElementById('metaEncryptedKey').innerText = json.encryptedPackage.encryptedKey;
    document.getElementById('metaCiphertext').innerText = json.encryptedPackage.ciphertext;
    document.getElementById('ciphertextSize').innerText = `${json.encryptedPackage.ciphertext.length} chars`;

    setStepState(3, 'completed', 'Berhasil Diambil');
  } catch (err) {
    showAlert('Gagal Mengambil Data', err.message, 'danger');
  }
}

// TAHAP 4: Decrypt Package
async function decryptSpecificTransfer(id = currentTransferId) {
  if (!id) {
    showAlert('Peringatan', 'Silakan lakukan transfer atau pilih transfer dari riwayat terlebih dahulu.', 'danger');
    return;
  }

  setStepState(4, 'active', 'Mendekripsi & Verifikasi...');

  try {
    const res = await fetch(`/api/transfers/${id}/decrypt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ persistToDbB: true })
    });

    const json = await res.json();

    if (!res.ok) {
      setStepState(4, 'error', 'Ditolak');
      document.getElementById('badgeIntegrity').className = 'badge danger';
      document.getElementById('badgeIntegrity').innerText = 'Gagal / Ditolak';
      document.getElementById('decryptionSummary').style.display = 'none';
      document.getElementById('decryptedJsonViewer').innerText = `[ERROR DEKRIPSI DITOLAK]\n\n${json.message}\nDetail: ${JSON.stringify(json.details || {}, null, 2)}`;
      throw new Error(json.message);
    }

    setStepState(4, 'completed', 'Dekripsi Berhasil');

    document.getElementById('badgeIntegrity').className = 'badge success';
    document.getElementById('badgeIntegrity').innerText = 'Integritas Terverifikasi';
    document.getElementById('decryptionSummary').style.display = 'flex';
    document.getElementById('decryptedJsonViewer').innerText = JSON.stringify(json.decryptedData, null, 2);

    showAlert('Dekripsi Sukses!', 'Payload berhasil didekripsi menggunakan Private Key Server B dan integritas terverifikasi via GCM Auth Tag.', 'success');
  } catch (err) {
    showAlert('Dekripsi Gagal', err.message, 'danger');
  }
}

// Uji Tampering (Modifikasi Ciphertext)
async function testTampering() {
  if (!currentTransferId || !currentEncryptedData) {
    showAlert('Perhatian', 'Jalankan transfer terlebih dahulu sebelum menguji manipulasi ciphertext.', 'danger');
    return;
  }

  showAlert('Memulai Uji Tampering', 'Mengirimkan ciphertext yang telah dimanipulasi ke endpoint dekripsi Server B...', 'info');

  // Manipulasi string ciphertext (mengubah beberapa karakter terakhir)
  const original = currentEncryptedData.ciphertext;
  const tampered = original.substring(0, original.length - 8) + 'AAAA' + original.substring(original.length - 4);

  try {
    const res = await fetch(`/api/transfers/${currentTransferId}/decrypt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tamperCiphertext: tampered
      })
    });

    const json = await res.json();

    if (!res.ok) {
      // Diharapkan gagal karena Auth Tag AES-256-GCM mendeteksi pemalsuan
      setStepState(4, 'error', 'Tampering Ditolak');
      document.getElementById('badgeIntegrity').className = 'badge danger';
      document.getElementById('badgeIntegrity').innerText = 'Integritas Gagal (Tampering)';
      document.getElementById('decryptionSummary').style.display = 'none';
      document.getElementById('decryptedJsonViewer').innerText = `[UJI TAMPERING BERHASIL: CIPHERTEXT PALSU DITOLAK]\n\nStatus HTTP: ${res.status} (Unprocessable Entity)\nAlasan: ${json.message}\nDetail Error: ${json.details || 'Autentikasi GCM gagal'}\n\n-> Sistem kriptografi terbukti menolak perubahan data tanpa autentikasi!`;

      showAlert('Tampering Terdeteksi & Ditolak!', 'Sistem menolak payload yang dimodifikasi karena authentication tag AES-256-GCM tidak cocok.', 'success');
    } else {
      showAlert('Uji Gagal', 'Ciphertext yang dimodifikasi justru berhasil didekripsi! (Ada celah keamanan)', 'danger');
    }
  } catch (err) {
    showAlert('Error Uji Tampering', err.message, 'danger');
  }
}

// Uji Kunci Privat Salah
async function testWrongKey() {
  if (!currentTransferId) {
    showAlert('Perhatian', 'Jalankan transfer terlebih dahulu sebelum menguji kunci privat salah.', 'danger');
    return;
  }

  showAlert('Memulai Uji Kunci Salah', 'Mencoba membuka kunci AES dengan RSA Private Key asing yang tidak berwenang...', 'info');

  // Private key RSA palsu / dummy
  const dummyPrivateKey = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7r7qFj5758W...
-----END PRIVATE KEY-----`;

  try {
    const res = await fetch(`/api/transfers/${currentTransferId}/decrypt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        overridePrivateKey: dummyPrivateKey
      })
    });

    const json = await res.json();

    if (!res.ok) {
      setStepState(4, 'error', 'Kunci Ditolak');
      document.getElementById('badgeIntegrity').className = 'badge danger';
      document.getElementById('badgeIntegrity').innerText = 'Kunci Tidak Berwenang';
      document.getElementById('decryptionSummary').style.display = 'none';
      document.getElementById('decryptedJsonViewer').innerText = `[UJI KUNCI SALAH BERHASIL DITOLAK]\n\nStatus HTTP: ${res.status}\nPesan: ${json.message}\n\n-> Hanya Server B yang memiliki Private Key resmi yang dapat membuka AES key!`;

      showAlert('Kunci Salah Ditolak!', 'Dekripsi gagal seperti yang diharapkan karena Private Key tidak cocok.', 'success');
    }
  } catch (err) {
    showAlert('Error Uji Kunci', err.message, 'danger');
  }
}

// Reset/Seed DB A
async function seedDatabaseA() {
  try {
    const res = await fetch('/api/source/seed', { method: 'POST' });
    const json = await res.json();
    if (json.success) {
      showAlert('Seed Berhasil', `DB A berhasil diisi: ${json.categoriesCount} kategori, ${json.productsCount} produk.`, 'success');
      await loadSourceProducts();
    }
  } catch (err) {
    showAlert('Gagal Seed DB A', err.message, 'danger');
  }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  checkHealth();
  loadSourceProducts();
  loadTransferHistory();

  document.getElementById('btnTransfer').addEventListener('click', runEncryptedTransfer);
  document.getElementById('btnFetchDbB').addEventListener('click', () => fetchTransferDetails());
  document.getElementById('btnDecrypt').addEventListener('click', () => decryptSpecificTransfer());
  document.getElementById('btnTamperTest').addEventListener('click', testTampering);
  document.getElementById('btnWrongKeyTest').addEventListener('click', testWrongKey);
  document.getElementById('btnSeedDbA').addEventListener('click', seedDatabaseA);
  document.getElementById('btnRefreshHistory').addEventListener('click', loadTransferHistory);
});
