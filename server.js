/* * ============================================
 * SERVIDOR BACKEND - Carrara Smart Clinic Admin
 * ============================================
 */

// 1. Importar as ferramentas
const express = require('express');
const sqlite3 = require('sqlite3');
const cors = require('cors');
const bcrypt = require('bcrypt'); // Importa bcrypt
const saltRounds = 10; // Fator de custo para bcrypt
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);

// 2. Configurar o Servidor Express
const app = express();
const PORT = 3000;

// 3. Configurar os "Middlewares"
app.use(cors({
    origin: 'http://127.0.0.1:5500', // Permite requisições do seu Live Server
    credentials: true // Permite que o navegador envie/receba cookies de sessão
}));
app.use(express.json());

app.use(session({
    store: new SQLiteStore({
        db: 'carrara.db', // Nome do seu arquivo de banco de dados
        dir: './', // Diretório onde o DB está (raiz do projeto)
        table: 'sessions' // Nome da tabela que será criada para guardar sessões
    }),
    secret: 'JoseManuel11032025', // MUDE ISSO PARA ALGO ALEATÓRIO E LONGO!
    resave: false, // Não salva a sessão se não houver mudanças
    saveUninitialized: false, // Não cria sessão até algo ser armazenado
    cookie: {
        maxAge: 1000 * 60 * 60 * 8, // Tempo de vida do cookie (8 horas)
        secure: false, // Mude para true se usar HTTPS em produção
        httpOnly: true, // Impede acesso ao cookie via JS no frontend (segurança)
        sameSite: 'lax' // Proteção contra CSRF
    }
}));

// 4. Conectar ao Banco de Dados SQLite
const db = new sqlite3.Database('./carrara.db', (err) => {
    if (err) {
        console.error("Erro ao conectar ao banco de dados:", err.message);
    } else {
        console.log("Conectado ao banco de dados 'carrara.db' com sucesso.");
        // HABILITA A VERIFICAÇÃO DE CHAVES ESTRANGEIRAS (IMPORTANTE PARA ON DELETE CASCADE)
        db.exec('PRAGMA foreign_keys = ON;', (pragmaErr) => {
            if (pragmaErr) {
                console.error("Erro ao habilitar foreign keys:", pragmaErr.message);
            } else {
                console.log("Verificação de Foreign Keys habilitada.");
            }
        });
    }
});

/* * ============================================
 * SERVER ARQUIVOS ESTÁTICOS (HTML, CSS, JS, Imagens)
 * ============================================
 * Permite testar o site localmente via Node.js
 */
app.use(express.static(__dirname));

/* * ============================================
 * ROTAS DA API (Nossos Endpoints)
 * ============================================
 */

/* * ============================================
 * MIDDLEWARE DE AUTENTICAÇÃO
 * ============================================
 * Verifica se o usuário está autenticado através da sessão
 */
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        console.log(`--> Middleware isAuthenticated: Usuário autenticado (ID: ${req.session.userId})`);
        next();
    } else {
        console.warn('--> Middleware isAuthenticated: Acesso não autorizado - sessão não encontrada');
        return res.status(401).json({ error: "Acesso não autorizado" });
    }
}

/* * ============================================
 * TEMA 1: DASHBOARD
 * ============================================
 */

// ROTA (GET): Buscar dados agregados para o Dashboard
app.get('/api/dashboard', isAuthenticated, async (req, res) => {
    console.log("--> GET /api/dashboard: Rota recebida.");
    try {
        const results = {};
        const now = new Date();
        const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
        const endOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));
        const startOfMonthStr = startOfMonth.toISOString().split('T')[0];
        const endOfMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const endOfMonthStr = endOfMonthDate.toISOString().split('T')[0];
        console.log(`--> GET /api/dashboard: Buscando dados para ${startOfMonthStr} a ${endOfMonthStr}`);

        // --- US01: Cards ---
        results.visitorsMonth = 1204; // Mockado // cite: 17]

        const appointmentsMonthSql = `SELECT COUNT(id) as count FROM appointments WHERE date_time BETWEEN ? AND ?`; // // cite: 17, 19]
        results.appointmentsMonth = await dbAllAsync(appointmentsMonthSql, [startOfMonth.toISOString(), endOfMonth.toISOString()]).then(rows => rows[0].count);
        console.log(`--> GET /api/dashboard: Agendamentos Mês: ${results.appointmentsMonth}`);

        const revenueMonthSql = `SELECT SUM(value_paid) as total FROM appointments WHERE status = 'realizado' AND payment_status = 'pago' AND date_time BETWEEN ? AND ?`; // // cite: 17, 19]
        results.revenueMonth = await dbAllAsync(revenueMonthSql, [startOfMonth.toISOString(), endOfMonth.toISOString()]).then(rows => rows[0].total || 0);
        console.log(`--> GET /api/dashboard: Receita Mês: ${results.revenueMonth}`);

        const expenseMonthSql = `SELECT SUM(value) as total FROM expenses WHERE date BETWEEN ? AND ?`; // // cite: 17, 19]
        results.expenseMonth = await dbAllAsync(expenseMonthSql, [startOfMonthStr, endOfMonthStr]).then(rows => rows[0].total || 0);
        console.log(`--> GET /api/dashboard: Despesa Mês: ${results.expenseMonth}`);

        // --- US02: Próximos Agendamentos ---
        const upcomingAppointmentsSql = `
            SELECT app.id, app.date_time, app.service_value, cli.name as client_name, app.service_name
            FROM appointments app LEFT JOIN clients cli ON app.client_id = cli.id
            WHERE app.status = 'agendado' AND app.date_time >= datetime('now', 'localtime')
            ORDER BY app.date_time ASC LIMIT 5`; // // cite: 20, 22]
        results.upcomingAppointments = await dbAllAsync(upcomingAppointmentsSql, []);
        console.log(`--> GET /api/dashboard: Próximos Agendamentos: ${results.upcomingAppointments.length}`);

        // --- US03: Categorias Populares ---
        const popularCategoriesSql = `SELECT category, COUNT(id) as count FROM appointments WHERE status = 'realizado' GROUP BY category ORDER BY count DESC`; // // cite: 23]
        results.popularCategories = await dbAllAsync(popularCategoriesSql, []);
        console.log(`--> GET /api/dashboard: Categorias Populares: ${results.popularCategories.length}`);

        // --- US04: Serviços Populares ---
        const popularServicesSql = `SELECT service_name, COUNT(id) as count FROM appointments WHERE status = 'realizado' GROUP BY service_name ORDER BY count DESC`; // // cite: 28]
        results.popularServices = await dbAllAsync(popularServicesSql, []);
        console.log(`--> GET /api/dashboard: Serviços Populares: ${results.popularServices.length}`);

        console.log("--> GET /api/dashboard: Dados agregados com sucesso.");
        res.json(results);

    } catch (err) {
        console.error("--> GET /api/dashboard: ERRO:", err.message);
        res.status(500).json({ error: `Erro ao buscar dados do dashboard: ${err.message}` });
    }
});

/* * ============================================
 * TEMA 2: AGENDAMENTOS
 * ============================================
 */

// ROTA (GET): Buscar todos os agendamentos
app.get('/api/appointments', isAuthenticated, (req, res) => {
    console.log("--> GET /api/appointments: Rota recebida.");
    const sql = `
        SELECT app.*, cli.name as client_name
        FROM appointments app LEFT JOIN clients cli ON app.client_id = cli.id
        ORDER BY app.date_time DESC`;
    console.log("--> GET /api/appointments: Executando SQL:", sql);
    db.all(sql, [], (err, rows) => {
        if (err) { console.error("--> GET /api/appointments: ERRO:", err.message); if (!res.headersSent) res.status(500).json({ error: err.message }); return; }
        console.log(`--> GET /api/appointments: Retornou ${rows ? rows.length : 0} linhas.`);
        if (!res.headersSent) res.json(rows);
    });
});

// ROTA (POST): Adicionar um novo agendamento (US05)
app.post('/api/appointments', isAuthenticated, (req, res) => {
    console.log("--> POST /api/appointments: Rota recebida.");
    const { client_id, service_name, category, date_time, service_value } = req.body;
    console.log("--> POST /api/appointments: Dados:", req.body);
    // Validação (Assume que client_id existe se não for novo, frontend lida com a criação/seleção)
    if (!client_id || !service_name || !date_time) {
        console.error("--> POST /api/appointments: ERRO - Validação falhou.");
        return res.status(400).json({ error: "Cliente, Serviço e Data/Hora são obrigatórios." });
    }
     if (isNaN(new Date(date_time).getTime())) {
          console.error("--> POST /api/appointments: ERRO - Data/Hora inválida.");
         return res.status(400).json({ error: "Formato de Data/Hora inválido." });
     }

    const sql = `INSERT INTO appointments (client_id, service_name, category, date_time, service_value, status, payment_status) VALUES (?, ?, ?, ?, ?, 'agendado', 'pendente')`; // // cite: 6] Status inicial
    const final_service_value = (service_value !== undefined && service_value !== '' && !isNaN(parseFloat(service_value))) ? parseFloat(service_value) : null;
    const date_time_utc = new Date(date_time).toISOString();
    const params = [client_id, service_name, category, date_time_utc, final_service_value];
    console.log("--> POST /api/appointments: SQL:", sql, params);
    db.run(sql, params, function (err) {
        if (err) { console.error("--> POST /api/appointments: ERRO db.run:", err.message); if (!res.headersSent) res.status(500).json({ error: err.message }); return; }
        console.log(`--> POST /api/appointments: Inserido com ID: ${this.lastID}`);
        if (!res.headersSent) res.status(201).json({ appointmentId: this.lastID });
    });
});

// ROTA (PUT): Atualizar STATUS de um agendamento (US06)
app.put('/api/appointments/:id/status', isAuthenticated, (req, res) => {
    const id = req.params.id;
const { status } = req.body; // // cite: 35] Espera 'realizado', 'cancelado', 'nao_compareceu'
    console.log(`--> PUT /api/appointments/${id}/status: Rota recebida. Novo status: ${status}`);
    const validStatuses = ['realizado', 'cancelado', 'nao_compareceu', 'agendado'];
    if (!status || !validStatuses.includes(status)) { return res.status(400).json({ error: "Status inválido fornecido." }); }
    const sql = "UPDATE appointments SET status = ? WHERE id = ?";
    db.run(sql, [status, id], function (err) {
        if (err) { console.error(`--> PUT /api/appointments/${id}/status: ERRO:`, err.message); if (!res.headersSent) res.status(500).json({ error: err.message }); return; }
        if (this.changes === 0) { return res.status(404).json({ error: "Agendamento não encontrado." }); }
        console.log(`--> PUT /api/appointments/${id}/status: Status atualizado.`);
if (!res.headersSent) res.json({ message: `Status do agendamento atualizado para ${status}!` }); // // cite: 35]
    });
});

// ROTA (PUT): Atualizar PAGAMENTO de um agendamento (US08)
app.put('/api/appointments/:id/payment', isAuthenticated, (req, res) => {
    const id = req.params.id;
const { payment_status, value_paid } = req.body; // // cite: 37] Espera 'pago' e valor
    console.log(`--> PUT /api/appointments/${id}/payment: Rota recebida. Status: ${payment_status}, Valor: ${value_paid}`);
    if (payment_status !== 'pago' || value_paid === undefined || value_paid === null || isNaN(parseFloat(value_paid)) || parseFloat(value_paid) < 0 ) {
        return res.status(400).json({ error: "Status de pagamento inválido ou valor pago não fornecido/inválido." });
    }
    const sql = "UPDATE appointments SET payment_status = ?, value_paid = ?, status = 'realizado' WHERE id = ?"; // // cite: 6, 37] Força status 'realizado' ao pagar
    db.run(sql, [payment_status, parseFloat(value_paid), id], function (err) {
        if (err) { console.error(`--> PUT /api/appointments/${id}/payment: ERRO:`, err.message); if (!res.headersSent) res.status(500).json({ error: err.message }); return; }
        if (this.changes === 0) { return res.status(404).json({ error: "Agendamento não encontrado." }); }
        console.log(`--> PUT /api/appointments/${id}/payment: Pagamento atualizado.`);
        if (!res.headersSent) res.json({ message: `Agendamento marcado como pago com valor € ${parseFloat(value_paid).toFixed(2)}!` });
    });
});

// ROTA (PUT): REAGENDAR um agendamento (US07)
app.put('/api/appointments/:id/reschedule', isAuthenticated, (req, res) => {
    const id = req.params.id;
const { date_time } = req.body; // // cite: 36] Espera nova data/hora
    console.log(`--> PUT /api/appointments/${id}/reschedule: Rota recebida. Nova data: ${date_time}`);
    if (!date_time) { return res.status(400).json({ error: "Nova data/hora obrigatória." }); }
    if (isNaN(new Date(date_time).getTime())) { return res.status(400).json({ error: "Formato de data/hora inválido." }); }
    const date_time_utc = new Date(date_time).toISOString();
    const sql = "UPDATE appointments SET date_time = ?, status = 'agendado' WHERE id = ? AND status = 'agendado'"; // // cite: 36] Só reagenda se estava 'agendado'
    db.run(sql, [date_time_utc, id], function (err) {
        if (err) { console.error(`--> PUT /api/appointments/${id}/reschedule: ERRO:`, err.message); if (!res.headersSent) res.status(500).json({ error: err.message }); return; }
        if (this.changes === 0) { return res.status(404).json({ error: "Agendamento não encontrado ou não está 'agendado'." }); }
        console.log(`--> PUT /api/appointments/${id}/reschedule: Reagendado com sucesso.`);
        if (!res.headersSent) res.json({ message: "Agendamento reagendado!" });
    });
});

/* * ============================================
 * TEMA 3: CLIENTES
 * ============================================
 */

// ROTA (GET): Buscar todos os clientes // cite: 10]
app.get('/api/clients', isAuthenticated, (req, res) => {
    const sql = "SELECT * FROM clients ORDER BY name";
    db.all(sql, [], (err, rows) => { if (err) { res.status(500).json({ error: err.message }); return; } res.json(rows); });
});
// ROTA (GET): Buscar UM cliente pelo ID
app.get('/api/clients/:id', isAuthenticated, (req, res) => {
    const id = req.params.id; const sql = "SELECT * FROM clients WHERE id = ?";
    db.get(sql, [id], (err, row) => { if (err) { res.status(500).json({ error: err.message }); return; } if (!row) { return res.status(404).json({ error: "Cliente não encontrado." }); } res.json(row); });
});
// ROTA (POST): Adicionar um novo cliente // cite: 33]
app.post('/api/clients', isAuthenticated, (req, res) => {
const { name, email, phone } = req.body; if (!name || !phone) { return res.status(400).json({ error: "Nome e Telefone são obrigatórios." }); } // // cite: 39]
    const sql = "INSERT INTO clients (name, email, phone) VALUES (?, ?, ?)";
    db.run(sql, [name, email, phone], function (err) { if (err) { res.status(500).json({ error: err.message }); return; } res.status(201).json({ clientId: this.lastID }); });
});
// ROTA (PUT): Atualizar um cliente existente // cite: 39]
app.put('/api/clients/:id', isAuthenticated, (req, res) => {
    const id = req.params.id; const { name, email, phone } = req.body; if (!name || !phone) { return res.status(400).json({ error: "Nome e Telefone são obrigatórios." }); }
    const sql = "UPDATE clients SET name = ?, email = ?, phone = ? WHERE id = ?";
    db.run(sql, [name, email, phone, id], function (err) { if (err) { res.status(500).json({ error: err.message }); return; } if (this.changes === 0) { return res.status(404).json({ error: "Cliente não encontrado." }); } res.json({ message: "Cliente atualizado!" }); });
});
// ROTA (DELETE): Excluir um cliente // cite: 39]
app.delete('/api/clients/:id', isAuthenticated, (req, res) => {
    const id = req.params.id; const sql = "DELETE FROM clients WHERE id = ?";
    db.run(sql, [id], function (err) { if (err) { if (err.message.includes('FOREIGN KEY constraint failed')) { return res.status(400).json({ error: "Não é possível excluir: cliente possui vínculos." }); } res.status(500).json({ error: err.message }); return; } if (this.changes === 0) { return res.status(404).json({ error: "Cliente não encontrado." }); } res.json({ message: "Cliente excluído!" }); });
});

/* * ============================================
 * TEMA 4: ANAMNESES
 * ============================================
 */

// ROTA (POST): Salvar um novo formulário de Anamnese Geral (US10) - CORRIGIDA
app.post('/api/anamneses/general', isAuthenticated, (req, res) => { // // cite: 41]
    console.log("--> POST /api/anamneses/general: Rota recebida."); const receivedData = req.body; console.log("--> POST /api/anamneses/general: Dados:", receivedData);
    const { client_id, date_created } = receivedData; if (!client_id || !date_created) { console.error("--> POST /api/anamneses/general: ERRO - Cliente/Data ausentes."); return res.status(400).json({ error: "Cliente e Data são obrigatórios." }); }
    const columns = [ 'client_id', 'date_created', 'main_objective', 'is_pregnant', 'obs_pregnant', 'is_lactating', 'obs_lactating', 'has_autoimmune', 'obs_autoimmune', 'has_diabetes', 'obs_diabetes', 'has_hypertension', 'obs_hypertension', 'has_pacemaker', 'has_thrombosis', 'obs_thrombosis', 'has_epilepsy', 'obs_epilepsy', 'has_cancer_history', 'obs_cancer_history', 'has_metal_implants', 'obs_metal_implants', 'has_iud', 'obs_iud', 'has_keloid', 'has_herpes', 'obs_herpes', 'has_allergies', 'obs_allergies', 'used_roacutan_6m', 'uses_anticoagulant', 'obs_anticoagulant', 'medications_in_use', 'sun_exposure', 'uses_sunscreen', 'is_smoker', 'consent_terms_accepted', 'consent_data_truthful', 'consent_procedures', 'consent_photos' ];
    const values = columns.map(col => { const value = receivedData[col]; if (typeof value === 'boolean') { return value ? 1 : 0; } if (value === '' || value === undefined || value === null) { if (col.startsWith('obs_')) return null; return null; } return value; });
    const fields = columns.join(', '); const placeholders = columns.map(() => '?').join(', '); const sql = `INSERT INTO anamneses_general (${fields}) VALUES (${placeholders})`;
    console.log("--> POST /api/anamneses/general: SQL:", sql); console.log("--> POST /api/anamneses/general: Params:", values);
    db.run(sql, values, function (err) { if (err) { console.error("--> POST /api/anamneses/general: ERRO:", err.message); console.error("--> SQL:", sql); console.error("--> Params:", values); if (!res.headersSent) res.status(500).json({ error: `Erro SQL: ${err.message}` }); return; } console.log(`--> POST /api/anamneses/general: Inserido ID: ${this.lastID}`); if (!res.headersSent) res.status(201).json({ message: "Anamnese salva!", anamnesisId: this.lastID }); });
});
// ROTA (GET): Buscar TODAS as Anamneses Gerais (US11)
app.get('/api/anamneses/general', isAuthenticated, (req, res) => { // // cite: 42]
    const sql = `SELECT ag.id, ag.client_id, ag.date_created, cl.name as client_name FROM anamneses_general ag LEFT JOIN clients cl ON ag.client_id = cl.id ORDER BY ag.date_created DESC`; db.all(sql, [], (err, rows) => { if (err) { res.status(500).json({ error: err.message }); return; } res.json(rows); });
});
// ROTA (GET): Buscar UMA Anamnese Geral pelo ID
app.get('/api/anamneses/general/:id', isAuthenticated, (req, res) => { const id = req.params.id; const sql = "SELECT * FROM anamneses_general WHERE id = ?"; db.get(sql, [id], (err, row) => { if (err) { res.status(500).json({ error: err.message }); return; } if (!row) { return res.status(404).json({ error: "Anamnese não encontrada." }); } const anamneseData = {}; for (const key in row) { if (row[key] === 1 || row[key] === 0) { anamneseData[key] = Boolean(row[key]); } else { anamneseData[key] = row[key]; } } res.json(anamneseData); }); });
// ROTA (PUT): Atualizar uma Anamnese Geral existente (US12) - CORRIGIDA
app.put('/api/anamneses/general/:id', isAuthenticated, (req, res) => { // // cite: 43]
    const id = req.params.id; const receivedData = req.body; console.log(`--> PUT /api/anamneses/general/${id}: Dados:`, receivedData); const { date_created } = receivedData; if (!date_created) { return res.status(400).json({ error: "Data é obrigatória." }); } const allowedColumnsToUpdate = [ 'date_created', 'main_objective', 'is_pregnant', 'obs_pregnant', 'is_lactating', 'obs_lactating', 'has_autoimmune', 'obs_autoimmune', 'has_diabetes', 'obs_diabetes', 'has_hypertension', 'obs_hypertension', 'has_pacemaker', 'has_thrombosis', 'obs_thrombosis', 'has_epilepsy', 'obs_epilepsy', 'has_cancer_history', 'obs_cancer_history', 'has_metal_implants', 'obs_metal_implants', 'has_iud', 'obs_iud', 'has_keloid', 'has_herpes', 'obs_herpes', 'has_allergies', 'obs_allergies', 'used_roacutan_6m', 'uses_anticoagulant', 'obs_anticoagulant', 'medications_in_use', 'sun_exposure', 'uses_sunscreen', 'is_smoker', 'consent_terms_accepted', 'consent_data_truthful', 'consent_procedures', 'consent_photos' ]; const values = []; const setClauses = []; allowedColumnsToUpdate.forEach(col => { if (receivedData.hasOwnProperty(col)) { const value = receivedData[col]; setClauses.push(`${col} = ?`); if (typeof value === 'boolean') { values.push(value ? 1 : 0); } else if (value === '' || value === undefined || value === null) { if (col.startsWith('obs_')) values.push(null); else values.push(null); } else { values.push(value); } } }); if (setClauses.length === 0) { return res.status(400).json({ error: "Nenhum dado válido enviado." }); } values.push(id); const sql = `UPDATE anamneses_general SET ${setClauses.join(', ')} WHERE id = ?`; console.log("--> PUT SQL:", sql); console.log("--> PUT Params:", values); db.run(sql, values, function (err) { if (err) { console.error("Erro PUT Anamnese:", err.message); res.status(500).json({ error: err.message }); return; } if (this.changes === 0) { return res.status(404).json({ error: "Anamnese não encontrada." }); } res.json({ message: "Anamnese atualizada!" }); }); });
// ROTA (DELETE): Excluir uma Anamnese Geral (US12)
app.delete('/api/anamneses/general/:id', isAuthenticated, (req, res) => { // // cite: 43]
    const id = req.params.id; const sql = "DELETE FROM anamneses_general WHERE id = ?"; db.run(sql, [id], function (err) { if (err) { res.status(500).json({ error: err.message }); return; } if (this.changes === 0) { return res.status(404).json({ error: "Anamnese não encontrada." }); } res.json({ message: "Anamnese excluída!" }); }); });

/* * ============================================
 * TEMA 5: RECEITAS
 * ============================================
 */
app.get('/api/revenues', isAuthenticated, (req, res) => { // // cite: 45]
    const { startDate, endDate, category } = req.query; let sql = ` SELECT app.id, app.client_id, app.service_name, app.category, app.date_time, app.service_value, app.value_paid, cli.name as client_name FROM appointments app LEFT JOIN clients cli ON app.client_id = cli.id WHERE app.status = 'realizado' AND app.payment_status = 'pago'`; const params = []; if (startDate) { sql += ` AND app.date_time >= ?`; params.push(startDate + 'T00:00:00'); } if (endDate) { sql += ` AND app.date_time <= ?`; params.push(endDate + 'T23:59:59'); } if (category) { sql += ` AND app.category = ?`; params.push(category); } sql += ` ORDER BY app.date_time DESC`; db.all(sql, params, (err, rows) => { if (err) { console.error("Erro SQL Receitas:", sql, params); res.status(500).json({ error: err.message }); return; } res.json(rows); }); });


/* * ============================================
 * TEMA 6: DESPESAS (CRUD Completo)
 * ============================================
 */

// ROTA (GET): Buscar todas as despesas // cite: 12]
app.get('/api/expenses', isAuthenticated, (req, res) => { const sql = "SELECT * FROM expenses ORDER BY date DESC"; db.all(sql, [], (err, rows) => { if (err) { res.status(500).json({ error: err.message }); return; } res.json(rows); }); });
// ROTA (POST): Adicionar uma nova despesa (US14)
app.post('/api/expenses', isAuthenticated, (req, res) => { const { date, description, category, type, value } = req.body; if (!date || !description || !category || !type || value === undefined || value === null) { return res.status(400).json({ error: "Todos campos obrigatórios." }); } if (isNaN(parseFloat(value)) || parseFloat(value) <= 0) { return res.status(400).json({ error: "Valor deve ser positivo." }); } const sql = "INSERT INTO expenses (date, description, category, type, value) VALUES (?, ?, ?, ?, ?)"; db.run(sql, [date, description, category, type, parseFloat(value)], function (err) { if (err) { res.status(500).json({ error: err.message }); return; } res.status(201).json({ expenseId: this.lastID }); }); }); // // cite: 47]
// ROTA (GET): Buscar UMA despesa pelo ID
app.get('/api/expenses/:id', isAuthenticated, (req, res) => { const id = req.params.id; const sql = "SELECT * FROM expenses WHERE id = ?"; db.get(sql, [id], (err, row) => { if (err) { res.status(500).json({ error: err.message }); return; } if (!row) { return res.status(404).json({ error: "Despesa não encontrada." }); } res.json(row); }); });
// ROTA (PUT): Atualizar uma despesa existente // cite: 47]
app.put('/api/expenses/:id', isAuthenticated, (req, res) => { const id = req.params.id; const { date, description, category, type, value } = req.body; if (!date || !description || !category || !type || value === undefined || value === null) { return res.status(400).json({ error: "Todos campos obrigatórios." }); } if (isNaN(parseFloat(value)) || parseFloat(value) <= 0) { return res.status(400).json({ error: "Valor deve ser positivo." }); } const sql = "UPDATE expenses SET date = ?, description = ?, category = ?, type = ?, value = ? WHERE id = ?"; const params = [date, description, category, type, parseFloat(value), id]; db.run(sql, params, function (err) { if (err) { res.status(500).json({ error: err.message }); return; } if (this.changes === 0) { return res.status(404).json({ error: "Despesa não encontrada." }); } res.json({ message: "Despesa atualizada!" }); }); });
// ROTA (DELETE): Excluir uma despesa // cite: 47]
app.delete('/api/expenses/:id', isAuthenticated, (req, res) => { const id = req.params.id; const sql = "DELETE FROM expenses WHERE id = ?"; db.run(sql, [id], function (err) { if (err) { res.status(500).json({ error: err.message }); return; } if (this.changes === 0) { return res.status(404).json({ error: "Despesa não encontrada." }); } res.json({ message: "Despesa excluída!" }); }); });

/* * ============================================
 * TEMA 7: CONTROLE DE ACESSO
 * ============================================
 */
// ROTA (GET): Buscar todos os usuários (US16)
app.get('/api/users', isAuthenticated, (req, res) => { const sql = "SELECT id, username, layer FROM users ORDER BY username"; db.all(sql, [], (err, rows) => { if (err) { res.status(500).json({ error: err.message }); return; } res.json(rows); }); }); // // cite: 50]
// ROTA (GET): Buscar UM usuário pelo ID
app.get('/api/users/:id', isAuthenticated, (req, res) => { const id = req.params.id; const sql = "SELECT id, username, layer FROM users WHERE id = ?"; db.get(sql, [id], (err, row) => { if (err) { res.status(500).json({ error: err.message }); return; } if (!row) { return res.status(404).json({ error: "Usuário não encontrado." }); } res.json(row); }); });
// ROTA (POST): Adicionar um novo usuário (US16)
app.post('/api/users', isAuthenticated, (req, res) => { const { username, password, layer } = req.body; if (!username || !password || !layer) { return res.status(400).json({ error: "Username, Password e Layer obrigatórios." }); } if (!['admin', 'esteticista'].includes(layer)) { return res.status(400).json({ error: "Layer inválida." }); } if (password.length < 6) { return res.status(400).json({ error: "Senha deve ter >= 6 caracteres." }); } bcrypt.hash(password, saltRounds, (err, hash) => { if (err) { console.error("--> POST /api/users: Erro bcrypt:", err); return res.status(500).json({ error: "Erro ao processar senha." }); } const sql = "INSERT INTO users (username, password_hash, layer) VALUES (?, ?, ?)"; db.run(sql, [username, hash, layer], function (err) { if (err) { if (err.message.includes('UNIQUE constraint failed')) { return res.status(400).json({ error: "Username já em uso." }); } res.status(500).json({ error: err.message }); return; } res.status(201).json({ userId: this.lastID }); }); }); }); // // cite: 50]
// ROTA (PUT): Atualizar um usuário existente // cite: 50]
app.put('/api/users/:id', isAuthenticated, (req, res) => { const id = req.params.id; const { username, password, layer } = req.body; if (!username || !layer) { return res.status(400).json({ error: "Username e Layer obrigatórios." }); } if (!['admin', 'esteticista'].includes(layer)) { return res.status(400).json({ error: "Layer inválida." }); } if (password && password.length < 6) { return res.status(400).json({ error: "Nova senha deve ter >= 6 caracteres." }); } if (password) { bcrypt.hash(password, saltRounds, (err, hash) => { if (err) { return res.status(500).json({ error: "Erro ao processar nova senha." }); } const sql = "UPDATE users SET username = ?, password_hash = ?, layer = ? WHERE id = ?"; db.run(sql, [username, hash, layer, id], function (err) { if (err) { if (err.message.includes('UNIQUE constraint failed')) { return res.status(400).json({ error: "Username já em uso." }); } res.status(500).json({ error: err.message }); return; } if (this.changes === 0) { return res.status(404).json({ error: "Usuário não encontrado." }); } res.json({ message: "Usuário atualizado (com senha)!" }); }); }); } else { const sql = "UPDATE users SET username = ?, layer = ? WHERE id = ?"; db.run(sql, [username, layer, id], function (err) { if (err) { if (err.message.includes('UNIQUE constraint failed')) { return res.status(400).json({ error: "Username já em uso." }); } res.status(500).json({ error: err.message }); return; } if (this.changes === 0) { return res.status(404).json({ error: "Usuário não encontrado." }); } res.json({ message: "Usuário atualizado (senha mantida)!" }); }); } });
// ROTA (DELETE): Excluir um usuário // cite: 50]
app.delete('/api/users/:id', isAuthenticated, (req, res) => { const id = req.params.id; console.log(`--> DELETE /api/users/${id}`); const sql = "DELETE FROM users WHERE id = ?"; db.run(sql, [id], function (err) { if (err) { res.status(500).json({ error: err.message }); return; } if (this.changes === 0) { return res.status(404).json({ error: "Usuário não encontrado." }); } console.log(`--> DELETE /api/users/${id}: Excluído.`); res.json({ message: "Usuário excluído!" }); }); });
// ROTA (POST): Autenticar um usuário (Login - US15)
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) { return res.status(400).json({ error: "Username e Password obrigatórios." }); }
    
    const sql = "SELECT * FROM users WHERE username = ?";
    
    db.get(sql, [username], (err, user) => {
        if (err) { 
            console.error("--> POST /api/login: Erro no db.get:", err.message);
            return res.status(500).json({ error: "Erro interno." }); 
        }
        if (!user) { 
            console.warn(`--> POST /api/login: Tentativa de login falhou (usuário não encontrado): ${username}`);
            return res.status(401).json({ error: "Usuário ou senha inválidos." }); 
        }

        // Compara a senha enviada com o HASH salvo no banco
        const isPasswordValid = bcrypt.compareSync(password, user.password_hash); 
        
        if (!isPasswordValid) { 
            console.warn(`--> POST /api/login: Tentativa de login falhou (senha inválida) para: ${username}`);
            return res.status(401).json({ error: "Usuário ou senha inválidos." }); 
        }

        // **** LOGIN VÁLIDO - CRIA A SESSÃO (NOVO!) ****
        req.session.userId = user.id; // Armazena o ID do usuário na sessão
        req.session.username = user.username;
        req.session.layer = user.layer;
        console.log(`--> POST /api/login: Sessão criada com sucesso para usuário ${user.id} (${user.username})`); 

        // Envia a resposta de sucesso
        res.json({ 
            message: "Login bem-sucedido!", 
            user: { 
                id: user.id, 
                username: user.username, 
                layer: user.layer 
            } 
        });
        });
});

// ROTA (POST): Logout - Destruir sessão
app.post('/api/logout', (req, res) => {
    console.log('--> POST /api/logout: Rota recebida');
    const sessionId = req.sessionID;
    
    req.session.destroy((err) => {
        if (err) {
            console.error('--> POST /api/logout: Erro ao destruir sessão:', err.message);
            return res.status(500).json({ error: "Erro ao fazer logout." });
        }
        
        // Limpar o cookie de sessão
        res.clearCookie('connect.sid');
        console.log(`--> POST /api/logout: Sessão ${sessionId} destruída com sucesso`);
        
        res.json({ message: "Logout realizado com sucesso!" });
    });
});

/* * ============================================
 * TEMA 8: EVOLUÇÃO DO PACIENTE
 * ============================================
 */
// ROTA (GET): Buscar dados para a timeline de evolução de UM paciente // cite: 52, 53, 54]
app.get('/api/patients/:id/evolution', isAuthenticated, async (req, res) => { const clientId = req.params.id; try { const evolutionData = {}; const clientSql = "SELECT * FROM clients WHERE id = ?"; evolutionData.client = await dbGetAsync(clientSql, [clientId]); if (!evolutionData.client) { return res.status(404).json({ error: "Cliente não encontrado." }); } const appointmentsSql = `SELECT * FROM appointments WHERE client_id = ? ORDER BY date_time DESC`; evolutionData.appointments = await dbAllAsync(appointmentsSql, [clientId]); const anamnesesSql = `SELECT * FROM anamneses_general WHERE client_id = ? ORDER BY date_created DESC`; evolutionData.anamneses = await dbAllAsync(anamnesesSql, [clientId]); res.json(evolutionData); } catch (err) { res.status(500).json({ error: err.message }); } });

/* * ============================================
 * HELPER FUNCTIONS (Async/Await para SQLite)
 * ============================================
 */
function dbAllAsync(sql, params = []) { return new Promise((resolve, reject) => { db.all(sql, params, (err, rows) => { if (err) { console.error("DB All Error:", sql, params, err); reject(err); } else { resolve(rows); } }); }); }
function dbGetAsync(sql, params = []) { return new Promise((resolve, reject) => { db.get(sql, params, (err, row) => { if (err) { console.error("DB Get Error:", sql, params, err); reject(err); } else { resolve(row); } }); }); }

/* * ============================================
 * INICIAR O SERVIDOR
 * ============================================
 */
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Servidor rodando em:`);
    console.log(`   Local:    http://localhost:${PORT}`);
    console.log(`   Rede:     http://192.168.1.6:${PORT}`);
    console.log(`\n📱 Para testar no iPhone:`);
    console.log(`   1. Certifique-se que iPhone e Mac estão na mesma Wi-Fi`);
    console.log(`   2. No iPhone, abra Safari e acesse: http://192.168.1.6:${PORT}`);
    console.log(`\n`);
});