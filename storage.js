const STORAGE_KEY = "financial_projection_data";

// Función auxiliar para formatear la fecha local sin desfases de huso horario
const formatDateLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const DEFAULT_DATA = {
    initial_balance: 5000.0,
    currency: "USD",
    savings_goals: [
        {
            id: "g1",
            name: "Fondo de Emergencia",
            target_amount: 10000.0,
            target_date: formatDateLocal(new Date(new Date().getFullYear() + 1, 11, 31)) // Fin del próximo año
        }
    ],
    transactions: [
        {
            id: "t1",
            name: "Salario Mensual",
            amount: 3500.0,
            type: "income",
            frequency: "monthly",
            start_date: formatDateLocal(new Date()),
            end_date: null,
            category: "Trabajo"
        },
        {
            id: "t2",
            name: "Alquiler",
            amount: 1200.0,
            type: "expense",
            frequency: "monthly",
            start_date: formatDateLocal(new Date()),
            end_date: null,
            category: "Vivienda"
        },
        {
            id: "t3",
            name: "Servicios (Luz, Internet)",
            amount: 150.0,
            type: "expense",
            frequency: "monthly",
            start_date: formatDateLocal(new Date()),
            end_date: null,
            category: "Servicios"
        },
        {
            id: "t4",
            name: "Gimnasio",
            amount: 50.0,
            type: "expense",
            frequency: "monthly",
            start_date: formatDateLocal(new Date()),
            end_date: null,
            category: "Salud"
        },
        {
            id: "t5",
            name: "Supermercado Semanal",
            amount: 120.0,
            type: "expense",
            frequency: "weekly",
            start_date: formatDateLocal(new Date()),
            end_date: null,
            category: "Comida"
        },
        {
            id: "t6",
            name: "Bono de Fin de Año",
            amount: 1500.0,
            type: "income",
            frequency: "yearly",
            start_date: formatDateLocal(new Date(new Date().getFullYear(), 11, 15)), // 15 de dic de este año
            end_date: null,
            category: "Otros"
        }
    ]
};

const StorageManager = {
    loadData: function() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            this.saveData(DEFAULT_DATA);
            return JSON.parse(JSON.stringify(DEFAULT_DATA));
        }
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.error("Error parsing storage data, using defaults:", e);
            return JSON.parse(JSON.stringify(DEFAULT_DATA));
        }
    },

    saveData: function(data) {
        data.last_updated = Date.now();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return true;
    },

    updateInitialBalance: function(balance) {
        const data = this.loadData();
        data.initial_balance = parseFloat(balance);
        this.saveData(data);
    },

    updateCurrency: function(currency) {
        const data = this.loadData();
        data.currency = currency;
        this.saveData(data);
    },

    addTransaction: function(name, amount, type, frequency, startDate, endDate = null, category = "Otros") {
        const data = this.loadData();
        const newTx = {
            id: "t_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
            name: name,
            amount: parseFloat(amount),
            type: type,
            frequency: frequency,
            start_date: startDate,
            end_date: endDate || null,
            category: category
        };
        data.transactions.push(newTx);
        this.saveData(data);
        return newTx;
    },

    deleteTransaction: function(id) {
        const data = this.loadData();
        data.transactions = data.transactions.filter(t => t.id !== id);
        this.saveData(data);
    },

    saveGoal: function(id, name, targetAmount, targetDate) {
        const data = this.loadData();
        if (!id) {
            const newGoal = {
                id: "g_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
                name: name,
                target_amount: parseFloat(targetAmount),
                target_date: targetDate
            };
            data.savings_goals.push(newGoal);
        } else {
            const goal = data.savings_goals.find(g => g.id === id);
            if (goal) {
                goal.name = name;
                goal.target_amount = parseFloat(targetAmount);
                goal.target_date = targetDate;
            }
        }
        this.saveData(data);
    },

    deleteGoal: function(id) {
        const data = this.loadData();
        data.savings_goals = data.savings_goals.filter(g => g.id !== id);
        this.saveData(data);
    },

    resetData: function() {
        this.saveData(DEFAULT_DATA);
        return JSON.parse(JSON.stringify(DEFAULT_DATA));
    }
};
