let UserService;
let userService;

const cadastrar = ({ nome = 'Ana Souza', email = 'ana.souza@exemplo.com', idade = 30, isAdmin = false } = {}) =>
  userService.createUser(nome, email, idade, isAdmin);

beforeEach(() => {
  jest.resetModules();
  ({ UserService } = require('../src/userService'));
  userService = new UserService();
});

describe('createUser', () => {
  test('salva o usuário com os dados informados, ativo e sem permissão de admin', () => {
    const dados = { nome: 'Carlos Lima', email: 'carlos.lima@exemplo.com', idade: 42 };

    const usuario = cadastrar(dados);

    expect(usuario).toMatchObject({ ...dados, isAdmin: false, status: 'ativo' });
  });

  test('cadastra como administrador quando isAdmin é true', () => {
    const usuario = cadastrar({ isAdmin: true });

    expect(usuario.isAdmin).toBe(true);
  });

  test('gera um id diferente para cada usuário', () => {
    const primeiro = cadastrar({ email: 'primeiro@exemplo.com' });

    const segundo = cadastrar({ email: 'segundo@exemplo.com' });

    expect(segundo.id).not.toBe(primeiro.id);
  });

  test('aceita usuário com exatamente 18 anos', () => {
    const usuario = cadastrar({ idade: 18 });

    expect(usuario.idade).toBe(18);
  });

  test('recusa usuário com 17 anos', () => {
    const cadastrarMenor = () => cadastrar({ idade: 17 });

    expect(cadastrarMenor).toThrow('O usuário deve ser maior de idade.');
  });

  test.each(['nome', 'email', 'idade'])('recusa cadastro sem %s', (campo) => {
    const cadastrarIncompleto = () => cadastrar({ [campo]: null });

    expect(cadastrarIncompleto).toThrow('Nome, email e idade são obrigatórios.');
  });
});

describe('getUserById', () => {
  test('encontra o usuário pelo id gerado no cadastro', () => {
    const cadastrado = cadastrar();

    const encontrado = userService.getUserById(cadastrado.id);

    expect(encontrado).toEqual(cadastrado);
  });

  test('retorna null quando o id não existe', () => {
    const encontrado = userService.getUserById('id-que-nao-existe');

    expect(encontrado).toBeNull();
  });
});

describe('deactivateUser', () => {
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

  test('retorna false quando o id não existe', () => {
    const desativou = userService.deactivateUser('id-que-nao-existe');

    expect(desativou).toBe(false);
  });
});

describe('generateUserReport', () => {
  test('inclui todos os usuários cadastrados', () => {
    const alice = cadastrar({ nome: 'Alice', email: 'alice@exemplo.com' });
    const bruno = cadastrar({ nome: 'Bruno', email: 'bruno@exemplo.com' });

    const relatorio = userService.generateUserReport();

    expect(relatorio).toContain(alice.id);
    expect(relatorio).toContain(bruno.id);
  });

  test('mostra o status atualizado depois de uma desativação', () => {
    const usuario = cadastrar();
    userService.deactivateUser(usuario.id);

    const relatorio = userService.generateUserReport();

    expect(relatorio).toContain('inativo');
  });

  test('avisa quando não há usuários cadastrados', () => {
    const relatorio = userService.generateUserReport();

    expect(relatorio).toContain('Nenhum usuário cadastrado.');
  });
});
