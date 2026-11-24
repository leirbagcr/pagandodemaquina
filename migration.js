require("dotenv").config({ quiet: true });
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const RAIZ = __dirname;
const ARQUIVO_PRODUTOS = path.join(RAIZ, "front", "produtos.json");
const PASTA_IMAGENS = path.join(RAIZ, "img");

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------
function configuracaoBanco(comBanco = false) {
    const nome = String(process.env.DB_DATABASE || "teste3dsc").trim();
    const config = {
        host: process.env.DB_HOST || "127.0.0.1",
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        charset: "utf8mb4",
    };
    if (comBanco) config.database = nome;
    return { config, nome };
}

async function criarBanco() {
    const { config, nome } = configuracaoBanco(false);
    const conexao = await mysql.createConnection(config);
    try {
        await conexao.query(
            `CREATE DATABASE IF NOT EXISTS \`${nome.replace(/`/g, "``")}\`
             CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`
        );
        console.log(`✓ Banco '${nome}' pronto.`);
    } finally {
        await conexao.end();
    }
}

// ---------------------------------------------------------------------------
// Estrutura
// ---------------------------------------------------------------------------
async function colunasDaTabela(pool, tabela) {
    const [linhas] = await pool.query(`SHOW COLUMNS FROM \`${tabela}\``);
    return new Set(linhas.map((linha) => linha.Field));
}

async function adicionarColuna(pool, tabela, nome, definicao, depoisDe) {
    const existentes = await colunasDaTabela(pool, tabela);
    if (existentes.has(nome)) return false;
    const posicao = depoisDe && existentes.has(depoisDe) ? ` AFTER \`${depoisDe}\`` : "";
    await pool.query(`ALTER TABLE \`${tabela}\` ADD COLUMN \`${nome}\` ${definicao}${posicao}`);
    return true;
}

async function ajustarTabelaProduto(pool) {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS produto (
            id int NOT NULL AUTO_INCREMENT,
            nome varchar(200) NOT NULL,
            descricao text NULL,
            categoria varchar(50) NOT NULL,
            preco decimal(10,2) NOT NULL DEFAULT 0,
            emoji varchar(16) DEFAULT NULL,
            caminho_img varchar(255) DEFAULT NULL,
            quantidade_img int NOT NULL DEFAULT 10,
            PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    // Dumps antigos usavam as colunas acentuadas "descrição" e "preço".
    if (await adicionarColuna(pool, "produto", "descricao", "text NULL", "nome")) {
        const existentes = await colunasDaTabela(pool, "produto");
        if (existentes.has("descrição")) {
            await pool.query("UPDATE produto SET descricao = `descrição` WHERE descricao IS NULL");
        }
    }
    if (await adicionarColuna(pool, "produto", "preco", "decimal(10,2) NOT NULL DEFAULT 0", "categoria")) {
        const existentes = await colunasDaTabela(pool, "produto");
        if (existentes.has("preço")) {
            await pool.query("UPDATE produto SET preco = `preço` WHERE preco = 0");
        }
    }
    await adicionarColuna(pool, "produto", "emoji", "varchar(16) DEFAULT NULL", "preco");
    await adicionarColuna(pool, "produto", "caminho_img", "varchar(255) DEFAULT NULL", "emoji");
    await adicionarColuna(pool, "produto", "quantidade_img", "int NOT NULL DEFAULT 10", "caminho_img");
}

async function criarTabelas(pool) {
    console.log("Criando tabela 'cliente'...");
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

    console.log("Criando tabela 'produto'...");
    await ajustarTabelaProduto(pool);

    console.log("Criando tabela 'compra'...");
    await pool.query(`
        CREATE TABLE IF NOT EXISTS compra (
            id int NOT NULL AUTO_INCREMENT,
            data datetime NOT NULL,
            forma_pagamento varchar(30) NOT NULL,
            valor_total decimal(10,2) NOT NULL,
            id_cliente int DEFAULT NULL,
            PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    console.log("Criando tabela 'possui'...");
    await pool.query(`
        CREATE TABLE IF NOT EXISTS possui (
            id_compra int NOT NULL,
            id_produto int NOT NULL,
            quantidade int NOT NULL,
            valor_unitario decimal(10,2) NOT NULL,
            PRIMARY KEY (id_compra, id_produto)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);
}

// ---------------------------------------------------------------------------
// Catálogo (fonte oficial: front/produtos.json)
// ---------------------------------------------------------------------------
function validarProdutos() {
    if (!fs.existsSync(ARQUIVO_PRODUTOS)) {
        throw new Error("Arquivo front/produtos.json não encontrado.");
    }

    let produtos;
    try {
        produtos = JSON.parse(fs.readFileSync(ARQUIVO_PRODUTOS, "utf-8"));
    } catch (erro) {
        throw new Error("front/produtos.json não é um JSON válido: " + erro.message);
    }
    if (!Array.isArray(produtos) || produtos.length === 0) {
        throw new Error("front/produtos.json está vazio ou não contém uma lista de produtos.");
    }

    const ids = new Set();
    const erros = [];
    const normalizados = produtos.map((produto) => {
        const id = Number(produto.id);
        const nome = String(produto.nome || "").trim();
        const caminho = String(produto.caminho_img || "")
            .trim()
            .replace(/^\/+/, "")
            .replace(/\\/g, "/");

        if (!Number.isInteger(id) || id <= 0) {
            erros.push(`ID inválido: ${JSON.stringify(produto.id)}`);
        } else if (ids.has(id)) {
            erros.push(`ID duplicado: ${id}`);
        }
        ids.add(id);

        if (!nome) erros.push(`Produto ${id} sem nome.`);
        if (!caminho) {
            erros.push(`Produto ${id} (${nome || "sem nome"}) sem caminho_img.`);
        } else {
            const arquivo = path.resolve(PASTA_IMAGENS, caminho);
            const relativo = path.relative(path.resolve(PASTA_IMAGENS), arquivo);
            if (relativo.startsWith("..") || path.isAbsolute(relativo)) {
                erros.push(`Produto ${id} (${nome}): caminho_img sai da pasta img/: ${caminho}`);
            } else if (!fs.existsSync(arquivo) || !fs.statSync(arquivo).isFile()) {
                erros.push(`Produto ${id} (${nome}): imagem não encontrada em img/${caminho}`);
            }
        }

        const estoque = Number(produto.estoque ?? produto.quantidade_img);
        return {
            id,
            nome,
            descricao: String(produto.descricao || ""),
            categoria: String(produto.categoria || ""),
            preco: Number(produto.preco) || 0,
            emoji: produto.emoji ? String(produto.emoji) : null,
            caminho_img: caminho,
            quantidade_img: Number.isFinite(estoque) ? estoque : 10,
        };
    });

    if (erros.length > 0) {
        throw new Error("Catálogo inconsistente com a pasta de imagens:\n- " + erros.join("\n- "));
    }
    return normalizados;
}

async function sincronizarProdutos(pool) {
    const produtos = validarProdutos();
    const redefinirEstoque = process.argv.includes("--reset-estoque")
        || String(process.env.MIGRATION_RESET_ESTOQUE || "") === "1";

    const atualizarEstoque = redefinirEstoque
        ? ",\n            quantidade_img = VALUES(quantidade_img)"
        : "";

    const sql = `
        INSERT INTO produto
            (id, nome, descricao, categoria, preco, emoji, caminho_img, quantidade_img)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            nome = VALUES(nome),
            descricao = VALUES(descricao),
            categoria = VALUES(categoria),
            preco = VALUES(preco),
            emoji = VALUES(emoji),
            caminho_img = VALUES(caminho_img)${atualizarEstoque}
    `;

    for (const produto of produtos) {
        await pool.query(sql, [
            produto.id,
            produto.nome,
            produto.descricao,
            produto.categoria,
            produto.preco,
            produto.emoji,
            produto.caminho_img,
            produto.quantidade_img,
        ]);
    }

    const [resumo] = await pool.query(
        `SELECT COUNT(*) AS total,
                SUM(caminho_img LIKE 'instrumentos/%') AS com_imagem
         FROM produto`
    );
    console.log(
        `✓ ${produtos.length} produto(s) sincronizado(s); ` +
        `${resumo[0].total} no banco (${resumo[0].com_imagem || 0} com imagem de instrumento).`
    );
    if (!redefinirEstoque) {
        console.log("  Estoque existente foi preservado (use --reset-estoque para redefinir).");
    }

    const ids = produtos.map((produto) => produto.id);
    const [extras] = await pool.query(
        "SELECT id, nome FROM produto WHERE id NOT IN (?) ORDER BY id",
        [ids]
    );
    if (extras.length > 0) {
        console.warn(
            `⚠ ${extras.length} produto(s) do banco não estão em front/produtos.json ` +
            "(as imagens deles podem não existir):"
        );
        for (const extra of extras) {
            console.warn(`   - ${extra.id}: ${extra.nome}`);
        }
    }
}

// ---------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------
function dicaDeErro(erro) {
    if (erro.code === "ER_ACCESS_DENIED_ERROR") {
        return "Confira DB_USER e DB_PASSWORD no arquivo .env.";
    }
    if (erro.code === "ECONNREFUSED") {
        return "O MySQL não está rodando ou DB_HOST/DB_PORT estão incorretos.";
    }
    if (erro.code === "ENOTFOUND") {
        return "O host informado em DB_HOST não foi encontrado.";
    }
    return "";
}

async function executar() {
    const { nome } = configuracaoBanco(false);
    console.log(
        `Conectando em ${process.env.DB_USER || "root"}@` +
        `${process.env.DB_HOST || "127.0.0.1"}:${process.env.DB_PORT || 3306}/${nome}...`
    );

    let pool = null;
    try {
        await criarBanco();
        const db = require("./db");
        pool = db.pool;
        await criarTabelas(pool);
        await sincronizarProdutos(pool);
        console.log("\n✅ Migration executada com sucesso!");
    } catch (erro) {
        console.error("\n❌ Falha na migration:", erro.message);
        const dica = dicaDeErro(erro);
        if (dica) console.error("Dica:", dica);
        process.exitCode = 1;
    } finally {
        if (pool) {
            await pool.end().catch(() => {});
        }
    }
}

if (require.main === module) {
    executar();
}

module.exports = Object.freeze({
    criarBanco,
    criarTabelas,
    sincronizarProdutos,
});
