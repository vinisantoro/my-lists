document.addEventListener('DOMContentLoaded', () => {
    
    // Inicializar Firebase
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();

    // --- Seletores do DOM ---
    const authSection = document.getElementById('auth-section');
    const appContent = document.getElementById('app-content');
    
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const showSignupLink = document.getElementById('show-signup');
    const showLoginLink = document.getElementById('show-login');
    const loginError = document.getElementById('login-error');
    const signupError = document.getElementById('signup-error');

    const userEmailDisplay = document.getElementById('user-email-display');
    const logoutButton = document.getElementById('logout-button');

    const itemForm = document.getElementById('item-form');
    const itemsTableBody = document.querySelector('#items-table tbody');
    
    const themeToggleButton = document.getElementById('theme-toggle');
    let themeToggleIcon = themeToggleButton ? themeToggleButton.querySelector('i') : null;

    const exportButton = document.getElementById('export-data');
    const importFileInput = document.getElementById('import-file');

    const categoryInput = document.getElementById('item-category');
    const brandInput = document.getElementById('item-brand');
    const categoryList = document.getElementById('category-list');
    const brandList = document.getElementById('brand-list');

    const formStarRatingContainer = document.getElementById('form-star-rating');
    const hiddenRatingInput = document.getElementById('item-rating-hidden');
    const currentRatingDisplay = document.getElementById('current-rating-display');

    const categoryTabsContainer = document.getElementById('category-tabs-container');

    const confirmationModal = document.getElementById('confirmation-modal');
    const modalMessage = document.getElementById('modal-message');
    const modalConfirmBtn = document.getElementById('modal-confirm-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');

    // --- Estado da Aplicação ---
    let items = []; // Agora será preenchido pelo Firestore
    let editingItemId = null;
    let actionToConfirm = null;
    let activeCategory = 'all';
    let currentUser = null; // Guarda o usuário logado
    let unsubscribeItemsListener = null; // Para desligar o listener do Firestore ao deslogar
    let unsubscribePrefsListener = null; // Para desligar o listener de preferências

    // --- Lógica de Tema (usando classList) ---
    function applyTheme(theme) {
        document.body.classList.remove('dark-mode', 'light-mode');
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.add('light-mode');
        }
        if (themeToggleIcon) {
            themeToggleIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
        // Salvar preferência de tema no Firestore para o usuário logado
        if (currentUser) {
            db.collection('userPreferences').doc(currentUser.uid).set({ theme: theme }, { merge: true })
                .catch(error => console.error("Erro ao salvar preferência de tema:", error));
        }
    }

    function toggleTheme() {
        const isDarkMode = document.body.classList.contains('dark-mode');
        const newTheme = isDarkMode ? 'light' : 'dark';
        applyTheme(newTheme);
        // Não precisamos mais salvar no localStorage aqui, será salvo no Firestore via applyTheme se usuário logado
    }

    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', toggleTheme);
    }
    // O tema inicial será carregado após o login do usuário a partir do Firestore

    // --- Autenticação ---
    showSignupLink.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('signup-container').style.display = 'block';
        loginError.textContent = ''; signupError.textContent = '';
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('signup-container').style.display = 'none';
        document.getElementById('login-container').style.display = 'block';
        loginError.textContent = ''; signupError.textContent = '';
    });

    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = signupForm['signup-email'].value;
        const password = signupForm['signup-password'].value;
        signupError.textContent = '';
        auth.createUserWithEmailAndPassword(email, password)
            .then(userCredential => {
                // Cadastro bem-sucedido, usuário logado automaticamente
                // console.log("Usuário cadastrado:", userCredential.user);
                // A lógica onAuthStateChanged cuidará do resto
                // Definir um tema padrão para o novo usuário
                db.collection('userPreferences').doc(userCredential.user.uid).set({ theme: 'light' }) // Padrão light
                    .then(() => applyTheme('light')); 
            })
            .catch(error => {
                console.error("Erro no cadastro:", error);
                signupError.textContent = error.message;
            });
    });

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = loginForm['login-email'].value;
        const password = loginForm['login-password'].value;
        loginError.textContent = '';
        auth.signInWithEmailAndPassword(email, password)
            .then(userCredential => {
                // Login bem-sucedido
                // console.log("Usuário logado:", userCredential.user);
                // A lógica onAuthStateChanged cuidará do resto
            })
            .catch(error => {
                console.error("Erro no login:", error);
                loginError.textContent = error.message;
            });
    });

    logoutButton.addEventListener('click', () => {
        auth.signOut().catch(error => console.error("Erro no logout:", error));
    });

    // Observador do estado de autenticação
    auth.onAuthStateChanged(user => {
        if (user) { // Usuário está logado
            currentUser = user;
            authSection.style.display = 'none';
            appContent.style.display = 'block';
            if (userEmailDisplay) userEmailDisplay.textContent = user.email;
            
            // Carregar preferências do usuário (tema)
            if (unsubscribePrefsListener) unsubscribePrefsListener(); // Cancela listener anterior
            unsubscribePrefsListener = db.collection('userPreferences').doc(user.uid)
                .onSnapshot(doc => {
                    if (doc.exists && doc.data().theme) {
                        applyTheme(doc.data().theme);
                    } else {
                        applyTheme('light'); // Tema padrão se não houver preferência salva
                    }
                }, error => {
                    console.error("Erro ao carregar preferências de tema:", error);
                    applyTheme('light'); // Fallback
                });

            loadItemsFromFirestore(); // Carrega os itens do usuário
        } else { // Usuário está deslogado
            currentUser = null;
            authSection.style.display = 'flex'; // ou 'block', dependendo do seu CSS para auth-container
            appContent.style.display = 'none';
            if (userEmailDisplay) userEmailDisplay.textContent = '';
            items = []; // Limpa itens
            if (itemsTableBody) itemsTableBody.innerHTML = ''; // Limpa tabela
            if (categoryTabsContainer) categoryTabsContainer.innerHTML = ''; // Limpa abas
            if (unsubscribeItemsListener) unsubscribeItemsListener(); // Cancela listener de itens
            if (unsubscribePrefsListener) unsubscribePrefsListener(); // Cancela listener de preferências
             // Reset para tema claro padrão ao deslogar (ou manter o último tema não logado)
            document.body.classList.remove('dark-mode');
            document.body.classList.add('light-mode');
            if (themeToggleIcon) themeToggleIcon.className = 'fas fa-moon';
        }
    });

    // --- Lógica de Estrelas (igual à sua versão funcional mais recente) ---
    function createStars(container, currentRating, isEditable = true, associatedHiddenInput = null, associatedDisplay = null) {
        container.innerHTML = ''; 
        const maxStars = 5;
        const updateVisualAllStars = (hoverRating) => {
            const starElements = container.querySelectorAll('.star');
            starElements.forEach((star, index) => {
                const starNum = index + 1; 
                star.className = 'star'; 
                if (hoverRating >= starNum) {
                    star.classList.add('fas', 'fa-star', 'filled');
                } else if (hoverRating >= starNum - 0.5) {
                    star.classList.add('fas', 'fa-star-half-alt', 'filled');
                } else {
                    star.classList.add('far', 'fa-star');
                }
            });
        };
        for (let s = 1; s <= maxStars; s++) {
            const starIcon = document.createElement('i');
            starIcon.dataset.starValue = s; 
            if (currentRating >= s) { starIcon.className = 'star fas fa-star filled'; }
            else if (currentRating >= s - 0.5) { starIcon.className = 'star fas fa-star-half-alt filled'; }
            else { starIcon.className = 'star far fa-star'; }
            if (isEditable) {
                starIcon.style.cursor = 'pointer';
                starIcon.addEventListener('mousemove', (e) => { /* ... lógica de mousemove ... */ 
                    const starNum = parseFloat(e.target.dataset.starValue); const rect = e.target.getBoundingClientRect();
                    const hoverIsHalf = e.clientX - rect.left < rect.width / 2;
                    const hoverRating = hoverIsHalf ? starNum - 0.5 : starNum; updateVisualAllStars(hoverRating);
                });
                starIcon.addEventListener('mouseleave', () => { /* ... lógica de mouseleave ... */ 
                    const actualRating = associatedHiddenInput ? parseFloat(associatedHiddenInput.value) : 0; updateVisualAllStars(actualRating);
                });
                starIcon.addEventListener('click', (e) => { /* ... lógica de click ... */ 
                    const starNum = parseFloat(e.target.dataset.starValue); const rect = e.target.getBoundingClientRect();
                    const clickIsHalf = e.clientX - rect.left < rect.width / 2;
                    const newRating = clickIsHalf ? starNum - 0.5 : starNum;
                    if (associatedHiddenInput) associatedHiddenInput.value = newRating.toFixed(1);
                    if (associatedDisplay) associatedDisplay.textContent = newRating.toFixed(1);
                    updateVisualAllStars(newRating); 
                });
            }
            container.appendChild(starIcon);
        }
    }
    createStars(formStarRatingContainer, 0, true, hiddenRatingInput, currentRatingDisplay);

    // --- Autocomplete ---
    function updateAutocompleteLists() {
        const categories = [...new Set(items.map(item => item.category.trim()).filter(Boolean))].sort();
        const brands = [...new Set(items.map(item => item.brand.trim()).filter(Boolean))].sort();
        categoryList.innerHTML = categories.map(cat => `<option value="${cat}"></option>`).join('');
        brandList.innerHTML = brands.map(br => `<option value="${br}"></option>`).join('');
    }

    // --- Abas de Categoria ---
    function renderCategoryTabs() {
        if (!categoryTabsContainer) return;
        categoryTabsContainer.innerHTML = '';
        const categories = ['all', ...new Set(items.map(item => item.category.trim()).filter(Boolean))].sort((a,b) => {
            if (a === 'all') return -1; if (b === 'all') return 1; return a.localeCompare(b);
        });
        categories.forEach(category => {
            const tabButton = document.createElement('button');
            tabButton.classList.add('tab-button');
            tabButton.textContent = category === 'all' ? 'Todos' : category;
            tabButton.dataset.category = category;
            if (category === activeCategory) tabButton.classList.add('active');
            tabButton.addEventListener('click', () => {
                activeCategory = category; renderCategoryTabs(); renderItems();
            });
            categoryTabsContainer.appendChild(tabButton);
        });
    }

    // --- Modal de Confirmação ---
    function showConfirmationModal(message, onConfirm, isPositiveAction = false) {
        if (!confirmationModal || !modalMessage || !modalConfirmBtn) {
            console.warn("Modal não encontrado, usando confirm() nativo.");
            if (confirm(message)) { if (typeof onConfirm === 'function') onConfirm(); } return;
        }
        modalMessage.textContent = message;
        actionToConfirm = onConfirm;
        modalConfirmBtn.classList.toggle('positive-action', isPositiveAction);
        confirmationModal.style.display = 'flex';
    }
    if (modalConfirmBtn) modalConfirmBtn.addEventListener('click', () => { /* ... */ if (typeof actionToConfirm === 'function') actionToConfirm(); if (confirmationModal) confirmationModal.style.display = 'none'; actionToConfirm = null; });
    if (modalCancelBtn) modalCancelBtn.addEventListener('click', () => { /* ... */ if (confirmationModal) confirmationModal.style.display = 'none'; actionToConfirm = null; });
    if (confirmationModal) confirmationModal.addEventListener('click', (e) => { if(e.target === confirmationModal) { confirmationModal.style.display = 'none'; actionToConfirm = null; }});


    // --- CRUD com Firestore ---
    function loadItemsFromFirestore() {
        if (!currentUser) return;
        if (unsubscribeItemsListener) unsubscribeItemsListener(); // Cancela listener anterior

        unsubscribeItemsListener = db.collection('items')
            .where('userId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc') // Opcional: ordenar por data de criação
            .onSnapshot(snapshot => {
                items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderCategoryTabs();
                renderItems();
                updateAutocompleteLists();
            }, error => {
                console.error("Erro ao carregar itens do Firestore: ", error);
            });
    }

    function renderItems() {
        if (!itemsTableBody) return;
        itemsTableBody.innerHTML = '';
        const itemsToRender = activeCategory === 'all' ? items : items.filter(item => item.category === activeCategory);

        if (itemsToRender.length === 0) {
            const cols = 5; 
            itemsTableBody.innerHTML = `<tr><td colspan="${cols}" class="empty-message">Nenhum item para exibir.</td></tr>`;
            return;
        }
        itemsToRender.forEach(item => {
            const row = itemsTableBody.insertRow();
            row.dataset.id = item.id; // Firestore ID
            if (editingItemId === item.id) {
                // Categoria não é editada na linha, é fixa ou alterada de outra forma (ex: dropdown no futuro)
                row.insertCell().innerHTML = `<input type="text" class="editable-input" value="${item.brand}" data-field="brand" list="brand-list">`;
                row.insertCell().innerHTML = `<input type="text" class="editable-input" value="${item.name}" data-field="name">`;
                row.insertCell().innerHTML = `<textarea class="editable-textarea" data-field="notes">${item.notes}</textarea>`;
                const ratingEditCell = row.insertCell();
                const editStarContainer = document.createElement('div');
                editStarContainer.classList.add('star-rating-input', 'inline-edit-stars');
                const hiddenEditRatingInput = document.createElement('input'); 
                hiddenEditRatingInput.type = 'hidden'; hiddenEditRatingInput.value = item.rating; hiddenEditRatingInput.dataset.field = 'rating';
                ratingEditCell.appendChild(editStarContainer); ratingEditCell.appendChild(hiddenEditRatingInput);
                createStars(editStarContainer, parseFloat(item.rating), true, hiddenEditRatingInput, null);
                const actionsCell = row.insertCell();
                actionsCell.innerHTML = `<button class="save-btn" title="Salvar"><i class="fas fa-save"></i></button> <button class="cancel-btn" title="Cancelar"><i class="fas fa-times"></i></button>`;
                actionsCell.querySelector('.save-btn').addEventListener('click', () => saveEditedItem(item.id));
                actionsCell.querySelector('.cancel-btn').addEventListener('click', () => cancelEdit());
            } else {
                row.insertCell().textContent = item.brand;
                row.insertCell().textContent = item.name;
                const notesCell = row.insertCell(); notesCell.innerHTML = item.notes.replace(/\n/g, '<br>');
                const ratingCell = row.insertCell();
                const displayStarsContainer = document.createElement('div');
                displayStarsContainer.classList.add('star-rating-display');
                createStars(displayStarsContainer, parseFloat(item.rating), false);
                ratingCell.appendChild(displayStarsContainer);
                const actionsCell = row.insertCell();
                actionsCell.innerHTML = `<button class="edit-btn" title="Editar"><i class="fas fa-edit"></i></button> <button class="delete-btn" title="Excluir"><i class="fas fa-trash-alt"></i></button>`;
                actionsCell.querySelector('.edit-btn').addEventListener('click', () => startEditItem(item.id));
                actionsCell.querySelector('.delete-btn').addEventListener('click', () => {
                    showConfirmationModal(`Tem certeza que deseja excluir o item "${item.name}"?`, () => deleteItemFromFirestore(item.id)); 
                });
            }
        });
    }
    
    itemForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!currentUser) {
            alert("Você precisa estar logado para adicionar itens.");
            return;
        }
        const newItemCategory = categoryInput.value.trim();
        const newItemData = {
            userId: currentUser.uid, // Associa o item ao usuário logado
            category: newItemCategory,
            brand: brandInput.value.trim(),
            name: document.getElementById('item-name').value.trim(),
            notes: document.getElementById('item-notes').value.trim(),
            rating: parseFloat(hiddenRatingInput.value) || 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp() // Data de criação
        };

        if (!newItemData.name || !newItemData.category || !newItemData.brand) {
            alert('Por favor, preencha Categoria, Marca/Modelo e Nome do Produto.'); return;
        }
        
        db.collection('items').add(newItemData)
            .then(() => {
                // O listener onSnapshot atualizará a UI automaticamente
                if (activeCategory !== 'all' && activeCategory !== newItemCategory) activeCategory = newItemCategory;
                // renderCategoryTabs(); // Não precisa chamar aqui, onSnapshot fará
                itemForm.reset(); hiddenRatingInput.value = '0'; currentRatingDisplay.textContent = '0.0';
                createStars(formStarRatingContainer, 0, true, hiddenRatingInput, currentRatingDisplay);
                categoryInput.focus();
            })
            .catch(error => {
                console.error("Erro ao adicionar item: ", error);
                alert("Erro ao adicionar item. Tente novamente.");
            });
    });

    function startEditItem(itemId) { editingItemId = itemId; renderItems(); }
    function cancelEdit() { editingItemId = null; renderItems(); }

    function saveEditedItem(itemId) {
        if (!currentUser) return;
        const row = document.querySelector(`#items-table tbody tr[data-id="${itemId}"]`);
        if (!row) return;
        
        const itemToUpdate = items.find(item => item.id === itemId);
        if (!itemToUpdate) return;

        const updatedData = {
            brand: row.querySelector('input[data-field="brand"]').value.trim(),
            name: row.querySelector('input[data-field="name"]').value.trim(),
            notes: row.querySelector('textarea[data-field="notes"]').value.trim(),
            rating: parseFloat(row.querySelector('input[type="hidden"][data-field="rating"]').value) || 0,
            // userId e category não são alterados aqui
        };

        if (!updatedData.name || !updatedData.brand ) {
            alert('Marca/Modelo e Nome do Produto não podem ficar vazios.'); return;
        }

        db.collection('items').doc(itemId).update(updatedData)
            .then(() => {
                editingItemId = null;
                // O listener onSnapshot atualizará a UI.
                // renderItems(); // Não é necessário se onSnapshot estiver ativo
            })
            .catch(error => {
                console.error("Erro ao atualizar item: ", error);
                alert("Erro ao atualizar item.");
            });
    }

    function deleteItemFromFirestore(itemId) {
        if (!currentUser) return;
        db.collection('items').doc(itemId).delete()
            .then(() => {
                // O listener onSnapshot cuidará da atualização da UI.
                // A lógica de activeCategory pode precisar de ajuste se a categoria for removida
                const itemToDelete = items.find(item => item.id === itemId); // Encontra antes de ser removido pelo snapshot
                if(itemToDelete){
                    const remainingCategories = [...new Set(items.filter(it => it.id !== itemId).map(it => it.category))];
                    if (activeCategory === itemToDelete.category && !remainingCategories.includes(itemToDelete.category)) {
                        activeCategory = 'all';
                    }
                }
            })
            .catch(error => {
                console.error("Erro ao excluir item: ", error);
                alert("Erro ao excluir item.");
            });
    }

    // --- Importar/Exportar Dados (Adaptado para Firestore) ---
    exportButton.addEventListener('click', () => {
        if (!currentUser) { alert("Você precisa estar logado para exportar dados."); return; }
        if (items.length === 0) { alert('Não há dados para exportar.'); return; }
        
        // Filtra apenas os campos que queremos exportar, sem o userId e id do Firestore,
        // pois ao importar, novos IDs serão gerados e o userId será o do usuário logado.
        const itemsToExport = items.map(({ userId, id, createdAt, ...rest }) => rest);

        const currentTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
        const dataToExport = { userTheme: currentTheme, items: itemsToExport };
        const dataStr = JSON.stringify(dataToExport, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = `meus_itens_${currentUser.uid.substring(0,5)}.json`;
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri); linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click(); linkElement.remove();
    });

    importFileInput.addEventListener('change', (event) => {
        if (!currentUser) { alert("Você precisa estar logado para importar dados."); return; }
        const file = event.target.files[0]; if (!file) return;
        if (file.type !== "application/json") { alert("Arquivo JSON inválido."); importFileInput.value = ""; return; }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedPayload = JSON.parse(e.target.result);
                let importedItemsList; let importedUserTheme = null;

                if (importedPayload && typeof importedPayload.items !== 'undefined') { 
                    importedItemsList = importedPayload.items;
                    if (typeof importedPayload.userTheme === 'string') importedUserTheme = importedPayload.userTheme;
                } else if (Array.isArray(importedPayload)) { 
                    importedItemsList = importedPayload; // Formato antigo, só itens
                } else { alert('Formato do arquivo JSON inválido.'); importFileInput.value = ""; return; }

                if (Array.isArray(importedItemsList) && 
                    (importedItemsList.length === 0 || importedItemsList.every(item => 
                        typeof item.name === 'string' && typeof item.category === 'string' && 
                        typeof item.brand === 'string' && typeof item.notes === 'string' && 
                        typeof item.rating === 'number'))) {
                    
                    showConfirmationModal('Isso ADICIONARÁ os itens importados à sua lista atual e pode definir o tema. Deseja continuar?', () => { 
                        if (importedUserTheme) applyTheme(importedUserTheme); // Aplica tema do arquivo
                        
                        const batch = db.batch();
                        importedItemsList.forEach(item => {
                            const newItemRef = db.collection('items').doc(); // Novo ID gerado pelo Firestore
                            batch.set(newItemRef, {
                                ...item, // Dados do item importado
                                userId: currentUser.uid, // Associa ao usuário logado
                                createdAt: firebase.firestore.FieldValue.serverTimestamp()
                            });
                        });
                        batch.commit()
                            .then(() => {
                                alert('Dados importados e adicionados com sucesso!');
                                // O listener onSnapshot já atualizará a lista
                            })
                            .catch(error => {
                                console.error("Erro ao importar itens em lote:", error);
                                alert("Erro ao importar alguns itens.");
                            });
                        activeCategory = 'all'; // Resetar para 'all' após importação
                    }, true); 
                } else { alert('Itens no arquivo JSON com formato inválido.');}
            } catch (error) { alert('Erro ao processar o arquivo JSON: ' + error.message);
            } finally { importFileInput.value = ""; }
        };
        reader.readAsText(file);
    });

    // Nenhuma chamada a loadItems() aqui, pois onAuthStateChanged cuidará disso.
});