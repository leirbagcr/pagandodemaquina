// Gera o arquivo banco_instrumentos.sql a partir de front/produtos.json.
// Uso: npm run gerar:sql
const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const ARQUIVO_PRODUTOS = path.join(RAIZ, "front", "produtos.json");
const PASTA_IMAGENS = path.join(RAIZ, "img");
const ARQUIVO_SQL = path.join(RAIZ, "banco_instrumentos.sql");
const BANCO = process.env.DB_DATABASE || "teste3dsc";

function escaparSql(valor) {
    return String(valor ?? "").replace(/\\/g, "\\\\").replace(/'/g, "''");
}

function validarProdutos() {
    const produtos = JSON.parse(fs.readFileSync(ARQUIVO_PRODUTOS, "utf-8"));
    if (!Array.isArray(produtos) || produtos.length === 0) {
        throw new Error("front/produtos.json está vazio ou não contém uma lista.");
    }

    const erros = [];
    for (const produto of produtos) {
        const caminho = String(produto.caminho_img || "").replace(/^\/+/, "").replace(/\\/g, "/");
        const arquivo = path.resolve(PASTA_IMAGENS, caminho);
        const relativo = path.relative(path.resolve(PASTA_IMAGENS), arquivo);
        if (!caminho || relativo.startsWith("..") || path.isAbsolute(relativo)) {
            erros.push(`Produto ${produto.id}: caminho_img inválido (${caminho || "vazio"}).`);
        } else if (!fs.existsSync(arquivo)) {
            erros.push(`Produto ${produto.id}: imagem não encontrada (img/${caminho}).`);
        }
    }
    if (erros.length > 0) {
        throw new Error("Catálogo inconsistente:\n- " + erros.join("\n- "));
    }
    return produtos;
}

const produtos = validarProdutos();

const valores = produtos.map((produto) => {
    const caminho = String(produto.caminho_img || "").replace(/^\/+/, "").replace(/\\/g, "/");
    const estoque = Number.isFinite(Number(produto.estoque ?? produto.quantidade_img))
        ? Number(produto.estoque ?? produto.quantidade_img)
        : 10;
    return `(${Number(produto.id)}, '${escaparSql(produto.nome)}', '${escaparSql(produto.descricao)}', ` +
        `'${escaparSql(produto.categoria)}', ${(Number(produto.preco) || 0).toFixed(2)}, ` +
        `'${escaparSql(produto.emoji || "")}', '${escaparSql(caminho)}', ${estoque})`;
});

const sql = `-- Banco de dados da Casabemol (loja de instrumentos musicais)
-- Gerado automaticamente a partir de front/produtos.json.
-- Imagens: ${produtos.length} arquivos em img/instrumentos/.
--
-- Importe este arquivo no MySQL Workbench ou rode:
--   mysql -u root -p < banco_instrumentos.sql
--
-- O INSERT abaixo também atualiza bancos antigos (jogos) sem apagar
-- compras: o ON DUPLICATE KEY UPDATE corrige nome, descrição, preço e,
-- principalmente, o caminho_img para a pasta de instrumentos.

CREATE DATABASE IF NOT EXISTS \`${BANCO}\`
    CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE \`${BANCO}\`;

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS compra (
    id int NOT NULL AUTO_INCREMENT,
    data datetime NOT NULL,
    forma_pagamento varchar(30) NOT NULL,
    valor_total decimal(10,2) NOT NULL,
    id_cliente int DEFAULT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS possui (
    id_compra int NOT NULL,
    id_produto int NOT NULL,
    quantidade int NOT NULL,
    valor_unitario decimal(10,2) NOT NULL,
    PRIMARY KEY (id_compra, id_produto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ---------------------------------------------------------------------------
-- Catálogo de instrumentos (68 produtos)
-- ---------------------------------------------------------------------------
INSERT INTO produto
    (id, nome, descricao, categoria, preco, emoji, caminho_img, quantidade_img)
VALUES
    ${valores.join(",\n    ")}
ON DUPLICATE KEY UPDATE
    nome = VALUES(nome),
    descricao = VALUES(descricao),
    categoria = VALUES(categoria),
    preco = VALUES(preco),
    emoji = VALUES(emoji),
    caminho_img = VALUES(caminho_img);

-- ---------------------------------------------------------------------------
-- Conferência
-- ---------------------------------------------------------------------------
SELECT COUNT(*) AS total_produtos FROM produto;
SELECT COUNT(*) AS produtos_com_imagem
FROM produto
WHERE caminho_img LIKE 'instrumentos/%';
SELECT id, nome, caminho_img
FROM produto
ORDER BY id;
`;

fs.writeFileSync(ARQUIVO_SQL, sql, "utf-8");
console.log(`✅ ${ARQUIVO_SQL} gerado com ${produtos.length} produtos.`);
