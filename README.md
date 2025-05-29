# Sistema de Gerenciamento de Itens Pessoais

## Visão Geral

Este é um sistema web interativo projetado para ajudar usuários a catalogar e gerenciar listas de itens pessoais de forma organizada e personalizada. A aplicação permite que os usuários cadastrem, editem, excluam e classifiquem seus itens, tendo o modelo freemium, onde os dados estão hospedados no LocalStorage de seu navegador de forma gratuíta e dados persistidos de forma segura na nuvem e acessíveis apenas pelo proprietário. O sistema conta com uma interface moderna, leve, responsiva e com opções de personalização de tema.

## Funcionalidades Principais

### 1. Autenticação e Segurança de Dados

- **Cadastro e Login de Usuários:** Sistema de autenticação individual utilizando e-mail e senha, gerenciado pelo Firebase Authentication.
- **Privacidade de Dados (ACL):** Cada usuário tem acesso exclusivo aos seus próprios itens. As regras de segurança do Firestore garantem que os dados de um usuário não possam ser visualizados ou modificados por outros.

### 2. Gerenciamento Completo de Itens (CRUD)

- **Adicionar Itens:** Formulário intuitivo para registrar novos itens com os seguintes campos:
  - **Categoria:** Campo de texto com funcionalidade de autocomplete, que sugere categorias já utilizadas pelo usuário.
  - **Marca/Modelo:** Campo de texto com autocomplete, sugerindo marcas/modelos previamente cadastrados pelo usuário.
  - **Nome do Produto:** Campo de texto para identificação do item.
  - **Anotações:** Área de texto para notas detalhadas, observações ou links.
  - **Ranking:** Classificação de 0 a 5 estrelas, com incrementos de 0.5 (ex: 0, 0.5, 1.0, 1.5, ..., 5.0), utilizando uma interface interativa de estrelas.
- **Visualizar Itens:**
  - **Abas por Categoria:** Os itens são organizados e filtrados dinamicamente por categorias, exibidas como abas navegáveis. Inclui uma aba "Todos" para visualização completa.
  - **Listagem em Tabela:** Apresentação clara dos itens em formato de tabela, exibindo marca/modelo, nome do produto, anotações e o ranking em estrelas.
- **Editar Itens:** Modificação dos dados de um item diretamente na linha da tabela (edição inline), facilitando atualizações rápidas.
- **Excluir Itens:** Remoção de itens com uma etapa de confirmação através de um modal, prevenindo exclusões acidentais.

### 3. Interface de Usuário e Experiência

- **Design Moderno e Leve:** Foco em uma interface visualmente agradável, limpa e de carregamento rápido.
- **Temas Claro e Escuro:**
  - Possibilidade de alternar entre um tema claro (com preferência por tons de azul) e um tema escuro.
  - A preferência de tema do usuário é salva no Firebase e aplicada automaticamente ao fazer login.
- **Responsividade:** Interface adaptável para visualização em diferentes tamanhos de tela (desktops, tablets e smartphones).
- **Feedback Visual:** Mensagens e modais para confirmações, erros e sucesso de operações.

### 4. Portabilidade e Backup de Dados

- **Exportar Dados:** Funcionalidade para o usuário exportar todos os seus itens (e sua preferência de tema) para um arquivo JSON local, servindo como backup manual.
- **Importar Dados:** Capacidade de importar itens de um arquivo JSON (previamente exportado). Os itens importados são adicionados à lista existente do usuário no Firebase. O tema salvo no arquivo também pode ser aplicado.

## Tecnologia Utilizada

- **Frontend:**
  - HTML5 (Estrutura semântica)
  - CSS3 (Estilização, temas, responsividade)
  - JavaScript (ES6+) (Lógica da aplicação, interatividade, manipulação do DOM)
- **Backend (Firebase - BaaS):**
  - **Firebase Authentication:** Para gerenciamento de identidade de usuários (login com e-mail/senha).
  - **Cloud Firestore:** Banco de dados NoSQL para persistência dos itens e preferências dos usuários, com sincronização em tempo real.
  - **Firebase Security Rules:** Para garantir a privacidade e o controle de acesso aos dados.
- **Hospedagem (Frontend):**
  - Firebase Hosting (para a versão online da aplicação cliente)
  - (Alternativamente, o projeto pode ser hospedado no GitHub Pages para demonstração)

## Evolução do Projeto

Este sistema evoluiu de uma versão inicial que utilizava o `localStorage` do navegador para armazenamento de dados para uma solução mais robusta e escalável, utilizando o Firebase para oferecer persistência na nuvem, autenticação segura e funcionalidades multiusuário.
