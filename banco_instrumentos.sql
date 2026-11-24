-- Banco de dados da Casabemol (loja de instrumentos musicais)
-- Gerado automaticamente a partir de front/produtos.json.
-- Imagens: 68 arquivos em img/instrumentos/.
--
-- Importe este arquivo no MySQL Workbench ou rode:
--   mysql -u root -p < banco_instrumentos.sql
--
-- O INSERT abaixo também atualiza bancos antigos (jogos) sem apagar
-- compras: o ON DUPLICATE KEY UPDATE corrige nome, descrição, preço e,
-- principalmente, o caminho_img para a pasta de instrumentos.

CREATE DATABASE IF NOT EXISTS `teste3dsc`
    CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `teste3dsc`;

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
    (1, 'Amplificador', 'Amplificador para guitarra e baixo, ideal para ensaios e shows.', 'audio', 250.00, '🔊', 'instrumentos/amplificador.jpg', 5),
    (2, 'Baixo Elétrico', 'Baixo elétrico de 4 cordas com timbre firme e versátil.', 'cordas', 415.00, '🎸', 'instrumentos/baixo-eletrico.jpg', 6),
    (3, 'Bateria Acústica', 'Kit de bateria acústica com pratos e pedais.', 'percussao', 310.00, '🥁', 'instrumentos/bateria-acustica.png', 7),
    (4, 'Bateria Eletrônica', 'Kit eletrônico com pads, módulo de sons e saída para fones.', 'percussao', 375.00, '🥁', 'instrumentos/bateria-eletronica.jpg', 8),
    (5, 'Cajón', 'Caixa percutida de origem peruana, muito usada no flamenco.', 'percussao', 440.00, '🥁', 'instrumentos/cajon.jpg', 9),
    (6, 'Contrabaixo', 'Contrabaixo acústico de cordas com arco ou dedilhado.', 'cordas', 675.00, '🎻', 'instrumentos/contrabaixo.jpg', 10),
    (7, 'Flauta', 'Flauta transversal de metal com timbre brilhante.', 'sopro', 810.00, '🪈', 'instrumentos/flauta.png', 11),
    (8, 'Violão Acústico', 'Violão clássico com cordas de nylon.', 'cordas', 350.00, '🎸', 'instrumentos/guitarra-acustica.png', 12),
    (9, 'Guitarra Elétrica', 'Guitarra elétrica de corpo sólido com captadores versáteis.', 'cordas', 415.00, '🎸', 'instrumentos/guitarra-eletrica.jpg', 13),
    (10, 'Metrônomo', 'Metrônomo para manter o ritmo nos estudos e ensaios.', 'acessorios', 220.00, '⏱️', 'instrumentos/metronomo.jpg', 14),
    (11, 'Microfone', 'Microfone dinâmico para voz e instrumentos.', 'audio', 445.00, '🎤', 'instrumentos/microfone.jpg', 5),
    (12, 'Pedal de Efeito', 'Pedal de efeito para modelar o som da guitarra.', 'acessorios', 350.00, '🎛️', 'instrumentos/pedal.jpg', 6),
    (13, 'Piano Digital', 'Piano digital com teclado sensível ao toque e sons de piano.', 'teclados', 1800.00, '🎹', 'instrumentos/piano-digital.jpg', 7),
    (14, 'Saxofone', 'Saxofone alto para jazz, blues e música popular.', 'sopro', 810.00, '🎷', 'instrumentos/saxofone.png', 8),
    (15, 'Teclado', 'Teclado com ritmos, timbres e acompanhamento automático.', 'teclados', 900.00, '🎹', 'instrumentos/teclado.jpg', 9),
    (16, 'Trompete', 'Trompete de metais com som brilhante e projetante.', 'sopro', 485.00, '🎺', 'instrumentos/trompete.jpg', 10),
    (17, 'Viola', 'Viola de cordas com arco, timbre mais grave que o violino.', 'cordas', 480.00, '🎻', 'instrumentos/viola.jpg', 11),
    (18, 'Violino', 'Violino acústico com arco e caixa ressonadora.', 'cordas', 545.00, '🎻', 'instrumentos/violino.png', 12),
    (19, 'Bandoneão', 'Instrumento de fole com botões, símbolo do tango argentino.', 'sopro', 680.00, '🎼', 'instrumentos/bandoneon.jpg', 13),
    (20, 'Acordeão', 'Acordeão de botões com fole, ideal para música popular.', 'teclados', 1800.00, '🎼', 'instrumentos/acordeao.jpg', 14),
    (21, 'Alaúde', 'Instrumento de cordas com braço longo e corpo em forma de pera.', 'cordas', 740.00, '🎸', 'instrumentos/alaude.png', 5),
    (22, 'Banjo', 'Instrumento de cordas com ressonador circular e som característico.', 'cordas', 350.00, '🎸', 'instrumentos/banjo.jpg', 6),
    (23, 'Barítono', 'Instrumento de metais com timbre grave, muito usado em bandas.', 'sopro', 485.00, '🎺', 'instrumentos/baritono.jpg', 7),
    (24, 'Bongô', 'Par de tambores pequenos de origem cubana.', 'percussao', 310.00, '🥁', 'instrumentos/bongo.jpg', 8),
    (25, 'Cabasa', 'Instrumento de percussão com corrente de contas metálicas.', 'percussao', 375.00, '🥁', 'instrumentos/cabasa.jpg', 9),
    (26, 'Castanholas', 'Pares de pequenas placas de madeira batidas entre si.', 'percussao', 440.00, '🥁', 'instrumentos/castanholas.jpg', 10),
    (27, 'Celesta', 'Instrumento de teclado com barras metálicas e timbre cristalino.', 'teclados', 1800.00, '🎹', 'instrumentos/celesta.jpg', 11),
    (28, 'Clarinete', 'Instrumento de sopro com palheta simples e timbre aveludado.', 'sopro', 810.00, '🎼', 'instrumentos/clarinete.jpg', 12),
    (29, 'Clavicórdio', 'Teclado antigo de cordas percutidas por pequenos martelos.', 'teclados', 900.00, '🎹', 'instrumentos/clavicordio.png', 13),
    (30, 'Cravo', 'Instrumento de teclado com cordas dedilhadas por penas.', 'teclados', 1080.00, '🎹', 'instrumentos/cravo.jpg', 14),
    (31, 'Cuíca', 'Tambor de fricção brasileiro com som característico.', 'percussao', 310.00, '🥁', 'instrumentos/cuica.jpg', 5),
    (32, 'Dobro', 'Guitarra ressonadora com cones metálicos e som acústico potente.', 'cordas', 545.00, '🎸', 'instrumentos/dobro.jpg', 6),
    (33, 'Fagote', 'Instrumento de sopro de palheta dupla com timbre grave.', 'sopro', 680.00, '🎼', 'instrumentos/fagote.jpg', 7),
    (34, 'Flauta Doce', 'Flauta de sopro direto, ideal para iniciantes.', 'sopro', 745.00, '🪈', 'instrumentos/flauta-doce.jpg', 8),
    (35, 'Flugelhorn', 'Instrumento de metais parecido com o trompete, com som mais suave.', 'sopro', 810.00, '🎺', 'instrumentos/flugelhorn.jpg', 9),
    (36, 'Gaita de Fole', 'Instrumento de sopro com fole e prestos, típico da música celta.', 'sopro', 420.00, '🎼', 'instrumentos/gaita-de-fole.jpg', 10),
    (37, 'Glockenspiel', 'Conjunto de barras metálicas percutidas com baquetas.', 'percussao', 245.00, '🎵', 'instrumentos/glockenspiel.jpg', 11),
    (38, 'Güiro', 'Instrumento de percussão com superfície estriada raspada.', 'percussao', 310.00, '🥁', 'instrumentos/guiro.jpg', 12),
    (39, 'Harpa', 'Instrumento de cordas dedilhadas em arco triangular.', 'cordas', 545.00, '🎻', 'instrumentos/harpa.png', 13),
    (40, 'Harmônica', 'Instrumento de palhetas livres tocado pela boca.', 'sopro', 680.00, '🎼', 'instrumentos/harmonica.jpg', 14),
    (41, 'Kalimba', 'Instrumento africano de lâminas metálicas presas em caixa.', 'percussao', 505.00, '🎵', 'instrumentos/kalimba.jpg', 5),
    (42, 'Maracas', 'Par de chocalhos de origem latino-americana.', 'percussao', 570.00, '🥁', 'instrumentos/maraca.jpg', 6),
    (43, 'Marimba', 'Instrumento de barras de madeira percutidas com baquetas.', 'percussao', 180.00, '🎵', 'instrumentos/marimba.jpg', 7),
    (44, 'Oboé', 'Instrumento de sopro de palheta dupla com timbre expressivo.', 'sopro', 485.00, '🎼', 'instrumentos/oboe.jpg', 8),
    (45, 'Ocarina', 'Instrumento de sopro cerâmico em forma de ovo.', 'sopro', 550.00, '🎼', 'instrumentos/ocarina.jpg', 9),
    (46, 'Órgão', 'Instrumento de teclado com tubos sonoros e pedais.', 'teclados', 1440.00, '🎹', 'instrumentos/orgao.jpg', 10),
    (47, 'Pandeiro', 'Tambor circular com platinas, muito usado no samba.', 'percussao', 440.00, '🥁', 'instrumentos/pandeiro.jpg', 11),
    (48, 'Piccolo', 'Flauta pequena com timbre agudo e brilhante.', 'sopro', 745.00, '🪈', 'instrumentos/piccolo.jpg', 12),
    (49, 'Pratos', 'Par de discos metálicos batidos entre si.', 'percussao', 570.00, '🥁', 'instrumentos/pratos.jpg', 13),
    (50, 'Chocalho', 'Instrumento de percussão com sementes ou contas dentro.', 'percussao', 180.00, '🥁', 'instrumentos/chocalho.jpg', 14),
    (51, 'Shaker', 'Pequeno recipiente com grãos que produz som ao ser agitado.', 'percussao', 245.00, '🥁', 'instrumentos/shaker.jpg', 5),
    (52, 'Sitar', 'Instrumento indiano de cordas com ressonador e braço longo.', 'cordas', 480.00, '🎸', 'instrumentos/sitar.jpg', 6),
    (53, 'Surdo', 'Tambor grave usado em blocos e escolas de samba.', 'percussao', 375.00, '🥁', 'instrumentos/surdo.jpg', 7),
    (54, 'Tamborim', 'Pequeno tambor de samba tocado com baqueta ou dedos.', 'percussao', 440.00, '🥁', 'instrumentos/tamborim.jpg', 8),
    (55, 'Gong', 'Disco metálico suspenso percutido com maço.', 'percussao', 505.00, '🥁', 'instrumentos/gong.jpg', 9),
    (56, 'Theremin', 'Instrumento eletrônico tocado sem contato físico.', 'audio', 640.00, '🎛️', 'instrumentos/theremin.jpg', 10),
    (57, 'Timbales', 'Par de tambores cilíndricos de origem cubana.', 'percussao', 180.00, '🥁', 'instrumentos/timbales.jpg', 11),
    (58, 'Triângulo', 'Barra de metal dobrada em triângulo, percutida com haste.', 'percussao', 245.00, '🎵', 'instrumentos/triangulo.jpg', 12),
    (59, 'Trombone', 'Instrumento de metais com slides para mudança de tom.', 'sopro', 550.00, '🎺', 'instrumentos/trombone.jpg', 13),
    (60, 'Tuba', 'Instrumento de metais grave, base harmônica das bandas.', 'sopro', 615.00, '🎺', 'instrumentos/tuba.png', 14),
    (61, 'Oud', 'Alaúde de braço curto e corpo em forma de pera, típico do Oriente Médio.', 'cordas', 610.00, '🎸', 'instrumentos/oud.jpg', 5),
    (62, 'Ukulele', 'Pequeno instrumento de quatro cordas originário do Havaí.', 'cordas', 675.00, '🎸', 'instrumentos/ukulele.jpg', 6),
    (63, 'Vibrafone', 'Instrumento de barras metálicas com ressonadores e pedal.', 'percussao', 570.00, '🎵', 'instrumentos/vibrafone.jpg', 7),
    (64, 'Viola Caipira', 'Viola brasileira de dez cordas usada na música caipira.', 'cordas', 350.00, '🎸', 'instrumentos/viola-caipira.jpg', 8),
    (65, 'Violoncelo', 'Instrumento de cordas com arco e timbre grave.', 'cordas', 415.00, '🎻', 'instrumentos/violoncelo.jpg', 9),
    (66, 'Xilofone', 'Barras de madeira de diferentes tamanhos percutidas com baquetas.', 'percussao', 310.00, '🎵', 'instrumentos/xilofone.jpg', 10),
    (67, 'Zabumba', 'Tambor grave usado no forró e na música nordestina.', 'percussao', 375.00, '🥁', 'instrumentos/zabumba.jpg', 11),
    (68, 'Citera', 'Instrumento de cordas planas dedilhadas sobre caixa ressonadora.', 'cordas', 610.00, '🎸', 'instrumentos/citera.jpg', 12)
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
