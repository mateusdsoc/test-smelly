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

## Etapa 5: Refatoração

Arquivo novo: `test/userService.clean.test.js`. O original (`userService.smelly.test.js`) não foi alterado.

Resultado: de 5 testes (1 pulado) para **16 testes**, organizados em um `describe` por método do `UserService`. O ESLint não aponta nada no arquivo novo.

### Como cada smell foi resolvido

| Smell | O que foi feito |
|---|---|
| Eager Test | "criar e buscar" virou testes separados: um para os dados salvos no `createUser`, outro para o id único e outro para a busca no `getUserById` |
| Lógica Condicional | O `for` com `if/else` virou dois testes: "desativa um usuário comum" e "não desativa um administrador". Cada um tem um único caminho e todos os `expect` sempre rodam |
| Teste Frágil | O relatório agora é verificado pelo conteúdo (contém o id de cada usuário, contém "inativo" depois da desativação) e não pela linha exata nem pelo cabeçalho |
| try/catch | Trocado por `expect(() => ...).toThrow('O usuário deve ser maior de idade.')`. Se o erro não for lançado, o teste falha |
| Teste Desativado / Vazio | O `test.skip` virou "avisa quando não há usuários cadastrados", que testa de verdade o caso de relatório vazio |

### Outras decisões

- **AAA**: cada teste tem as três partes separadas por uma linha em branco (preparar, executar, verificar), sem comentários do tipo "Act 1". Cada teste tem um único Act.
- **Função `cadastrar`**: cria um usuário válido com valores padrão, e cada teste só informa o dado que importa para ele (ex.: `cadastrar({ idade: 17 })`). Assim fica claro o que muda de um teste para o outro, e se a assinatura do `createUser` mudar, só uma linha precisa ser ajustada.
- **Sem `_clearDB()`**: o `beforeEach` usa `jest.resetModules()` e importa o módulo de novo, então cada teste começa com o "banco" vazio sem depender de um método interno.
- **`test.each` para campos obrigatórios**: os três casos (sem nome, sem email, sem idade) têm a mesma estrutura. O `test.each` gera um teste separado para cada um, com nome próprio no resultado. Não é um `for` dentro do teste: se um falhar, o Jest mostra qual.
- **Nomes**: descrevem o comportamento esperado ("recusa usuário com 17 anos", "retorna null quando o id não existe"), e não o que o código faz por dentro.
- **Comportamentos que antes não eram testados**: campos obrigatórios, cadastro como admin, id único, limite de 18 anos, busca e desativação de id inexistente, admin continua ativo depois da tentativa de desativação, status atualizado no relatório e relatório vazio.

### Comprovação: a suíte nova pega bugs que a antiga deixa passar

Fiz duas alterações de propósito no `src/userService.js` e rodei as duas suítes. O arquivo foi restaurado depois de cada teste.

| Alteração no código | smelly | clean |
|---|---|---|
| `if (idade < 18)` → `if (false)` (sem validação de idade) | passa | **falha** em "recusa usuário com 17 anos" |
| `if (idade < 18)` → `if (idade <= 18)` (recusa quem tem 18) | passa | **falha** em "aceita usuário com exatamente 18 anos" |

Prints: [prints/04-sem-validacao-clean-pega.png](prints/04-sem-validacao-clean-pega.png) e [prints/05-limite-18-clean-pega.png](prints/05-limite-18-clean-pega.png)

O segundo caso é exatamente um mutante de "operador relacional", como os do trabalho anterior: a suíte antiga deixa ele sobreviver e a nova mata.

### Sugestão para o "Antes e Depois" do relatório

Usar o teste de desativação, que é o que tem mais erros do ESLint (3 dos 6):

**Antes** (`userService.smelly.test.js`, linhas 33-52):

```js
test('deve desativar usuários se eles não forem administradores', () => {
  const usuarioComum = userService.createUser('Comum', 'comum@teste.com', 30);
  const usuarioAdmin = userService.createUser('Admin', 'admin@teste.com', 40, true);

  const todosOsUsuarios = [usuarioComum, usuarioAdmin];

  for (const user of todosOsUsuarios) {
    const resultado = userService.deactivateUser(user.id);
    if (!user.isAdmin) {
      expect(resultado).toBe(true);
      const usuarioAtualizado = userService.getUserById(user.id);
      expect(usuarioAtualizado.status).toBe('inativo');
    } else {
      expect(resultado).toBe(false);
    }
  }
});
```

**Depois** (`userService.clean.test.js`):

```js
test('desativa um usuário comum', () => {
  const comum = cadastrar();

  const desativou = userService.deactivateUser(comum.id);

  expect(desativou).toBe(true);
  expect(userService.getUserById(comum.id).status).toBe('inativo');
});

test('não desativa um administrador', () => {
  const admin = cadastrar({ isAdmin: true });

  const desativou = userService.deactivateUser(admin.id);

  expect(desativou).toBe(false);
  expect(userService.getUserById(admin.id).status).toBe('ativo');
});
```

Pontos para explicar:
- Sem `for` e sem `if`: cada cenário virou um teste, e todo `expect` sempre roda.
- Se um falhar, o nome do teste já diz qual regra quebrou (usuário comum ou admin).
- O teste do admin passou a verificar que o status **continua "ativo"**. O original só olhava o retorno `false`, então um bug que desativasse o admin e mesmo assim retornasse `false` passaria.
- AAA claro: uma linha de preparação, uma chamada e as verificações.

Alternativa: o teste do try/catch (linhas 66-75), que é o mais grave, mas a mudança nele é menor (uma linha).

### Observação sobre o ESLint neste ambiente

Como a pasta de trabalho do Claude fica dentro do repositório principal, o ESLint 8 lia também o `.eslintrc.json` da pasta de cima e dava conflito de plugin. Aqui rodei com `npx eslint --no-eslintrc -c .eslintrc.json .`. Num clone normal, `npx eslint .` funciona direto. Não precisa ir para o relatório.
