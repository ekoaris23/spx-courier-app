import { db } from "./firebase-config.js";

let currentRole = null;
let chartInstance = null;

// Handling Login
document.getElementById("login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const role = document.getElementById("login-role").value;
  const pass = document.getElementById("login-password").value;

  // Password sederhana berdasarkan role
  let valid = false;
  if (role === "admin" && pass === "admin123") valid = true;
  if (role === "assistant" && pass === "asisten123") valid = true;
  if (role === "leader" && pass === "leader123") valid = true;

  if (valid) {
    currentRole = role;
    document.getElementById("user-role-badge").innerText = `Role: ${role.toUpperCase()}`;
    
    // Sembunyikan/Tampilkan Profit Owner hanya jika Login sebagai Admin/Owner
    if (currentRole === 'admin') {
      document.getElementById("admin-card-profit").classList.remove("hidden");
    } else {
      document.getElementById("admin-card-profit").classList.add("hidden");
    }

    document.getElementById("login-section").classList.add("hidden");
    document.getElementById("app-section").classList.remove("hidden");
    
    listenRealtimeData();
  } else {
    alert("Password salah untuk role yang dipilih!");
  }
});

// Logout
document.getElementById("logout-btn").addEventListener("click", () => {
  currentRole = null;
  document.getElementById("login-section").classList.remove("hidden");
  document.getElementById("app-section").classList.add("hidden");
});

// Form Input Pengiriman
document.getElementById("entry-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const date = document.getElementById("entry-date").value;
  const courier = document.getElementById("entry-courier").value;
  const standard = parseInt(document.getElementById("pkg-standard").value) || 0;
  const far = parseInt(document.getElementById("pkg-far").value) || 0;
  const heavy = parseInt(document.getElementById("pkg-heavy").value) || 0;

  const newRef = db.ref("deliveries").push();
  newRef.set({
    date,
    courier,
    standard,
    far,
    heavy,
    totalPkg: standard + far + heavy,
    timestamp: Date.now()
  }).then(() => {
    alert("Data rekap berhasil disimpan!");
    document.getElementById("entry-form").reset();
    document.getElementById("entry-date").value = date;
  }).catch((err) => {
    alert("Gagal menyimpan data: " + err.message);
  });
});

// Mendengarkan Perubahan Data secara Realtime dari Firebase Realtime Database
function listenRealtimeData() {
  db.ref("deliveries").on("value", (snapshot) => {
    const dataObj = snapshot.val() || {};
    let totalPkgSum = 0;
    const tableBody = document.getElementById("recap-table-body");
    tableBody.innerHTML = "";

    const chartData = {};

    const items = Object.keys(dataObj).map(key => ({
      id: key,
      ...dataObj[key]
    })).sort((a, b) => new Date(b.date) - new Date(a.date));

    items.forEach((item) => {
      // Hitung Hak Kurir
      const courierPay = (item.standard * 2500) + (item.far * 2800) + (item.heavy * 3000);
      totalPkgSum += item.totalPkg;

      // Agregasi Data Chart per Tanggal
      chartData[item.date] = (chartData[item.date] || 0) + item.totalPkg;

      // Render Baris Tabel
      const tr = document.createElement("tr");
      tr.className = "border-b text-xs";
      tr.innerHTML = `
        <td class="p-2">${item.date}</td>
        <td class="p-2 font-medium">${item.courier}</td>
        <td class="p-2">${item.standard} / ${item.far} / ${item.heavy} (${item.totalPkg})</td>
        <td class="p-2">Rp ${courierPay.toLocaleString("id-ID")}</td>
        <td class="p-2">
          <button onclick="window.deleteEntry('${item.id}')" class="text-red-500 hover:underline">Hapus</button>
        </td>
      `;
      tableBody.appendChild(tr);
    });

    // Perhitungan Komisi
    const leaderOmset = totalPkgSum * 4000;
    const assistantFee = leaderOmset * 0.01;

    document.getElementById("metric-total-pkg").innerText = totalPkgSum.toLocaleString("id-ID");
    document.getElementById("metric-leader-omset").innerText = `Rp ${leaderOmset.toLocaleString("id-ID")}`;
    document.getElementById("metric-assistant-fee").innerText = `Rp ${assistantFee.toLocaleString("id-ID")}`;

    // Hanya Owner/Admin yang bisa melihat margin Rp 1.300
    if (currentRole === 'admin') {
      const ownerProfit = totalPkgSum * 1300;
      document.getElementById("metric-owner-profit").innerText = `Rp ${ownerProfit.toLocaleString("id-ID")}`;
    }

    renderChart(chartData);
  });
}

// Fungsi Hapus Item
window.deleteEntry = (id) => {
  if (confirm("Apakah Anda yakin ingin menghapus data rekap ini?")) {
    db.ref("deliveries/" + id).remove();
  }
};

// Render Grafik Analisis Paket
function renderChart(chartData) {
  const dates = Object.keys(chartData).reverse();
  const totals = dates.map(d => chartData[d]);

  const ctx = document.getElementById('volumeChart').getContext('2d');
  
  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: dates,
      datasets: [{
        label: 'Volume Paket Terkirim',
        data: totals,
        backgroundColor: 'rgba(238, 77, 45, 0.7)',
        borderColor: 'rgb(238, 77, 45)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}
