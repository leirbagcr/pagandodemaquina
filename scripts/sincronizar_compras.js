// Copia as compras já existentes em compras.json para as tabelas
// `compra` e `possui` do MySQL. Pode ser executado mais de uma vez:
// o ID da compra é reaproveitado e os itens são regravados.
//
// Uso: npm.cmd run sincronizar:compras
require("dotenv").config({ quiet: true });
const fs = require("fs");
const path = require("path");
const { pool, garantirCliente, salvarCompra } = require("../db");

const RAIZ = path.join(__dirname, "..");
const ARQUIVO_COMPRAS = path.join(RAIZ, "compras.json");
const ARQUIVO_CLIENTES = path.join(RAIZ, "bd.json");

function lerJson(arquivo, padrao) {
    try {
        if (!fs.existsSync(arquivo)) return padrao;
        const conteudo = fs.readFileSync(arquivo, "utf-8").trim();
        if (!conteudo) return padrao;
        const dados = JSON.parse(conteudo);
        return Array.isArray(dados) ? dados : padrao;
    } catch (error) {
        throw new Error(`Erro ao ler ${path.basename(arquivo)}: ${error.message}`);
    }
}

async function main() {
    const compras = lerJson(ARQUIVO_COMPRAS, []);
    const clientes = lerJson(ARQUIVO_CLIENTES, []);

    if (compras.length === 0) {
        console.log("Nenhuma compra encontrada em compras.json.");
        return;
    }

    let totalItens = 0;
    for (const compra of compras) {
        const clienteJson = clientes.find(
            (cliente) => Number(cliente.id) === Number(compra.id_cliente)
        );
        const idClienteBanco = await garantirCliente(clienteJson);
        await salvarCompra({ ...compra, id_cliente: idClienteBanco });
        totalItens += Array.isArray(compra.itens) ? compra.itens.length : 0;
        console.log(
            `✓ Compra ${compra.id} sincronizada ` +
            `(cliente MySQL: ${idClienteBanco ?? "sem cliente"}, ` +
            `${Array.isArray(compra.itens) ? compra.itens.length : 0} item(ns)).`
        );
    }

    const [linhas] = await pool.query(
        "SELECT COUNT(*) AS compras, (SELECT COUNT(*) FROM possui) AS itens FROM compra"
    );
    const resumo = linhas[0];
    console.log(
        `\n✅ ${compras.length} compra(s) do JSON processada(s): ` +
        `${resumo.compras} na tabela compra e ${resumo.itens} na tabela possui.`
    );
}

main()
    .catch((error) => {
        console.error("❌ Falha ao sincronizar compras:", error.message);
        if (error.code === "ER_NO_SUCH_TABLE") {
            console.error("Dica: rode primeiro: npm.cmd run migrate");
        }
        process.exitCode = 1;
    })
    .finally(async () => {
        await pool.end();
    });
