# Consulta de Contratos — Brasilata

Portal estático para consultar contratos exportados do Paradigma SRM360.

## Base atual

- 721 contratos consolidados;
- 3.891 itens;
- 529 fornecedores;
- 9 estabelecimentos;
- 448 contratos de serviço;
- 273 contratos de compra.

Cada contrato aparece apenas uma vez na pesquisa. As linhas repetidas da planilha representam itens e ficam agrupadas na janela **Ver detalhes e itens**.

## Como abrir

Abra `index.html` em um servidor local ou publique os arquivos no ambiente escolhido.

Exemplo com Python:

```bash
python -m http.server 8000
```

Depois acesse `http://localhost:8000`.

## Pesquisa

A pesquisa geral aceita texto parcial e ignora diferenças de acentos e letras maiúsculas. Ela pesquisa por:

- número do contrato;
- descrição do contrato;
- fornecedor e CNPJ;
- responsável e gestor;
- empresa e estabelecimento;
- tipo de contrato;
- descrição dos itens;
- datas e demais classificações.

Quando a pesquisa encontra um termo dentro de um item, o resultado principal mostra **Item relacionado** para explicar por que o contrato apareceu.

## Detalhes e itens

O botão **Ver detalhes e itens** abre:

- descrição do contrato;
- fornecedor e CNPJ;
- responsável e gestor;
- empresa e estabelecimento;
- datas;
- tipo e situação;
- valor total e saldo;
- indicadores de quantidade;
- todos os itens agrupados.

A área de itens possui pesquisa própria e carregamento progressivo. No computador os itens aparecem em tabela; no celular aparecem em cards.

## Atualizar a base futuramente

Coloque o novo relatório XLSX em uma pasta acessível e execute:

```bash
python tools/generate_contracts_data.py "EXP13_(Paradigma SRM360 - brasilata).xlsx"
```

O comando substitui `contractsData.js`.

Depois:

1. Verifique os totais exibidos pelo comando.
2. Execute os testes.
3. Publique todos os arquivos atualizados.
4. Use `Ctrl + F5` no navegador para ignorar cache antigo.

## Executar testes

```bash
node --check script.js
node --check contractsData.js
node tests/application-smoke.test.js
node tests/contracts-search.test.js
```

## Regra de consolidação

Um contrato é identificado pela combinação:

```text
Número + CNPJ da empresa contratada + CNPJ da empresa contratante
```

Essa combinação é necessária porque alguns números de contrato aparecem em empresas ou fornecedores diferentes.

## Arquivos principais

- `index.html`: estrutura da interface;
- `style.css`: design e responsividade;
- `script.js`: pesquisa, filtros, paginação, detalhes e itens;
- `contractsData.js`: contratos e itens convertidos da planilha;
- `tools/generate_contracts_data.py`: importador do relatório;
- `tests/`: testes automatizados;
- `SECURITY.md`: limitações de segurança de uma hospedagem estática.

## Segurança

A tela de login feita somente com HTML e JavaScript não protege os dados de um site estático. Não publique `contractsData.js` no GitHub Pages caso os contratos sejam confidenciais. Consulte `SECURITY.md`.
