require("dotenv").config({ quiet: true });
const { criarBanco } = require("./migration");
const db = require("./db");

// Cria apenas a tabela de clientes. O site atualmente grava os cadastros em
// bd.json; esta tabela deixa o MySQL pronto para a versão que usa o banco.
async function criarEstruturaClientes() {
    let pool = null;
    try {
        await criarBanco();
        pool = db.pool;
        await pool.query(`
            CREATE TABLE IF NOT EXISTS cliente (
                id int NOT NULL AUTO_INCREMENT,
                nome varchar(100) NOT NULL,
                cpf varchar(14) NOT NULL,
                celular varchar(20) NOT NULL,
                email varchar(100) NOT NULL,
                senha varchar(512) NOT NULL,
                PRIMARY KEY (id),
                UNIQUE KEY cpf (cpf),
                UNIQUE KEY email (email)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);
        console.log("✅ Tabela 'cliente' pronta.");
    } catch (erro) {
        console.error("❌ Falha ao criar a tabela de clientes:", erro.message);
        if (erro.code === "ER_ACCESS_DENIED_ERROR") {
            console.error("Dica: confira DB_USER e DB_PASSWORD no arquivo .env.");
        }
        process.exitCode = 1;
    } finally {
        if (pool) {
            await pool.end().catch(() => {});
        }
    }
}

criarEstruturaClientes();
