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
