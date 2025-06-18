## EN-US

Feature: User Authentication
Scenario: Registering a new user
Given I am on the sign-up page
When I fill "signup-email" with a valid email
And I fill "signup-password" with a valid password
And I submit the "signup-form"
Then I should see the main screen with my lists

Scenario: Logging in with an existing user
Given I am on the login page
When I provide a valid email and password
And I submit the "login-form"
Then I should see my registered lists

Scenario: Continue without logging in
Given I am on the authentication page
When I click the "Continue without login" button
Then I can use the application in LocalStorage mode

Scenario: Logout
Given I am logged in
When I click "Logout"
Then I return to the login screen

Feature: Item Management
Scenario: Add a new item
Given I have an open list
When I fill in category, brand/model, name, and notes
And I choose a ranking using the stars
And I submit the item form
Then the item appears in the items table

Scenario: Edit an existing item
Given there is a registered item
When I click "Edit" on that item
And I change the desired fields
And I confirm the edit
Then the item is updated in the list

Scenario: Delete an item
Given there is a registered item
When I click the delete icon for that item
Then I confirm the deletion
And the item no longer appears in the list

Scenario: Filter by category and remove category
Given I have items in multiple categories
When I select a category in the header
Then I see only items from that category
When I click "Delete Category"
Then all items from that category are removed

Feature: List Management
Scenario: Create a new list
Given I am on the lists page
When I click "New List"
And I provide a valid name
And I confirm the creation
Then the new list appears in the table

Scenario: Delete a list
Given I am on the lists page
And there is at least one list
When I click "Delete" for that list
Then I confirm the deletion
And the list is removed along with its items

Scenario: Open an existing list
Given I am on the lists page
When I click "Edit" for a list
Then I see the items belonging to that list

Feature: Theme Preference
Scenario: Switch between light and dark modes
Given I am logged in or in guest mode
When I click the theme toggle button
Then the page body changes class
And the preference is saved for future access

Feature: Import and Export
Scenario: Export items to JSON
Given I have registered items
When I click "Export Data"
Then a JSON file is generated for download

Scenario: Import items from JSON
Given I am on the items page
When I select a valid JSON file under "Import Data"
Then I confirm the import
And the items from the file are added to my list

Feature: List Sharing (Premium)
Scenario: Share a list with read-only permission
Given I am a Premium user on the items page
When I click "Share List"
And I provide a valid email
And I leave the write option unchecked
And I save the sharing settings
Then the specified user appears in the sharing list with read-only permission

Scenario: Share a list with write permission
Given I am a Premium user on the items page
When I click "Share List"
And I provide a valid email
And I check the write option
And I save the sharing settings
Then the specified user appears in the sharing list with write permission

Scenario: Non-Premium user trying to share
Given I do not have a Premium plan
When I click "Share List"
Then I should see a message indicating the feature is only for Premium users

## PT-BR

Feature: Autenticação de Usuário
Scenario: Cadastro de novo usuário
Given estou na tela de cadastro
When preencho "signup-email" com um email válido
And preencho "signup-password" com uma senha válida
And envio o formulário "signup-form"
Then devo ver a tela principal com minhas listas

Scenario: Login de usuário existente
Given estou na tela de login
When informo email e senha válidos
And envio o formulário "login-form"
Then devo visualizar minhas listas cadastradas

Scenario: Continuar sem login
Given estou na tela de autenticação
When clico no botão "Continuar sem login"
Then posso utilizar o aplicativo em modo LocalStorage

Scenario: Logout
Given estou autenticado
When clico em "Sair"
Then retorno à tela de login

Feature: Gerenciamento de Itens
Scenario: Adicionar um novo item
Given estou com uma lista aberta
When preencho categoria, marca/modelo, nome e notas
And escolho um ranking usando as estrelas
And envio o formulário de item
Then o item aparece na tabela de itens

Scenario: Editar um item existente
Given há um item cadastrado
When clico em "Editar" nesse item
And altero os campos desejados
And confirmo a edição
Then o item é atualizado na lista

Scenario: Excluir um item
Given há um item cadastrado
When clico no ícone de exclusão desse item
Then devo confirmar a exclusão
And o item não aparece mais na lista

Scenario: Filtrar por categoria e excluir categoria
Given tenho itens em múltiplas categorias
When seleciono uma categoria no cabeçalho
Then vejo apenas itens dessa categoria
When clico em "Excluir Categoria"
Then todos os itens dessa categoria são removidos

Feature: Gerenciamento de Listas
Scenario: Criar nova lista
Given estou na tela de listas
When clico em "Nova Lista"
And informo um nome válido
And confirmo a criação
Then a nova lista aparece na tabela

Scenario: Excluir uma lista
Given estou na tela de listas
And existe ao menos uma lista
When clico em "Excluir" na linha da lista
Then confirmo a exclusão
And a lista é removida junto com seus itens

Scenario: Abrir uma lista existente
Given estou na tela de listas
When clico em "Editar" de uma lista
Then vejo os itens pertencentes a essa lista

Feature: Preferência de Tema
Scenario: Alternar entre tema claro e escuro
Given estou autenticado ou em modo convidado
When clico no botão de alternar tema
Then o corpo da página muda de classe
And a preferência é salva para reaplicar em próximos acessos

Feature: Importação e Exportação
Scenario: Exportar itens para JSON
Given tenho itens cadastrados
When clico em "Exportar Dados"
Then um arquivo JSON é gerado para download

Scenario: Importar itens de um JSON
Given estou na tela de itens
When seleciono um arquivo JSON válido em "Importar Dados"
Then confirmo a importação
And os itens do arquivo são adicionados à minha lista

Feature: Compartilhamento de Listas (Premium)
Scenario: Compartilhar lista com permissão de leitura
Given sou um usuário Premium na tela de itens
When clico em "Compartilhar Lista"
And informo um email válido
And deixo desmarcada a opção de gravação
And salvo o compartilhamento
Then o usuário informado aparece na lista de compartilhamento com permissão de leitura

Scenario: Compartilhar lista com permissão de escrita
Given sou um usuário Premium na tela de itens
When clico em "Compartilhar Lista"
And informo um email válido
And marco a opção de gravação
And salvo o compartilhamento
Then o usuário informado aparece na lista de compartilhamento com permissão de escrita

Scenario: Usuário não Premium tentando compartilhar
Given não possuo plano Premium
When clico em "Compartilhar Lista"
Then devo ver uma mensagem informando que o recurso é exclusivo para usuários Premium
