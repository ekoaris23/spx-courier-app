function renderTablesAndCharts() {
  const startDate = document.getElementById("filter-start-date").value;
  const endDate = document.getElementById("filter-end-date").value;
  const filterCourier = document.getElementById("filter-courier-history").value;

  const summaryBody = document.getElementById("summary-table-body");
  const recapBody = document.getElementById("recap-table-body");

  summaryBody.innerHTML = "";
  recapBody.innerHTML = "";

  const courierStats = {};
  let globalTotalPkg = 0;
  let globalTotalCod = 0;
  let globalTotalCourierPay = 0;

  // Filter tanggal
  const filteredDeliveries = allDeliveries.filter((item) => {
    if (startDate && endDate) {
      return item.date >= startDate && item.date <= endDate;
    } else if (startDate) {
      return item.date === startDate;
    } else if (endDate) {
      return item.date <= endDate;
    }
    return true;
  });

  filteredDeliveries.forEach((item) => {
    globalTotalPkg++;
    globalTotalCod += item.codAmount;
    globalTotalCourierPay += item.courierRate;

    if (!courierStats[item.courier]) {
      courierStats[item.courier] = { totalPkg: 0, totalCod: 0, totalPay: 0 };
    }
    courierStats[item.courier].totalPkg += 1;
    courierStats[item.courier].totalCod += item.codAmount;
    courierStats[item.courier].totalPay += item.courierRate;

    if (filterCourier === "ALL" || item.courier === filterCourier) {
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

  // Render Tabel Ringkasan
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

  document.getElementById("summary-total-pkg").innerText = globalTotalPkg;
  document.getElementById("summary-total-cod").innerText = `Rp ${globalTotalCod.toLocaleString("id-ID")}`;
  document.getElementById("summary-total-pay").innerText = `Rp ${globalTotalCourierPay.toLocaleString("id-ID")}`;

  // KETIGA PERHITUNGAN UTAMA
  const leaderOmset = globalTotalPkg * 4000;                      // 80 x 4000 = Rp 320.000
  const assistantFee = leaderOmset * 0.01;                        // 1% x 320.000 = Rp 3.200
  const leaderNetProfit = leaderOmset - globalTotalCourierPay - assistantFee; // 320.000 - 210.500 - 3.200 = Rp 106.300
  const ownerProfit = globalTotalPkg * 1300;                      // 80 x 1300 = Rp 104.000

  // PENGISIAN NILAI KE KARTU METRIK
  document.getElementById("metric-total-pkg").innerText = globalTotalPkg;
  document.getElementById("metric-leader-omset").innerText = `Rp ${leaderOmset.toLocaleString("id-ID")}`;
  document.getElementById("metric-leader-profit").innerText = `Rp ${leaderNetProfit.toLocaleString("id-ID")}`;
  document.getElementById("metric-total-cod").innerText = `Rp ${globalTotalCod.toLocaleString("id-ID")}`;
  document.getElementById("metric-assistant-fee").innerText = `Rp ${assistantFee.toLocaleString("id-ID")}`;
  document.getElementById("metric-owner-profit").innerText = `Rp ${ownerProfit.toLocaleString("id-ID")}`;

  renderChart(courierStats);
}
