// LoginForm.js
class LoginForm {
  elements = {
    usernameInput: () => cy.get('#login-email'),
    passwordInput: () => cy.get('#login-password'),
    submitBtn:    () => cy.get('#login-form .btn-auth')
  };
  typeUsername(text) { if (text) this.elements.usernameInput().type(text); }
  typePassword(text) { if (text) this.elements.passwordInput().type(text); }
  clickSubmit()      { this.elements.submitBtn().click(); }
}

// ItemForm.js
class ItemForm {
  elements = {
    category: () => cy.get('#item-category'),
    brand:    () => cy.get('#item-brand'),
    name:     () => cy.get('#item-name'),
    notes:    () => cy.get('#item-notes'),
    rating:   () => cy.get('#form-star-rating'),
    submit:   () => cy.get('#item-form button[type="submit"]')
  };
  fillItem({cat, brand, name, notes}) {
    if (cat)   this.elements.category().type(cat);
    if (brand) this.elements.brand().type(brand);
    if (name)  this.elements.name().type(name);
    if (notes) this.elements.notes().type(notes);
  }
  submit() { this.elements.submit().click(); }
}

// RegisterForm.js
class RegisterForm {
  elements = {
    usernameInput:   () => cy.get('#login-email'),
    passwordInput:   () => cy.get('#login-password'),
    newusernameInput:() => cy.get('#signup-email'),
    newpasswordInput:() => cy.get('#signup-password'),
    submitBtn:       () => cy.get('#btn-auth'),
    registrationBtn: () => cy.get('#show-signup'),
    createUserBtn:   () => cy.get('#submit-new-user')
  };
  typeUsername(text)      { if (text) this.elements.usernameInput().type(text); }
  typePassword(text)      { if (text) this.elements.passwordInput().type(text); }
  typeNewUsername(text)   { if (text) this.elements.newusernameInput().type(text); }
  typeNewPassword(text)   { if (text) this.elements.newpasswordInput().type(text); }
  clickSubmit()           { this.elements.submitBtn().click(); }
  clickRegister()         { this.elements.registrationBtn().click(); }
  clickCreateUser()       { this.elements.createUserBtn().click(); }
}

// ListsPage.js
class ListsPage {
  elements = {
    createBtn:      () => cy.get('#create-list'),
    newNameInput:   () => cy.get('#new-list-name'),
    saveNewBtn:     () => cy.get('#create-list-save'),
    listRow:        (name) => cy.contains('#lists-table tr', name),
    deleteBtnFor:   (name) => this.elements.listRow(name).find('.delete-btn'),
    confirmDelete:  () => cy.get('#modal-confirm-btn')
  };
  createList(name) {
    this.elements.createBtn().click();
    this.elements.newNameInput().type(name);
    this.elements.saveNewBtn().click();
  }
  deleteList(name) {
    this.elements.deleteBtnFor(name).click();
    this.elements.confirmDelete().click();
  }
}

// ItemsPage.js
class ItemsPage {
  elements = {
    editBtn:   (name) => cy.contains('#items-table tr', name).find('.edit-btn'),
    deleteBtn: (name) => cy.contains('#items-table tr', name).find('.delete-btn'),
    editInput: (field) => cy.get(`.editable-input[data-field="${field}"]`),
    saveBtn:   () => cy.get('.save-btn'),
    confirmDelete: () => cy.get('#modal-confirm-btn')
  };
  editItem(name, newName) {
    this.elements.editBtn(name).click();
    this.elements.editInput('name').clear().type(newName);
    this.elements.saveBtn().click();
  }
  deleteItem(name) {
    this.elements.deleteBtn(name).click();
    this.elements.confirmDelete().click();
  }
}

// ThemeToggle.js
class ThemeToggle {
  elements = { toggle: () => cy.get('#theme-toggle') };
  toggle() { this.elements.toggle().click(); }
}

// ImportExportPage.js
class ImportExportPage {
  elements = {
    exportBtn: () => cy.get('#export-data'),
    importInput: () => cy.get('#import-file'),
    confirmBtn: () => cy.get('#modal-confirm-btn')
  };
  exportData() { this.elements.exportBtn().click(); }
  importData(file) {
    this.elements.importInput().selectFile(file, { force: true });
    this.elements.confirmBtn().click();
  }
}

// SharePage.js
class SharePage {
  elements = {
    openBtn:  () => cy.get('#share-list'),
    email:    () => cy.get('#share-email'),
    writeChk: () => cy.get('#share-recording'),
    saveBtn:  () => cy.get('#share-save-btn'),
    userEntry: (email, perm) => cy.contains('#shared-users-list li', `${email} - ${perm}`)
  };
  share(email, write = false) {
    this.elements.openBtn().click();
    this.elements.email().type(email);
    if (write) this.elements.writeChk().check();
    this.elements.saveBtn().click();
  }
}

const registerForm = new RegisterForm();
const loginForm    = new LoginForm();
const itemForm     = new ItemForm();
const listsPage    = new ListsPage();
const itemsPage    = new ItemsPage();
const themeToggle  = new ThemeToggle();
const importExport = new ImportExportPage();
const sharePage    = new SharePage();

// Tests

describe('Access Main Site', () => {
  it('passes', () => {
    cy.visit('/');
  });
});

describe('User Authentication', () => {
  describe('Registering a new user', () => {
    const input = { user: 'registered@test.com', password: 'Password123' };
    it('Given I am on the registration form', () => {
      cy.visit('/app.html');
      registerForm.clickRegister();
    });
    it(`When I fill "${input.user}" with a valid email`, () => {
      registerForm.typeNewUsername(input.user);
    });
    it(`And I fill "${input.password}" with a valid password`, () => {
      registerForm.typeNewPassword(input.password);
    });
    it('And I submit the "signup-form"', () => {
      registerForm.clickCreateUser();
    });
    it('Then I should see the main screen with my lists', () => {
      cy.get('#lists-section').should('be.visible');
    });
  });

  describe('Logging in with an existing user', () => {
    it('Given I am on the login form', () => {
      cy.visit('/app.html');
    });
    it('When I fill valid credentials and submit', () => {
      loginForm.typeUsername('registered@test.com');
      loginForm.typePassword('Password123');
      loginForm.clickSubmit();
    });
    it('Then I should see the main screen', () => {
      cy.contains('#list-name', 'Minha Lista').should('be.visible');
    });
  });

  describe('Continue without login', () => {
    it('I can access guest mode', () => {
      cy.visit('/app.html');
      cy.get('#continue-guest').click();
      cy.contains('#mode-indicator', 'Convidado').should('exist');
    });
  });

  describe('Logout', () => {
    it('logs out from the app', () => {
      cy.get('#logout-button').click();
      cy.get('#auth-section').should('be.visible');
    });
  });
});

describe('List Management', () => {
  const listName = 'Nova Lista';
  it('creates a new list', () => {
    listsPage.createList(listName);
    cy.contains('#lists-table td', listName).should('exist');
  });
  it('deletes a list', () => {
    listsPage.deleteList(listName);
    cy.contains('#lists-table td', listName).should('not.exist');
  });
});

describe('Item Management', () => {
  const itemName = 'Galaxy S23';
  it('adds a new item', () => {
    itemForm.fillItem({
      cat: 'Eletrônicos',
      brand: 'Samsung',
      name: itemName,
      notes: 'telefone de teste'
    });
    itemForm.submit();
    cy.contains('#items-table td', itemName).should('exist');
  });
  it('edits an item', () => {
    itemsPage.editItem(itemName, 'Galaxy Edit');
    cy.contains('#items-table td', 'Galaxy Edit').should('exist');
  });
  it('deletes an item', () => {
    itemsPage.deleteItem('Galaxy Edit');
    cy.contains('#items-table td', 'Galaxy Edit').should('not.exist');
  });
});

describe('Theme Preference', () => {
  it('toggles dark mode', () => {
    themeToggle.toggle();
    cy.get('body').should('have.class', 'dark-mode');
  });
});

describe('Import and Export', () => {
  it('exports data to JSON', () => {
    importExport.exportData();
    // Add assertion for downloaded file if needed
  });
  it('imports items from JSON', () => {
    importExport.importData('cypress/fixtures/sample-data.json');
    // Verify imported data in table
  });
});

describe('List Sharing (Premium)', () => {
  it('shares a list with read permission', () => {
    sharePage.share('other@example.com');
    sharePage.elements.userEntry('other@example.com', 'read').should('exist');
  });
});
