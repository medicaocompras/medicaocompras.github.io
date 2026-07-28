# Relatório de implementação

## Objetivo

Adicionar todos os contratos do relatório do Paradigma SRM360 sem criar um resultado separado para cada item.

## Estrutura encontrada

O relatório possui 3.891 linhas e 24 colunas. Cada linha representa um item associado a um contrato.

As principais colunas utilizadas foram:

- Número;
- Descrição;
- razão social e CNPJ da contratada;
- razão social e CNPJ da contratante;
- descrição do item;
- quantidades previstas, realizadas e restantes;
- valores;
- tipo e tipo de contrato;
- datas;
- situação;
- usuário gestor;
- usuário responsável.

## Consolidação

As 3.891 linhas foram consolidadas em 721 contratos.

A chave utilizada foi:

```text
Número + CNPJ da contratada + CNPJ da contratante
```

Essa regra evita misturar contratos que possuem o mesmo número, mas pertencem a fornecedores ou empresas contratantes diferentes.

## Experiência do usuário

### Resultado principal

Cada contrato aparece somente uma vez e apresenta:

- número;
- descrição do contrato;
- fornecedor;
- responsável;
- gestor;
- unidade;
- quantidade de itens;
- término;
- status calculado;
- botão para abrir detalhes.

### Pesquisa geral

A pesquisa inclui os dados do contrato e a descrição de todos os itens. Quando o termo existe em um item, a interface mostra o primeiro **Item relacionado** encontrado.

### Detalhes

A janela de detalhes foi ampliada e organizada em:

1. descrição e fornecedor;
2. indicadores do contrato;
3. dados cadastrais;
4. outros responsáveis do fornecedor;
5. itens agrupados.

### Lista de itens

Como alguns contratos possuem centenas de itens, a interface não renderiza tudo de uma vez.

- 20 itens inicialmente no computador;
- 10 itens inicialmente no celular;
- botão para carregar mais;
- pesquisa apenas dentro dos itens;
- tabela no computador;
- cards no celular.

O maior contrato da base possui 422 itens.

## Campos de dados criados

Cada contrato contém:

```text
id
numero
descricao
fornecedor
cnpjFornecedor
empresa
estabelecimento
razaoSocialContratante
cnpjContratante
dataInicio
dataFim
situacao
gestor
responsavel
diasParaTerminoPlanilha
categoria
tipos
tiposConsumo
saldoMinimoPercentuais
valorTotal
saldo
quantidadeItens
itens
```

Cada item contém:

```text
id
descricao
quantidadePrevista
quantidadeRealizada
saldoQuantidade
valorUnitario
saldoValor
tipoConsumo
tipo
saldoMinimoPercentual
```

## Arquivos alterados

- `contractsData.js`;
- `index.html`;
- `script.js`;
- `style.css`;
- `tools/generate_contracts_data.py`;
- `tests/contracts-search.test.js`;
- `tests/application-smoke.test.js`;
- `README.md`;
- `IMPLEMENTATION_REPORT.md`.

## Testes realizados

- carregamento dos 721 contratos;
- preservação dos 3.891 itens;
- descrição presente em todos os contratos;
- itens agrupados corretamente;
- busca por número;
- busca por descrição;
- busca por item;
- busca sem acentos;
- filtros combinados;
- ordenação;
- paginação;
- status de vencimento;
- geração da janela de detalhes;
- validação de sintaxe JavaScript;
- validação estrutural de HTML e CSS.

## Resultado

O projeto usa os dados reais do relatório. Nenhum item foi transformado em contrato independente.
