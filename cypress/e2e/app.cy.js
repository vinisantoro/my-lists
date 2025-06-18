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
  fillItem({cat, brand, name, notes, rating}) {
    if (cat)   this.elements.category().type(cat);
    if (brand) this.elements.brand().type(brand);
    if (name)  this.elements.name().type(name);
    if (notes) this.elements.notes().type(notes);
    // rating could be set with custom commands
  }
  submit() { this.elements.submit().click(); }
}

// RegisterForm.js
class RegisterForm {
  elements = {
    usernameInput: () => cy.get('#login-email'),
    passwordInput: () => cy.get('#login-password'),
    newusernameInput: () => cy.get('#signup-email'),
    newpasswordInput: () => cy.get('#signup-password'),
    submitBtn: () => cy.get('#btn-auth'),
    registrationBtn: () => cy.get('#show-signup'),
    createUserBtn: () => cy.get('#submit-new-user')
  }

  typeUsername(text) {
    if(!text) return;
    this.elements.usernameInput().type(text)
  }

  typePassword(text) {
    if(!text) return;
    this.elements.passwordInput().type(text)
  }

  typeNewUsername(text) {
    if(!text) return;
    this.elements.newusernameInput().type(text)
  }

  typeNewPassword(text) {
    if(!text) return;
    this.elements.newpasswordInput().type(text)
  }
  clickSubmit(){
    this.elements.submitBtn().click()
  }
  
  clickRegister(){
    this.elements.registrationBtn().click()
  }  
  
  clickCreateUser(){
    this.elements.createUserBtn().click()
  }
  
}

const registerForm = new RegisterForm()
const loginForm = new LoginForm()
const itemForm = new ItemForm()

describe('Access Main Site', () => {
  it('passes', () => {
    cy.visit('/')
  })
});
describe('User Authentication', () => {
  describe('Registering a new user', () => {
    const input = {
      user: 'registered@test.com',
      password: 'Password123'
    }
    it(`Given I am on the registration form`, () => {
      cy.visit('/app.html'),
      registerForm.clickRegister()
    }),

    it(`When I fill "${input.user}" with a valid email`, () => {
      registerForm.typeNewUsername(input.user)
    }),

    it(`And I fill "${input.password}" with a valid password`, () => {
      registerForm.typeNewPassword(input.password)
    }),

    it(`And I submit the "signup-form"`, () => {
      registerForm.clickCreateUser()
    }),

    it(`Then I should see the main screen with my lists`, () => {

    })
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


describe('List Management', () => {
  it('creates a new list', () => {
    cy.get('#create-list').click();
    cy.get('#new-list-name').type('Nova Lista');
    cy.get('#create-list-save').click();
    cy.contains('#lists-table td', 'Nova Lista').should('exist');
  });

  it('deletes a list', () => {
    cy.contains('#lists-table tr', 'Nova Lista')
      .find('.delete-btn')
      .click();
    cy.get('#modal-confirm-btn').click();
    cy.contains('#lists-table td', 'Nova Lista').should('not.exist');
  });
});

describe('Item Management', () => {
  it('adds a new item', () => {
    itemForm.fillItem({
      cat: 'Eletrônicos',
      brand: 'Samsung',
      name: 'Galaxy S23',
      notes: 'telefone de teste'
    });
    itemForm.submit();
    cy.contains('#items-table td', 'Galaxy S23').should('exist');
  });

  it('edits an item', () => {
    cy.contains('#items-table tr', 'Galaxy S23')
      .find('.edit-btn')
      .click();
    cy.get('.editable-input[data-field="name"]').clear().type('Galaxy Edit');
    cy.get('.save-btn').click();
    cy.contains('#items-table td', 'Galaxy Edit').should('exist');
  });

  it('deletes an item', () => {
    cy.contains('#items-table tr', 'Galaxy Edit')
      .find('.delete-btn')
      .click();
    cy.get('#modal-confirm-btn').click();
    cy.contains('#items-table td', 'Galaxy Edit').should('not.exist');
  });
});

describe('Theme Preference', () => {
  it('toggles dark mode', () => {
    cy.get('#theme-toggle').click();
    cy.get('body').should('have.class', 'dark-mode');
  });
});

describe('Import and Export', () => {
  it('exports data to JSON', () => {
    cy.get('#export-data').click();
    // Add assertion for downloaded file if needed
  });

  it('imports items from JSON', () => {
    cy.get('#import-file').selectFile('cypress/fixtures/sample-data.json', { force: true });
    cy.get('#modal-confirm-btn').click();
    // Verify imported data in table
  });
});

describe('List Sharing (Premium)', () => {
  it('shares a list with read permission', () => {
    cy.get('#share-list').click();
    cy.get('#share-email').type('other@example.com');
    cy.get('#share-save-btn').click();
    cy.contains('#shared-users-list li', 'other@example.com - read').should('exist');
  });
});