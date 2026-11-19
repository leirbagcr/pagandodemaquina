// ===================== CONFIG =====================
// O front-end conversa com o back-end por aqui. Por padrão usa o mesmo
// endereço que serviu a página (quando você abre http://localhost:3000).
// Se abrir o HTML direto do disco (file://) ou hospedar em outro lugar,
// a API é http://localhost:3000. Para sobrescrever, defina antes deste
// script: <script>window.API_BASE = "http://servidor:3000";</script>
const API_BASE = window.API_BASE
    || (window.location.protocol.startsWith("http")
        ? window.location.origin
        : "http://localhost:3000");

// ===================== NOTIFICAÇÕES ANIMADAS =====================
const NOTIFICACAO_ICONES = {
    sucesso: "✅",
    erro: "❌",
    aviso: "⚠️",
    info: "ℹ️",
};

const NOTIFICACAO_TITULOS = {
    sucesso: "Sucesso",
    erro: "Erro",
    aviso: "Atenção",
    info: "Informação",
};

function mostrarNotificacao(mensagem, tipo = "info", duracao = 4200) {
    const container = document.getElementById("notificacoes");
    if (!container) return;

    const tipoFinal = NOTIFICACAO_ICONES[tipo] ? tipo : "info";
    const duracaoFinal = Math.max(1500, Number(duracao) || 4200);

    while (container.children.length >= 4) {
        container.firstElementChild.remove();
    }

    const notificacao = document.createElement("div");
    notificacao.className = `notificacao notificacao-${tipoFinal}`;
    notificacao.style.setProperty("--notif-duracao", `${duracaoFinal}ms`);
    notificacao.setAttribute("role", tipoFinal === "erro" ? "alert" : "status");

    const icone = document.createElement("div");
    icone.className = "notificacao-icone";
    icone.setAttribute("aria-hidden", "true");
    icone.textContent = NOTIFICACAO_ICONES[tipoFinal];

    const conteudo = document.createElement("div");
    conteudo.className = "notificacao-conteudo";

    const titulo = document.createElement("div");
    titulo.className = "notificacao-titulo";
    titulo.textContent = NOTIFICACAO_TITULOS[tipoFinal];

    const texto = document.createElement("div");
    texto.className = "notificacao-mensagem";
    texto.textContent = mensagem;

    conteudo.append(titulo, texto);

    const fechar = document.createElement("button");
    fechar.type = "button";
    fechar.className = "notificacao-fechar";
    fechar.setAttribute("aria-label", "Fechar notificação");
    fechar.textContent = "×";

    const progresso = document.createElement("div");
    progresso.className = "notificacao-progresso";
    progresso.setAttribute("aria-hidden", "true");

    notificacao.append(icone, conteudo, fechar, progresso);
    container.appendChild(notificacao);

    let removendo = false;
    let timer = null;

    function remover() {
        if (removendo) return;
        removendo = true;
        clearTimeout(timer);
        notificacao.classList.add("saindo");
        setTimeout(() => notificacao.remove(), 320);
    }

    timer = setTimeout(remover, duracaoFinal);
    fechar.addEventListener("click", remover);
}

// ===================== NAVEGAÇÃO =====================
function mostrarSecao(nome) {
    // Perfil e histórico de compras são áreas privadas.
    if ((nome === "perfil" || nome === "compras") && !getUsuarioLogado()) {
        mostrarNotificacao("Faça login para acessar esta área.", "info");
        nome = "login";
    }

    document.querySelectorAll(".secao").forEach((s) => (s.hidden = true));
    document.getElementById(`secao-${nome}`).hidden = false;

    document.querySelectorAll(".nav-btn[data-secao]").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.secao === nome);
    });

    if (nome === "produtos") carregarProdutos(paginaAtualProdutos);
    if (nome === "carrinho") renderCarrinho();
    if (nome === "perfil") carregarPerfil();
    if (nome === "compras") carregarCompras();
}

document.querySelectorAll("[data-secao]").forEach((el) => {
    el.addEventListener("click", (e) => {
        e.preventDefault();
        mostrarSecao(el.dataset.secao);
    });
});

// ===================== SESSÃO (LOGIN) =====================
function getUsuarioLogado() {
    const raw = localStorage.getItem("usuarioLogado");
    return raw ? JSON.parse(raw) : null;
}

// ===================== MENU DO USUÁRIO =====================
const btnMenuUsuario = document.getElementById("btnMenuUsuario");
const menuUsuarioLista = document.getElementById("menuUsuarioLista");

function fecharMenuUsuario() {
    menuUsuarioLista.hidden = true;
    btnMenuUsuario.setAttribute("aria-expanded", "false");
}

function alternarMenuUsuario() {
    const abrir = menuUsuarioLista.hidden;
    menuUsuarioLista.hidden = !abrir;
    btnMenuUsuario.setAttribute("aria-expanded", String(abrir));
}

btnMenuUsuario.addEventListener("click", (e) => {
    e.stopPropagation();
    alternarMenuUsuario();
});

document.addEventListener("click", (e) => {
    if (menuUsuarioLista.hidden) return;
    if (e.target.closest("#menuUsuario")) return;
    fecharMenuUsuario();
});

document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || menuUsuarioLista.hidden) return;
    fecharMenuUsuario();
    btnMenuUsuario.focus();
});

document.getElementById("btnPerfilMenu").addEventListener("click", () => {
    fecharMenuUsuario();
});

document.getElementById("btnComprasMenu").addEventListener("click", () => {
    fecharMenuUsuario();
});

function atualizarNavbarUsuario() {
    const usuario = getUsuarioLogado();
    const navbarUser = document.getElementById("navbarUser");
    const btnLoginNav = document.getElementById("btnLoginNav");

    fecharMenuUsuario();

    if (usuario) {
        navbarUser.style.display = "flex";
        btnLoginNav.style.display = "none";
        document.getElementById("usuarioNome").textContent = `Olá, ${usuario.nome}`;
    } else {
        navbarUser.style.display = "none";
        btnLoginNav.style.display = "inline-block";
    }
}

document.getElementById("btnLogout").addEventListener("click", () => {
    localStorage.removeItem("usuarioLogado");
    atualizarNavbarUsuario();
    limparPerfil();
    mostrarSecao("produtos");
    mostrarNotificacao("Você saiu da sua conta.", "info");
});

document.getElementById("formLogin").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const senha = document.getElementById("loginSenha").value;
    const erroEl = document.getElementById("loginErro");
    erroEl.textContent = "";

    try {
        const resposta = await fetch(`${API_BASE}/login`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email, senha }),
        });
        const dados = await resposta.json();

        if (!resposta.ok) {
            erroEl.textContent = dados.msg || dados.erro || "Não foi possível entrar.";
            return;
        }

        localStorage.setItem("usuarioLogado", JSON.stringify({ nome: dados.nome, token: dados.token }));
        atualizarNavbarUsuario();
        document.getElementById("formLogin").reset();
        mostrarSecao("produtos");
        mostrarNotificacao(`Bem-vindo, ${dados.nome}!`, "sucesso");
    } catch (error) {
        erroEl.textContent = "Erro ao conectar com o servidor: " + error.message;
    }
});

// ===================== CEP (CADASTRO) =====================
function pesquisar(cep) {
    const cepInput = document.getElementById("cep");
    const erroCep = document.getElementById("cepErro");

    cep = cep.replace(/\D/g, "");

    if (cep.length === 8) {
        cepInput.classList.remove("invalid");
        cepInput.setCustomValidity("");
        erroCep.textContent = "";

        const link = "https://viacep.com.br/ws/" + cep + "/json/?callback=preencherEndereco";
        var script = document.createElement("script");
        script.src = link;
        document.body.appendChild(script);
    } else if (cep.length > 0) {
        cepInput.classList.add("invalid");
        cepInput.setCustomValidity("CEP deve conter 8 dígitos.");
        erroCep.textContent = "CEP inválido: informe exatamente 8 números.";
    } else {
        cepInput.classList.remove("invalid");
        cepInput.setCustomValidity("");
        erroCep.textContent = "";
    }
}

function preencherEndereco(conteudo) {
    if (!("erro" in conteudo)) {
        document.getElementById("rua").value = conteudo.logradouro;
        document.getElementById("bairro").value = conteudo.bairro;
        document.getElementById("cidade").value = conteudo.localidade;
        document.getElementById("estado").value = conteudo.uf;
    } else {
        alert("CEP não encontrado!");
    }
}

// ===================== CADASTRO =====================
// Os nomes dos campos abaixo seguem as colunas da tabela Clientes (MySQL)
function pegarDadosCadastro() {
    return {
        nome: document.getElementById("nome").value,
        cpf: document.getElementById("cpf").value,
        email: document.getElementById("email").value,
        celular: document.getElementById("celular").value,
        senha: document.getElementById("senha").value,
        cep: document.getElementById("cep").value,
        rua: document.getElementById("rua").value,
        numero_casa: document.getElementById("numero_casa").value,
        bairro: document.getElementById("bairro").value,
        cidade: document.getElementById("cidade").value,
        estado: document.getElementById("estado").value,
        data_nasc: document.getElementById("dt_nasc").value,
    };
}

document.getElementById("formCadastro").addEventListener("submit", async (e) => {
    e.preventDefault();
    const erroEl = document.getElementById("cadastroErro");
    erroEl.textContent = "";
    const dados = pegarDadosCadastro();

    try {
        const resposta = await fetch(`${API_BASE}/Clientes`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(dados),
        });
        const corpo = await resposta.json();

        if (!resposta.ok) {
            erroEl.textContent = corpo.erro || corpo.msg || "Erro ao cadastrar!";
            return;
        }

        mostrarNotificacao("Cliente cadastrado com sucesso!", "sucesso");
        document.getElementById("formCadastro").reset();
        mostrarSecao("login");
    } catch (error) {
        erroEl.textContent = "Erro ao conectar com o servidor: " + error.message;
    }
});

// ===================== PERFIL =====================
let carregandoPerfil = false;

function somenteDigitos(valor) {
    return String(valor ?? "").replace(/\D/g, "");
}

function mascaraCpf(valor) {
    const digitos = somenteDigitos(valor).slice(0, 11);
    if (!digitos) return "";
    if (digitos.length <= 3) return digitos;
    if (digitos.length <= 6) return `${digitos.slice(0, 3)}.${digitos.slice(3)}`;
    if (digitos.length <= 9) return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6)}`;
    return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
}

function mascaraCelular(valor) {
    const digitos = somenteDigitos(valor).slice(0, 11);
    if (!digitos) return "";
    if (digitos.length <= 2) return `(${digitos}`;

    const ddd = digitos.slice(0, 2);
    const numero = digitos.slice(2);

    if (numero.length <= 5) return `(${ddd})${numero}`;
    if (numero.length === 8) return `(${ddd})${numero.slice(0, 4)}-${numero.slice(4)}`;
    return `(${ddd})${numero.slice(0, 5)}-${numero.slice(5)}`;
}

function limparPerfil() {
    const form = document.getElementById("formPerfil");
    if (form) form.reset();

    const erroEl = document.getElementById("perfilErro");
    if (erroEl) erroEl.textContent = "";

    document.getElementById("perfilNomeExibicao").textContent = "Seu perfil";
    document.getElementById("perfilEmailExibicao").textContent = "";
    document.getElementById("perfilAvatar").textContent = "?";
}

function preencherPerfil(perfil) {
    document.getElementById("perfilNome").value = perfil.nome || "";
    document.getElementById("perfilEmail").value = perfil.email || "";
    document.getElementById("perfilCpf").value = mascaraCpf(perfil.cpf || "");
    document.getElementById("perfilCelular").value = mascaraCelular(perfil.celular || "");
    document.getElementById("perfilSenhaAtual").value = "";
    document.getElementById("perfilNovaSenha").value = "";
    document.getElementById("perfilConfirmarSenha").value = "";
    document.getElementById("perfilErro").textContent = "";

    const nome = String(perfil.nome || "").trim();
    document.getElementById("perfilNomeExibicao").textContent = nome || "Seu perfil";
    document.getElementById("perfilEmailExibicao").textContent = perfil.email || "";
    document.getElementById("perfilAvatar").textContent = (nome.charAt(0) || "?").toUpperCase();
}

function validarPerfil(dados) {
    if (dados.nome.length < 2 || dados.nome.length > 50) {
        return "Informe um nome entre 2 e 50 caracteres.";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email) || dados.email.length > 50) {
        return "Informe um e-mail válido.";
    }
    if (dados.cpf.length !== 11 || /^(\d)\1{10}$/.test(dados.cpf)) {
        return "Informe um CPF válido com 11 dígitos.";
    }
    if (dados.celular.length < 10 || dados.celular.length > 11) {
        return "Informe um celular com DDD e 10 ou 11 dígitos.";
    }

    const querTrocarSenha = Boolean(dados.senhaAtual || dados.novaSenha || dados.confirmarSenha);
    if (querTrocarSenha) {
        if (!dados.senhaAtual) return "Informe sua senha atual para trocar a senha.";
        if (!dados.novaSenha) return "Informe a nova senha.";
        if (dados.novaSenha.length < 6 || dados.novaSenha.length > 72) {
            return "A nova senha deve ter entre 6 e 72 caracteres.";
        }
        if (dados.novaSenha !== dados.confirmarSenha) {
            return "As senhas novas não coincidem.";
        }
    }

    return "";
}

function encerrarSessao(mensagem) {
    localStorage.removeItem("usuarioLogado");
    atualizarNavbarUsuario();
    limparPerfil();
    mostrarSecao("login");
    if (mensagem) mostrarNotificacao(mensagem, "aviso", 6000);
}

async function carregarPerfil() {
    const usuario = getUsuarioLogado();
    const erroEl = document.getElementById("perfilErro");

    if (!usuario) {
        mostrarNotificacao("Faça login para acessar seu perfil.", "info");
        return false;
    }
    if (carregandoPerfil) return false;

    carregandoPerfil = true;
    erroEl.textContent = "";

    const btn = document.getElementById("btnSalvarPerfil");
    const textoOriginal = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Carregando...";

    try {
        const resposta = await fetch(`${API_BASE}/Clientes/perfil`, {
            headers: { authorization: `Bearer ${usuario.token}` },
        });
        const dados = await resposta.json().catch(() => ({}));

        if (!resposta.ok) {
            if (resposta.status === 401 || resposta.status === 403) {
                encerrarSessao("Sua sessão expirou. Faça login novamente.");
                return false;
            }
            erroEl.textContent = dados.erro || dados.msg || "Não foi possível carregar seu perfil.";
            return false;
        }

        preencherPerfil(dados);
        return true;
    } catch (error) {
        erroEl.textContent = "Erro ao conectar com o servidor: " + error.message;
        return false;
    } finally {
        carregandoPerfil = false;
        btn.disabled = false;
        btn.textContent = textoOriginal;
    }
}

document.getElementById("formPerfil").addEventListener("submit", async (e) => {
    e.preventDefault();
    const erroEl = document.getElementById("perfilErro");
    erroEl.textContent = "";

    const usuario = getUsuarioLogado();
    if (!usuario) {
        mostrarNotificacao("Faça login para acessar seu perfil.", "info");
        mostrarSecao("login");
        return;
    }

    const dados = {
        nome: document.getElementById("perfilNome").value.trim(),
        email: document.getElementById("perfilEmail").value.trim(),
        cpf: somenteDigitos(document.getElementById("perfilCpf").value),
        celular: somenteDigitos(document.getElementById("perfilCelular").value),
        senhaAtual: document.getElementById("perfilSenhaAtual").value,
        novaSenha: document.getElementById("perfilNovaSenha").value,
        confirmarSenha: document.getElementById("perfilConfirmarSenha").value,
    };

    const erroValidacao = validarPerfil(dados);
    if (erroValidacao) {
        erroEl.textContent = erroValidacao;
        mostrarNotificacao(erroValidacao, "aviso");
        return;
    }

    const btn = document.getElementById("btnSalvarPerfil");
    const textoOriginal = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Salvando...";

    try {
        const resposta = await fetch(`${API_BASE}/Clientes/perfil`, {
            method: "PUT",
            headers: {
                "content-type": "application/json",
                authorization: `Bearer ${usuario.token}`,
            },
            body: JSON.stringify({
                nome: dados.nome,
                cpf: dados.cpf,
                celular: dados.celular,
                email: dados.email,
                senha_atual: dados.senhaAtual,
                nova_senha: dados.novaSenha,
            }),
        });
        const corpo = await resposta.json().catch(() => ({}));
        const mensagem = corpo.erro || corpo.msg || "Não foi possível salvar seu perfil.";

        if (!resposta.ok) {
            const senhaIncorreta = resposta.status === 401 && /senha atual/i.test(mensagem);

            if ((resposta.status === 401 || resposta.status === 403) && !senhaIncorreta) {
                encerrarSessao("Sua sessão expirou. Faça login novamente.");
                return;
            }

            erroEl.textContent = mensagem;
            mostrarNotificacao(mensagem, resposta.status === 409 ? "aviso" : "erro");
            return;
        }

        const cliente = corpo.cliente || {};
        localStorage.setItem("usuarioLogado", JSON.stringify({
            nome: cliente.nome || dados.nome,
            token: corpo.token || usuario.token,
        }));

        atualizarNavbarUsuario();
        preencherPerfil(cliente);
        mostrarNotificacao(corpo.msg || "Dados atualizados com sucesso!", "sucesso");
    } catch (error) {
        erroEl.textContent = "Erro ao conectar com o servidor: " + error.message;
        mostrarNotificacao("Erro ao conectar com o servidor.", "erro");
    } finally {
        btn.disabled = false;
        btn.textContent = textoOriginal;
    }
});

document.getElementById("btnCancelarPerfil").addEventListener("click", async () => {
    const recarregou = await carregarPerfil();
    if (recarregou) mostrarNotificacao("Alterações descartadas.", "info");
});

document.getElementById("perfilCpf").addEventListener("input", (e) => {
    e.target.value = mascaraCpf(e.target.value);
});

document.getElementById("perfilCelular").addEventListener("input", (e) => {
    e.target.value = mascaraCelular(e.target.value);
});

// ===================== PRODUTOS =====================
let paginaAtualProdutos = 1;
let timerBuscaProdutos = null;
let categoriasCarregadas = false;

function formatarPreco(valor) {
    return Number(valor).toFixed(2).replace(".", ",");
}

// Capas opcionais (caminho_img). Sem imagem, o emoji do produto é o fallback.
function urlImagemProduto(produto) {
    const caminho = String(produto?.caminho_img || produto?.imagem || "").trim().replace(/^\/+/, "");
    if (!caminho) return "";
    return `${API_BASE}/img/${caminho}`;
}

function escaparHtml(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

async function carregarCategorias() {
    if (categoriasCarregadas) return;

    try {
        const resposta = await fetch(`${API_BASE}/categorias`);
        if (!resposta.ok) return;

        const categorias = await resposta.json();
        const select = document.getElementById("filtroCategoria");

        categorias.forEach((categoria) => {
            const opcao = document.createElement("option");
            opcao.value = categoria;
            opcao.textContent = categoria;
            select.appendChild(opcao);
        });

        categoriasCarregadas = true;
    } catch (error) {
        // Se a lista de categorias falhar, os outros filtros continuam funcionando.
    }
}

function obterFiltrosProdutos() {
    return {
        busca: document.getElementById("buscaProduto").value.trim(),
        categoria: document.getElementById("filtroCategoria").value,
        precoMin: document.getElementById("filtroPrecoMin").value,
        precoMax: document.getElementById("filtroPrecoMax").value,
        ordem: document.getElementById("filtroOrdem").value,
    };
}

function montarQueryProdutos(pagina) {
    const filtros = obterFiltrosProdutos();
    const params = new URLSearchParams();

    if (filtros.busca) params.set("busca", filtros.busca);
    if (filtros.categoria) params.set("categoria", filtros.categoria);
    if (filtros.precoMin !== "") params.set("preco_min", filtros.precoMin);
    if (filtros.precoMax !== "") params.set("preco_max", filtros.precoMax);
    if (filtros.ordem) params.set("ordem", filtros.ordem);
    params.set("pagina", String(pagina));

    return params.toString();
}

function renderizarPaginacao(paginacao) {
    const nav = document.getElementById("paginacao");
    nav.innerHTML = "";

    if (!paginacao || paginacao.totalPaginas <= 1) {
        nav.hidden = true;
        return;
    }

    nav.hidden = false;

    function criarBotao(texto, pagina, { ativo = false, desabilitado = false } = {}) {
        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "pagina-btn" + (ativo ? " ativa" : "");
        botao.textContent = texto;
        botao.disabled = desabilitado;
        if (ativo) botao.setAttribute("aria-current", "page");

        botao.addEventListener("click", () => {
            if (!desabilitado && !ativo) carregarProdutos(pagina);
        });

        nav.appendChild(botao);
    }

    criarBotao("« Anterior", paginacao.pagina - 1, { desabilitado: !paginacao.temAnterior });

    for (let pagina = 1; pagina <= paginacao.totalPaginas; pagina += 1) {
        criarBotao(String(pagina), pagina, { ativo: pagina === paginacao.pagina });
    }

    criarBotao("Próxima »", paginacao.pagina + 1, { desabilitado: !paginacao.temProxima });
}

async function carregarProdutos(pagina = 1) {
    const lista = document.getElementById("listaProdutos");
    const erroEl = document.getElementById("produtosErro");
    const resumoEl = document.getElementById("produtosResumo");
    const paginacaoEl = document.getElementById("paginacao");
    const filtros = obterFiltrosProdutos();

    erroEl.textContent = "";
    resumoEl.textContent = "";

    if (filtros.precoMin !== "" && filtros.precoMax !== "" && Number(filtros.precoMin) > Number(filtros.precoMax)) {
        lista.innerHTML = "";
        paginacaoEl.hidden = true;
        erroEl.textContent = "O preço mínimo não pode ser maior que o preço máximo.";
        return;
    }

    paginaAtualProdutos = Math.max(1, Number(pagina) || 1);
    lista.innerHTML = "<p>Carregando produtos...</p>";

    try {
        const resposta = await fetch(`${API_BASE}/produtos?${montarQueryProdutos(paginaAtualProdutos)}`);
        const dados = await resposta.json();

        if (!resposta.ok) {
            lista.innerHTML = "";
            paginacaoEl.hidden = true;
            erroEl.textContent = dados.erro || "Não foi possível carregar os produtos.";
            return;
        }

        const produtos = Array.isArray(dados) ? dados : (dados.produtos || []);
        const paginacao = Array.isArray(dados)
            ? { pagina: 1, limite: produtos.length, total: produtos.length, totalPaginas: 1 }
            : (dados.paginacao || {
                pagina: 1,
                limite: produtos.length,
                total: produtos.length,
                totalPaginas: 1,
            });

        paginaAtualProdutos = paginacao.pagina;

        lista.innerHTML = "";

        if (produtos.length === 0) {
            paginacaoEl.hidden = true;
            lista.innerHTML = '<p class="aviso">Nenhum produto encontrado com esses filtros.</p>';
            resumoEl.textContent = "0 produtos encontrados";
            return;
        }

        produtos.forEach((produto) => {
            const estoqueBruto = produto.quantidade_img;
            const estoqueValido = estoqueBruto === null || estoqueBruto === undefined
                ? null
                : Number(estoqueBruto);
            const semEstoque = Number.isFinite(estoqueValido) && estoqueValido <= 0;

            const imagemUrl = urlImagemProduto(produto);
            const imagemHtml = imagemUrl
                ? `<img class="card-produto-img" alt="Imagem de ${escaparHtml(produto.nome)}" loading="lazy" data-src="${escaparHtml(imagemUrl)}">`
                : "";

            const card = document.createElement("div");
            card.className = "card-produto";
            card.innerHTML = `
                <div class="card-produto-imagem" data-emoji="${escaparHtml(produto.emoji || "🎵")}">${imagemHtml}</div>
                <span class="card-produto-categoria">${escaparHtml(produto.categoria || "Sem categoria")}</span>
                <h3>${escaparHtml(produto.nome)}</h3>
                <p class="card-produto-desc">${escaparHtml(produto.descricao || "")}</p>
                <p class="card-produto-preco">R$ ${formatarPreco(produto.preco)}</p>
                ${Number.isFinite(estoqueValido) ? `<p class="card-produto-estoque">${semEstoque ? "Sem estoque" : `Em estoque: ${estoqueValido}`}</p>` : ""}
                <button class="submit-btn" data-add-id="${produto.id}" ${semEstoque ? "disabled" : ""}>${semEstoque ? "Sem estoque" : "Adicionar ao carrinho"}</button>
            `;
            lista.appendChild(card);

            const imagem = card.querySelector(".card-produto-img");
            if (imagem) {
                imagem.addEventListener("error", () => imagem.remove(), { once: true });
                imagem.src = imagem.dataset.src;
                imagem.removeAttribute("data-src");
            }
        });

        lista.querySelectorAll("[data-add-id]").forEach((btn) => {
            btn.addEventListener("click", () => {
                const produto = produtos.find((p) => String(p.id) === btn.dataset.addId);
                adicionarAoCarrinho(produto);
            });
        });

        const inicio = (paginacao.pagina - 1) * paginacao.limite + 1;
        const fim = inicio + produtos.length - 1;
        resumoEl.textContent = `Mostrando ${inicio}–${fim} de ${paginacao.total} produto(s) • Página ${paginacao.pagina} de ${paginacao.totalPaginas}`;

        renderizarPaginacao(paginacao);
    } catch (error) {
        lista.innerHTML = "";
        paginacaoEl.hidden = true;
        erroEl.textContent = "Erro ao conectar com o servidor: " + error.message;
    }
}

function agendarCarregamentoProdutos() {
    clearTimeout(timerBuscaProdutos);
    timerBuscaProdutos = setTimeout(() => carregarProdutos(1), 350);
}

document.getElementById("formFiltros").addEventListener("submit", (e) => {
    e.preventDefault();
    clearTimeout(timerBuscaProdutos);
    carregarProdutos(1);
});

document.getElementById("buscaProduto").addEventListener("input", agendarCarregamentoProdutos);
document.getElementById("filtroPrecoMin").addEventListener("input", agendarCarregamentoProdutos);
document.getElementById("filtroPrecoMax").addEventListener("input", agendarCarregamentoProdutos);
document.getElementById("filtroCategoria").addEventListener("change", () => carregarProdutos(1));
document.getElementById("filtroOrdem").addEventListener("change", () => carregarProdutos(1));

document.getElementById("btnLimparFiltros").addEventListener("click", () => {
    clearTimeout(timerBuscaProdutos);
    document.getElementById("formFiltros").reset();
    carregarProdutos(1);
});

// ===================== CARRINHO (localStorage) =====================
// O carrinho fica no navegador; a finalização envia os itens para POST /compra.
function getCarrinho() {
    try {
        const bruto = JSON.parse(localStorage.getItem("carrinho") || "[]");
        if (!Array.isArray(bruto)) return [];

        return bruto
            .map((item) => ({
                id: Number(item.id),
                nome: String(item.nome || ""),
                preco: Number(item.preco) || 0,
                qtd: Math.max(1, Number(item.qtd) || 1),
                imagem: String(item.imagem || ""),
                estoque: item.estoque === null || item.estoque === undefined
                    ? null
                    : Number(item.estoque),
            }))
            .filter((item) => Number.isInteger(item.id));
    } catch {
        return [];
    }
}

function salvarCarrinho(carrinho) {
    localStorage.setItem("carrinho", JSON.stringify(carrinho));
    atualizarContadorCarrinho();
}

function adicionarAoCarrinho(produto) {
    if (!produto) return;

    const estoqueBruto = produto.quantidade_img;
    const estoque = estoqueBruto === null || estoqueBruto === undefined
        ? null
        : Number(estoqueBruto);
    if (estoque !== null && Number.isFinite(estoque) && estoque <= 0) {
        mostrarNotificacao("Produto sem estoque.", "aviso");
        return;
    }

    const carrinho = getCarrinho();
    const item = carrinho.find((i) => String(i.id) === String(produto.id));

    if (item) {
        const novaQtd = item.qtd + 1;
        if (estoque !== null && novaQtd > estoque) {
            mostrarNotificacao("Quantidade máxima em estoque atingida.", "aviso");
            return;
        }
        item.qtd = novaQtd;
    } else {
        carrinho.push({
            id: Number(produto.id),
            nome: produto.nome,
            preco: Number(produto.preco),
            qtd: 1,
            imagem: urlImagemProduto(produto),
            estoque,
        });
    }

    salvarCarrinho(carrinho);
    mostrarNotificacao(`${produto.nome} adicionado ao carrinho.`, "sucesso", 2500);
}

function alterarQtd(id, delta) {
    let carrinho = getCarrinho();
    const item = carrinho.find((i) => String(i.id) === String(id));
    if (!item) return;

    const novaQtd = item.qtd + delta;
    if (delta > 0 && item.estoque !== null && Number.isFinite(item.estoque) && novaQtd > item.estoque) {
        mostrarNotificacao("Quantidade máxima em estoque atingida.", "aviso");
        return;
    }

    item.qtd = novaQtd;
    if (item.qtd <= 0) {
        carrinho = carrinho.filter((i) => String(i.id) !== String(id));
    }
    salvarCarrinho(carrinho);
    renderCarrinho();
}

function removerDoCarrinho(id) {
    const carrinho = getCarrinho().filter((i) => String(i.id) !== String(id));
    salvarCarrinho(carrinho);
    renderCarrinho();
}

function atualizarContadorCarrinho() {
    const total = getCarrinho().reduce((soma, i) => soma + i.qtd, 0);
    document.getElementById("carrinhoContador").textContent = total;
}

function renderCarrinho() {
    const carrinho = getCarrinho();
    const lista = document.getElementById("listaCarrinho");
    const vazioEl = document.getElementById("carrinhoVazio");
    const layoutEl = document.getElementById("carrinhoLayout");
    const btnFinalizar = document.getElementById("btnFinalizar");
    const erroEl = document.getElementById("carrinhoErro");
    const totalEl = document.getElementById("carrinhoTotal");
    const qtdEl = document.getElementById("resumoQtd");
    const subtotalEl = document.getElementById("resumoSubtotal");

    lista.innerHTML = "";
    erroEl.textContent = "";

    if (carrinho.length === 0) {
        vazioEl.hidden = false;
        layoutEl.hidden = true;
        btnFinalizar.hidden = true;
        qtdEl.textContent = "0";
        subtotalEl.textContent = "R$ 0,00";
        totalEl.textContent = "";
        return;
    }

    vazioEl.hidden = true;
    layoutEl.hidden = false;
    btnFinalizar.hidden = false;

    let total = 0;
    let quantidadeItens = 0;

    carrinho.forEach((item) => {
        const subtotal = item.preco * item.qtd;
        total += subtotal;
        quantidadeItens += item.qtd;

        const miniatura = item.imagem
            ? `<img src="${escaparHtml(item.imagem)}" alt="" loading="lazy">`
            : `<span aria-hidden="true">🎵</span>`;
        const estoqueTexto = item.estoque !== null && Number.isFinite(item.estoque)
            ? `Disponível: ${item.estoque}`
            : "";

        const linha = document.createElement("article");
        linha.className = "item-carrinho";
        linha.innerHTML = `
            <div class="item-imagem">${miniatura}</div>
            <div class="item-info">
                <h3>${escaparHtml(item.nome)}</h3>
                <p class="item-preco-unitario">R$ ${formatarPreco(item.preco)} cada</p>
                <p class="item-estoque">${estoqueTexto}</p>
            </div>
            <div class="item-controles">
                <div class="item-qtd">
                    <button type="button" data-menos="${item.id}" aria-label="Diminuir quantidade">−</button>
                    <span>${item.qtd}</span>
                    <button type="button" data-mais="${item.id}" aria-label="Aumentar quantidade">+</button>
                </div>
                <strong class="item-subtotal">R$ ${formatarPreco(subtotal)}</strong>
                <button type="button" class="item-remover" data-remover="${item.id}">Remover</button>
            </div>
        `;
        lista.appendChild(linha);
    });

    qtdEl.textContent = String(quantidadeItens);
    subtotalEl.textContent = `R$ ${formatarPreco(total)}`;
    totalEl.textContent = `R$ ${formatarPreco(total)}`;

    lista.querySelectorAll("[data-mais]").forEach((b) =>
        b.addEventListener("click", () => alterarQtd(Number(b.dataset.mais), 1))
    );
    lista.querySelectorAll("[data-menos]").forEach((b) =>
        b.addEventListener("click", () => alterarQtd(Number(b.dataset.menos), -1))
    );
    lista.querySelectorAll("[data-remover]").forEach((b) =>
        b.addEventListener("click", () => removerDoCarrinho(Number(b.dataset.remover)))
    );
}

document.getElementById("btnFinalizar").addEventListener("click", async () => {
    const usuario = getUsuarioLogado();
    const erroEl = document.getElementById("carrinhoErro");
    erroEl.textContent = "";

    if (!usuario) {
        mostrarNotificacao("Faça login para finalizar a compra.", "info");
        mostrarSecao("login");
        return;
    }

    const carrinho = getCarrinho();
    if (carrinho.length === 0) return;

    const formaPagamento = document.getElementById("formaPagamento").value;
    if (!formaPagamento) {
        erroEl.textContent = "Selecione uma forma de pagamento.";
        return;
    }

    const btn = document.getElementById("btnFinalizar");
    btn.disabled = true;
    btn.textContent = "Finalizando...";

    try {
        const resposta = await fetch(`${API_BASE}/compra`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                authorization: `Bearer ${usuario.token}`,
            },
            body: JSON.stringify({
                forma_pagamento: formaPagamento,
                produtos: carrinho.map((item) => ({
                    id: Number(item.id),
                    quantidade: item.qtd,
                })),
            }),
        });
        const dados = await resposta.json().catch(() => ({}));

        if (!resposta.ok) {
            if (resposta.status === 401 || resposta.status === 403) {
                localStorage.removeItem("usuarioLogado");
                atualizarNavbarUsuario();
                erroEl.textContent = "Sessão expirada. Faça login novamente.";
                mostrarNotificacao("Sua sessão expirou. Faça login novamente.", "erro", 6000);
                mostrarSecao("login");
                return;
            }

            erroEl.textContent = dados.erro || dados.msg || "Não foi possível finalizar a compra.";
            mostrarNotificacao(erroEl.textContent, "erro");
            return;
        }

        mostrarNotificacao(
            `Compra realizada com sucesso! Total: R$ ${formatarPreco(dados.valor_total)}. Veja em Minhas compras.`,
            "sucesso",
            6000
        );
        salvarCarrinho([]);
        document.getElementById("formaPagamento").value = "";
        renderCarrinho();
        mostrarSecao("compras");
    } catch (error) {
        erroEl.textContent = "Erro ao conectar com o servidor: " + error.message;
        mostrarNotificacao("Erro ao conectar com o servidor.", "erro");
    } finally {
        btn.disabled = false;
        btn.textContent = "Finalizar compra";
    }
});

// ===================== HISTÓRICO DE COMPRAS =====================
let carregandoCompras = false;

function formatarDataCompra(valor) {
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return String(valor || "");
    return data.toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit"
    });
}

function urlImagemPedido(item) {
    const caminho = String(item?.imagem || "").trim().replace(/^\/+/, "");
    return caminho ? `${API_BASE}/${caminho}` : "";
}

function renderizarCompras(compras) {
    const lista = document.getElementById("listaCompras");
    const vazio = document.getElementById("comprasVazio");
    lista.innerHTML = "";

    if (!Array.isArray(compras) || compras.length === 0) {
        vazio.hidden = false;
        return;
    }
    vazio.hidden = true;

    compras.forEach((compra) => {
        const artigo = document.createElement("article");
        artigo.className = "pedido";

        const itensHtml = (Array.isArray(compra.itens) ? compra.itens : []).map((item) => {
            const imagemUrl = urlImagemPedido(item);
            const imagemHtml = imagemUrl
                ? `<img class="pedido-item-img" src="${escaparHtml(imagemUrl)}" alt="" loading="lazy">`
                : `<span class="pedido-item-emoji" aria-hidden="true">${escaparHtml(item.emoji || "🎵")}</span>`;

            return `
                <div class="pedido-item">
                    <div class="pedido-item-imagem" data-emoji="${escaparHtml(item.emoji || "🎵")}">${imagemHtml}</div>
                    <div class="pedido-item-info">
                        <h3>${escaparHtml(item.nome)}</h3>
                        <p>${Number(item.quantidade) || 0}× R$ ${formatarPreco(item.valor_unitario)} · ${escaparHtml(item.categoria || "Instrumento")}</p>
                    </div>
                    <strong class="pedido-item-subtotal">R$ ${formatarPreco(item.subtotal)}</strong>
                </div>`;
        }).join("");

        artigo.innerHTML = `
            <header class="pedido-cabecalho">
                <div>
                    <h2>Pedido #${escaparHtml(compra.id)}</h2>
                    <p class="pedido-data">${escaparHtml(formatarDataCompra(compra.data))}</p>
                </div>
                <span class="pedido-status">Concluído</span>
            </header>
            <div class="pedido-itens">${itensHtml}</div>
            <footer class="pedido-rodape">
                <span>${Number(compra.quantidade_itens) || 0} item(ns) · ${escaparHtml(compra.forma_pagamento || "—")}</span>
                <span>Total: <strong>R$ ${formatarPreco(compra.valor_total)}</strong></span>
            </footer>`;

        artigo.querySelectorAll(".pedido-item-img").forEach((img) => {
            img.addEventListener("error", () => {
                const emoji = img.parentElement?.dataset?.emoji || "🎵";
                img.outerHTML = `<span class="pedido-item-emoji" aria-hidden="true">${escaparHtml(emoji)}</span>`;
            }, { once: true });
        });

        lista.appendChild(artigo);
    });
}

async function carregarCompras() {
    const usuario = getUsuarioLogado();
    const erroEl = document.getElementById("comprasErro");
    const lista = document.getElementById("listaCompras");
    const vazio = document.getElementById("comprasVazio");

    if (!usuario) {
        mostrarSecao("login");
        return;
    }
    if (carregandoCompras) return;

    carregandoCompras = true;
    erroEl.textContent = "";
    vazio.hidden = true;
    lista.innerHTML = '<p class="aviso">Carregando seus pedidos...</p>';

    try {
        const resposta = await fetch(`${API_BASE}/compras`, {
            headers: { authorization: `Bearer ${usuario.token}` },
        });
        const dados = await resposta.json().catch(() => ({}));

        if (!resposta.ok) {
            if (resposta.status === 401 || resposta.status === 403) {
                encerrarSessao("Sua sessão expirou. Faça login novamente.");
                return;
            }
            lista.innerHTML = "";
            erroEl.textContent = dados.erro || "Não foi possível carregar seus pedidos.";
            return;
        }

        renderizarCompras(dados);
    } catch (error) {
        lista.innerHTML = "";
        erroEl.textContent = "Erro ao conectar com o servidor: " + error.message;
    } finally {
        carregandoCompras = false;
    }
}

// ===================== LINK FRONT <-> BACK =====================
// Confere se a API está respondendo e mostra o resultado no topo da página.
async function verificarConexaoApi() {
    const badge = document.getElementById("statusServidor");
    if (!badge) return false;

    badge.className = "status-servidor";
    badge.textContent = "● verificando";
    badge.title = `Testando ${API_BASE}/health`;

    const controlador = new AbortController();
    const timeout = setTimeout(() => controlador.abort(), 5000);

    try {
        const resposta = await fetch(`${API_BASE}/health`, { signal: controlador.signal });
        if (!resposta.ok) throw new Error("HTTP " + resposta.status);

        await resposta.json().catch(() => ({}));
        badge.classList.add("online");
        badge.textContent = "● servidor online";
        badge.title = `Conectado à API em ${API_BASE}`;
        return true;
    } catch (error) {
        badge.classList.add("offline");
        badge.textContent = "● servidor offline";
        badge.title = `Não foi possível conectar em ${API_BASE}. Rode: npm start`;
        mostrarNotificacao(
            `Não foi possível conectar ao servidor (${API_BASE}). Rode "npm start" na pasta do projeto.`,
            "erro",
            7000
        );
        return false;
    } finally {
        clearTimeout(timeout);
    }
}

// ===================== INICIALIZAÇÃO =====================
atualizarNavbarUsuario();
atualizarContadorCarrinho();
carregarCategorias();
mostrarSecao("produtos");
verificarConexaoApi();
