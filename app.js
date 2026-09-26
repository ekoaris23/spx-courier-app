import { db } from "./firebase-config.js";

let currentRole = null;
let chartInstance = null;
let allDeliveries = [];

// Set Tanggal Hari Ini secara otomatis
document.getElementById("entry-date").valueAsDate = new Date();

// Handling Login
document.getElementById("login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const role = document.getElementById("login-role").value;
  const pass = document.getElementById("login-password").value;

  let valid = false;
  if (role === "admin" && pass === "admin123") valid = true;
  if (role === "assistant" && pass === "asisten123") valid = true;
  if (role === "leader" && pass === "leader123") valid = true;

  if (valid) {
    currentRole = role;
    document.getElementById("user-role-badge").innerText = `Role: ${role.toUpperCase()}`;
    
    // Hak Akses Tampilan Kartu Metrik
    const assistantCard = document.getElementById("assistant-card-fee");
    const adminCard = document.getElementById("admin-card-profit");

    if (currentRole === 'admin') {
      assistantCard.classList.remove("hidden");
      adminCard.classList.remove("hidden");
    } else if (currentRole === 'assistant') {
      assistantCard.classList.remove("hidden");
      adminCard.classList.add("hidden");
    } else {
      assistantCard.classList.add("hidden");
      adminCard.classList.add("hidden");
    }

    document.getElementById("login-section").classList.add("hidden");
    document.getElementById("app-section").classList.remove("hidden");
    
    listenCouriers();
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

// LISTEN DAFTAR KURIR
function listenCouriers() {
  db.ref("couriers").on("value", (snapshot) => {
    const couriersObj = snapshot.val() || {};
    const courierSelect = document.getElementById("entry-courier");
    const courierFilter = document.getElementById("filter-courier-history");
    const courierList = document.getElementById("courier-list");

    courierSelect.innerHTML = "";
    courierFilter.innerHTML = `<option value="ALL">-- Semua Kurir --</option>`;
    courierList.innerHTML = "";

    const keys = Object.keys(couriersObj);

    if (keys.length === 0) {
      courierSelect.innerHTML = `<option value="">-- Belum Ada Kurir --</option>`;
      courierList.innerHTML = `<li class="text-gray-400 text-xs italic">Belum ada kurir ditambahkan</li>`;
      return;
    }

    keys.forEach((key) => {
      const name = couriersObj[key].name;

      // Select Option
      const opt = document.createElement("option");
      opt.value = name;
      opt.innerText = name;
      courierSelect.appendChild(opt);

      // Filter Option
      const optFilter = document.createElement("option");
      optFilter.value = name;
      optFilter.innerText = name;
      courierFilter.appendChild(optFilter);

      // List Hapus
      const li = document.createElement("li");
      li.className = "flex justify-between items-center bg-white p-2 rounded border";
      li.innerHTML = `
        <span>${name}</span>
        <button onclick="window.deleteCourier('${key}')" class="text-red-500 hover:text-red-700 font-bold text-xs bg-red-50 px-2 py-1 rounded">Hapus</button>
      `;
      courierList.appendChild(li);
    });
  });
}

// TAMBAH KURIR BARU
document.getElementById("add-courier-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const nameInput = document.getElementById("courier-name-input");
  const name = nameInput.value.trim();

  if (name) {
    db.ref("couriers").push({ name })
      .then(() => nameInput.value = "")
      .catch((err) => alert("Gagal menambah kurir: " + err.message));
  }
});

// HAPUS KURIR
window.deleteCourier = (key) => {
  if (confirm("Yakin ingin menghapus kurir ini?")) {
    db.ref("couriers/" + key).remove();
  }
};

// SIMPAN PAKET PER RESI (SPXID)
document.getElementById("entry-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const date = document.getElementById("entry-date").value;
  const courier = document.getElementById("entry-courier").value;
  const spxid = document.getElementById("entry-spxid").value.trim().toUpperCase();
  const type = document.getElementById("entry-type").value;
  const codAmount = parseInt(document.getElementById("entry-cod").value) || 0;

  if (!courier) {
    alert("Silakan pilih kurir terlebih dahulu!");
    return;
  }

  // Hitung Tarif Hak Kurir per Paket
  let courierRate = 2500;
  if (type === "JAUH") courierRate = 2800;
  if (type === "BIG") courierRate = 3000;

  const newRef = db.ref("deliveries").push();
  newRef.set({
    date,
    courier,
    spxid,
    type,
    codAmount,
    courierRate,
    timestamp: Date.now()
  }).then(() => {
    document.getElementById("entry-spxid").value = "";
    document.getElementById("entry-cod").value = "0";
    document.getElementById("entry-spxid").focus();
  }).catch((err) => {
    alert("Gagal menyimpan paket: " + err.message);
  });
});

// LISTEN REALTIME DATA PAKET
function listenRealtimeData() {
  db.ref("deliveries").on("value", (snapshot) => {
    const dataObj = snapshot.val() || {};
    
    allDeliveries = Object.keys(dataObj).map(key => ({
      id: key,
      ...dataObj[key]
    })).sort((a, b) => b.timestamp - a.timestamp);

    renderTablesAndCharts();
  });
}

// FILTER KURIR
document.getElementById("filter-courier-history").addEventListener("change", () => {
  renderTablesAndCharts();
});

// RENDER REKAPITULASI & RIWAYAT
function renderTablesAndCharts() {
  const filterVal = document.getElementById("filter-courier-history").value;
  const summaryBody = document.getElementById("summary-table-body");
  const recapBody = document.getElementById("recap-table-body");

  summaryBody.innerHTML = "";
  recapBody.innerHTML = "";

  const courierStats = {};
  let globalTotalPkg = 0;
  let globalTotalCod = 0;
  let globalTotalCourierPay = 0;

  allDeliveries.forEach((item) => {
    globalTotalPkg++;
    globalTotalCod += item.codAmount;
    globalTotalCourierPay += item.courierRate;

    // Agregasi Per Kurir untuk Tabel Ringkasan
    if (!courierStats[item.courier]) {
      courierStats[item.courier] = { totalPkg: 0, totalCod: 0, totalPay: 0 };
    }
    courierStats[item.courier].totalPkg += 1;
    courierStats[item.courier].totalCod += item.codAmount;
    courierStats[item.courier].totalPay += item.courierRate;

    // Render Tabel Detail (Di-filter jika memilih kurir tertentu)
    if (filterVal === "ALL" || item.courier === filterVal) {
      const tr = document.createElement("tr");
      tr.className = "border-b text-xs";
      tr.innerHTML = `
        <td class="p-2">${item.date}</td>
        <td class="p-2 font-medium">${item.courier}</td>
        <td class="p-2 font-mono text-blue-600 font-bold">${item.spxid}</td>
        <td class="p-2"><span class="px-1.5 py-0.5 text-[10px] rounded font-bold ${item.type==='BIG'?'bg-red-100 text-red-600':item.type==='JAUH'?'bg-yellow-100 text-yellow-700':'bg-blue-100 text-blue-600'}">${item.type}</span></td>
        <td class="p-2">Rp ${item.codAmount.toLocaleString("id-ID")}</td>
        <td class="p-2">Rp ${item.courierRate.toLocaleString("id-ID")}</td>
        <td class="p-2">
          <button onclick="window.deleteEntry('${item.id}')" class="text-red-500 hover:underline">Hapus</button>
        </td>
      `;
      recapBody.appendChild(tr);
    }
  });

  // Render Tabel Ringkasan (Seperti Sheet Kiri Spreadsheet)
  Object.keys(courierStats).forEach((courierName) => {
    const stat = courierStats[courierName];
    const tr = document.createElement("tr");
    tr.className = "border-b text-xs";
    tr.innerHTML = `
      <td class="p-2 font-bold">${courierName}</td>
      <td class="p-2 text-center font-bold">${stat.totalPkg}</td>
      <td class="p-2 text-emerald-600 font-semibold">Rp ${stat.totalCod.toLocaleString("id-ID")}</td>
      <td class="p-2 font-semibold">Rp ${stat.totalPay.toLocaleString("id-ID")}</td>
    `;
    summaryBody.appendChild(tr);
  });

  // Footer Ringkasan
  document.getElementById("summary-total-pkg").innerText = globalTotalPkg;
  document.getElementById("summary-total-cod").innerText = `Rp ${globalTotalCod.toLocaleString("id-ID")}`;
  document.getElementById("summary-total-pay").innerText = `Rp ${globalTotalCourierPay.toLocaleString("id-ID")}`;

  // Metric Cards
  const leaderOmset = globalTotalPkg * 4000;
  const assistantFee = leaderOmset * 0.01;
  const ownerProfit = globalTotalPkg * 1300;

  document.getElementById("metric-total-pkg").innerText = globalTotalPkg;
  document.getElementById("metric-total-cod").innerText = `Rp ${globalTotalCod.toLocaleString("id-ID")}`;
  document.getElementById("metric-assistant-fee").innerText = `Rp ${assistantFee.toLocaleString("id-ID")}`;
  document.getElementById("metric-owner-profit").innerText = `Rp ${ownerProfit.toLocaleString("id-ID")}`;

  renderChart(courierStats);
}

// HAPUS PAKET
window.deleteEntry = (id) => {
  if (confirm("Apakah Anda yakin ingin menghapus paket ini?")) {
    db.ref("deliveries/" + id).remove();
  }
};

// RENDER CHART PER KURIR
function renderChart(courierStats) {
  const labels = Object.keys(courierStats);
  const dataPkg = labels.map(l => courierStats[l].totalPkg);

  const ctx = document.getElementById('volumeChart').getContext('2d');
  
  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Jumlah Paket Terkirim',
        data: dataPkg,
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 } }
      }
    }
  });
}
