// VARIABLES DE ESTADO GLOBAL
let appData = StorageManager.loadData();
let targetDateVal = "";
let categoryChart = null;
let flowComparisonChart = null;
let googleTokenClient = null;
let googleAccessToken = null;

// ELEMENTOS DEL DOM
const dom = {
    // Sidebar Configuración
    initialBalanceInput: document.getElementById("initial-balance-input"),
    currencySelect: document.getElementById("currency-select"),
    sbFixedExpenses: document.getElementById("sb-fixed-expenses"),
    sbWeeklySaving: document.getElementById("sb-weekly-saving"),
    
    // Header
    currentDateSpan: document.getElementById("current-date-span"),
    
    // Tabs de Navegación
    tabBtns: document.querySelectorAll(".tab-btn"),
    tabPanels: document.querySelectorAll(".tab-panel"),
    
    // TAB 1: Calculadora de Fecha Meta
    calcTargetDate: document.getElementById("calc-target-date"),
    presetDateBtns: document.querySelectorAll(".preset-date-btn"),
    calcResultDateText: document.getElementById("calc-result-date-text"),
    calcResultValueText: document.getElementById("calc-result-value-text"),
    calcResultDiffText: document.getElementById("calc-result-diff-text"),
    calcBreakdownList: document.getElementById("calc-breakdown-list"),
    
    // TAB 2: Plan de Ahorro Semanal
    fixedExpensesBody: document.getElementById("fixed-expenses-body"),
    totalFixedExpensesVal: document.getElementById("total-fixed-expenses-val"),
    weeklySavingNumber: document.getElementById("weekly-saving-number"),
    weeklySavingTotalNeeded: document.getElementById("weekly-saving-total-needed"),
    weeklyChks: document.querySelectorAll(".weekly-chk"),
    weeklyProgressPercent: document.getElementById("weekly-progress-percent"),
    weeklyProgressFill: document.getElementById("weekly-progress-fill"),
    
    // TAB 3: Vista por Meses
    monthlyAccordionWrapper: document.getElementById("monthly-accordion-wrapper"),
    
    // TAB 4: Distribución de Gastos (Analytics)
    analyticsTableBody: document.getElementById("analytics-table-body"),
    analyticsMonthSelect: document.getElementById("analytics-month-select"),
    analyticsSummaryTitle: document.getElementById("analytics-summary-title"),
    
    // TAB 5: Gestión de Transacciones
    transactionForm: document.getElementById("transaction-form"),
    txName: document.getElementById("tx-name"),
    txAmount: document.getElementById("tx-amount"),
    txType: document.getElementById("tx-type"),
    txFrequency: document.getElementById("tx-frequency"),
    txCategory: document.getElementById("tx-category"),
    txStartDate: document.getElementById("tx-start-date"),
    txEndDate: document.getElementById("tx-end-date"),
    txListTableBody: document.getElementById("tx-list-table-body"),
    
    // TAB 6: Respaldo
    btnExportBackup: document.getElementById("btn-export-backup"),
    importFileInput: document.getElementById("import-file-input"),
    btnResetData: document.getElementById("btn-reset-data"),

    // Asistente de IA & Aspecto
    btnToggleTheme: document.getElementById("btn-toggle-theme"),
    aiApiKey: document.getElementById("ai-apikey"),
    btnSaveKey: document.getElementById("btn-save-key"),
    keySavedIndicator: document.getElementById("key-saved-indicator"),
    aiQuery: document.getElementById("ai-query"),
    btnAskAi: document.getElementById("btn-ask-ai"),
    aiLoaderContainer: document.getElementById("ai-loader-container"),
    aiResponseWrapper: document.getElementById("ai-response-wrapper"),
    aiChips: document.querySelectorAll(".ai-chip"),
    gdClientId: document.getElementById("gd-client-id"),
    btnSaveGdClient: document.getElementById("btn-save-gd-client"),
    btnSyncGd: document.getElementById("btn-sync-gd"),
    gdSyncStatus: document.getElementById("gd-sync-status"),
    btnToggleSidebarContent: document.getElementById("btn-toggle-sidebar-content")
};

// MAPA DE MONEDAS
const CURRENCY_MAP = {
    "USD": { symbol: "$", code: "USD" },
    "EUR": { symbol: "€", code: "EUR" },
    "MXN": { symbol: "$", code: "MXN" },
    "CLP": { symbol: "$", code: "CLP" },
    "ARS": { symbol: "$", code: "ARS" },
    "COP": { symbol: "$", code: "COP" },
    "PEN": { symbol: "S/", code: "PEN" },
    "BRL": { symbol: "R$", code: "BRL" }
};

// OBTENER MONEDA ACTUAL
function getCurrencyInfo() {
    return CURRENCY_MAP[appData.currency] || { symbol: "$", code: "USD" };
}

// FORMATEAR MONEDA
function formatCurrency(val) {
    const c = getCurrencyInfo();
    const sign = val < 0 ? "-" : "";
    return `${sign}${c.symbol}${Math.abs(val).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// INICIALIZACIÓN
function init() {
    const today = new Date();
    dom.currentDateSpan.textContent = today.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    
    // Valores iniciales
    dom.initialBalanceInput.value = appData.initial_balance;
    dom.currencySelect.value = appData.currency;
    
    // Establecer fecha por defecto en calculadora (3 meses a futuro)
    const defaultTarget = new Date(today);
    defaultTarget.setMonth(today.getMonth() + 3);
    targetDateVal = defaultTarget.toISOString().split('T')[0];
    dom.calcTargetDate.value = targetDateVal;
    
    // Fecha inicio por defecto para transacciones
    dom.txStartDate.value = today.toISOString().split('T')[0];
    
    // Sincronizar el estado del checklist de ahorro semanal
    initWeeklyChecklistState();

    // Rellenar meses en la pestaña de estadísticas
    populateAnalyticsMonths();

    // Inicializar Tema (Aspecto Claro/Oscuro)
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
        document.body.classList.add("light-theme");
        dom.btnToggleTheme.textContent = "🌙 Modo Oscuro";
    } else {
        document.body.classList.remove("light-theme");
        dom.btnToggleTheme.textContent = "☀️ Modo Claro";
    }

    // Inicializar Clave API de OpenAI
    const savedApiKey = localStorage.getItem("openai_api_key") || "";
    dom.aiApiKey.value = savedApiKey;

    // Inicializar Google Client ID
    const savedGdClientId = localStorage.getItem("google_client_id") || "";
    dom.gdClientId.value = savedGdClientId;
    if (savedGdClientId) {
        dom.gdSyncStatus.textContent = "Estado: Guardado. Listo para conectar.";
        setTimeout(initGoogleAuth, 1000);
    }

    // Eventos
    registerEventListeners();
    
    // Actualizar UI
    updateUI();
}

// REGISTRAR EVENT LISTENERS
function registerEventListeners() {
    // 1. Balance Inicial
    dom.initialBalanceInput.addEventListener("change", function() {
        const val = parseFloat(this.value);
        if (!isNaN(val) && val >= 0) {
            StorageManager.updateInitialBalance(val);
            appData.initial_balance = val;
            updateUI();
        }
    });

    // 2. Selección de Moneda
    dom.currencySelect.addEventListener("change", function() {
        StorageManager.updateCurrency(this.value);
        appData.currency = this.value;
        document.getElementById("curr-symbol-prefix").textContent = getCurrencyInfo().symbol;
        updateUI();
    });

    // 3. Pestañas
    dom.tabBtns.forEach(btn => {
        btn.addEventListener("click", function() {
            dom.tabBtns.forEach(b => b.classList.remove("active"));
            dom.tabPanels.forEach(p => p.classList.remove("active"));
            
            this.classList.add("active");
            const tabId = this.dataset.tab;
            document.getElementById(tabId).classList.add("active");
        });
    });

    // 4. Selector de Fecha de Calculadora
    dom.calcTargetDate.addEventListener("change", function() {
        if (this.value) {
            targetDateVal = this.value;
            updateCalculatorView();
        }
    });

    // 5. Botones Rápidos de Fecha de Calculadora
    dom.presetDateBtns.forEach(btn => {
        btn.addEventListener("click", function() {
            const days = parseInt(this.dataset.days);
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + days);
            
            targetDateVal = targetDate.toISOString().split('T')[0];
            dom.calcTargetDate.value = targetDateVal;
            updateCalculatorView();
        });
    });

    // 6. Checkboxes de Ahorro Semanal
    dom.weeklyChks.forEach(chk => {
        chk.addEventListener("change", function() {
            saveWeeklyChecklistState();
            updateWeeklySavingView();
        });
    });

    // 6b. Cambio de mes en Estadísticas
    dom.analyticsMonthSelect.addEventListener("change", function() {
        updateAnalyticsView();
    });

    // 7. Guardar Transacción
    dom.transactionForm.addEventListener("submit", function(e) {
        e.preventDefault();
        
        const name = dom.txName.value.trim();
        const amount = parseFloat(dom.txAmount.value);
        const type = dom.txType.value;
        const frequency = dom.txFrequency.value;
        const category = dom.txCategory.value;
        const startDate = dom.txStartDate.value;
        const endDate = dom.txEndDate.value || null;

        if (!name) return alert("Ingresa un nombre.");
        if (isNaN(amount) || amount <= 0) return alert("Ingresa un monto válido.");
        if (endDate && endDate <= startDate) return alert("La fecha de término debe ser posterior a la fecha de inicio.");

        StorageManager.addTransaction(name, amount, type, frequency, startDate, endDate, category);
        
        appData = StorageManager.loadData();
        dom.transactionForm.reset();
        dom.txStartDate.value = new Date().toISOString().split('T')[0];
        
        updateUI();
        alert(`Transacción "${name}" agregada con éxito.`);
    });

    // 8. Exportar backup
    dom.btnExportBackup.addEventListener("click", function() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appData, null, 4));
        const dlAnchor = document.createElement('a');
        dlAnchor.setAttribute("href", dataStr);
        dlAnchor.setAttribute("download", `respaldo_financiero_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(dlAnchor);
        dlAnchor.click();
        dlAnchor.remove();
    });

    // 9. Importar backup
    dom.importFileInput.addEventListener("change", function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(evt) {
            try {
                const parsed = JSON.parse(evt.target.result);
                if (parsed.initial_balance !== undefined && Array.isArray(parsed.transactions)) {
                    StorageManager.saveData(parsed);
                    appData = StorageManager.loadData();
                    alert("Respaldo cargado con éxito.");
                    location.reload();
                } else {
                    alert("El archivo no tiene el formato correcto.");
                }
            } catch (err) {
                alert("Error: " + err.message);
            }
        };
        reader.readAsText(file);
    });

    // 10. Restablecer
    dom.btnResetData.addEventListener("click", function() {
        if (confirm("¿Estás seguro de restablecer todos los datos?")) {
            StorageManager.resetData();
            location.reload();
        }
    });

    // 11. Cambiar Tema (Claro / Oscuro)
    dom.btnToggleTheme.addEventListener("click", function() {
        document.body.classList.toggle("light-theme");
        const isLight = document.body.classList.contains("light-theme");
        localStorage.setItem("theme", isLight ? "light" : "dark");
        dom.btnToggleTheme.textContent = isLight ? "🌙 Modo Oscuro" : "☀️ Modo Claro";
    });

    // 12. Guardar OpenAI Clave API
    dom.btnSaveKey.addEventListener("click", function() {
        const key = dom.aiApiKey.value.trim();
        localStorage.setItem("openai_api_key", key);
        
        dom.keySavedIndicator.style.display = "block";
        setTimeout(() => {
            dom.keySavedIndicator.style.display = "none";
        }, 3000);
    });

    // 13. Preguntar al Asesor de IA
    dom.btnAskAi.addEventListener("click", askAiAsesor);

    // 14. Sugerencias rápidas de IA
    dom.aiChips.forEach(chip => {
        chip.addEventListener("click", function() {
            dom.aiQuery.value = this.dataset.query;
            dom.aiQuery.focus();
        });
    });

    // 15. Guardar Google Client ID
    dom.btnSaveGdClient.addEventListener("click", function() {
        const val = dom.gdClientId.value.trim();
        localStorage.setItem("google_client_id", val);
        alert("Google Client ID guardado con éxito.");
        dom.gdSyncStatus.textContent = val ? "Estado: Guardado. Listo para conectar." : "Estado: No conectado. Configura tu Client ID.";
        initGoogleAuth();
    });

    // 16. Sincronizar con Google Drive
    dom.btnSyncGd.addEventListener("click", function() {
        syncWithGoogleDrive();
    });

    // 17. Alternar visibilidad de la barra lateral en móviles
    if (dom.btnToggleSidebarContent) {
        dom.btnToggleSidebarContent.addEventListener("click", function() {
            const sidebar = document.querySelector(".sidebar");
            sidebar.classList.toggle("collapsed");
            const isCollapsed = sidebar.classList.contains("collapsed");
            this.textContent = isCollapsed ? "⚙️ Ajustes" : "❌ Cerrar";
        });
    }
}

// SINCRONIZAR ESTADO DE CHECKBOXES DE RESERVA
function initWeeklyChecklistState() {
    const today = new Date();
    const currentMonthStr = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, '0');
    
    if (!appData.weekly_reserve_progress || appData.weekly_reserve_progress.month !== currentMonthStr) {
        // Inicializar vacío para el nuevo mes
        appData.weekly_reserve_progress = {
            month: currentMonthStr,
            checked_weeks: []
        };
        StorageManager.saveData(appData);
    }
    
    // Tildar los guardados
    const checked = appData.weekly_reserve_progress.checked_weeks || [];
    dom.weeklyChks.forEach(chk => {
        const week = parseInt(chk.dataset.week);
        chk.checked = checked.includes(week);
    });
}

// GUARDAR ESTADO DE CHECKBOXES EN LOCALSTORAGE
function saveWeeklyChecklistState() {
    const checked = [];
    dom.weeklyChks.forEach(chk => {
        if (chk.checked) {
            checked.push(parseInt(chk.dataset.week));
        }
    });
    
    appData.weekly_reserve_progress.checked_weeks = checked;
    StorageManager.saveData(appData);
}

// GRUPAR PROYECCIONES DIARIAS POR MESES
function getGroupedMonthlyProjections() {
    const today = new Date();
    const startStr = today.toISOString().split('T')[0];
    
    // Proyectar a 18 meses por defecto para la vista mensualizada
    const end = new Date(today);
    end.setMonth(today.getMonth() + 18);
    const endStr = end.toISOString().split('T')[0];
    
    // Ejecutar proyección diaria base
    const dailyPoints = FinanceEngine.runProjection(
        appData.initial_balance,
        appData.transactions,
        startStr,
        endStr
    );
    
    // Agrupar
    const months = {};
    const monthsOrder = [];
    
    dailyPoints.forEach(pt => {
        const dateObj = new Date(pt.date + "T00:00:00");
        const yearMonth = pt.date.substring(0, 7); // "YYYY-MM"
        
        if (!months[yearMonth]) {
            const monthName = dateObj.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
            // Capitalizar
            const capitalizedName = monthName.charAt(0).toUpperCase() + monthName.slice(1);
            
            months[yearMonth] = {
                id: yearMonth,
                name: capitalizedName,
                startingBalance: 0,
                endingBalance: 0,
                incomeSum: 0,
                expenseSum: 0,
                events: []
            };
            monthsOrder.push(yearMonth);
        }
        
        // Sumar flujos
        months[yearMonth].incomeSum += pt.income;
        months[yearMonth].expenseSum += pt.expense;
        
        // Almacenar detalles si hubo movimientos
        if (pt.income > 0 || pt.expense > 0) {
            months[yearMonth].events.push({
                date: pt.date,
                income: pt.income,
                expense: pt.expense,
                details: pt.details
            });
        }
    });
    
    // Rellenar saldos iniciales y finales de cada mes
    let prevEndingBalance = parseFloat(appData.initial_balance);
    
    monthsOrder.forEach(ym => {
        const m = months[ym];
        m.startingBalance = prevEndingBalance;
        
        const netFlow = m.incomeSum - m.expenseSum;
        m.endingBalance = m.startingBalance + netFlow;
        
        prevEndingBalance = m.endingBalance;
    });
    
    return monthsOrder.map(ym => months[ym]);
}

// ---------------- RENDER: TAB 1 (CALCULADORA FECHA) ----------------
function updateCalculatorView() {
    if (!targetDateVal) return;
    
    const todayStr = new Date().toISOString().split('T')[0];
    
    if (targetDateVal < todayStr) {
        dom.calcResultDateText.textContent = "Fecha Inválida";
        dom.calcResultValueText.textContent = "$0.00";
        dom.calcResultDiffText.textContent = "La fecha debe ser a futuro";
        dom.calcResultDiffText.className = "calc-result-diff";
        dom.calcBreakdownList.innerHTML = "";
        return;
    }
    
    // Proyectar
    const proj = FinanceEngine.runProjection(
        appData.initial_balance,
        appData.transactions,
        todayStr,
        targetDateVal
    );
    
    const lastPoint = proj[proj.length - 1];
    const diff = lastPoint.balance - appData.initial_balance;
    
    const dateObj = new Date(targetDateVal + "T00:00:00");
    dom.calcResultDateText.textContent = dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    dom.calcResultValueText.textContent = formatCurrency(lastPoint.balance);
    
    // Mostrar diferencia
    const prefix = diff >= 0 ? "+" : "";
    dom.calcResultDiffText.textContent = `Variación: ${prefix}${formatCurrency(diff)}`;
    if (diff >= 0) {
        dom.calcResultDiffText.className = "calc-result-diff positive";
    } else {
        dom.calcResultDiffText.className = "calc-result-diff negative";
    }
    
    // Desglose de transacciones ocurridas
    dom.calcBreakdownList.innerHTML = "";
    const occurrences = [];
    
    appData.transactions.forEach(tx => {
        const occs = FinanceEngine.getOccurrences(tx, todayStr, targetDateVal);
        occs.forEach(dateStr => {
            occurrences.push({
                date: dateStr,
                name: tx.name,
                amount: tx.amount,
                type: tx.type,
                category: tx.category
            });
        });
    });
    
    // Ordenar cronológicamente
    occurrences.sort((a, b) => a.date.localeCompare(b.date));
    
    if (occurrences.length === 0) {
        dom.calcBreakdownList.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 15px;">No hay transacciones programadas en este lapso.</div>`;
        return;
    }
    
    occurrences.forEach(occ => {
        const item = document.createElement("div");
        item.className = "calc-breakdown-item";
        
        const dateObj = new Date(occ.date + "T00:00:00");
        const dateStr = dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
        
        const sign = occ.type === "income" ? "+" : "-";
        const amtClass = occ.type === "income" ? "income" : "expense";
        
        item.innerHTML = `
            <div>
                <span class="calc-breakdown-name">${occ.name}</span>
                <div class="calc-breakdown-meta">${dateStr} &bull; ${occ.category}</div>
            </div>
            <span class="calc-breakdown-amt ${amtClass}">${sign}${formatCurrency(occ.amount)}</span>
        `;
        dom.calcBreakdownList.appendChild(item);
    });
}

// ---------------- RENDER: TAB 2 (AHORRO SEMANAL) ----------------
function updateWeeklySavingView() {
    // 1. Filtrar gastos fijos mensuales (gastos con frecuencia mensual)
    const fixedExpenses = appData.transactions.filter(t => t.type === "expense" && t.frequency === "monthly");
    
    dom.fixedExpensesBody.innerHTML = "";
    let totalMonthlyFixed = 0;
    
    if (fixedExpenses.length === 0) {
        dom.fixedExpensesBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No has agregado gastos mensuales fijos.</td></tr>`;
    } else {
        fixedExpenses.forEach(tx => {
            totalMonthlyFixed += tx.amount;
            const startObj = new Date(tx.start_date + "T00:00:00");
            const dayOfPayment = startObj.getDate();
            
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td style="font-weight: 600; color: var(--text-header);">${tx.name}</td>
                <td style="font-weight: 600; color: var(--color-danger);">${formatCurrency(tx.amount)}</td>
                <td><span class="badge" style="background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; border: 1px solid var(--border-color);">${tx.category}</span></td>
                <td>Día ${dayOfPayment} de cada mes</td>
            `;
            dom.fixedExpensesBody.appendChild(tr);
        });
    }
    
    // Actualizar totales mensuales
    dom.totalFixedExpensesVal.textContent = formatCurrency(totalMonthlyFixed);
    dom.weeklySavingTotalNeeded.textContent = formatCurrency(totalMonthlyFixed);
    
    // 2. Calcular cuota semanal (dividiendo el gasto mensual en 4 semanas para reserva)
    const weeklyQuota = totalMonthlyFixed / 4;
    dom.weeklySavingNumber.textContent = formatCurrency(weeklyQuota);
    
    // Sincronizar cuotas en la checklist
    for (let i = 1; i <= 4; i++) {
        document.getElementById(`chk-val-${i}`).textContent = formatCurrency(weeklyQuota);
    }
    
    // 3. Actualizar barra de progreso de ahorro semanal
    const checkedBoxes = Array.from(dom.weeklyChks).filter(chk => chk.checked).length;
    const progressPct = (checkedBoxes / 4) * 100;
    
    dom.weeklyProgressPercent.textContent = `${progressPct.toFixed(0)}%`;
    dom.weeklyProgressFill.style.width = `${progressPct}%`;
    
    // 4. Actualizar Sidebar Resumen
    dom.sbFixedExpenses.textContent = formatCurrency(totalMonthlyFixed);
    dom.sbWeeklySaving.textContent = formatCurrency(weeklyQuota);
}

// ---------------- RENDER: TAB 3 (VISTA POR MESES) ----------------
function updateMonthlyGridView() {
    dom.monthlyAccordionWrapper.innerHTML = "";
    
    const monthlyProjections = getGroupedMonthlyProjections();
    
    monthlyProjections.forEach((m, idx) => {
        const item = document.createElement("div");
        item.className = "month-item";
        if (idx === 0) item.classList.add("expanded"); // Expandir el primer mes por defecto
        
        const netFlow = m.incomeSum - m.expenseSum;
        const flowSign = netFlow >= 0 ? "+" : "";
        const flowClass = netFlow >= 0 ? "positive" : "negative";
        
        item.innerHTML = `
            <div class="month-header" data-id="${m.id}">
                <span class="month-name">
                    <span class="month-chevron">▶</span>
                    <span>${m.name}</span>
                </span>
                <span class="month-stat">Saldo Inicial: <span>${formatCurrency(m.startingBalance)}</span></span>
                <span class="month-stat">Flujo Neto: <span class="${flowClass}">${flowSign}${formatCurrency(netFlow)}</span></span>
                <span class="month-stat">Saldo Final: <span>${formatCurrency(m.endingBalance)}</span></span>
            </div>
            <div class="month-body">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Flujo</th>
                            <th>Descripción</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${m.events.map(ev => {
                            const dateObj = new Date(ev.date + "T00:00:00");
                            const dayFormatted = dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'long' });
                            
                            const flowStr = ev.income > 0 
                                ? `<span style="color: var(--color-success); font-weight: 600;">+${formatCurrency(ev.income)}</span>` 
                                : `<span style="color: var(--color-danger); font-weight: 600;">-${formatCurrency(ev.expense)}</span>`;
                            
                            return `
                                <tr>
                                    <td style="width: 140px; font-weight: 500;">${dayFormatted}</td>
                                    <td style="width: 150px;">${flowStr}</td>
                                    <td style="color: var(--text-muted); font-size: 0.8rem;">${ev.details}</td>
                                </tr>
                            `;
                        }).join("")}
                        ${m.events.length === 0 ? '<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">Sin movimientos programados en este mes.</td></tr>' : ''}
                    </tbody>
                </table>
            </div>
        `;
        
        // Evento para colapsar/expandir acordeón
        item.querySelector(".month-header").addEventListener("click", function() {
            const parent = this.parentElement;
            parent.classList.toggle("expanded");
        });
        
        dom.monthlyAccordionWrapper.appendChild(item);
    });
}

// ---------------- RENDER: TAB 4 (MIS TRANSACCIONES) ----------------
function updateTransactionsListView() {
    dom.txListTableBody.innerHTML = "";
    const txs = appData.transactions;

    if (txs.length === 0) {
        dom.txListTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">No tienes transacciones registradas.</td></tr>`;
        return;
    }

    txs.forEach(tx => {
        const tr = document.createElement("tr");
        
        const freqText = {
            "one-time": "Única",
            "daily": "Diaria",
            "weekly": "Semanal",
            "bi-weekly": "Quincenal",
            "monthly": "Mensual (Gasto Fijo)",
            "yearly": "Anual"
        }[tx.frequency] || tx.frequency;

        const typeIndicator = tx.type === "income" 
            ? `<span style="color: var(--color-success); font-weight: 600;">🟢 Ingreso</span>` 
            : `<span style="color: var(--color-danger); font-weight: 600;">🔴 Gasto</span>`;

        const startObj = new Date(tx.start_date + "T00:00:00");
        const startStr = startObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const endStr = tx.end_date 
            ? new Date(tx.end_date + "T00:00:00").toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : "Indefinido";

        tr.innerHTML = `
            <td>
                <div style="font-weight: 600; color: var(--text-header);">${tx.name}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${typeIndicator}</div>
            </td>
            <td style="font-weight: 700;">${formatCurrency(tx.amount)}</td>
            <td style="font-weight: 500;">${freqText}</td>
            <td style="font-size: 0.75rem; color: var(--text-muted);">${startStr} a<br>${endStr}</td>
            <td><span class="badge" style="background: rgba(255,255,255,0.04); padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; border: 1px solid var(--border-color);">${tx.category}</span></td>
            <td>
                <button class="btn btn-danger btn-sm btn-delete-tx" data-id="${tx.id}">🗑️</button>
            </td>
        `;
        
        tr.querySelector(".btn-delete-tx").addEventListener("click", function() {
            if (confirm(`¿Eliminar transacción "${tx.name}"?`)) {
                StorageManager.deleteTransaction(this.dataset.id);
                appData = StorageManager.loadData();
                updateUI();
            }
        });

        dom.txListTableBody.appendChild(tr);
    });
}

// OBTENER PARÁMETROS DE SIMULACIÓN VACÍOS (DADO QUE SE QUITARON LOS SLIDERS DE LA UI)
function getSimulationParams() {
    return {
        monthly_savings_delta: 0,
        one_time_delta: 0,
        one_time_date: null,
        one_time_name: ""
    };
}

// POPULAR SELECTOR DE MESES EN LA PESTAÑA DE ESTADÍSTICAS
function populateAnalyticsMonths() {
    const today = new Date();
    dom.analyticsMonthSelect.innerHTML = "";
    
    // Generar 12 meses a futuro
    for (let i = 0; i < 12; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
        const val = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0');
        const labelRaw = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        const label = labelRaw.charAt(0).toUpperCase() + labelRaw.slice(1);
        
        const opt = document.createElement("option");
        opt.value = val;
        opt.textContent = label;
        dom.analyticsMonthSelect.appendChild(opt);
    }
    
    // Seleccionar el mes actual por defecto
    const currentMonthVal = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, '0');
    dom.analyticsMonthSelect.value = currentMonthVal;
}

// ---------------- RENDER: TAB 5 (DISTRIBUCIÓN DE GASTOS / ANALYTICS) ----------------
function updateAnalyticsView() {
    const selectedMonth = dom.analyticsMonthSelect.value;
    if (!selectedMonth) return;
    
    // Descomponer el año y el mes seleccionado
    const [year, month] = selectedMonth.split('-').map(Number);
    
    // Rango de fechas: día 1 al último día del mes
    const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    
    // Actualizar título de la sección de estadísticas
    const monthNameText = dom.analyticsMonthSelect.options[dom.analyticsMonthSelect.selectedIndex].text;
    dom.analyticsSummaryTitle.textContent = `Resumen de Flujos (${monthNameText})`;
    
    const simulations = getSimulationParams();
    
    let totalIncome = 0;
    let totalExpense = 0;
    const expenseByCat = {};
    
    // 1. Procesar transacciones reales que ocurren en este mes
    appData.transactions.forEach(tx => {
        const occs = FinanceEngine.getOccurrences(tx, startStr, endStr);
        const totalAmt = occs.length * parseFloat(tx.amount);
        
        if (totalAmt > 0) {
            if (tx.type === "income") {
                totalIncome += totalAmt;
            } else {
                totalExpense += totalAmt;
                expenseByCat[tx.category] = (expenseByCat[tx.category] || 0) + totalAmt;
            }
        }
    });
    
    // 2. Procesar simulaciones si están activas en el mes
    // Ahorro mensual (ocurre 1 vez al mes)
    if (simulations.monthly_savings_delta && simulations.monthly_savings_delta !== 0) {
        const delta = parseFloat(simulations.monthly_savings_delta);
        const totalSim = Math.abs(delta);
        if (delta > 0) {
            totalIncome += totalSim;
        } else {
            totalExpense += totalSim;
            expenseByCat["Simulación"] = (expenseByCat["Simulación"] || 0) + totalSim;
        }
    }
    
    // Evento único
    if (simulations.one_time_delta && simulations.one_time_delta !== 0 && simulations.one_time_date) {
        if (simulations.one_time_date >= startStr && simulations.one_time_date <= endStr) {
            const otDelta = parseFloat(simulations.one_time_delta);
            const name = simulations.one_time_name || "Simulación Única";
            if (otDelta > 0) {
                totalIncome += otDelta;
            } else {
                totalExpense += Math.abs(otDelta);
                expenseByCat[name] = (expenseByCat[name] || 0) + Math.abs(otDelta);
            }
        }
    }
    
    // Rellenar tabla
    dom.analyticsTableBody.innerHTML = "";
    
    const sortedCats = Object.keys(expenseByCat).map(cat => ({
        name: cat,
        amount: expenseByCat[cat]
    })).sort((a, b) => b.amount - a.amount);
    
    if (sortedCats.length === 0) {
        dom.analyticsTableBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 15px;">No hay gastos programados para este mes.</td></tr>`;
    } else {
        sortedCats.forEach(cat => {
            const pct = totalExpense > 0 ? (cat.amount / totalExpense) * 100 : 0;
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td style="font-weight: 600; color: var(--text-header);">${cat.name}</td>
                <td style="font-weight: 700;">${formatCurrency(cat.amount)}</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-weight: 600; min-width: 40px;">${pct.toFixed(1)}%</span>
                        <div style="flex: 1; height: 6px; background-color: #1a1a28; border-radius: 3px; overflow: hidden;">
                            <div style="height: 100%; width: ${pct}%; background-color: var(--color-primary);"></div>
                        </div>
                    </div>
                </td>
            `;
            dom.analyticsTableBody.appendChild(tr);
        });
    }

    // ---------------- DIBUJAR GRÁFICOS CON CHART.JS ----------------
    // 1. Gráfico de Dona: Gastos por Categoría
    const catCanvas = document.getElementById("categoryChart");
    if (categoryChart) {
        categoryChart.destroy();
    }

    const labels = sortedCats.map(c => c.name);
    const data = sortedCats.map(c => c.amount);

    if (sortedCats.length === 0) {
        categoryChart = new Chart(catCanvas, {
            type: 'doughnut',
            data: {
                labels: ['Sin Gastos'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['rgba(255, 255, 255, 0.05)'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            }
        });
    } else {
        categoryChart = new Chart(catCanvas, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#8a2be2', // Violeta
                        '#ff5252', // Coral/Rojo
                        '#ffd60a', // Amarillo
                        '#00d2ff', // Cian
                        '#ff007f', // Rosa
                        '#ff9f40', // Naranja
                        '#4bc0c0', // Verde-Azulado
                        '#00e676'  // Verde
                    ],
                    borderWidth: 1,
                    borderColor: 'rgba(20, 20, 32, 0.9)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#f3f3f5',
                            font: { family: 'Inter', size: 11 }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 15, 26, 0.95)',
                        titleColor: '#ffffff',
                        bodyColor: '#f3f3f5',
                        borderColor: 'rgba(255, 255, 255, 0.08)',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                const symbol = getCurrencyInfo().symbol;
                                const val = context.parsed;
                                const pct = (val / totalExpense) * 100;
                                return ` ${context.label}: ${symbol}${val.toLocaleString('es-ES', { minimumFractionDigits: 2 })} (${pct.toFixed(1)}%)`;
                            }
                        }
                    }
                },
                cutout: '65%'
            }
        });
    }

    // 2. Gráfico de Comparación: Ingresos vs Gastos (Barra Horizontal)
    const compCanvas = document.getElementById("flowComparisonChart");
    if (flowComparisonChart) {
        flowComparisonChart.destroy();
    }

    flowComparisonChart = new Chart(compCanvas, {
        type: 'bar',
        data: {
            labels: ['Ingresos', 'Gastos'],
            datasets: [{
                data: [totalIncome, totalExpense],
                backgroundColor: ['rgba(0, 230, 118, 0.85)', 'rgba(255, 82, 82, 0.85)'],
                borderColor: ['var(--color-success)', 'var(--color-danger)'],
                borderWidth: 1,
                borderRadius: 6,
                barThickness: 24
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 15, 26, 0.95)',
                    titleColor: '#ffffff',
                    bodyColor: '#f3f3f5',
                    callbacks: {
                        label: function(context) {
                            const symbol = getCurrencyInfo().symbol;
                            return ` ${context.label}: ${symbol}${context.parsed.x.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: false,
                    grid: { display: false }
                },
                y: {
                    grid: { display: false },
                    ticks: {
                        color: '#f3f3f5',
                        font: { family: 'Inter', weight: 'bold', size: 12 }
                    }
                }
            }
        }
    });
}

// ---------------- ASISTENTE DE IA: COMUNICACIÓN CON OPENAI ----------------
async function askAiAsesor() {
    const key = localStorage.getItem("openai_api_key") || "";
    if (!key) {
        alert("Por favor, ingresa tu clave API de OpenAI en la sección de configuración de la izquierda.");
        // Cambiar a la pestaña de IA si no están ahí
        dom.tabBtns.forEach(b => b.classList.remove("active"));
        dom.tabPanels.forEach(p => p.classList.remove("active"));
        document.querySelector('[data-tab="tab-ai-advisor"]').classList.add("active");
        document.getElementById("tab-ai-advisor").classList.add("active");
        dom.aiApiKey.focus();
        return;
    }
    
    const query = dom.aiQuery.value.trim();
    if (!query) {
        alert("Por favor, escribe una pregunta para tu asesor financiero.");
        dom.aiQuery.focus();
        return;
    }
    
    // Mostrar cargador
    dom.aiResponseWrapper.style.display = "none";
    dom.aiLoaderContainer.style.display = "flex";
    dom.btnAskAi.disabled = true;
    
    try {
        // 1. Obtener listas de ingresos y gastos
        const fixedExpenses = appData.transactions.filter(t => t.type === "expense" && t.frequency === "monthly");
        const fixedExpensesList = fixedExpenses.map(t => `- ${t.name}: ${formatCurrency(t.amount)} (Categoría: ${t.category})`).join("\n");
        
        const recurringIncomes = appData.transactions.filter(t => t.type === "income" && t.frequency === "monthly");
        const recurringIncomesList = recurringIncomes.map(t => `- ${t.name}: ${formatCurrency(t.amount)} (Categoría: ${t.category})`).join("\n");
        
        // 2. Ejecutar proyecciones a 30, 90 y 365 días
        const today = new Date();
        const todayStr = FinanceEngine.formatDateLocal(today);
        
        const end30 = new Date(today);
        end30.setDate(today.getDate() + 30);
        const end30Str = FinanceEngine.formatDateLocal(end30);
        
        const end90 = new Date(today);
        end90.setDate(today.getDate() + 90);
        const end90Str = FinanceEngine.formatDateLocal(end90);
        
        const end365 = new Date(today);
        end365.setDate(today.getDate() + 365);
        const end365Str = FinanceEngine.formatDateLocal(end365);
        
        const proj30 = FinanceEngine.runProjection(appData.initial_balance, appData.transactions, todayStr, end30Str);
        const bal30 = proj30[proj30.length - 1].balance;
        
        const proj90 = FinanceEngine.runProjection(appData.initial_balance, appData.transactions, todayStr, end90Str);
        const bal90 = proj90[proj90.length - 1].balance;
        
        const proj365 = FinanceEngine.runProjection(appData.initial_balance, appData.transactions, todayStr, end365Str);
        const bal365 = proj365[proj365.length - 1].balance;
        
        // 3. Crear Prompt de Contexto
        const systemPrompt = `Eres un asesor financiero personal experto. Tu objetivo es analizar la situación económica del usuario y aconsejarle sobre si puede permitirse ciertos gastos, cómo optimizar sus presupuestos o responder a sus inquietudes financieras de forma pragmática, realista y responsable.

Los datos financieros del usuario para el análisis son:
- Saldo inicial/actual: ${formatCurrency(appData.initial_balance)}
- Moneda activa: ${appData.currency}
- Ingresos recurrentes mensuales:
${recurringIncomesList || "Ninguno registrado"}
- Gastos fijos mensuales:
${fixedExpensesList || "Ninguno registrado"}

Saldos futuros estimados en base a proyecciones automáticas:
- Proyección de saldo a 30 días: ${formatCurrency(bal30)}
- Proyección de saldo a 90 días (3 meses): ${formatCurrency(bal90)}
- Proyección de saldo a 365 días (1 año): ${formatCurrency(bal365)}

Responde de manera directa, práctica y estructurada (usa viñetas para desglosar tus argumentos o consejos). Siempre sé realista: si consideras que el gasto propuesto es imprudente o pone en riesgo su flujo de caja o su fondo de reserva, explícale el porqué con números y ofrécele una alternativa (ej: "si esperas X semanas...", o "si reduces Y...").`;
        
        // 4. Llamar a la API de OpenAI
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${key}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: query }
                ],
                temperature: 0.5
            })
        });
        
        const resData = await response.json();
        
        if (!response.ok) {
            const errorMsg = resData.error ? resData.error.message : "Error desconocido en la API.";
            throw new Error(errorMsg);
        }
        
        const reply = resData.choices[0].message.content;
        
        // 5. Renderizar respuesta formateada
        dom.aiResponseWrapper.innerHTML = parseAiMarkdown(reply);
        dom.aiResponseWrapper.classList.remove("empty");
        
    } catch (err) {
        console.error("AI Error:", err);
        dom.aiResponseWrapper.innerHTML = `
            <div style="color: var(--color-danger); font-weight: 600;">⚠️ Error en la consulta del Asistente</div>
            <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 6px;">
                No pudimos comunicarnos con la API de OpenAI. Por favor verifica lo siguiente:
                <ul style="margin-left: 20px; margin-top: 6px;">
                    <li>¿Tu API Key es correcta?</li>
                    <li>¿Tu cuenta de OpenAI tiene saldo/créditos activos? (La clave API requiere saldo prepago en la plataforma de desarrolladores).</li>
                    <li>Detalle del error: <code>${err.message}</code></li>
                </ul>
            </div>
        `;
        dom.aiResponseWrapper.classList.remove("empty");
    } finally {
        // Ocultar cargador
        dom.aiLoaderContainer.style.display = "none";
        dom.aiResponseWrapper.style.display = "block";
        dom.btnAskAi.disabled = false;
    }
}

// FORMATEADOR SENCILLO DE MARKDOWN A HTML PARA LA RESPUESTA DE IA
function parseAiMarkdown(text) {
    // Escapar caracteres HTML para evitar inyección
    let html = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    
    // Encabezados H3, H2, H1
    html = html.replace(/^### (.*$)/gim, '<h3 style="margin-top: 14px; margin-bottom: 6px; color: var(--text-header); font-size: 0.95rem;">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 style="margin-top: 18px; margin-bottom: 8px; color: var(--text-header); font-size: 1.1rem;">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 style="margin-top: 22px; margin-bottom: 10px; color: var(--text-header); font-size: 1.25rem;">$1</h1>');
    
    // Negrita (**texto**)
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Cursiva (*texto*)
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Elementos de lista (- item o * item)
    html = html.replace(/^\s*[\*\-]\s+(.*$)/gim, '<li style="margin-left: 18px; margin-bottom: 4px; list-style-type: disc;">$1</li>');
    
    // Agrupar elementos <li> consecutivos en una sola lista <ul>
    html = html.replace(/(<li>.*<\/li>)/gms, '<ul style="margin-bottom: 12px; padding-left: 5px;">$1</ul>');
    
    // Saltos de línea
    html = html.replace(/\n/g, '<br>');
    
    // Limpiar saltos de línea repetidos generados por los encabezados
    html = html.replace(/(<\/h[1-3]>|<br>)\s*<br>/g, '$1');
    
    return `<div class="ai-response-content">${html}</div>`;
}

// ---------------- SINCRONIZACIÓN CON GOOGLE DRIVE (API v3) ----------------

// Inicializar Google Identity Services Client
function initGoogleAuth() {
    const clientId = localStorage.getItem("google_client_id");
    if (!clientId) {
        console.log("Sincronización de Drive omitida: No se ha configurado Google Client ID.");
        return;
    }
    if (!window.google) {
        console.warn("SDK de Google Accounts no disponible.");
        dom.gdSyncStatus.textContent = "Error: SDK de Google no cargó.";
        return;
    }
    
    try {
        googleTokenClient = google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: "https://www.googleapis.com/auth/drive.file",
            callback: async (tokenResponse) => {
                if (tokenResponse.error !== undefined) {
                    console.error("Google Auth Error:", tokenResponse.error);
                    dom.gdSyncStatus.textContent = `Error: ${tokenResponse.error_description || "Fallo en autenticación"}`;
                    return;
                }
                googleAccessToken = tokenResponse.access_token;
                dom.gdSyncStatus.textContent = "Conectado. Sincronizando datos...";
                await performDriveSync();
            }
        });
        console.log("Google OAuth client inicializado correctamente.");
    } catch (err) {
        console.error("Fallo al inicializar Google Token Client:", err);
        dom.gdSyncStatus.textContent = `Error de Inicialización: ${err.message}`;
    }
}

// Iniciar proceso de sincronización
function syncWithGoogleDrive() {
    const clientId = localStorage.getItem("google_client_id");
    if (!clientId) {
        alert("Por favor, ingresa tu Client ID de Google Cloud y guárdalo primero.");
        dom.gdClientId.focus();
        return;
    }
    
    // Si no está inicializado, intentar hacerlo
    if (!googleTokenClient) {
        initGoogleAuth();
    }
    
    if (!googleTokenClient) {
        alert("No se pudo iniciar el cliente de Google. Revisa tu Client ID.");
        return;
    }
    
    dom.gdSyncStatus.textContent = "Solicitando autorización de Google...";
    
    // Si ya tenemos token, sincronizar directamente. Si no, pedir token.
    if (googleAccessToken) {
        dom.gdSyncStatus.textContent = "Conectado. Sincronizando...";
        performDriveSync();
    } else {
        googleTokenClient.requestAccessToken({ prompt: 'consent' });
    }
}

// Ejecutar sincronización (Búsqueda, Descarga, Comparación y Carga)
async function performDriveSync() {
    if (!googleAccessToken) return;
    
    const fileName = "planificador_financiero_datos.json";
    
    try {
        // 1. Buscar si el archivo ya existe en Drive
        const query = encodeURIComponent(`name='${fileName}' and trashed=false`);
        const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;
        
        const searchResponse = await fetch(searchUrl, {
            headers: { "Authorization": `Bearer ${googleAccessToken}` }
        });
        
        if (!searchResponse.ok) {
            throw new Error(`Error al buscar archivo en Drive: ${searchResponse.statusText}`);
        }
        
        const searchResult = await searchResponse.json();
        const file = searchResult.files && searchResult.files[0];
        
        if (file) {
            // EL ARCHIVO EXISTE EN DRIVE
            const fileId = file.id;
            console.log("Archivo encontrado en Google Drive con ID:", fileId);
            
            // 2. Descargar los datos desde Drive
            const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
            const downloadResponse = await fetch(downloadUrl, {
                headers: { "Authorization": `Bearer ${googleAccessToken}` }
            });
            
            if (!downloadResponse.ok) {
                throw new Error(`Error al descargar archivo desde Drive: ${downloadResponse.statusText}`);
            }
            
            const driveData = await downloadResponse.json();
            
            // 3. Comparar marcas de tiempo
            const localLastUpdated = appData.last_updated || 0;
            const driveLastUpdated = driveData.last_updated || 0;
            
            console.log(`Última actualización - Local: ${localLastUpdated} | Drive: ${driveLastUpdated}`);
            
            if (driveLastUpdated > localLastUpdated) {
                // LOS DATOS DE DRIVE SON MÁS NUEVOS: Sobrescribir datos locales
                if (confirm(`Los datos en Google Drive son más recientes (${new Date(driveLastUpdated).toLocaleString()}) que tus datos locales (${new Date(localLastUpdated).toLocaleString()}).\n\n¿Deseas descargar los datos de la nube y sobrescribir los datos actuales en este navegador?`)) {
                    StorageManager.saveData(driveData);
                    appData = StorageManager.loadData();
                    updateUI();
                    dom.gdSyncStatus.textContent = `Sincronizado: Datos descargados de Drive (${new Date().toLocaleTimeString()})`;
                    alert("Datos de la nube descargados e integrados correctamente.");
                } else {
                    // Si el usuario rechaza, subimos la local a Drive para forzar consistencia
                    dom.gdSyncStatus.textContent = "Subiendo versión local a Drive...";
                    await uploadFileToDrive(fileId);
                }
            } else if (localLastUpdated > driveLastUpdated) {
                // LOS DATOS LOCALES SON MÁS NUEVOS: Sobrescribir datos en Drive
                console.log("Los datos locales son más recientes. Subiendo a Google Drive...");
                await uploadFileToDrive(fileId);
            } else {
                // YA ESTÁN EN SINCRONÍA
                dom.gdSyncStatus.textContent = `Sincronizado: Al día (${new Date().toLocaleTimeString()})`;
                console.log("La versión local y de la nube están al día.");
            }
        } else {
            // EL ARCHIVO NO EXISTE EN DRIVE: Crear uno nuevo
            console.log("El archivo no existe en Google Drive. Creando nuevo archivo...");
            await createFileInDrive();
        }
    } catch (err) {
        console.error("Fallo en sincronización de Drive:", err);
        dom.gdSyncStatus.textContent = `Error de sincronización: ${err.message}`;
    }
}

// Función auxiliar para subir (PATCH/Actualizar) archivo existente a Drive
async function uploadFileToDrive(fileId) {
    const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
    
    // Asegurar que el objeto local tenga timestamp actualizado
    appData.last_updated = Date.now();
    StorageManager.saveData(appData); // Sincroniza en localStorage local
    
    const response = await fetch(uploadUrl, {
        method: "PATCH",
        headers: {
            "Authorization": `Bearer ${googleAccessToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(appData)
    });
    
    if (!response.ok) {
        throw new Error(`Fallo al actualizar archivo en Drive: ${response.statusText}`);
    }
    
    dom.gdSyncStatus.textContent = `Sincronizado: Subido a Drive (${new Date().toLocaleTimeString()})`;
    console.log("Archivo actualizado en Google Drive con éxito.");
}

// Función auxiliar para crear (POST) archivo por primera vez en Drive
async function createFileInDrive() {
    const metadata = {
        name: "planificador_financiero_datos.json",
        mimeType: "application/json"
    };
    
    appData.last_updated = Date.now();
    StorageManager.saveData(appData);
    
    const form = new FormData();
    form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
    form.append("file", new Blob([JSON.stringify(appData)], { type: "application/json" }));
    
    const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${googleAccessToken}`
        },
        body: form
    });
    
    if (!response.ok) {
        throw new Error(`Fallo al crear archivo en Drive: ${response.statusText}`);
    }
    
    dom.gdSyncStatus.textContent = `Sincronizado: Archivo creado en Drive (${new Date().toLocaleTimeString()})`;
    console.log("Archivo creado en Google Drive con éxito.");
}

// ---------------- ACTUALIZACIÓN INTEGRAL DE LA UI ----------------
function updateUI() {
    updateCalculatorView();
    updateWeeklySavingView();
    updateMonthlyGridView();
    updateAnalyticsView();
    updateTransactionsListView();
}

// INICIAR AL CARGAR
window.addEventListener("DOMContentLoaded", init);
