"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "style.css"), "utf8");
const script = fs.readFileSync(path.join(root, "script.js"), "utf8");
const data = fs.readFileSync(path.join(root, "contractsData.js"), "utf8");

const requiredFiles = [
    "config.js",
    "tutorials.js",
    "contractsData.js",
    "script.js",
    "style.css",
    "assets/brasilata-symbol.png",
    "tools/generate_contracts_data.py"
];
requiredFiles.forEach((file) => {
    assert.ok(fs.existsSync(path.join(root, file)), `Arquivo ausente: ${file}`);
});

const requiredIds = [
    "mainContent", "loginSection", "appSection", "contractsView", "tutorialView",
    "contractSearchInput", "advancedFilters", "sortFilter", "activeFilters",
    "contractTableBody", "contractCardList", "contractEmptyState", "pagination",
    "contractDialog", "loadVideoButton"
];
requiredIds.forEach((id) => {
    assert.ok(html.includes(`id="${id}"`), `ID obrigatório ausente: ${id}`);
});

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
assert.strictEqual(new Set(ids).size, ids.length, "O HTML não pode ter IDs duplicados.");
assert.ok(html.includes("Descrição e fornecedor"), "A descrição do contrato deve estar explícita na tabela.");
assert.ok(html.includes("<th scope=\"col\">Itens</th>"), "A tabela deve informar a quantidade de itens.");
assert.ok(html.toLocaleLowerCase("pt-BR").includes("contrato, descrição, fornecedor, responsável ou item"), "A pesquisa deve informar que aceita itens.");
assert.ok(script.includes("contract.itens") && script.includes("dialogItemSearch"), "O JavaScript deve agrupar e pesquisar itens.");
assert.ok(script.includes("Item relacionado"), "A interface deve explicar correspondências por item.");
assert.ok(css.includes(".dialog-items-table") && css.includes(".dialog-items-card-list"), "Itens devem ter layout de desktop e celular.");
assert.ok(css.includes("100dvh"), "O layout deve usar altura dinâmica em celulares.");
assert.ok(css.includes("@media (max-width: 899px)"), "O projeto deve possuir layout móvel específico.");
assert.ok(data.includes('"records": 721') && data.includes('"items": 3891'), "Os totais consolidados devem estar no arquivo de dados.");
assert.ok(!html.includes("youtube-nocookie"), "O iframe não deve ser carregado diretamente no HTML.");
assert.ok(script.includes("youtube-nocookie.com"), "O vídeo deve usar o domínio com privacidade aprimorada.");

console.log("Teste estrutural de HTML, CSS, dados, acessibilidade e responsividade passou.");
