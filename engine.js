const FinanceEngine = {
    // Formatea una fecha en formato YYYY-MM-DD en hora local
    formatDateLocal: function(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    // Genera todas las fechas en formato YYYY-MM-DD entre startDate y endDate (inclusive)
    generateDateRange: function(start, end) {
        const dates = [];
        let current = new Date(start + "T00:00:00");
        const stop = new Date(end + "T00:00:00");
        
        while (current <= stop) {
            dates.push(this.formatDateLocal(current));
            current.setDate(current.getDate() + 1);
        }
        return dates;
    },

    // Obtiene las ocurrencias de una transacción en el rango proyectado
    getOccurrences: function(tx, projStart, projEnd) {
        const occurrences = [];
        const txStart = new Date(tx.start_date + "T00:00:00");
        const txEnd = tx.end_date ? new Date(tx.end_date + "T00:00:00") : null;
        
        const startLimit = new Date(projStart + "T00:00:00");
        const endLimit = new Date(projEnd + "T00:00:00");
        
        // El ciclo de transacciones empieza en la fecha de inicio efectiva más tardía
        const effStart = txStart > startLimit ? txStart : startLimit;
        const effEnd = txEnd && txEnd < endLimit ? txEnd : endLimit;

        if (effStart > effEnd) {
            return occurrences;
        }

        const freq = tx.frequency;

        if (freq === "one-time") {
            if (txStart >= startLimit && txStart <= endLimit) {
                occurrences.push(tx.start_date);
            }
        } 
        else if (freq === "daily") {
            let curr = new Date(effStart);
            while (curr <= effEnd) {
                occurrences.push(this.formatDateLocal(curr));
                curr.setDate(curr.getDate() + 1);
            }
        } 
        else if (freq === "weekly") {
            let curr = new Date(txStart);
            while (curr < effStart) {
                curr.setDate(curr.getDate() + 7);
            }
            while (curr <= effEnd) {
                occurrences.push(this.formatDateLocal(curr));
                curr.setDate(curr.getDate() + 7);
            }
        } 
        else if (freq === "bi-weekly") {
            let curr = new Date(txStart);
            while (curr < effStart) {
                curr.setDate(curr.getDate() + 14);
            }
            while (curr <= effEnd) {
                occurrences.push(this.formatDateLocal(curr));
                curr.setDate(curr.getDate() + 14);
            }
        } 
        else if (freq === "monthly") {
            const targetDay = txStart.getDate();
            let currYear = effStart.getFullYear();
            let currMonth = effStart.getMonth(); // 0-indexed
            
            const endYear = effEnd.getFullYear();
            const endMonth = effEnd.getMonth();
            
            let currVal = currYear * 12 + currMonth;
            const endVal = endYear * 12 + endMonth;
            
            while (currVal <= endVal) {
                const year = Math.floor(currVal / 12);
                const month = currVal % 12;
                
                // Obtener el último día del mes destino
                const lastDay = new Date(year, month + 1, 0).getDate();
                const day = Math.min(targetDay, lastDay);
                
                const occDate = new Date(year, month, day);
                if (occDate >= effStart && occDate <= effEnd) {
                    occurrences.push(this.formatDateLocal(occDate));
                }
                currVal++;
            }
        } 
        else if (freq === "yearly") {
            const targetMonth = txStart.getMonth();
            const targetDay = txStart.getDate();
            let currYear = effStart.getFullYear();
            const endYear = effEnd.getFullYear();
            
            while (currYear <= endYear) {
                const lastDay = new Date(currYear, targetMonth + 1, 0).getDate();
                const day = Math.min(targetDay, lastDay);
                
                const occDate = new Date(currYear, targetMonth, day);
                if (occDate >= effStart && occDate <= effEnd) {
                    occurrences.push(this.formatDateLocal(occDate));
                }
                currYear++;
            }
        }

        return occurrences;
    },

    // Ejecuta la proyección del saldo financiero
    runProjection: function(initialBalance, transactions, startStr, endStr, simulations = {}) {
        const dates = this.generateDateRange(startStr, endStr);
        
        // Crear mapa para acumular flujos por día
        const timeline = {};
        dates.forEach(d => {
            timeline[d] = {
                income: 0,
                expense: 0,
                details: []
            };
        });

        // Procesar transacciones reales
        transactions.forEach(tx => {
            const occurrences = this.getOccurrences(tx, startStr, endStr);
            const amount = parseFloat(tx.amount);
            const type = tx.type;
            const name = tx.name;

            occurrences.forEach(dateStr => {
                if (timeline[dateStr]) {
                    if (type === "income") {
                        timeline[dateStr].income += amount;
                        timeline[dateStr].details.push(`+${amount.toFixed(2)} (${name})`);
                    } else {
                        timeline[dateStr].expense += amount;
                        timeline[dateStr].details.push(`-${amount.toFixed(2)} (${name})`);
                    }
                }
            });
        });

        // Aplicar simulaciones
        // 1. Ahorro mensual adicional (ocurre a fin de cada mes)
        if (simulations.monthly_savings_delta && simulations.monthly_savings_delta !== 0) {
            const delta = parseFloat(simulations.monthly_savings_delta);
            const uniqueMonths = {};
            
            // Agrupar fechas por Año-Mes
            dates.forEach(d => {
                const parts = d.split('-');
                const yearMonth = parts[0] + '-' + parts[1];
                uniqueMonths[yearMonth] = d; // Mantiene la última fecha vista para ese mes (el último día en el rango)
            });

            Object.keys(uniqueMonths).forEach(ym => {
                const lastDayStr = uniqueMonths[ym];
                if (timeline[lastDayStr]) {
                    if (delta > 0) {
                        timeline[lastDayStr].income += delta;
                        timeline[lastDayStr].details.push(`+${delta.toFixed(2)} (Ahorro Simulado)`);
                    } else {
                        timeline[lastDayStr].expense += Math.abs(delta);
                        timeline[lastDayStr].details.push(`-${Math.abs(delta).toFixed(2)} (Gasto Simulado)`);
                    }
                }
            });
        }

        // 2. Inyección/Gasto único simulado
        if (simulations.one_time_delta && simulations.one_time_delta !== 0 && simulations.one_time_date) {
            const otDate = simulations.one_time_date;
            const otDelta = parseFloat(simulations.one_time_delta);
            
            if (timeline[otDate]) {
                const description = simulations.one_time_name || "Evento Simulado";
                if (otDelta > 0) {
                    timeline[otDate].income += otDelta;
                    timeline[otDate].details.push(`+${otDelta.toFixed(2)} (${description})`);
                } else {
                    timeline[otDate].expense += Math.abs(otDelta);
                    timeline[otDate].details.push(`-${Math.abs(otDelta).toFixed(2)} (${description})`);
                }
            }
        }

        // Acumular balance cronológicamente
        let runningBalance = parseFloat(initialBalance);
        const results = [];

        dates.forEach(d => {
            const dayData = timeline[d];
            const netFlow = dayData.income - dayData.expense;
            runningBalance += netFlow;

            results.push({
                date: d,
                income: dayData.income,
                expense: dayData.expense,
                details: dayData.details.length > 0 ? dayData.details.join(" | ") : "Sin movimientos",
                balance: runningBalance
            });
        });

        return results;
    }
};
