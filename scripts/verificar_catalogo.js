// Verifica se o catálogo (front/produtos.json) está coerente com a pasta
// de imagens (img/instrumentos) e com o espelho produtos.json da raiz.
// Uso: npm run verificar
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const RAIZ = path.join(__dirname, "..");
const ARQUIVO_FRONT = path.join(RAIZ, "front", "produtos.json");
const ARQUIVO_ESPELHO = path.join(RAIZ, "produtos.json");
const PASTA_IMAGENS = path.join(RAIZ, "img");
const PASTA_INSTRUMENTOS = path.join(PASTA_IMAGENS, "instrumentos");

function erro(mensagem) {
    console.error(`❌ ${mensagem}`);
    process.exitCode = 1;
}

function lerJson(arquivo) {
    try {
        return JSON.parse(fs.readFileSync(arquivo, "utf-8"));
    } catch (falha) {
        erro(`Não foi possível ler ${path.relative(RAIZ, arquivo)}: ${falha.message}`);
        return null;
    }
}

const produtos = lerJson(ARQUIVO_FRONT);
if (!Array.isArray(produtos) || produtos.length === 0) {
    erro("front/produtos.json não contém uma lista de produtos.");
    process.exit(1);
}

const ids = new Set();
const caminhos = new Set();
const erros = [];

for (const produto of produtos) {
    const id = Number(produto.id);
    const nome = String(produto.nome || "").trim();
    const caminho = String(produto.caminho_img || "").trim().replace(/^\/+/, "").replace(/\\/g, "/");

    if (!Number.isInteger(id) || id <= 0) {
        erros.push(`ID inválido em front/produtos.json: ${JSON.stringify(produto.id)}`);
    } else if (ids.has(id)) {
        erros.push(`ID duplicado: ${id}`);
    }
    ids.add(id);

    if (!nome) erros.push(`Produto ${id} está sem nome.`);
    if (!produto.categoria) erros.push(`Produto ${id} (${nome || "sem nome"}) está sem categoria.`);
    if (!Number.isFinite(Number(produto.preco)) || Number(produto.preco) <= 0) {
        erros.push(`Produto ${id} (${nome || "sem nome"}) está com preço inválido.`);
    }

    if (!caminho) {
        erros.push(`Produto ${id} (${nome || "sem nome"}) está sem caminho_img.`);
        continue;
    }
    if (!caminho.startsWith("instrumentos/")) {
        erros.push(`Produto ${id} (${nome || "sem nome"}) aponta para "${caminho}" em vez de "instrumentos/...".`);
    }
    if (caminhos.has(caminho)) {
        erros.push(`Imagem repetida em mais de um produto: ${caminho}`);
    }
    caminhos.add(caminho);

    const arquivo = path.resolve(PASTA_IMAGENS, caminho);
    const relativo = path.relative(path.resolve(PASTA_IMAGENS), arquivo);
    if (relativo.startsWith("..") || path.isAbsolute(relativo)) {
        erros.push(`Produto ${id} (${nome || "sem nome"}): caminho_img inválido (${caminho}).`);
    } else if (!fs.existsSync(arquivo)) {
        erros.push(`Produto ${id} (${nome || "sem nome"}): imagem não encontrada em img/${caminho}.`);
    } else if (fs.statSync(arquivo).size === 0) {
        erros.push(`Produto ${id} (${nome || "sem nome"}): imagem vazia em img/${caminho}.`);
    }
}

const arquivos = fs.existsSync(PASTA_INSTRUMENTOS)
    ? fs.readdirSync(PASTA_INSTRUMENTOS, { withFileTypes: true })
        .filter((item) => item.isFile())
        .map((item) => `instrumentos/${item.name}`)
    : [];

for (const arquivo of arquivos) {
    if (!caminhos.has(arquivo)) {
        erros.push(`Imagem sem produto no catálogo: img/${arquivo}`);
    }
}

const hash = (arquivo) => crypto.createHash("sha256").update(fs.readFileSync(arquivo)).digest("hex");
if (fs.existsSync(ARQUIVO_ESPELHO) && hash(ARQUIVO_FRONT) !== hash(ARQUIVO_ESPELHO)) {
    erros.push("produtos.json (raiz) está diferente de front/produtos.json. Rode a API para sincronizar ou copie o arquivo.");
}

const categorias = [...new Set(produtos.map((produto) => produto.categoria))].sort();
const resumo = [
    `Produtos: ${produtos.length}`,
    `Imagens em img/instrumentos: ${arquivos.length}`,
    `Categorias: ${categorias.join(", ")}`,
];

if (erros.length > 0) {
    console.error("Problemas encontrados:\n- " + erros.join("\n- "));
    process.exitCode = 1;
} else {
    console.log("✅ Catálogo e imagens estão coerentes.");
}
console.log(resumo.join("\n"));
