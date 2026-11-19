require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

async function criar_banco() {
    const conexao = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD
    });
    await conexao.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_DATABASE}\``);
    await conexao.end();
}

async function criar_estrutura() {
    try {
        await criar_banco();

        // só carrega o db.js depois que o banco já existe
        const db = require("./db");

        console.log("Criando tabela 'Clientes'...");
        await db.pool.query(`
            CREATE TABLE IF NOT EXISTS Clientes (
                id int NOT NULL AUTO_INCREMENT,
                senha varchar(512) NOT NULL,
                cpf varchar(14) NOT NULL,
                nome varchar(50) NOT NULL,
                email varchar(50) NOT NULL,
                celular varchar(20) NOT NULL,
                PRIMARY KEY (id),
                UNIQUE KEY cpf (cpf),
                UNIQUE KEY email (email)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
        `);

        console.log("Criando tabela 'produto'...");
        await db.pool.query(`
            CREATE TABLE IF NOT EXISTS produto (
                id int NOT NULL,
                nome varchar(200) NOT NULL,
                descricao text,
                categoria varchar(50) NOT NULL,
                preco decimal(10,2) NOT NULL,
                emoji varchar(16) DEFAULT NULL,
                caminho_img varchar(255) DEFAULT NULL,
                quantidade_img int NOT NULL DEFAULT 10,
                PRIMARY KEY (id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
        `);

        // Compatibilidade com o dump antigo 3DSC_clientes.sql, que usava
        // colunas acentuadas (descrição / preço).
        const [colunas] = await db.pool.query("SHOW COLUMNS FROM produto");
        const nomes = new Set(colunas.map((c) => c.Field));
        if (!nomes.has("descricao") && nomes.has("descrição")) {
            await db.pool.query("ALTER TABLE produto ADD COLUMN descricao text NULL AFTER nome");
            await db.pool.query("UPDATE produto SET descricao = `descrição`");
        }
        if (!nomes.has("preco") && nomes.has("preço")) {
            await db.pool.query("ALTER TABLE produto ADD COLUMN preco decimal(10,2) NOT NULL DEFAULT 0 AFTER categoria");
            await db.pool.query("UPDATE produto SET preco = `preço`");
        }
        if (!nomes.has("emoji")) {
            await db.pool.query("ALTER TABLE produto ADD COLUMN emoji varchar(16) NULL AFTER preco");
        }

        console.log("Criando tabela 'compra'...");
        await db.pool.query(`
            CREATE TABLE IF NOT EXISTS compra (
                id int NOT NULL AUTO_INCREMENT,
                data datetime NOT NULL,
                forma_pagamento varchar(30) NOT NULL,
                valor_total decimal(10,2) NOT NULL,
                id_cliente int DEFAULT NULL,
                PRIMARY KEY (id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
        `);

        console.log("Criando tabela 'possui'...");
        await db.pool.query(`
            CREATE TABLE IF NOT EXISTS possui (
                id_compra int NOT NULL,
                id_produto int NOT NULL,
                quantidade int NOT NULL,
                valor_unitario decimal(10,2) NOT NULL,
                PRIMARY KEY (id_compra, id_produto)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
        `);

        await popularProdutos(db);

        console.log("Banco e tabelas prontos!");
        process.exit(0);
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
}

// O catálogo da loja continua vindo de front/produtos.json. Aqui ele apenas
// é espelhado no banco para controlar estoque e registrar as compras.
async function popularProdutos(db) {
    const arquivo = path.join(__dirname, "front", "produtos.json");
    const produtos = JSON.parse(fs.readFileSync(arquivo, "utf-8"));

    const [linhas] = await db.pool.query("SELECT COUNT(*) AS total FROM produto");
    if (linhas[0].total > 0) {
        console.log(`Catálogo já possui ${linhas[0].total} produto(s); mantendo estoque atual.`);
        return;
    }

    console.log(`Inserindo ${produtos.length} produto(s) no catálogo...`);
    for (const produto of produtos) {
        await db.pool.query(
            `INSERT INTO produto (id, nome, descricao, categoria, preco, emoji, caminho_img, quantidade_img)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                produto.id,
                produto.nome,
                produto.descricao || "",
                produto.categoria || "",
                Number(produto.preco) || 0,
                produto.emoji || null,
                produto.caminho_img || null,
                Number.isFinite(Number(produto.estoque)) ? Number(produto.estoque) : 10
            ]
        );
    }
}

criar_estrutura();
