import { db } from "./firebase-config.js";

let currentRole = null;
let chartInstance = null;

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
    
    // --- KONTROL HAK AKSES TAMPILAN KARTU METRIK ---
    const assistantCard = document.getElementById("assistant-card-fee");
    const adminCard = document.getElementById("admin-card-profit");

    if (currentRole === 'admin') {
      // Admin: Lihat Semua Kartu
      assistantCard.classList.remove("hidden");
      adminCard.classList.remove("hidden");
    } else if (currentRole === 'assistant') {
      // Asisten: Lihat Omset Leader + Komisi Asisten (Profit Owner Sembunyi)
      assistantCard.classList.remove("hidden");
      adminCard.classList.add("hidden");
    } else {
      // Leader: Hanya Lihat Omset Leader (Komisi Asisten & Profit Owner Sembunyi)
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

// LISTEN & RENDERING DAFTAR KURIR
function listenCouriers() {
  db.ref("couriers").on("value", (snapshot) => {
    const couriersObj = snapshot.val() || {};
    const courierSelect = document.getElementById("entry-courier");
    const courierList = document.getElementById("courier-list");

    courierSelect.innerHTML = "";
    courierList.innerHTML = "";

    const keys = Object.keys(couriersObj);

    if (keys.length === 0) {
      courierSelect.innerHTML = `<option value="">-- Belum Ada Kurir --</option>`;
      courierList.innerHTML = `<li class="text-gray-400 text-xs italic">Belum ada kurir ditambahkan</li>`;
      return;
    }

    keys.forEach((key) => {
      const name = couriersObj[key].name;

      // Isi Dropdown Options
      const opt = document.createElement("option");
      opt.value = name;
      opt.innerText = name;
      courierSelect.appendChild(opt);

      // Isi List Hapus Kurir
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
      .then(() => {
        nameInput.value = "";
      })
      .catch((err) => alert("Gagal menambah kurir: " + err.message));
  }
});

// HAPUS KURIR
window.deleteCourier = (key) => {
  if (confirm("Yakin ingin menghapus kurir ini dari daftar?")) {
    db.ref("couriers/" + key).remove();
  }
};

// FORM INPUT PENGIRIMAN
document.getElementById("entry-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const date = document.getElementById("entry-date").value;
  const courier = document.getElementById("entry-courier").value;
  const standard = parseInt(document.getElementById("pkg-standard").value) || 0;
  const far = parseInt(document.getElementById("pkg-far").value) || 0;
  const heavy = parseInt(document.getElementById("pkg-heavy").value) || 0;

  if (!courier) {
    alert("Silakan pilih kurir terlebih dahulu!");
    return;
  }

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

// REALTIME REKAP PENGIRIMAN
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
      const courierPay = (item.standard * 2500) + (item.far * 2800) + (item.heavy * 3000);
      totalPkgSum += item.totalPkg;

      chartData[item.date] = (chartData[item.date] || 0) + item.totalPkg;

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

    const leaderOmset = totalPkgSum * 4000;
    const assistantFee = leaderOmset * 0.01;
    const ownerProfit = totalPkgSum * 1300;

    // Isikan nilai sesuai perhitungan
    document.getElementById("metric-total-pkg").innerText = totalPkgSum.toLocaleString("id-ID");
    document.getElementById("metric-leader-omset").innerText = `Rp ${leaderOmset.toLocaleString("id-ID")}`;
    document.getElementById("metric-assistant-fee").innerText = `Rp ${assistantFee.toLocaleString("id-ID")}`;
    document.getElementById("metric-owner-profit").innerText = `Rp ${ownerProfit.toLocaleString("id-ID")}`;

    renderChart(chartData);
  });
}

// HAPUS RIWAYAT PENGIRIMAN
window.deleteEntry = (id) => {
  if (confirm("Apakah Anda yakin ingin menghapus data rekap ini?")) {
    db.ref("deliveries/" + id).remove();
  }
};

// RENDER CHART
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
