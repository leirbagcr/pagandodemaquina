require("dotenv").config({ quiet: true });
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_DATABASE || "teste3dsc",
    charset: "utf8mb4",
    timezone: "Z",
    connectTimeout: 3000,
    multipleStatements: true
});

function somenteDigitos(valor) {
    return String(valor ?? "").replace(/\D/g, "");
}

function formatarCpf(digitos) {
    const d = String(digitos);
    if (d.length !== 11) return d;
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function formatarCelular(digitos) {
    const d = String(digitos);
    if (d.length === 11) return `(${d.slice(0, 2)})${d.slice(2, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0, 2)})${d.slice(2, 6)}-${d.slice(6)}`;
    return d;
}

function emailCliente(cliente) {
    return String(cliente?.email || cliente?.gmail || "").trim().toLowerCase();
}

// Garante que o cliente exista na tabela `cliente` e devolve o ID do MySQL.
// Usado para que compra.id_cliente aponte para o cliente certo.
async function garantirCliente(cliente) {
    if (!cliente) return null;

    const nome = String(cliente.nome || "").trim() || "Cliente";
    const cpf = formatarCpf(somenteDigitos(cliente.cpf));
    const celular = formatarCelular(somenteDigitos(cliente.celular ?? cliente.telefone));
    const email = emailCliente(cliente);
    const senha = String(cliente.senha || "");

    if (!cpf || !email) {
        console.warn("Cliente sem CPF/e-mail; compra ficará sem id_cliente no MySQL.");
        return null;
    }

    const [encontrados] = await pool.execute(
        "SELECT id FROM cliente WHERE email = ? OR cpf = ? LIMIT 1",
        [email, cpf]
    );

    if (encontrados.length > 0) {
        const id = Number(encontrados[0].id);
        // Atualiza apenas os dados de contato para não sobrescrever a senha.
        await pool.execute(
            "UPDATE cliente SET nome = ?, celular = ? WHERE id = ?",
            [nome, celular, id]
        );
        return id;
    }

    try {
        const [resultado] = await pool.execute(
            "INSERT INTO cliente (nome, cpf, celular, email, senha) VALUES (?, ?, ?, ?, ?)",
            [nome, cpf, celular, email, senha]
        );
        return resultado.insertId;
    } catch (error) {
        // Se outro processo inseriu o mesmo cliente, busca novamente.
        const [novamente] = await pool.execute(
            "SELECT id FROM cliente WHERE email = ? OR cpf = ? LIMIT 1",
            [email, cpf]
        );
        if (novamente.length > 0) return Number(novamente[0].id);
        throw error;
    }
}

// Grava a compra e os itens em uma transação. Usa o mesmo ID do compras.json
// para manter JSON e MySQL alinhados (e permite reexecutar sem duplicar).
async function salvarCompra(compra) {
    const id = Number(compra.id);
    if (!Number.isInteger(id) || id <= 0) {
        throw new Error("Compra sem ID válido para gravar no MySQL.");
    }

    const data = new Date(compra.data);
    const dataSql = Number.isNaN(data.getTime()) ? new Date() : data;
    const valorTotal = Number(compra.valor_total) || 0;
    const idCliente = compra.id_cliente === null || compra.id_cliente === undefined
        ? null
        : Number(compra.id_cliente);
    const itens = Array.isArray(compra.itens) ? compra.itens : [];

    const conexao = await pool.getConnection();
    try {
        await conexao.beginTransaction();

        await conexao.execute(
            `INSERT INTO compra (id, data, forma_pagamento, valor_total, id_cliente)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                data = VALUES(data),
                forma_pagamento = VALUES(forma_pagamento),
                valor_total = VALUES(valor_total),
                id_cliente = VALUES(id_cliente)`,
            [id, dataSql, String(compra.forma_pagamento || ""), valorTotal, idCliente]
        );

        await conexao.execute("DELETE FROM possui WHERE id_compra = ?", [id]);

        for (const item of itens) {
            await conexao.execute(
                `INSERT INTO possui (id_compra, id_produto, quantidade, valor_unitario)
                 VALUES (?, ?, ?, ?)`,
                [
                    id,
                    Number(item.id_produto),
                    Number(item.quantidade),
                    Number(item.valor_unitario) || 0,
                ]
            );
        }

        await conexao.commit();
    } catch (error) {
        await conexao.rollback();
        throw error;
    } finally {
        conexao.release();
    }
}

module.exports = Object.freeze({
    pool,
    garantirCliente,
    salvarCompra,
});
