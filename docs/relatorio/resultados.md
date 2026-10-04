# Resultados para o relatório

## Etapa 1: Preparação do ambiente

- Node v26.6.0 e npm 11.18.0
- `npm install` rodou sem erros
- `npm test`: 1 suíte passou, 4 testes passaram e 1 foi pulado (`test.skip`)
- Os testes ficam em `test/`, e não em `__tests__/` como diz o enunciado

Print: [prints/01-npm-test-inicial.png](prints/01-npm-test-inicial.png)

Mesmo cheia de smells, a suíte passa inteira. Ou seja, "estar verde" não garante que os testes são bons.

## Etapa 2: Análise manual

Arquivo analisado: `test/userService.smelly.test.js`

| # | Smell | Teste | Linhas |
|---|---|---|---|
| 1 | Eager Test | deve criar e buscar um usuário corretamente | 18-31 |
| 2 | Lógica Condicional (Conditional Test Logic) | deve desativar usuários se eles não forem administradores | 33-52 |
| 3 | Teste Frágil (Fragile Test) | deve gerar um relatório de usuários formatado | 54-64 |
| 4 | Exceção tratada com try/catch (Silent Failure) | deve falhar ao criar usuário menor de idade | 66-75 |
| 5 | Teste Desativado / Vazio (Empty Test) | deve retornar uma lista vazia quando não há usuários | 77-79 |

### 1. Eager Test

O teste cria e busca o usuário de uma vez, com dois "Act" no mesmo teste e asserts misturados entre eles. Se falhar, não dá para saber de cara se o problema está no `createUser` ou no `getUserById`. O nome "criar e buscar" já mostra que ele testa duas coisas.

Risco: diagnóstico mais lento e testes que crescem sem controle, já que fica fácil ir colocando mais coisa no mesmo teste.

### 2. Lógica Condicional

O teste tem um `for` sobre os usuários e um `if/else` decidindo qual `expect` roda. Cada `expect` só roda em parte das vezes. Na prática são dois cenários diferentes (usuário comum e admin) dentro de um só teste.

Risco: se a lista mudar ou o `if` estiver errado, alguns `expect` param de rodar e o teste continua passando. Também fica mais difícil de ler, porque é preciso "executar o código de cabeça" para saber o que está sendo verificado.

### 3. Teste Frágil

O teste compara a linha exata do relatório (`ID: ..., Nome: Alice, Status: ativo\n`) e o cabeçalho exato. O próprio `userService.js` diz que "o formato do relatório pode mudar no futuro".

Risco: qualquer mudança visual, como um espaço, a ordem dos campos ou o texto do cabeçalho, quebra o teste sem ter nenhum bug. Com o tempo, a equipe passa a ignorar ou apagar testes que falham à toa. Além disso, o Bob é criado e não é verificado.

### 4. Exceção tratada com try/catch

O `expect` fica dentro do `catch`. Se `createUser` não lançar erro, o `catch` não roda, nenhum `expect` é executado e o teste passa.

Comprovação: troquei `if (idade < 18)` por `if (false)` em `src/userService.js`, ou seja, removi a validação. O teste continuou passando. Depois voltei o arquivo ao original.

Print: [prints/02-try-catch-sem-validacao.png](prints/02-try-catch-sem-validacao.png)

Risco: é o mais perigoso dos cinco, porque esconde um bug real (cadastro de menor de idade) com o teste verde. Tem relação direta com o trabalho anterior: esse é o tipo de teste que deixa mutante sobreviver.

### 5. Teste Desativado / Vazio

`test.skip` com corpo vazio e um `TODO`. O cenário de "nenhum usuário cadastrado" no relatório nunca é testado, mas aparece no resultado do Jest como se tivesse sido pensado.

Risco: dá uma falsa sensação de cobertura, e o TODO tende a ficar esquecido.

### Outros pontos observados

- O `beforeEach` chama `_clearDB()`, um método "interno" (com `_`) que só existe por causa dos testes. O teste depende de um detalhe da implementação.
- Comportamentos sem teste: campos obrigatórios (nome, email, idade), `getUserById` com id inexistente retornando `null`, `deactivateUser` com id inexistente, relatório vazio e o valor padrão de `isAdmin`.
- Os comentários "Act 1" e "Act 2" mostram que o teste não segue o padrão AAA (um Arrange, um Act, um Assert).

## Etapa 3: Configuração do ESLint

- Instalado com `npm install --save-dev eslint@8 eslint-plugin-jest` (ESLint 8.57.1 e eslint-plugin-jest 29.16.6)
- Usei a versão 8 porque a 9 em diante não lê mais `.eslintrc.json` por padrão (usa `eslint.config.js`), e o enunciado pede o `.eslintrc.json`
- `.eslintrc.json` criado na raiz com o conteúdo do enunciado:
  - `eslint:recommended` + `plugin:jest/recommended`
  - `jest/no-disabled-tests`: warn
  - `jest/no-conditional-expect`: error
  - `jest/no-identical-title`: error
- Os testes continuam passando depois da instalação

## Etapa 4: Detecção automática (primeira execução do ESLint)

Comando: `npx eslint .`

Resultado: **6 problemas (4 erros, 2 avisos)**, todos em `test/userService.smelly.test.js`. O `src/userService.js` não teve nenhum apontamento.

| Linha | Tipo | Regra | Mensagem | Teste |
|---|---|---|---|---|
| 44:9 | erro | jest/no-conditional-expect | Avoid calling `expect` conditionally | deve desativar usuários... |
| 46:9 | erro | jest/no-conditional-expect | Avoid calling `expect` conditionally | deve desativar usuários... |
| 49:9 | erro | jest/no-conditional-expect | Avoid calling `expect` conditionally | deve desativar usuários... |
| 73:7 | erro | jest/no-conditional-expect | Avoid calling `expect` conditionally | deve falhar ao criar usuário menor de idade |
| 77:3 | aviso | jest/no-disabled-tests | Tests should not be skipped | deve retornar uma lista vazia... |
| 77:3 | aviso | jest/expect-expect | Test has no assertions | deve retornar uma lista vazia... |

Print: [prints/03-eslint-inicial.png](prints/03-eslint-inicial.png)

### Comparação com a análise manual

| Smell (análise manual) | ESLint detectou? | Como |
|---|---|---|
| 1. Eager Test | Não | Nenhuma regra do `recommended` conta quantos "Act" ou quantos `expect` um teste tem |
| 2. Lógica Condicional | Sim | `no-conditional-expect` nas linhas 44, 46 e 49 (`expect` dentro do `if/else`) |
| 3. Teste Frágil | Não | O linter não sabe se a string comparada é um detalhe de formatação ou uma regra de negócio |
| 4. try/catch | Sim | `no-conditional-expect` na linha 73 (`expect` dentro do `catch`) |
| 5. Teste Desativado / Vazio | Sim | `no-disabled-tests` (o `skip`) e `expect-expect` (corpo sem `expect`) |

### Observações

- A ferramenta pegou 3 dos 5 smells sem nenhum esforço manual, apontando a linha e a regra exata. Pegou justamente os que dá para reconhecer pela estrutura do código: `expect` dentro de `if`/`catch` e teste sem `expect`.
- A mesma regra (`no-conditional-expect`) pegou dois smells diferentes: a lógica condicional e o try/catch. Para o linter os dois são o mesmo problema: um `expect` que pode não rodar.
- O `expect-expect` não estava listado no `.eslintrc.json` do enunciado. Ele veio do `plugin:jest/recommended`.
- O `for` da linha 40 não foi apontado sozinho. A regra só reclama dos `expect` que estão dentro do `if`.
- Eager Test e Teste Frágil dependem de entender a intenção do teste, então ainda precisam de análise manual. A ferramenta ajuda, mas não substitui a revisão.
- O teste com try/catch é o caso mais grave (como foi comprovado na etapa 2), e o linter marca ele como **erro**, e não só como aviso.
