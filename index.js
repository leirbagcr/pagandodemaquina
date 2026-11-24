// npm init
// npm install express cors bcrypt jsonwebtoken dotenv

require("dotenv").config({ quiet: true });
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { garantirCliente, salvarCompra } = require("./db");

const app = express();
const port = Number(process.env.API_PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "senha_muit0_forte_2h13u12h3i1uuhia";

const ARQUIVO_CLIENTES = path.join(__dirname, "bd.json");
const ARQUIVO_PRODUTOS = path.join(__dirname, "front", "produtos.json");
const ARQUIVO_PRODUTOS_LEGADO = path.join(__dirname, "produtos.json");
const ARQUIVO_COMPRAS = path.join(__dirname, "compras.json");

const PRODUTOS_POR_PAGINA = 10;

app.use(cors());
app.use(express.json());
app.use("/img", express.static(path.join(__dirname, "img")));

// A pasta front é pública, mas estes arquivos são internos: bd.json contém
// cadastros/senhas e index.js é uma versão antiga da API.
app.use((req, res, next) => {
    const internos = new Set(["/bd.json", "/index.js", "/produtos.json"]);
    if (internos.has(req.path.toLowerCase())) {
        return res.status(404).json({ erro: "Arquivo não encontrado" });
    }
    return next();
});

// serve o front-end (pasta front) em http://localhost:3000
app.use(express.static(path.join(__dirname, "front")));

// ---------- AUXILIARES ----------
function lerJson(arquivo, padrao) {
    try {
        if (!fs.existsSync(arquivo)) return padrao;
        const conteudo = fs.readFileSync(arquivo, "utf-8").trim();
        if (!conteudo) return padrao;
        const dados = JSON.parse(conteudo);
        return Array.isArray(dados) ? dados : padrao;
    } catch (error) {
        console.error("Erro ao ler " + arquivo + ":", error.message);
        return padrao;
    }
}

function salvarJson(arquivo, dados) {
    fs.writeFileSync(arquivo, JSON.stringify(dados, null, 2), "utf-8");
}

function somenteDigitos(valor) {
    return String(valor ?? "").replace(/\D/g, "");
}

function emailValido(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""));
}

function emailCliente(cliente) {
    return String(cliente?.email || cliente?.gmail || "").trim().toLowerCase();
}

function cpfCliente(cliente) {
    return somenteDigitos(cliente?.cpf);
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

function clienteSemSenha(cliente) {
    const { senha: _senha, ...resto } = cliente;
    return resto;
}

function senhaCorreta(informada, gravada) {
    const hash = String(gravada || "");
    if (hash.startsWith("$2")) {
        return bcrypt.compareSync(String(informada || ""), hash);
    }
    // compatibilidade com cadastros antigos salvos em texto puro
    return hash === String(informada || "");
}

function proximoId(clientes) {
    return clientes.reduce((maior, c) => Math.max(maior, Number(c.id) || 0), 0) + 1;
}

function gerarToken(cliente) {
    return jwt.sign(
        { id: cliente.id, email: emailCliente(cliente) },
        JWT_SECRET,
        { expiresIn: "2h" }
    );
}

function autenticar(req, res, next) {
    const header = String(req.headers.authorization || "");
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!token) {
        return res.status(401).json({ erro: "Token não enviado. Use Authorization: Bearer <token>" });
    }
    try {
        req.usuario = jwt.verify(token, JWT_SECRET);
        return next();
    } catch (error) {
        return res.status(403).json({ erro: "Token inválido ou expirado" });
    }
}

function clienteDaRequisicao(req) {
    const clientes = lerJson(ARQUIVO_CLIENTES, []);
    const id = Number(req.usuario?.id);
    const email = String(req.usuario?.email || "").toLowerCase();
    let cliente = clientes.find((c) => Number(c.id) === id && Number.isFinite(id));
    if (!cliente && email) cliente = clientes.find((c) => emailCliente(c) === email);
    return { clientes, cliente };
}

function normalizarTexto(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
}

function converterNumero(valor) {
    if (valor === undefined || valor === null || String(valor).trim() === "") return null;
    const numero = Number(String(valor).replace(",", "."));
    return Number.isFinite(numero) ? numero : null;
}

function obterOrdenacao(query) {
    const ordenar = normalizarTexto(query.ordenar || query.sort);
    const ordem = normalizarTexto(query.ordem);
    const campo = normalizarTexto(query.ordenar_por);

    if (["preco_asc", "asc", "menor", "menor_preco"].includes(ordenar)) return "preco_asc";
    if (["preco_desc", "desc", "maior", "maior_preco"].includes(ordenar)) return "preco_desc";
    if ((ordem === "asc" || ordem === "crescente") && (!campo || campo === "preco")) return "preco_asc";
    if ((ordem === "desc" || ordem === "decrescente") && (!campo || campo === "preco")) return "preco_desc";
    return null;
}

function lerProdutos() {
    let produtos = lerJson(ARQUIVO_PRODUTOS, null);
    if (!produtos) {
        produtos = lerJson(ARQUIVO_PRODUTOS_LEGADO, []);
        salvarJson(ARQUIVO_PRODUTOS, produtos);
    }
    return produtos.map((produto, indice) => {
        const estoqueBruto = produto.estoque ?? produto.quantidade_img;
        const estoque = Number.isFinite(Number(estoqueBruto)) ? Number(estoqueBruto) : 10;
        return {
            ...produto,
            id: Number(produto.id) || indice + 1,
            preco: Number(produto.preco) || 0,
            estoque,
            quantidade_img: estoque,
        };
    });
}

function salvarProdutos(produtos) {
    // front/produtos.json é a fonte oficial; produtos.json fica como espelho.
    salvarJson(ARQUIVO_PRODUTOS, produtos);
    salvarJson(ARQUIVO_PRODUTOS_LEGADO, produtos);
}

function filtrarProdutos(produtos, query) {
    const busca = normalizarTexto(query.busca || query.nome || query.q);
    const categoria = normalizarTexto(query.categoria);
    const precoMin = converterNumero(query.preco_min);
    const precoMax = converterNumero(query.preco_max);
    const ordenacao = obterOrdenacao(query);

    const filtrados = produtos.filter((produto) => {
        if (busca && !normalizarTexto(produto.nome).includes(busca)) return false;
        if (categoria && normalizarTexto(produto.categoria) !== categoria) return false;
        const preco = converterNumero(produto.preco);
        if (precoMin !== null && (preco === null || preco < precoMin)) return false;
        if (precoMax !== null && (preco === null || preco > precoMax)) return false;
        return true;
    });

    if (ordenacao === "preco_asc") {
        filtrados.sort((a, b) => Number(a.preco) - Number(b.preco));
    } else if (ordenacao === "preco_desc") {
        filtrados.sort((a, b) => Number(b.preco) - Number(a.preco));
    }
    return filtrados;
}

function montarRespostaProdutos(produtos, query) {
    const filtrados = filtrarProdutos(produtos, query);
    const total = filtrados.length;
    const totalPaginas = Math.max(1, Math.ceil(total / PRODUTOS_POR_PAGINA));
    const paginaSolicitada = Number.parseInt(query.pagina, 10);
    const pagina = Number.isFinite(paginaSolicitada) && paginaSolicitada > 0
        ? Math.min(paginaSolicitada, totalPaginas)
        : 1;
    const offset = (pagina - 1) * PRODUTOS_POR_PAGINA;

    const categorias = [...new Set(produtos.map((p) => p.categoria).filter(Boolean))]
        .sort((a, b) => String(a).localeCompare(String(b), "pt-BR"));

    const paginacao = {
        pagina,
        limite: PRODUTOS_POR_PAGINA,
        total,
        totalPaginas,
        offset,
        temAnterior: pagina > 1,
        temProxima: pagina < totalPaginas,
    };

    return {
        produtos: filtrados.slice(offset, offset + PRODUTOS_POR_PAGINA),
        paginacao,
        categorias,
        ...paginacao,
    };
}

// ---------- SAÚDE / TESTE ----------
app.get('/ola', (req, res) => {
    res.send('Hello World!');
});

app.get('/health', (req, res) => {
    res.status(200).json({
        ok: true,
        servidor: "pagandodemaquina",
        agora: new Date().toISOString()
    });
});

// ---------- CADASTRO (front chama /Clientes) ----------
function cadastrarCliente(req, res) {
    const cliente = req.body;
    if (!cliente || Object.keys(cliente).length === 0) {
        return res.status(400).json({ resposta: "Body não preenchido", erro: "Body não preenchido" });
    }

    const nome = String(cliente.nome ?? "").trim();
    const cpfDigitos = somenteDigitos(cliente.cpf);
    const celularDigitos = somenteDigitos(cliente.celular);
    const emailLimpo = String(cliente.email ?? cliente.gmail ?? "").trim().toLowerCase();
    const senha = String(cliente.senha ?? "");

    if (nome.length < 2) {
        return res.status(400).json({ erro: "Informe um nome válido." });
    }
    if (cpfDigitos.length !== 11 || /^(\d)\1{10}$/.test(cpfDigitos)) {
        return res.status(400).json({ erro: "Informe um CPF válido com 11 dígitos." });
    }
    if (celularDigitos.length < 10 || celularDigitos.length > 11) {
        return res.status(400).json({ erro: "Informe um celular com DDD e 10 ou 11 dígitos." });
    }
    if (!emailValido(emailLimpo)) {
        return res.status(400).json({ erro: "Informe um e-mail válido." });
    }
    if (senha.length < 6 || senha.length > 72) {
        return res.status(400).json({ erro: "A senha deve ter entre 6 e 72 caracteres." });
    }

    try {
        const clientes = lerJson(ARQUIVO_CLIENTES, []);
        const jaExiste = clientes.some(
            (c) => emailCliente(c) === emailLimpo || (cpfDigitos && cpfCliente(c) === cpfDigitos)
        );
        if (jaExiste) {
            return res.status(409).json({ erro: "Já existe um cliente com este e-mail ou CPF" });
        }

        const novo = {
            ...cliente,
            id: proximoId(clientes),
            nome,
            cpf: formatarCpf(cpfDigitos),
            celular: formatarCelular(celularDigitos),
            email: emailLimpo,
            gmail: emailLimpo,
            senha: bcrypt.hashSync(senha, 10),
        };
        clientes.push(novo);
        salvarJson(ARQUIVO_CLIENTES, clientes);

        console.log('✅ Cliente cadastrado:', novo.nome);
        return res.status(201).json({
            msg: "Cliente cadastrado com sucesso!",
            resposta: "Cliente cadastrado com sucesso!",
            cliente: clienteSemSenha(novo),
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ erro: "Erro interno no servidor" });
    }
}

app.post("/Clientes", cadastrarCliente);
app.post("/cliente/cadastro", cadastrarCliente);

// ---------- LOGIN (devolve nome + token JWT para o front) ----------
app.post("/login", (req, res) => {
    const { email, senha } = req.body || {};
    if (!email || !senha) {
        return res.status(400).json({ resposta: "Informe e-mail e senha", erro: "Informe e-mail e senha" });
    }
    try {
        const clientes = lerJson(ARQUIVO_CLIENTES, []);
        const emailBuscado = String(email).trim().toLowerCase();
        const usuario = clientes.find((c) => emailCliente(c) === emailBuscado);
        if (!usuario) {
            return res.status(401).json({ msg: "E-mail não cadastrado!", resposta: "E-mail ou senha inválidos" });
        }
        if (!senhaCorreta(senha, usuario.senha)) {
            return res.status(401).json({ msg: "Credenciais inválidas!", resposta: "E-mail ou senha inválidos" });
        }

        const token = gerarToken(usuario);
        return res.status(200).json({
            nome: usuario.nome,
            token,
            msg: "Login realizado com sucesso!",
            resposta: "Login realizado com sucesso!",
            usuario: clienteSemSenha(usuario),
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ erro: error.message });
    }
});

// ---------- ROTAS DE CLIENTES (mantidas para compatibilidade) ----------
app.get("/clientes", (req, res) => {
    try {
        res.status(200).json(lerJson(ARQUIVO_CLIENTES, []));
    } catch (error) {
        res.status(500).json({ resposta: error.message });
    }
});

app.get("/cliente/:cpf", (req, res) => {
    const cpfBuscado = somenteDigitos(req.params.cpf);
    const clientes = lerJson(ARQUIVO_CLIENTES, []);
    if (clientes.length === 0) {
        return res.status(404).json({ resposta: "Nenhum cliente cadastrado ainda" });
    }
    const encontrado = clientes.find((c) => cpfCliente(c) === cpfBuscado);
    if (!encontrado) {
        return res.status(404).json({ resposta: "Cliente não encontrado com este CPF" });
    }
    return res.status(200).json(encontrado);
});

app.delete("/cliente/:cpf", (req, res) => {
    const cpfBuscado = somenteDigitos(req.params.cpf);
    const clientes = lerJson(ARQUIVO_CLIENTES, []);
    const indice = clientes.findIndex((c) => cpfCliente(c) === cpfBuscado);
    if (indice === -1) {
        return res.status(404).json({ resposta: "Cliente não encontrado com este CPF" });
    }
    clientes.splice(indice, 1);
    salvarJson(ARQUIVO_CLIENTES, clientes);
    return res.status(200).json({ resposta: "Cliente deletado com sucesso!" });
});

app.put("/clientes/:cpf", (req, res) => {
    const cpfBuscado = somenteDigitos(req.params.cpf);
    const clientes = lerJson(ARQUIVO_CLIENTES, []);
    const indice = clientes.findIndex((c) => cpfCliente(c) === cpfBuscado);
    if (indice === -1) {
        return res.status(404).json({ resposta: "clientes não encontrado!" });
    }
    clientes[indice] = { ...clientes[indice], ...req.body };
    salvarJson(ARQUIVO_CLIENTES, clientes);
    return res.status(200).json({ resposta: "Cliente alterado com sucesso!" });
});

// ---------- PERFIL (autenticado) ----------
app.get("/Clientes/perfil", autenticar, (req, res) => {
    const { cliente } = clienteDaRequisicao(req);
    if (!cliente) {
        return res.status(404).json({ erro: "Cliente não encontrado." });
    }
    return res.status(200).json(clienteSemSenha(cliente));
});

app.put("/Clientes/perfil", autenticar, (req, res) => {
    const { clientes, cliente } = clienteDaRequisicao(req);
    if (!cliente) {
        return res.status(404).json({ erro: "Cliente não encontrado." });
    }

    const { nome, cpf, celular, email, senha_atual, nova_senha } = req.body || {};
    const nomeLimpo = String(nome ?? cliente.nome ?? "").trim();
    const emailLimpo = String(email ?? emailCliente(cliente)).trim().toLowerCase();
    const cpfDigitos = somenteDigitos(cpf ?? cliente.cpf);
    const celularDigitos = somenteDigitos(celular ?? cliente.celular);

    if (nomeLimpo.length < 2 || nomeLimpo.length > 50) {
        return res.status(400).json({ erro: "Informe um nome entre 2 e 50 caracteres." });
    }
    if (cpfDigitos.length !== 11 || /^(\d)\1{10}$/.test(cpfDigitos)) {
        return res.status(400).json({ erro: "Informe um CPF válido com 11 dígitos." });
    }
    if (celularDigitos.length < 10 || celularDigitos.length > 11) {
        return res.status(400).json({ erro: "Informe um celular com DDD e 10 ou 11 dígitos." });
    }
    if (!emailValido(emailLimpo) || emailLimpo.length > 100) {
        return res.status(400).json({ erro: "Informe um e-mail válido." });
    }

    const duplicado = clientes.some(
        (c) => Number(c.id) !== Number(cliente.id)
            && (emailCliente(c) === emailLimpo || cpfCliente(c) === cpfDigitos)
    );
    if (duplicado) {
        return res.status(409).json({ erro: "Este e-mail ou CPF já está cadastrado em outra conta." });
    }

    let senhaFinal = cliente.senha;
    if (senha_atual || nova_senha) {
        if (!senhaCorreta(senha_atual, cliente.senha)) {
            return res.status(401).json({ erro: "Senha atual incorreta." });
        }
        const novaLimpa = String(nova_senha || "");
        if (novaLimpa.length < 6 || novaLimpa.length > 72) {
            return res.status(400).json({ erro: "A nova senha deve ter entre 6 e 72 caracteres." });
        }
        senhaFinal = bcrypt.hashSync(novaLimpa, 10);
    }

    Object.assign(cliente, {
        nome: nomeLimpo,
        cpf: formatarCpf(cpfDigitos),
        celular: formatarCelular(celularDigitos),
        email: emailLimpo,
        senha: senhaFinal,
    });
    if ("gmail" in cliente) cliente.gmail = emailLimpo;

    salvarJson(ARQUIVO_CLIENTES, clientes);

    return res.status(200).json({
        msg: "Dados atualizados com sucesso!",
        cliente: clienteSemSenha(cliente),
        token: gerarToken(cliente),
    });
});

// ---------- CATÁLOGO / PRODUTOS ----------
app.get('/categorias', (req, res) => {
    const categorias = [...new Set(lerProdutos().map((p) => p.categoria).filter(Boolean))]
        .sort((a, b) => String(a).localeCompare(String(b), "pt-BR"));
    res.status(200).json(categorias);
});

app.get('/produtos', (req, res) => {
    try {
        const produtos = lerProdutos();
        if (produtos.length === 0) {
            return res.status(404).json({ resposta: "Nenhum produto cadastrado ainda" });
        }
        return res.status(200).json(montarRespostaProdutos(produtos, req.query));
    } catch (error) {
        return res.status(500).json({ resposta: error.message });
    }
});

app.get('/produtos/:id', (req, res) => {
    const produto = lerProdutos().find((p) => String(p.id) === req.params.id);
    if (!produto) return res.status(404).json({ resposta: "Produto não encontrado" });
    return res.status(200).json(produto);
});

// aliases usados pelo projeto de referência
app.get('/produto', (req, res) => {
    const produtos = lerProdutos();
    const filtrados = filtrarProdutos(produtos, req.query);
    const resposta = montarRespostaProdutos(produtos, req.query);
    return res.status(200).json(filtrados.length === produtos.length && !req.query.busca
        ? produtos
        : resposta.produtos);
});

app.get('/produto/:id', (req, res) => {
    const produto = lerProdutos().find((p) => String(p.id) === req.params.id);
    if (!produto) return res.status(404).json({ resposta: "Produto não encontrado" });
    return res.status(200).json(produto);
});

// ---------- COMPRA ----------
app.post('/compra', autenticar, async (req, res) => {
    const { forma_pagamento, produtos: itens } = req.body || {};

    if (!forma_pagamento) {
        return res.status(400).json({ erro: "Informe a forma de pagamento" });
    }
    if (!Array.isArray(itens) || itens.length === 0) {
        return res.status(400).json({ erro: "Informe ao menos um produto" });
    }

    try {
        const produtos = lerProdutos();
        const carrinho = [];
        let valorTotal = 0;

        // valida tudo antes de baixar o estoque
        for (const item of itens) {
            const id = Number(item.id);
            const quantidade = Number(item.quantidade);
            if (!Number.isInteger(id) || !Number.isInteger(quantidade) || quantidade <= 0) {
                return res.status(400).json({ erro: "Produto ou quantidade inválida" });
            }
            const produto = produtos.find((p) => Number(p.id) === id);
            if (!produto) {
                return res.status(404).json({ erro: "Produto não encontrado: ID " + id });
            }
            if (produto.estoque < quantidade) {
                return res.status(400).json({ erro: "Estoque insuficiente para o produto: " + produto.nome });
            }
            valorTotal += Number(produto.preco) * quantidade;
            carrinho.push({ produto, quantidade, valor_unitario: Number(produto.preco) });
        }

        for (const item of carrinho) {
            item.produto.estoque -= item.quantidade;
            item.produto.quantidade_img = item.produto.estoque;
        }
        salvarProdutos(produtos);

        valorTotal = Number(valorTotal.toFixed(2));
        const compras = lerJson(ARQUIVO_COMPRAS, []);
        const idCompra = compras.reduce((maior, c) => Math.max(maior, Number(c.id) || 0), 0) + 1;
        const compra = {
            id: idCompra,
            data: new Date().toISOString(),
            forma_pagamento,
            valor_total: valorTotal,
            id_cliente: req.usuario?.id ?? null,
            itens: carrinho.map((i) => ({
                id_produto: Number(i.produto.id),
                quantidade: i.quantidade,
                valor_unitario: i.valor_unitario,
            })),
        };
        compras.push(compra);
        salvarJson(ARQUIVO_COMPRAS, compras);

        // Espelha a compra no MySQL (tabelas compra e possui). Se o banco
        // estiver indisponível, a compra continua salva no compras.json.
        let salvaNoBanco = false;
        try {
            const { cliente } = clienteDaRequisicao(req);
            const idClienteBanco = await garantirCliente(cliente);
            await salvarCompra({ ...compra, id_cliente: idClienteBanco });
            salvaNoBanco = true;
        } catch (errorBanco) {
            console.error("Compra salva em compras.json, mas não no MySQL:", errorBanco.message);
        }

        return res.status(201).json({
            msg: "Compra realizada com sucesso",
            id_compra: idCompra,
            valor_total: valorTotal,
            banco: salvaNoBanco,
        });
    } catch (error) {
        console.error("Erro ao finalizar compra:", error);
        return res.status(500).json({ erro: "Erro interno ao finalizar a compra." });
    }
});

// ---------- HISTÓRICO DE COMPRAS ----------
// Devolve somente os pedidos do cliente autenticado, com os dados dos
// produtos (nome, foto, emoji) buscados no catálogo atual.
app.get('/compras', autenticar, (req, res) => {
    try {
        const idCliente = Number(req.usuario?.id);
        const todas = lerJson(ARQUIVO_COMPRAS, []);
        const produtos = lerProdutos();
        const porId = new Map(produtos.map((p) => [Number(p.id), p]));

        const compras = todas
            .filter((compra) => Number(compra.id_cliente) === idCliente)
            .sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')))
            .map((compra) => {
                const itens = Array.isArray(compra.itens) ? compra.itens : [];
                const totalItens = itens.reduce(
                    (soma, item) => soma + (Number(item.quantidade) || 0), 0
                );

                return {
                    id: compra.id,
                    data: compra.data,
                    forma_pagamento: compra.forma_pagamento,
                    valor_total: Number(compra.valor_total) || 0,
                    quantidade_itens: totalItens,
                    itens: itens.map((item) => {
                        const produto = porId.get(Number(item.id_produto));
                        const valorUnitario = Number(item.valor_unitario) || 0;
                        const quantidade = Number(item.quantidade) || 0;
                        const caminhoImg = String(produto?.caminho_img || '').replace(/^\/+/, '');
                        return {
                            id_produto: Number(item.id_produto),
                            nome: produto?.nome || `Produto #${item.id_produto}`,
                            categoria: produto?.categoria || '',
                            emoji: produto?.emoji || '🎵',
                            imagem: caminhoImg ? `/img/${caminhoImg}` : '',
                            quantidade,
                            valor_unitario: valorUnitario,
                            subtotal: Number((valorUnitario * quantidade).toFixed(2)),
                        };
                    }),
                };
            });

        return res.status(200).json(compras);
    } catch (error) {
        console.error("Erro ao carregar histórico de compras:", error);
        return res.status(500).json({ erro: "Não foi possível carregar seu histórico de compras." });
    }
});

app.listen(port, () => {
    console.log(`🚀 API rodando em http://localhost:${port}`);
});
