// =============================================================================
// SCRIPT PRINCIPAL DA APLICAÇÃO (script-app.js)
// Gerenciamento de Lista de Itens com Modelo Freemium (LocalStorage e Firebase)
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
    // ---------------------------------------------------------------------------
    // CONFIGURAÇÃO E INICIALIZAÇÃO DO FIREBASE
    // ---------------------------------------------------------------------------
    const firebaseConfig = {
        apiKey: "AIzaSyBeAVHfvUU993JQHJLMc9BHsV2KUZOs33U", // Chave de API do seu projeto Firebase
        authDomain: "my-list-2f3a7.firebaseapp.com",     // Domínio de autenticação
        projectId: "my-list-2f3a7",                     // ID do projeto
        storageBucket: "my-list-2f3a7.appspot.com",     // Bucket de armazenamento (se usado)
        messagingSenderId: "515380103480",              // ID do remetente de mensagens (se usado)
        appId: "1:515380103480:web:0d6c2e7d4ee47cc9d299cd", // ID do aplicativo web
        measurementId: "G-V0K1T22ZNB"                   // ID de medição do Google Analytics (se usado)
    };

    try {
        // Verifica se o SDK do Firebase foi carregado antes de inicializar
        if (typeof firebase === 'undefined' || typeof firebase.initializeApp === 'undefined') {
            throw new Error("SDK do Firebase não carregado. Verifique os links <script> no seu HTML.");
        }
        firebase.initializeApp(firebaseConfig); // Inicializa o Firebase com a configuração fornecida
    } catch (e) {
        console.error("Erro Crítico ao inicializar Firebase:", e.message);
        // Exibe uma mensagem de erro proeminente para o usuário se a inicialização falhar
        const bodyElement = document.body;
        if (bodyElement) {
            bodyElement.innerHTML = `<div style="padding: 20px; text-align: center; color: #721c24; background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: .25rem; margin: 20px;"><h1>Erro de Configuração</h1><p>Não foi possível carregar o aplicativo devido a um problema de configuração ou conexão. Por favor, tente recarregar a página. Se o problema persistir, o Firebase pode não estar configurado corretamente neste ambiente.</p></div>`;
        }
        return; // Interrompe a execução do script se o Firebase não puder ser inicializado
    }
    const auth = firebase.auth();       // Serviço de Autenticação do Firebase
    const db = firebase.firestore();    // Serviço Firestore (banco de dados) do Firebase

    // ---------------------------------------------------------------------------
    // SELETORES DE ELEMENTOS DO DOM
    // ---------------------------------------------------------------------------
    // Seções principais da UI
    const authSection = document.getElementById('auth-section');
    const appContent = document.getElementById('app-content');

    // Elementos de Autenticação
    const loginContainer = document.getElementById('login-container');
    const signupContainer = document.getElementById('signup-container');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const showSignupLink = document.getElementById('show-signup');
    const showLoginLink = document.getElementById('show-login');
    const loginError = document.getElementById('login-error');
    const signupError = document.getElementById('signup-error');
    const continueGuestButton = document.getElementById('continue-guest');
    const guestModeOption = document.getElementById('guest-mode-option');

    // Elementos da UI do Aplicativo (quando logado ou como convidado)
    const userEmailDisplay = document.getElementById('user-email-display');
    const logoutButton = document.getElementById('logout-button');
    const upgradeButtons = document.querySelectorAll('.upgrade-to-premium');
    const modeIndicator = document.getElementById('mode-indicator');
    
    // Formulário de Itens
    const itemForm = document.getElementById('item-form');
    const categoryInput = document.getElementById('item-category');
    const brandInput = document.getElementById('item-brand');
    const itemNameInput = document.getElementById('item-name'); // Adicionado para clareza
    const itemNotesInput = document.getElementById('item-notes'); // Adicionado para clareza
    const categoryList = document.getElementById('category-list');
    const brandList = document.getElementById('brand-list');
    const formStarRatingContainer = document.getElementById('form-star-rating');
    const hiddenRatingInput = document.getElementById('item-rating-hidden');
    const currentRatingDisplay = document.getElementById('current-rating-display');

    // Seções e Tabelas
    const listsSection = document.getElementById('lists-section');
    const itemsSection = document.getElementById('items-section');
    const listsTable = document.getElementById('lists-table');
    const listsTableBody = document.querySelector('#lists-table tbody');
    const createListButton = document.getElementById('create-list');
    const createListModal = document.getElementById('create-list-modal');
    const createListForm = document.getElementById('create-list-form');
    const newListNameInput = document.getElementById('new-list-name');
    const createListCancel = document.getElementById('create-list-cancel');
    const backToListsButton = document.getElementById('back-to-lists');
    const listNameDisplay = document.getElementById('list-name');

    const itemsTableBody = document.querySelector('#items-table tbody');
    const categoryTabsContainer = document.getElementById('category-tabs-container');

    // Controles Gerais e Modal
    const themeToggleButtons = document.querySelectorAll('.theme-toggle');
    let themeToggleIcons = Array.from(themeToggleButtons).map(btn => btn.querySelector('i'));
    const exportButton = document.getElementById('export-data');
    const importFileInput = document.getElementById('import-file');
    const exportButtonLists = document.getElementById('export-data-lists');
    const importFileInputLists = document.getElementById('import-file-lists');
    const logoutButtonLists = document.getElementById('logout-button-lists');
    const deleteCategoryButton = document.getElementById('delete-category');
    const shareListButton = document.getElementById('share-list');
    const shareModal = document.getElementById('share-modal');
    const shareForm = document.getElementById('share-form');
    const shareEmailInput = document.getElementById('share-email');
    const shareRecordingCheckbox = document.getElementById('share-recording');
    const shareCancelBtn = document.getElementById('share-cancel-btn');
    const confirmationModal = document.getElementById('confirmation-modal');
    const modalMessage = document.getElementById('modal-message');
    const modalConfirmBtn = document.getElementById('modal-confirm-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    const modalIcon = document.getElementById('modal-icon');
    const sharedUsersList = document.getElementById('shared-users-list');

    // ---------------------------------------------------------------------------
    // ESTADO GLOBAL DA APLICAÇÃO
    // ---------------------------------------------------------------------------
    let lists = [];                                 // Array para armazenar as listas
    let activeListId = null;                        // ID da lista atualmente em edição
    let activeListOwnerId = null;                   // ID do proprietário da lista ativa
    let activeListCanWrite = true;                  // Permissão de escrita na lista ativa    
    let items = [];                                 // Array para armazenar os itens da lista
    let editingItemId = null;                       // ID do item atualmente em edição, ou null
    let actionToConfirm = null;                     // Função a ser executada após confirmação no modal
    let activeCategory = 'all';                     // Categoria atualmente selecionada para filtro
    let currentUser = null;                         // Objeto do usuário autenticado pelo Firebase
    let userProfile = { isPremium: false, theme: 'light' }; // Perfil do usuário (padrão gratuito, tema claro)
    let modoOperacao = 'localStorage';              // 'localStorage' (gratuito/convidado) ou 'firebase' (premium)
    
    // Funções para cancelar listeners do Firebase (evitar memory leaks)
    let unsubscribeItemsListener = () => {};        // Listener para atualizações da coleção 'items'
    let unsubscribePrefsListener = () => {};        // Listener para atualizações da coleção 'userProfiles'

    // Chaves para o LocalStorage (versionadas para evitar conflitos com dados antigos)
    const LOCAL_STORAGE_LISTS_KEY = 'appListsLocal_v1';
    const LOCAL_STORAGE_ITEMS_KEY = 'appItemsLocal_v3_freemium_final';
    const LOCAL_STORAGE_THEME_KEY = 'appThemeLocal_v3_freemium_final';

    // ---------------------------------------------------------------------------
    // CAMADA DE ABSTRAÇÃO DE DADOS (Data Managers)
    // Define como os dados são lidos e escritos, dependendo do modo de operação.
    // ---------------------------------------------------------------------------

    /**
     * Gerenciador de dados para LocalStorage (modo gratuito/convidado).
     */
    const lsDataManager = {
        loadItems: () => {
            const stored = localStorage.getItem(LOCAL_STORAGE_ITEMS_KEY);
            try {
                return stored ? JSON.parse(stored) : [];
            } catch (e) {
                console.error("Erro ao carregar itens do LocalStorage:", e);
                localStorage.removeItem(LOCAL_STORAGE_ITEMS_KEY); // Remove dados corrompidos
                return [];
            }
        },
        saveItems: (currentItems) => {
            try {
                localStorage.setItem(LOCAL_STORAGE_ITEMS_KEY, JSON.stringify(currentItems));
            } catch (e) {
                console.error("Erro ao salvar itens no LocalStorage (possivelmente cheio):", e);
                // Poderia notificar o usuário sobre o erro de salvamento
            }
        },
        addItem: (itemData, currentItems) => {
            const newItem = { ...itemData, id: generateId() }; // ID gerado no cliente para LS
            currentItems.push(newItem);
            lsDataManager.saveItems(currentItems);
            return newItem;
        },
        updateItem: (itemId, updatedData, currentItems) => {
            const itemIndex = currentItems.findIndex(item => item.id === itemId);
            if (itemIndex > -1) {
                currentItems[itemIndex] = { ...currentItems[itemIndex], ...updatedData };
                lsDataManager.saveItems(currentItems);
                return currentItems[itemIndex];
            }
            return null;
        },
        deleteItem: (itemId, currentItems) => {
            const newItems = currentItems.filter(item => item.id !== itemId);
            lsDataManager.saveItems(newItems);
            return newItems; // Retorna a nova lista de itens
        }
    };

    const lsListManager = {
        loadLists: () => {
            const stored = localStorage.getItem(LOCAL_STORAGE_LISTS_KEY);
            try {
                return stored ? JSON.parse(stored) : [];
            } catch (e) {
                console.error('Erro ao carregar listas do LocalStorage:', e);
                localStorage.removeItem(LOCAL_STORAGE_LISTS_KEY);
                return [];
            }
        },
        saveLists: (currentLists) => {
            try {
                localStorage.setItem(LOCAL_STORAGE_LISTS_KEY, JSON.stringify(currentLists));
            } catch (e) {
                console.error('Erro ao salvar listas no LocalStorage:', e);
            }
        }
    };

    /**
     * Gerenciador de dados para Firebase Firestore (modo premium).
     */
    const fbDataManager = {
        // Nota: loadItems com onSnapshot é gerenciado diretamente no listener de autenticação
        // para manter a reatividade. Esta função pode ser usada para uma carga inicial se necessário.
        loadItems: async (userId) => {
            try {
                const snapshot = await db.collection('items')
                                     .where('userId', '==', userId)
                                     .orderBy('createdAt', 'desc')
                                     .get();
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (error) {
                console.error("Erro ao carregar itens do Firestore (get): ", error);
                return [];
            }
        },
        addItem: async (userId, itemData) => {
            const dataWithUser = { 
                ...itemData, 
                userId: userId, 
                createdAt: firebase.firestore.FieldValue.serverTimestamp() // Adiciona timestamp do servidor
            };
            const docRef = await db.collection('items').add(dataWithUser);
            return { id: docRef.id, ...dataWithUser }; // Retorna o item com ID do Firestore
        },
        updateItem: async (itemId, updatedData) => {
            // Adiciona um timestamp de atualização se desejar
            // const dataToUpdate = { ...updatedData, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
            await db.collection('items').doc(itemId).update(updatedData);
            return { id: itemId, ...updatedData }; // Retorna dados atualizados (sem o timestamp do servidor aqui)
        },
        deleteItem: async (itemId) => {
            await db.collection('items').doc(itemId).delete();
        }
    };

    const fbListManager = {
        loadLists: async (user) => {
            try {
                const lists = [];
                const ownSnap = await db.collection('lists')
                                     .where('ownerId', '==', user.uid)
                                     .orderBy('createdAt', 'desc')
                                     .get();
                ownSnap.forEach(doc => {
                    const data = doc.data();
                    lists.push({
                        id: doc.id,
                        ...data,
                        ownerEmail: data.ownerEmail || user.email,
                        permission: 'owner',
                        canWrite: true
                    });
                });

                const sharedSnap = await db.collection('sharedLists')
                    .where('invitedEmail', '==', user.email)
                    .get();
                for (const shareDoc of sharedSnap.docs) {
                    const data = shareDoc.data();
                    const listRef = db.collection('lists').doc(data.listId);
                    const listDoc = await listRef.get();
                    if (listDoc.exists) {
                        const listData = listDoc.data();
                        if (data.permission === 'write' && (!listData.writerEmails || !listData.writerEmails.includes(data.invitedEmail))) {
                            try {
                                await listRef.update({
                                    writerEmails: firebase.firestore.FieldValue.arrayUnion(data.invitedEmail)
                                });
                                listData.writerEmails = (listData.writerEmails || []).concat([data.invitedEmail]);
                            } catch (e) {
                                console.error('Erro ao sincronizar permissao de escrita:', e);
                            }
                        }
                        lists.push({
                            id: listDoc.id,
                            ...listData,
                            ownerEmail: listData.ownerEmail || '',
                            permission: data.permission,
                            canWrite: userProfile.isPremium && data.permission === 'write'
                        });
                    }
                }
                return lists.sort((a, b) => {
                    const da = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate() : a.createdAt;
                    const dbt = b.createdAt && b.createdAt.toDate ? b.createdAt.toDate() : b.createdAt;
                    return dbt - da;
                });
            } catch (e) {
                console.error('Erro ao carregar listas do Firestore:', e);
                return [];
            }
        },
        addList: async (userId, name, ownerEmail) => {
            const data = {
                ownerId: userId,
                ownerEmail,
                name,
                writerEmails: [],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            const docRef = await db.collection('lists').add(data);
            return { id: docRef.id, ownerId: userId, ownerEmail, name, createdAt: new Date(), updatedAt: new Date() };
        },
        updateList: async (listId, data) => {
            await db.collection('lists').doc(listId).update({
                ...data,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        },
        deleteList: async (listId) => {
            const itemsSnap = await db.collection('items').where('listId', '==', listId).get();
            const batch = db.batch();
            itemsSnap.forEach(doc => batch.delete(doc.ref));
            await batch.commit();

            const sharesSnap = await db.collection('sharedLists')
                .where('listId', '==', listId)
                .where('ownerId', '==', currentUser.uid)
                .get();
            const batch2 = db.batch();
            sharesSnap.forEach(doc => batch2.delete(doc.ref));
            await batch2.commit();

            await db.collection('lists').doc(listId).delete();
        }
    };

    let activeDataManager = lsDataManager; // Padrão inicial para modo LocalStorage
    let activeListManager = lsListManager;

    // ---------------------------------------------------------------------------
    // FUNÇÕES UTILITÁRIAS
    // ---------------------------------------------------------------------------

    /**
     * Gera um ID único simples para itens no LocalStorage.
     * @returns {string} ID único.
     */
    function generateId() {
        if (window.crypto && window.crypto.randomUUID) {
            return window.crypto.randomUUID();
        }
        return '_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    }

    /**
     * Cria e renderiza as estrelas de ranking em um container.
     * @param {HTMLElement} container - O elemento DOM onde as estrelas serão inseridas.
     * @param {number} currentRating - O valor atual do ranking (0 a 5, com incrementos de 0.5).
     * @param {boolean} isEditable - Define se as estrelas são interativas para definir um ranking.
     * @param {HTMLInputElement|null} associatedHiddenInput - O input hidden para armazenar o valor do ranking (se editável).
     * @param {HTMLElement|null} associatedDisplay - O elemento para exibir o valor numérico do ranking (se editável).
     */
    function createStars(container, currentRating, isEditable = true, associatedHiddenInput = null, associatedDisplay = null) {
        if (!container) {
            // console.warn("Container para estrelas não fornecido ou não encontrado no DOM.");
            return;
        }
        container.innerHTML = ''; 
        const maxStars = 5;

        const updateVisualAllStars = (ratingToDisplay) => {
            const starElements = container.querySelectorAll('.star');
            starElements.forEach((star, index) => {
                const starNum = index + 1; 
                star.className = 'star'; // Reseta classes
                if (ratingToDisplay >= starNum) {
                    star.classList.add('fas', 'fa-star', 'filled');
                } else if (ratingToDisplay >= starNum - 0.5) {
                    star.classList.add('fas', 'fa-star-half-alt', 'filled');
                } else {
                    star.classList.add('far', 'fa-star');
                }
            });
        };

        for (let s = 1; s <= maxStars; s++) {
            const starIcon = document.createElement('i');
            starIcon.dataset.starValue = s.toString(); 

            // Define classe inicial baseada no currentRating
            if (currentRating >= s) { starIcon.className = 'star fas fa-star filled'; }
            else if (currentRating >= s - 0.5) { starIcon.className = 'star fas fa-star-half-alt filled'; }
            else { starIcon.className = 'star far fa-star'; }

            if (isEditable) {
                starIcon.style.cursor = 'pointer';
                starIcon.addEventListener('mousemove', (e) => { 
                    const starElement = e.currentTarget; // Usar currentTarget para garantir que é o ícone
                    const starNum = parseFloat(starElement.dataset.starValue);
                    const rect = starElement.getBoundingClientRect();
                    const hoverIsHalf = e.clientX - rect.left < rect.width / 2;
                    const hoverRating = hoverIsHalf ? starNum - 0.5 : starNum;
                    updateVisualAllStars(hoverRating);
                });
                starIcon.addEventListener('mouseleave', () => { 
                    const actualRating = associatedHiddenInput ? (parseFloat(associatedHiddenInput.value) || 0) : currentRating;
                    updateVisualAllStars(actualRating);
                });
                starIcon.addEventListener('click', (e) => { 
                    const starElement = e.currentTarget;
                    const starNum = parseFloat(starElement.dataset.starValue);
                    const rect = starElement.getBoundingClientRect();
                    const clickIsHalf = e.clientX - rect.left < rect.width / 2;
                    const newRating = clickIsHalf ? starNum - 0.5 : starNum;
                    if (associatedHiddenInput) associatedHiddenInput.value = newRating.toFixed(1);
                    if (associatedDisplay) associatedDisplay.textContent = newRating.toFixed(1);
                    updateVisualAllStars(newRating); // Atualiza visual permanentemente após clique
                });
            }
            container.appendChild(starIcon);
        }
    }

    // ---------------------------------------------------------------------------
    // GERENCIAMENTO DE TEMA (CLARO/ESCURO)
    // ---------------------------------------------------------------------------

    /**
     * Aplica o tema (claro ou escuro) ao body e atualiza o ícone do botão.
     * Salva a preferência de tema no Firestore (se premium) ou LocalStorage (se gratuito/convidado).
     * @param {string} theme - O tema a ser aplicado ('light' ou 'dark').
     */
    function applyTheme(theme) {
        document.body.classList.remove('dark-mode', 'light-mode');
        const themeToApply = (theme === 'dark' || theme === 'light') ? theme : 'light'; // Garante valor válido
        document.body.classList.add(themeToApply === 'dark' ? 'dark-mode' : 'light-mode');
        
        themeToggleIcons.forEach(icon => {
            if (icon) icon.className = themeToApply === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        });

        // Salva a preferência de tema
        if (modoOperacao === 'firebase' && currentUser && userProfile) {
            // Apenas atualiza se o tema realmente mudou para evitar escritas desnecessárias e loops com onSnapshot
            if (userProfile.theme !== themeToApply) {
                db.collection('userProfiles').doc(currentUser.uid).set({ theme: themeToApply }, { merge: true })
                    .catch(error => console.warn("Preferência de tema não salva no Firestore:", error.message));
            }
        } else { // LocalStorage para usuários não premium ou deslogados/convidado
            localStorage.setItem(LOCAL_STORAGE_THEME_KEY, themeToApply);
        }
    }

    // Listener para o botão de alternar tema
    if (themeToggleButtons.length > 0) {
        themeToggleButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const isDarkMode = document.body.classList.contains('dark-mode');
                applyTheme(isDarkMode ? 'light' : 'dark');
            });
        });
    }

    // ---------------------------------------------------------------------------
    // GERENCIAMENTO DA INTERFACE DO USUÁRIO (UI)
    // ---------------------------------------------------------------------------

    /**
     * Controla a visibilidade das seções principais da UI (autenticação vs. conteúdo do app).
     * @param {boolean} showAppContent - True para mostrar o conteúdo do app, false para mostrar a autenticação.
     */
    function updateUIVisibility(showAppContent) {
        if(authSection) authSection.style.display = showAppContent ? 'none' : 'flex'; // 'flex' para centralizar
        if(appContent) appContent.style.display = showAppContent ? 'block' : 'none';
    }

    /**
     * Atualiza elementos da UI específicos do usuário (email, botões de logout/upgrade, indicador de modo).
     */
    function updateUserSpecificUI() {
        const isGuest = !currentUser && modoOperacao === 'localStorage';
        const isLoggedInButFree = currentUser && !userProfile.isPremium; // modoOperacao será 'localStorage' neste caso

        if(userEmailDisplay) userEmailDisplay.textContent = currentUser ? currentUser.email : (isGuest ? 'Convidado' : '');
        if(logoutButton) logoutButton.style.display = (currentUser || isGuest) ? 'inline-block' : 'none';
        if(logoutButtonLists) logoutButtonLists.style.display = (currentUser || isGuest) ? 'inline-block' : 'none';
        if(guestModeOption) guestModeOption.style.display = currentUser ? 'none' : 'block'; // Mostra se não há usuário logado
        
        if(upgradeButtons && upgradeButtons.length) {
            const showUpgradeButton = isGuest || isLoggedInButFree;
            upgradeButtons.forEach(btn => {
                btn.style.display = showUpgradeButton ? 'inline-block' : 'none';
                if(showUpgradeButton) {
                    btn.onclick = () => { window.location.href = 'planos.html'; };
                }
            });
        }

        if(listsTable) {
            listsTable.classList.toggle('hide-guest', isGuest);
        }

        if(createListButton) createListButton.style.display = 'inline-block';
        if(backToListsButton) backToListsButton.style.display = 'none';

        if(modeIndicator) {
            modeIndicator.classList.remove('premium-indicator');
            if (currentUser && userProfile.isPremium) {
                modeIndicator.textContent = 'Premium Cloud';
                modeIndicator.classList.add('premium-indicator');
            } else if (currentUser && !userProfile.isPremium) {
                modeIndicator.textContent = 'Gratuito (Online)';
            } else if (isGuest) {
                modeIndicator.textContent = 'Convidado Local';
            } else {
                modeIndicator.textContent = '';
            }
        }
    }
    
    // ---------------------------------------------------------------------------
    // LÓGICA DE AUTENTICAÇÃO E ESTADO DO USUÁRIO
    // ---------------------------------------------------------------------------

    /**
     * Observador do estado de autenticação do Firebase.
     * Gerencia a UI e os dados com base no status de login do usuário.
     */
    let profileInitialized = false;
    auth.onAuthStateChanged(async user => {
        unsubscribePrefsListener(); // Cancela listener de preferências anterior
        unsubscribeItemsListener(); // Cancela listener de itens anterior

        if (user) { // Usuário está logado
            currentUser = user;
            
            // Listener para o perfil do usuário (isPremium, theme)
            unsubscribePrefsListener = db.collection('userProfiles').doc(user.uid)
                .onSnapshot(async (doc) => {
                    const prevProfile = userProfile;
                    if (doc.exists) {
                        userProfile = doc.data();
                    } else {
                        // Perfil não existe, cria um perfil padrão gratuito
                        userProfile = { isPremium: false, theme: 'light' };
                        try {
                            await db.collection('userProfiles').doc(user.uid).set(userProfile);
                        } catch (e) {
                            console.error("Erro ao criar perfil default no Firestore:", e);
                        }
                    }

                    const modeChanged = !prevProfile || prevProfile.isPremium !== userProfile.isPremium;

                    modoOperacao = userProfile.isPremium ? 'firebase' : 'localStorage';
                    activeDataManager = userProfile.isPremium ? fbDataManager : lsDataManager;
                    applyTheme(userProfile.theme || 'light');
                    if (!profileInitialized || modeChanged) {
                        updateUIVisibility(true);
                        updateUserSpecificUI();
                        await loadAndRenderLists(true);
                        await loadAndRenderData();
                        profileInitialized = true;
                    } else {
                        // Apenas atualiza o tema sem mudar de visão
                        await loadAndRenderLists(false);
                    }
                },
                async (error) => { // Callback de erro para o listener do perfil
                    console.error("Erro no listener do perfil do usuário:", error);
                    // Fallback em caso de erro ao ler o perfil
                    userProfile = { isPremium: false, theme: 'light' };
                    modoOperacao = 'localStorage'; 
                    activeDataManager = lsDataManager;
                    applyTheme(localStorage.getItem(LOCAL_STORAGE_THEME_KEY) || 'light');
                    updateUIVisibility(true); 
                    updateUserSpecificUI();
                    await loadAndRenderLists();
                    await loadAndRenderData();
                });
        } else { // Usuário está deslogado
            currentUser = null; 
            userProfile = { isPremium: false, theme: 'light' }; // Reseta perfil para padrão
            modoOperacao = 'localStorage'; 
            activeDataManager = lsDataManager;
            
            applyTheme(localStorage.getItem(LOCAL_STORAGE_THEME_KEY) || 'light'); // Aplica tema local ou padrão
            updateUIVisibility(false); // Mostra a seção de autenticação
            updateUserSpecificUI();    // Atualiza UI para estado deslogado
            
            items = [];
            lists = [];
            renderLists();
            renderAppUI();
        }
    });
    
    // Listener para o botão "Continuar sem login" (Modo Convidado)
    if (continueGuestButton) {
        continueGuestButton.addEventListener('click', async () => {
            currentUser = null; 
            userProfile = { isPremium: false, theme: 'light' }; 
            modoOperacao = 'localStorage';
            activeDataManager = lsDataManager;
            
            applyTheme(localStorage.getItem(LOCAL_STORAGE_THEME_KEY) || 'light');
            updateUIVisibility(true); // Mostra o conteúdo do app
            updateUserSpecificUI();   // Atualiza UI para modo convidado
            
            document.body.dataset.appInitialized = "true"; // Marca que o app foi "iniciado" neste modo
            await loadAndRenderLists();
            await loadAndRenderData(); // Carrega dados do localStorage
        });
    }

    // Listeners para alternar entre formulários de Login e Signup
    if (showSignupLink && loginContainer && signupContainer) { 
        showSignupLink.addEventListener('click', (e) => { 
            e.preventDefault(); 
            loginContainer.style.display = 'none'; 
            signupContainer.style.display = 'block'; 
            if(loginError) loginError.textContent = ''; 
            if(signupError) signupError.textContent = ''; 
        });
    }
    if (showLoginLink && loginContainer && signupContainer) { 
        showLoginLink.addEventListener('click', (e) => { 
            e.preventDefault(); 
            signupContainer.style.display = 'none'; 
            loginContainer.style.display = 'block'; 
            if(loginError) loginError.textContent = ''; 
            if(signupError) signupError.textContent = ''; 
        });
    }
    
    // Listeners para submissão dos formulários de Autenticação
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => { 
            e.preventDefault(); 
            const email = signupForm['signup-email'].value; 
            const password = signupForm['signup-password'].value; 
            if(signupError) signupError.textContent = ''; 
            auth.createUserWithEmailAndPassword(email, password)
                .catch(error => { if(signupError) signupError.textContent = error.message; });
            // onAuthStateChanged cuidará da criação do perfil e atualização da UI
        });
    }
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => { 
            e.preventDefault(); 
            const email = loginForm['login-email'].value; 
            const password = loginForm['login-password'].value; 
            if(loginError) loginError.textContent = ''; 
            auth.signInWithEmailAndPassword(email, password)
                .catch(error => { if(loginError) loginError.textContent = error.message; });
            // onAuthStateChanged cuidará da atualização da UI
        });
    }
    function handleLogout() {
        const isGuest = !currentUser && modoOperacao === 'localStorage';
        if (isGuest) {
            window.location.href = '/app.html';
        } else {
            auth.signOut().catch(error => console.error("Erro no logout:", error.message));
        }
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
    if (logoutButtonLists) {
        logoutButtonLists.addEventListener('click', handleLogout);
    }
    // Listener para o botão de Upgrade (apenas redireciona)
    if (upgradeButtons && upgradeButtons.length) {
        upgradeButtons.forEach(btn => {
            btn.onclick = () => { window.location.href = 'planos.html'; };
        });
    }

    // ---------------------------------------------------------------------------
    // FUNÇÕES DE CARREGAMENTO E RENDERIZAÇÃO DE DADOS E UI PRINCIPAL
    // ---------------------------------------------------------------------------

    /**
     * Carrega os itens (do Firebase ou LocalStorage) e chama a renderização da UI.
     */
    async function loadAndRenderLists(showListsView = true) {
        if (modoOperacao === 'firebase' && currentUser) {
            lists = await fbListManager.loadLists(currentUser);
        } else {
            lists = lsListManager.loadLists();
        }
        if (lists.length > 0 && !activeListId) {
            activeListId = lists[0].id;
            activeListOwnerId = lists[0].ownerId || (currentUser ? currentUser.uid : null);
            activeListCanWrite = lists[0].canWrite !== undefined ? lists[0].canWrite : true;
        }
        renderLists();

        if (showListsView) {
            if (listsSection) listsSection.style.display = 'block';
            if (itemsSection) itemsSection.style.display = 'none';
            if (backToListsButton) backToListsButton.style.display = 'none';
        }
    }

    async function loadAndRenderData() {
        unsubscribeItemsListener(); // Limpa listener de itens anterior sempre
        unsubscribeItemsListener = () => {}; // Garante que sempre temos uma função válida

        if (modoOperacao === 'firebase' && currentUser) {
            // Garante que os IDs necessários estejam presentes antes de criar o listener
            if (!activeListOwnerId || !activeListId) {
                items = [];
                renderAppUI();
                return;
            }

            try {
                // Configura o listener em tempo real para itens do Firebase
                // Deve filtrar pelo dono da lista e pelo ID da lista atual
                unsubscribeItemsListener = db.collection('items')
                    .where('userId', '==', activeListOwnerId)
                    .where('listId', '==', activeListId)
                    .orderBy('createdAt', 'desc')
                    .onSnapshot(snapshot => {
                        items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        renderAppUI(); // Re-renderiza a UI com os novos dados
                    }, error => {
                        console.error("Erro no listener de itens do Firebase:", error);
                        items = []; // Limpa itens em caso de erro
                        renderAppUI();
                    });
            } catch (err) {
                console.error("Erro ao configurar listener de itens:", err);
                items = [];
                renderAppUI();
            }
        } else { // Modo LocalStorage (ou deslogado, mas o app não deveria estar visível)
            items = activeDataManager.loadItems().filter(it => it.listId === activeListId);
            renderAppUI();
        }
    }

    /**
     * Função central para re-renderizar as partes da UI que dependem da lista de 'items'.
     */
    function renderAppUI() { 
        // Verifica se os elementos existem no DOM antes de tentar usá-los
        // Isso é útil se este script for incluído em páginas que não têm todos esses elementos
        if (document.body.contains(categoryTabsContainer) && document.body.contains(itemsTableBody)) {
            renderCategoryTabs();
            renderItems();
            updateAutocompleteLists();
            updateCategoryControls();
        }
        
        // Garante que as estrelas no formulário de adição sejam recriadas/resetadas
        if(formStarRatingContainer && hiddenRatingInput && currentRatingDisplay) {
            createStars(formStarRatingContainer, parseFloat(hiddenRatingInput.value) || 0, true, hiddenRatingInput, currentRatingDisplay);
        }
    }
    
    // ---------------------------------------------------------------------------
    // LÓGICA DE CRUD (Create, Read, Update, Delete) PARA ITENS
    // ---------------------------------------------------------------------------

    // Listener para submissão do formulário de adicionar item
    if (itemForm) {
        itemForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newItemData = {
                category: categoryInput.value.trim(),
                brand: brandInput.value.trim(),
                name: itemNameInput.value.trim(),
                notes: itemNotesInput.value.trim(),
                rating: parseFloat(hiddenRatingInput.value) || 0,
                createdAt: new Date(),
                listId: activeListId
            };

            if (!newItemData.name || !newItemData.category || !newItemData.brand) {
                showInfoModal('Por favor, preencha Categoria, Marca/Modelo e Nome do Produto.');
                return;
            }
            
            try {
                if (modoOperacao === 'firebase' && currentUser) {
                    const dataForFirebase = {
                    ...newItemData,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp() // O timestamp do servidor prevalecerá
                    };
                    if (activeListCanWrite) {
                        await activeDataManager.addItem(activeListOwnerId, dataForFirebase);
                    } else {
                        showInfoModal('Acesso somente leitura.');
                        return;
                    }
                    // O listener onSnapshot do Firebase atualizará a UI automaticamente
                } else { // Modo LocalStorage
                activeDataManager.addItem(newItemData, items); // 'items' modificado por referência
                renderAppUI(); // Re-renderiza manualmente para LocalStorage
                }
                // Limpa o formulário e reseta as estrelas
                itemForm.reset(); 
                hiddenRatingInput.value = '0'; 
                if(currentRatingDisplay) currentRatingDisplay.textContent = '0.0';
                if(formStarRatingContainer) createStars(formStarRatingContainer, 0, true, hiddenRatingInput, currentRatingDisplay);
                if(categoryInput) categoryInput.focus();
                showToast('Item adicionado com sucesso!');
            } catch (error) {
                console.error("Erro ao adicionar item:", error);
                const msg = /insufficient permissions/i.test(error.message)
                    ? 'Permissões insuficientes para adicionar item.'
                    : 'Erro ao adicionar item. Tente novamente.';
                showInfoModal(msg, false, true);
            }
        });
    }
    
    /**
     * Salva as alterações de um item editado.
     * @param {string} itemId - O ID do item a ser atualizado.
     */
    async function saveEditedItem(itemId) {
        const row = document.querySelector(`#items-table tbody tr[data-id="${itemId}"]`);
        if (!row) return;

        const updatedData = {
            category: row.querySelector('input[data-field="category"]').value.trim(),
            brand: row.querySelector('input[data-field="brand"]').value.trim(),
            name: row.querySelector('input[data-field="name"]').value.trim(),
            notes: row.querySelector('textarea[data-field="notes"]').value.trim(),
            rating: parseFloat(row.querySelector('input[type="hidden"][data-field="rating"]').value) || 0,
        };
        if (!updatedData.name || !updatedData.brand || !updatedData.category) {
            showInfoModal('Categoria, Marca/Modelo e Nome do Produto não podem ficar vazios.');
            return;
        }

        try {
            if (modoOperacao === 'firebase' && currentUser) {
                if (!activeListCanWrite) { showInfoModal('Acesso somente leitura.'); return; }
                await activeDataManager.updateItem(itemId, updatedData); // onSnapshot do Firebase cuida da UI
                editingItemId = null;
                renderItems();
            } else { // Modo LocalStorage
                editingItemId = null;
                activeDataManager.updateItem(itemId, updatedData, items);
                renderAppUI();
            }
            showToast('Alterações salvas com sucesso!');
            // renderItems(); // Não é estritamente necessário se renderAppUI é chamado ou onSnapshot está ativo
        } catch (error) {
            console.error("Erro ao atualizar item:", error);
            showInfoModal("Erro ao atualizar item.");
            // renderItems(); // Não é estritamente necessário se renderAppUI é chamado ou onSnapshot está ativo
        }
    }
    
    /**
     * Exclui um item da lista.
     * @param {string} itemId - O ID do item a ser excluído.
     */
    async function deleteItemAction(itemId) {
        const itemToDelete = items.find(item => item.id === itemId);
        if (!itemToDelete) return;

        try {
            if (modoOperacao === 'firebase' && currentUser) {
                if (!activeListCanWrite) { showInfoModal('Acesso somente leitura.'); return; }
                await activeDataManager.deleteItem(itemId); // onSnapshot do Firebase cuida da UI
                // A lógica de atualizar activeCategory se a categoria for removida pode ser feita no callback do onSnapshot
            } else { // Modo LocalStorage
                items = activeDataManager.deleteItem(itemId, items); // Atualiza 'items'
                // Lógica para atualizar activeCategory se a categoria foi removida
                const remainingCategories = [...new Set(items.map(it => it.category))];
                if (activeCategory === itemToDelete.category && !remainingCategories.includes(itemToDelete.category)) {
                    activeCategory = 'all';
                }
                renderAppUI(); // Re-renderiza para LocalStorage
            }
            showToast('Item excluído com sucesso!', true);
        } catch (error) {
            console.error("Erro ao excluir item:", error);
            const msg = /insufficient permissions/i.test(error.message)
                ? 'Permissões insuficientes para excluir o item.'
                : 'Erro ao excluir item.';
            showInfoModal(msg, false, true);
        }
    }

    async function deleteAllItemsOfCategory(category) {
        if (modoOperacao === 'firebase' && currentUser) {
            if (!activeListCanWrite) { showInfoModal('Acesso somente leitura.'); return; }
            const snapshot = await db.collection('items')
                .where('userId', '==', activeListOwnerId)
                .where('listId', '==', activeListId)
                .where('category', '==', category)
                .get();
            const batch = db.batch();
            snapshot.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        } else {
            items = items.filter(it => !(it.category === category && it.listId === activeListId));
            lsDataManager.saveItems(items);
            renderAppUI();
        }
        const remainingCategories = [...new Set(items.map(it => it.category))];
        if (!remainingCategories.includes(category)) activeCategory = 'all';
        showToast('Categoria excluída com sucesso!', true);
    }

    async function shareListWithEmail(email, permission) {
        if (!currentUser || !userProfile || !userProfile.isPremium) return;
        try {
            const docId = `${activeListId}_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
            await db.collection('sharedLists').doc(docId).set({ ownerId: currentUser.uid, listId: activeListId, invitedEmail: email, permission });
            const updateData = {
                sharedEmails: firebase.firestore.FieldValue.arrayUnion(email)
            };
            if (permission === 'write') {
                updateData.writerEmails = firebase.firestore.FieldValue.arrayUnion(email);
            }
            await db.collection('lists').doc(activeListId).update(updateData);
            await loadAndRenderLists(false);
            showInfoModal('Lista compartilhada com sucesso!', true);
        } catch (e) {
            console.error('Erro ao compartilhar lista:', e);
            showInfoModal('Erro ao compartilhar lista.');
        }
    }

    async function loadSharedUsers() {
        if (!sharedUsersList) return;
        sharedUsersList.innerHTML = '';
        if (!currentUser || !userProfile.isPremium) return;
        const snap = await db.collection('sharedLists')
            .where('ownerId', '==', currentUser.uid)
            .where('listId', '==', activeListId)
            .get();
        snap.forEach(doc => {
            const li = document.createElement('li');
            const data = doc.data();
            li.textContent = `${data.invitedEmail} - ${data.permission}`;
            const btn = document.createElement('button');
            btn.innerHTML = '<i class="fas fa-times-circle"></i>';
            btn.addEventListener('click', () => unshareUser(doc.id, data.invitedEmail));
            li.appendChild(btn);
            sharedUsersList.appendChild(li);
        });
    }

    async function unshareUser(id, email) {
        await db.collection('sharedLists').doc(id).delete();
        await db.collection('lists').doc(activeListId).update({
            sharedEmails: firebase.firestore.FieldValue.arrayRemove(email),
            writerEmails: firebase.firestore.FieldValue.arrayRemove(email)
        });
        loadSharedUsers();
        await loadAndRenderLists(false);
        showToast('Usuário removido do compartilhamento');
    }

    // Funções para iniciar e cancelar a edição inline de um item
    function startEditItem(itemId) {
        if (!activeListCanWrite) { showInfoModal('Acesso somente leitura.'); return; }
        editingItemId = itemId;
        renderItems();
    }
    function cancelEdit() { editingItemId = null; renderItems(); }

    // ---------------------------------------------------------------------------
    // FUNÇÕES DE RENDERIZAÇÃO DA UI (TABELA, ABAS, AUTOCOMPLETE)
    // ---------------------------------------------------------------------------
    
    /**
     * Atualiza as listas de datalist para autocomplete de categoria e marca/modelo.
     */
function updateAutocompleteLists() {
    if (!categoryList || !brandList) return;
    
    // Limpa as listas para evitar duplicatas
    categoryList.innerHTML = '';
    brandList.innerHTML = '';

    const categories = [...new Set(items.map(item => item.category.trim()).filter(Boolean))].sort();
    const brands = [...new Set(items.map(item => item.brand.trim()).filter(Boolean))].sort();
    
    // Adiciona opções de categoria de forma segura
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        categoryList.appendChild(option);
    });

    // Adiciona opções de marca de forma segura
    brands.forEach(br => {
        const option = document.createElement('option');
        option.value = br;
        brandList.appendChild(option);
    });
}

    function updateCategoryControls() {
        if (deleteCategoryButton) {
            if (!activeListCanWrite || activeCategory === 'all') {
                deleteCategoryButton.style.display = 'none';
            } else {
                const hasItems = items.some(it => it.category === activeCategory);
                deleteCategoryButton.style.display = hasItems ? 'inline-block' : 'none';
            }
        }
        if (shareListButton) {
            const canShare = currentUser && userProfile.isPremium && activeListOwnerId === currentUser.uid;
            shareListButton.style.display = canShare ? 'inline-block' : 'none';
        }
    }

    /**
     * Renderiza as abas de filtro por categoria.
     */
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
                activeCategory = category; 
                renderAppUI(); // Re-renderiza tudo ao mudar de aba
            });
            categoryTabsContainer.appendChild(tabButton);
        });
    }

    /**
     * Renderiza os itens na tabela, filtrados pela categoria ativa.
     */
    function renderItems() {
        if (!itemsTableBody) return;
        itemsTableBody.innerHTML = '';
        const itemsToRender = activeCategory === 'all' ? items : items.filter(item => item.category === activeCategory);
        
        if (itemsToRender.length === 0) {
            itemsTableBody.innerHTML = `<tr><td colspan="6" class="empty-message">Nenhum item para exibir nesta categoria.</td></tr>`;
            return;
        }
        itemsToRender.forEach(item => {
            const row = itemsTableBody.insertRow();
            row.dataset.id = item.id;
            if (editingItemId === item.id) {
                // Modo de Edição
                const categoryCell = row.insertCell();
                const categoryInputEdit = document.createElement('input');
                categoryInputEdit.type = 'text';
                categoryInputEdit.className = 'editable-input';
                categoryInputEdit.value = item.category || '';
                categoryInputEdit.dataset.field = 'category';
                categoryInputEdit.setAttribute('list', 'category-list');
                categoryCell.appendChild(categoryInputEdit);

                const brandCell = row.insertCell();
                const brandInput = document.createElement('input');
                brandInput.type = 'text';
                brandInput.className = 'editable-input';
                brandInput.value = item.brand || ''; // Use .value
                brandInput.dataset.field = 'brand';
                brandInput.setAttribute('list', 'brand-list');
                brandCell.appendChild(brandInput);

                const nameCell = row.insertCell();
                const nameInput = document.createElement('input');
                nameInput.type = 'text';
                nameInput.className = 'editable-input';
                nameInput.value = item.name || ''; // Use .value
                nameInput.dataset.field = 'name';
                nameCell.appendChild(nameInput);
                
                const notesCell = row.insertCell();
                const notesTextarea = document.createElement('textarea');
                notesTextarea.className = 'editable-textarea';
                notesTextarea.value = item.notes || ''; // Use .value
                notesTextarea.dataset.field = 'notes';
                notesCell.appendChild(notesTextarea);

                const ratingEditCell = row.insertCell(); 
                const editStarContainer = document.createElement('div');
                editStarContainer.classList.add('star-rating-input', 'inline-edit-stars');
                const hiddenEditRatingInput = document.createElement('input'); 
                hiddenEditRatingInput.type = 'hidden'; 
                hiddenEditRatingInput.value = item.rating || 0; 
                hiddenEditRatingInput.dataset.field = 'rating';
                ratingEditCell.appendChild(editStarContainer); 
                ratingEditCell.appendChild(hiddenEditRatingInput);
                createStars(editStarContainer, parseFloat(item.rating || 0), true, hiddenEditRatingInput, null);
                
                const actionsCell = row.insertCell();
                actionsCell.innerHTML = `<button class="save-btn" title="Salvar"><i class="fas fa-save"></i></button> <button class="cancel-btn" title="Cancelar"><i class="fas fa-times"></i></button>`;
                actionsCell.querySelector('.save-btn').addEventListener('click', () => saveEditedItem(item.id));
                actionsCell.querySelector('.cancel-btn').addEventListener('click', () => cancelEdit());
            } else {
                // Modo de Visualização
                row.insertCell().textContent = item.category || '-';
                row.insertCell().textContent = item.brand || '-';
                row.insertCell().textContent = item.name || '-';
                const notesCell = row.insertCell();
                notesCell.textContent = item.notes || '-'; // <-- CORRIGIDO: usa textContent
                notesCell.style.whiteSpace = 'pre-wrap';   // <-- CORRIGIDO: CSS para quebrar linha
                const ratingCell = row.insertCell(); 
                const displayStarsContainer = document.createElement('div');
                displayStarsContainer.classList.add('star-rating-display');
                createStars(displayStarsContainer, parseFloat(item.rating || 0), false);
                ratingCell.appendChild(displayStarsContainer);
                const actionsCell = row.insertCell();
                if (activeListCanWrite) {
                    actionsCell.innerHTML = `<button class="edit-btn" title="Editar"><i class="fas fa-edit"></i></button> <button class="delete-btn" title="Excluir"><i class="fas fa-trash-alt"></i></button>`;
                    actionsCell.querySelector('.edit-btn').addEventListener('click', () => startEditItem(item.id));
                    actionsCell.querySelector('.delete-btn').addEventListener('click', () => {
                        showConfirmationModal(`Tem certeza que deseja excluir o item \"${item.name || 'sem nome'}\"?`, () => deleteItemAction(item.id));
                    });
                } else {
                    actionsCell.textContent = '-';
                }                
            }
        });
        updateCategoryControls();
    }

    function renderLists() {
        if (!listsTableBody) return;
        listsTableBody.innerHTML = '';
        if (lists.length === 0) {
            listsTableBody.innerHTML = '<tr><td colspan="6" class="empty-message">Nenhuma lista encontrada.</td></tr>';
            return;
        }
        lists.forEach(list => {
            const row = listsTableBody.insertRow();
            row.dataset.id = list.id;
            row.insertCell().textContent = list.name || '';
            row.insertCell().textContent = formatDate(list.createdAt);
            row.insertCell().textContent = formatDate(list.updatedAt);
            row.insertCell().textContent = (currentUser && list.ownerId === currentUser.uid) ? 'Você' : (list.ownerEmail || '');
            const sharedCell = row.insertCell();
            if (Array.isArray(list.sharedEmails) && list.sharedEmails.length) {
                sharedCell.textContent = list.sharedEmails.join(', ');
            } else {
                sharedCell.textContent = '-';
            }
            const actionsCell = row.insertCell();
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-btn';
            editBtn.innerHTML = '<i class="fas fa-edit"></i> Editar';
            editBtn.addEventListener('click', () => openList(list.id));
            actionsCell.appendChild(editBtn);

            if (currentUser && userProfile.isPremium && list.ownerId === currentUser.uid) {
                const shareBtn = document.createElement('button');
                shareBtn.className = 'share-btn';
                shareBtn.innerHTML = '<i class="fas fa-share-alt"></i>';
                shareBtn.addEventListener('click', () => {
                    if (!currentUser || !userProfile.isPremium) {
                        showInfoModal('Função disponível apenas para usuários premium.');
                        return;
                    }
                    if (shareEmailInput && shareRecordingCheckbox) {
                        shareEmailInput.value = '';
                        shareRecordingCheckbox.checked = false;
                    }
                    activeListId = list.id;
                    loadSharedUsers();
                    shareModal.classList.add('show');
                });
                actionsCell.appendChild(shareBtn);
            }

            if (modoOperacao !== 'firebase' || (currentUser && list.ownerId === currentUser.uid)) {
                const delBtn = document.createElement('button');
                delBtn.className = 'delete-btn';
                delBtn.innerHTML = '<i class="fas fa-trash"></i>';
                delBtn.addEventListener('click', () => confirmDeleteList(list.id));
                actionsCell.appendChild(delBtn);
            }
        });
    }

    function openList(id) {
        const l = lists.find(li => li.id === id);
        activeListId = id;
        activeListOwnerId = l ? (l.ownerId || (currentUser ? currentUser.uid : null)) : null;
        activeListCanWrite = l ? (l.canWrite !== undefined ? l.canWrite : true) : true;
        if (listNameDisplay && l) {
            listNameDisplay.textContent = l.name;
        }
        if (itemForm) itemForm.style.display = activeListCanWrite ? 'block' : 'none';
        updateCategoryControls();        
        if (listsSection) listsSection.style.display = 'none';
        if (itemsSection) itemsSection.style.display = 'block';
        if (backToListsButton) backToListsButton.style.display = 'inline-block';
        loadAndRenderData();
    }

    function backToListsView() {
        if (itemsSection) itemsSection.style.display = 'none';
        if (listsSection) listsSection.style.display = 'block';
        if (backToListsButton) backToListsButton.style.display = 'none';
    }

    function confirmDeleteList(id) {
        const l = lists.find(li => li.id === id);
        showConfirmationModal(`Excluir a lista "${l ? l.name : ''}" e todos os itens?`, async () => {
            try {
                if (modoOperacao === 'firebase' && currentUser) {
                    await fbListManager.deleteList(id);
                } else {
                    items = items.filter(it => it.listId !== id);
                    lsDataManager.saveItems(items);
                }

                // Remove a lista do array local em ambos os modos
                lists = lists.filter(li => li.id !== id);
                if (modoOperacao !== 'firebase') lsListManager.saveLists(lists);

                if (activeListId === id) {
                    activeListId = lists.length ? lists[0].id : null;
                }
                renderLists();
                showToast('Lista excluída com sucesso!', true);
            } catch (error) {
                console.error('Erro ao excluir lista:', error);
                showInfoModal('Erro ao excluir lista.');
            }
        });
    }

    function formatDate(ts) {
        if (!ts) return '';
        const d = ts.toDate ? ts.toDate() : (ts instanceof Date ? ts : new Date(ts));
        return d.toLocaleDateString();
    }

    // ---------------------------------------------------------------------------
    // MODAL DE CONFIRMAÇÃO
    // ---------------------------------------------------------------------------
    function showConfirmationModal(message, onConfirm, isPositiveAction = false) {
        if (!confirmationModal || !modalMessage || !modalConfirmBtn) {
            console.warn("Modal de confirmação não encontrado, usando confirm() nativo.");
            if (confirm(message)) { if (typeof onConfirm === 'function') onConfirm(); } 
            return;
        }
        modalMessage.textContent = message;
        if(modalIcon) {
            modalIcon.className = 'modal-icon ' + (isPositiveAction ? 'fas fa-check-circle' : 'fas fa-exclamation-circle');
        }
        actionToConfirm = onConfirm;
        modalConfirmBtn.classList.toggle('positive-action', isPositiveAction);
        confirmationModal.classList.add('show'); // Adiciona classe para mostrar com transição
    }

    let infoModalCleanup = null;

    function cleanupModal() {
        modalConfirmBtn.classList.remove('positive-action');
        confirmationModal.classList.remove('modal-danger');
        if (typeof infoModalCleanup === 'function') {
            infoModalCleanup();
            infoModalCleanup = null;
        }
    }

    if (modalConfirmBtn) {
        modalConfirmBtn.addEventListener('click', () => {
            if (typeof actionToConfirm === 'function') actionToConfirm();
            if (confirmationModal) confirmationModal.classList.remove('show');
            cleanupModal();
            actionToConfirm = null;
        });
    }
    if (modalCancelBtn) {
        modalCancelBtn.addEventListener('click', () => {
            if (confirmationModal) confirmationModal.classList.remove('show');
            cleanupModal();
            actionToConfirm = null;
        });
    }
    if (confirmationModal) { // Fechar ao clicar fora
        confirmationModal.addEventListener('click', (e) => {
            if (e.target === confirmationModal) {
                confirmationModal.classList.remove('show');
                cleanupModal();
                actionToConfirm = null;
            }
        });
    }

    /**
     * Exibe uma mensagem simples em modal, usando o modal de confirmação com apenas o botão OK.
     * @param {string} message - Mensagem a ser exibida.
     * @param {boolean} positive - Se verdadeiro, aplica estilo de ação positiva ao botão.
     */
    function showInfoModal(message, positive = false, danger = false) {
        if (!confirmationModal || !modalMessage || !modalConfirmBtn) {
            alert(message);
            return;
        }
        const originalText = modalConfirmBtn.textContent;
        const hadPositive = modalConfirmBtn.classList.contains('positive-action');
        const hadDanger = confirmationModal.classList.contains('modal-danger');
        modalMessage.textContent = message;
        if(modalIcon) {
            let iconClass = 'fas fa-info-circle';
            if (positive) iconClass = 'fas fa-check-circle';
            else if (danger) iconClass = 'fas fa-exclamation-circle';
            modalIcon.className = 'modal-icon ' + iconClass;
        }
        modalConfirmBtn.textContent = 'OK';
        modalConfirmBtn.classList.toggle('positive-action', positive);
        confirmationModal.classList.toggle('modal-danger', danger);
        if (modalCancelBtn) modalCancelBtn.style.display = 'none';
        actionToConfirm = null;
        confirmationModal.classList.add('show');
        const cleanup = () => {
            modalConfirmBtn.textContent = originalText;
            modalConfirmBtn.classList.toggle('positive-action', hadPositive);
            confirmationModal.classList.toggle('modal-danger', hadDanger);
            if (modalCancelBtn) modalCancelBtn.style.display = '';
        };
        infoModalCleanup = cleanup;
        modalConfirmBtn.addEventListener('click', cleanup, { once: true });
    }

    // ---------------------------------------------------------------------------
    // FUNCIONALIDADE DE IMPORTAR/EXPORTAR DADOS
    // ---------------------------------------------------------------------------
    function handleExportData() {
        if (items.length === 0) { showInfoModal('Não há dados para exportar.'); return; }
        let itemsToExport = JSON.parse(JSON.stringify(items)); // Cria cópia profunda
            
            if (modoOperacao === 'firebase') { 
                // Remove campos específicos do Firebase se não forem úteis para um backup genérico
                itemsToExport = items.map(({ userId, createdAt, ...rest }) => rest); 
            }
            // Remove o 'id' gerado pelo cliente se for exportar do localStorage para potencialmente importar no Firebase
            // ou mantém para re-importar no localStorage. Para simplificar, vamos manter o ID do LS.

            const currentThemeClass = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
            const dataToExport = { userThemeSetting: currentThemeClass, appMode: modoOperacao, items: itemsToExport };
            const dataStr = JSON.stringify(dataToExport, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
            const fileName = (modoOperacao === 'firebase' && currentUser) ? `listasuper_backup_${currentUser.uid.substring(0,5)}.json` : 'listasuper_backup_local.json';
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri); 
            linkElement.setAttribute('download', fileName);
        linkElement.click();
        linkElement.remove();
    }
    if (exportButton) {
        exportButton.addEventListener('click', handleExportData);
    }
    if (exportButtonLists) {
        exportButtonLists.addEventListener('click', handleExportData);
    }

    async function handleImportFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        if (file.type !== "application/json") { showInfoModal('Arquivo JSON inválido.'); event.target.value = ""; return; }

        const reader = new FileReader();
        reader.onload = async (e) => {
                try {
                    const importedPayload = JSON.parse(e.target.result);
                    let importedItemsList; 
                    let importedUserTheme = null;
                    // let importedAppMode = 'localStorage'; // Assume localStorage se não especificado

                    if (importedPayload && typeof importedPayload.items !== 'undefined') { 
                        importedItemsList = importedPayload.items; 
                        if (typeof importedPayload.userThemeSetting === 'string') importedUserTheme = importedPayload.userThemeSetting;
                        // if (typeof importedPayload.appMode === 'string') importedAppMode = importedPayload.appMode;
                    } else if (Array.isArray(importedPayload)) { // Formato antigo, só array de itens
                        importedItemsList = importedPayload;
                    } else {
                        showInfoModal('Formato do arquivo JSON inválido.'); importFileInput.value = ""; return;
                    }

                    if (Array.isArray(importedItemsList) && 
                        (importedItemsList.length === 0 || importedItemsList.every(item => typeof item.name === 'string'))) { // Validação básica
                        
                        showConfirmationModal('Isso ADICIONARÁ os itens importados à sua lista atual e pode definir o tema. Deseja continuar?', async () => { 
                            if (importedUserTheme) applyTheme(importedUserTheme);
                            
                            if (modoOperacao === 'firebase' && currentUser) {
                                const batch = db.batch();
                                importedItemsList.forEach(item => { 
                                    const { id, originalFbId, ...itemDataForFirestore } = item; // Remove IDs antigos
                                    const newItemRef = db.collection('items').doc(); // Novo ID do Firestore
                                    batch.set(newItemRef, { 
                                        ...itemDataForFirestore, 
                                        userId: currentUser.uid, 
                                        createdAt: firebase.firestore.FieldValue.serverTimestamp() 
                                    }); 
                                });
                                await batch.commit(); // onSnapshot do Firebase atualizará a UI
                            } else { // Modo LocalStorage
                                const newItemsForLS = importedItemsList.map(item => ({ ...item, id: generateId() })); // Gera novos IDs para LS
                                items = [...items, ...newItemsForLS];
                                lsDataManager.saveItems(items);
                                renderAppUI(); // Atualiza UI para LocalStorage
                            }
                            showInfoModal('Dados importados e adicionados com sucesso!', true);
                            activeCategory = 'all'; // Volta para a aba "Todos"
                            // renderAppUI(); // Já chamado ou será pelo onSnapshot
                        }, true); // true para isPositiveAction (botão verde no modal)
                    } else {
                        showInfoModal('Os itens no arquivo JSON não estão no formato esperado ou contêm dados inválidos.');
                    }
                } catch (error) {
                    showInfoModal('Erro ao processar o arquivo JSON: ' + error.message);
                } finally { 
                    event.target.value = ""; // Limpa o input de arquivo
                }
            };
        reader.readAsText(file);
    }
    if (importFileInput) {
        importFileInput.addEventListener('change', handleImportFile);
    }
    if (importFileInputLists) {
        importFileInputLists.addEventListener('change', handleImportFile);
    }

    if (deleteCategoryButton) {
        deleteCategoryButton.addEventListener('click', () => {
            if (!activeListCanWrite || activeCategory === 'all') return;
            const count = items.filter(it => it.category === activeCategory).length;
            if (count === 0) return;
            showConfirmationModal(`Remover todos os ${count} itens da categoria "${activeCategory}"?`, () => deleteAllItemsOfCategory(activeCategory));
        });
    }

    if (shareListButton) {
        shareListButton.addEventListener('click', () => {
            if (!currentUser || !userProfile.isPremium) { showInfoModal('Função disponível apenas para usuários premium.'); return; }
            if (shareModal && shareEmailInput && shareRecordingCheckbox) {
                shareEmailInput.value = '';
                shareRecordingCheckbox.checked = false;
                loadSharedUsers();
                shareModal.classList.add('show');
            }
        });
    }

    if (backToListsButton) {
        backToListsButton.addEventListener('click', () => {
            backToListsView();
        });
    }

    if (createListButton && createListModal && createListForm) {
        createListButton.addEventListener('click', () => {
            if (newListNameInput) newListNameInput.value = '';
            createListModal.classList.add('show');
        });

        createListCancel.addEventListener('click', () => {
            createListModal.classList.remove('show');
        });

        createListForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = newListNameInput.value.trim();
            if (!name) return;
            if (modoOperacao === 'firebase' && currentUser) {
                const newList = await fbListManager.addList(currentUser.uid, name, currentUser.email);
                lists.unshift(newList);
            } else {
                const newList = { id: generateId(), name, createdAt: new Date(), updatedAt: new Date(), ownerId: null };
                lists.unshift(newList);
                lsListManager.saveLists(lists);
            }
            renderLists();
            createListModal.classList.remove('show');
            showToast('Lista adicionada com sucesso!');
        });

        createListModal.addEventListener('click', (e) => {
            if (e.target === createListModal) createListModal.classList.remove('show');
        });
    }

    function showToast(message, danger = false) {
        const toast = document.createElement('div');
        toast.className = 'toast-message' + (danger ? ' toast-danger' : '');
        toast.textContent = message;
        document.body.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    if (listNameDisplay) {
        listNameDisplay.addEventListener('blur', async () => {
            const newName = listNameDisplay.textContent.trim();
            const list = lists.find(l => l.id === activeListId);
            if (!list || !newName) return;
            list.name = newName;
            if (modoOperacao === 'firebase' && currentUser) {
                await fbListManager.updateList(activeListId, { name: newName });
            } else {
                lsListManager.saveLists(lists);
            }
            renderLists();
            showToast('Alteração Concluída');
        });
    }

    if (shareCancelBtn && shareModal) {
        shareCancelBtn.addEventListener('click', () => {
            shareModal.classList.remove('show');
        });
    }

    if (shareForm && shareModal) {
        shareForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentUser || !userProfile.isPremium) { showInfoModal('Função disponível apenas para usuários premium.'); return; }
            const email = shareEmailInput.value.trim();
            if (!email) return;
            const permission = shareRecordingCheckbox.checked ? 'write' : 'read';
            await shareListWithEmail(email, permission);
            loadSharedUsers();
            shareModal.classList.remove('show');
        });
        shareModal.addEventListener('click', (e) => {
            if (e.target === shareModal) shareModal.classList.remove('show');
        });
    }

});
