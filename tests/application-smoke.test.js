"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "style.css"), "utf8");
const script = fs.readFileSync(path.join(root, "script.js"), "utf8");
const sharePointData = fs.readFileSync(path.join(root, "sharepointData.js"), "utf8");

const requiredFiles = [
    "config.js",
    "contractsMapper.js",
    "sharepointData.js",
    "tutorials.js",
    "script.js",
    "style.css",
    "assets/brasilata-symbol.png",
    "CONFIGURACAO_SHAREPOINT.md"
];

requiredFiles.forEach((file) => {
    assert.ok(fs.existsSync(path.join(root, file)), `Arquivo ausente: ${file}`);
});

assert.ok(!fs.existsSync(path.join(root, "contractsData.js")), "Os contratos não devem continuar em contractsData.js.");

const requiredIds = [
    "mainContent", "loginSection", "appSection", "contractsView", "tutorialView",
    "loginButton", "refreshContractsButton", "contractSearchInput", "advancedFilters",
    "sortFilter", "activeFilters", "contractTableBody", "contractCardList",
    "contractEmptyState", "pagination", "contractDialog", "loadVideoButton"
];

requiredIds.forEach((id) => {
    assert.ok(html.includes(`id="${id}"`), `ID obrigatório ausente: ${id}`);
});

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
assert.strictEqual(new Set(ids).size, ids.length, "O HTML não pode ter IDs duplicados.");
assert.ok(html.includes("msal-browser.min.js"), "O HTML deve carregar a biblioteca MSAL.");
assert.ok(html.includes("xlsx.full.min.js"), "O HTML deve carregar o leitor de Excel.");
assert.ok(html.includes("sharepointData.js"), "O HTML deve carregar a integração SharePoint.");
assert.ok(!html.includes("contractsData.js"), "O HTML não deve carregar uma base estática de contratos.");
assert.ok(sharePointData.includes("graph.microsoft.com/v1.0"), "A integração deve usar o Microsoft Graph.");
assert.ok(sharePointData.includes("@microsoft.graph.downloadUrl"), "O download deve usar a URL temporária protegida do Graph.");
assert.ok(script.includes("refreshIntervalMs"), "O portal deve atualizar os dados periodicamente.");
assert.ok(css.includes("100dvh"), "O layout deve usar altura dinâmica em celulares.");
assert.ok(css.includes("@media (max-width: 899px)"), "O projeto deve possuir layout móvel específico.");

console.log("Teste estrutural, autenticação e integração SharePoint passou.");
