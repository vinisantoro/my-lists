// ===================================================================================
// SCRIPT PRINCIPAL DA APLICAÇÃO (script-app.js)
// Gerenciamento de Lista de Itens com Modelo Freemium (LocalStorage e Firebase)
// ===================================================================================

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
    const upgradeToPremiumButton = document.getElementById('upgrade-to-premium');
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

    // Tabela e Abas de Itens
    const itemsTableBody = document.querySelector('#items-table tbody');
    const categoryTabsContainer = document.getElementById('category-tabs-container');

    // Controles Gerais e Modal
    const themeToggleButton = document.getElementById('theme-toggle');
    let themeToggleIcon = themeToggleButton ? themeToggleButton.querySelector('i') : null;
    const exportButton = document.getElementById('export-data');
    const importFileInput = document.getElementById('import-file');
    const confirmationModal = document.getElementById('confirmation-modal');
    const modalMessage = document.getElementById('modal-message');
    const modalConfirmBtn = document.getElementById('modal-confirm-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');

    // ---------------------------------------------------------------------------
    // ESTADO GLOBAL DA APLICAÇÃO
    // ---------------------------------------------------------------------------
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

    let activeDataManager = lsDataManager; // Padrão inicial para modo LocalStorage

    // ---------------------------------------------------------------------------
    // FUNÇÕES UTILITÁRIAS
    // ---------------------------------------------------------------------------

    /**
     * Gera um ID único simples para itens no LocalStorage.
     * @returns {string} ID único.
     */
    function generateId() {
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
        
        if (themeToggleIcon) {
            themeToggleIcon.className = themeToApply === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }

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
    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', () => {
            const isDarkMode = document.body.classList.contains('dark-mode');
            applyTheme(isDarkMode ? 'light' : 'dark');
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
        if(logoutButton) logoutButton.style.display = currentUser ? 'inline-block' : 'none';
        if(guestModeOption) guestModeOption.style.display = currentUser ? 'none' : 'block'; // Mostra se não há usuário logado
        
        if(upgradeToPremiumButton) {
            const showUpgradeButton = isGuest || isLoggedInButFree;
            upgradeToPremiumButton.style.display = showUpgradeButton ? 'inline-block' : 'none';
            if(showUpgradeButton) {
                upgradeToPremiumButton.onclick = () => { window.location.href = 'planos.html'; };
            }
        }

        if(modeIndicator) {
            if (currentUser && userProfile.isPremium) modeIndicator.textContent = 'Premium Cloud';
            else if (currentUser && !userProfile.isPremium) modeIndicator.textContent = 'Gratuito (Online)';
            else if (isGuest) modeIndicator.textContent = 'Convidado Local';
            else modeIndicator.textContent = '';
        }
    }
    
    // ---------------------------------------------------------------------------
    // LÓGICA DE AUTENTICAÇÃO E ESTADO DO USUÁRIO
    // ---------------------------------------------------------------------------

    /**
     * Observador do estado de autenticação do Firebase.
     * Gerencia a UI e os dados com base no status de login do usuário.
     */
    auth.onAuthStateChanged(async user => {
        unsubscribePrefsListener(); // Cancela listener de preferências anterior
        unsubscribeItemsListener(); // Cancela listener de itens anterior

        if (user) { // Usuário está logado
            currentUser = user;
            
            // Listener para o perfil do usuário (isPremium, theme)
            unsubscribePrefsListener = db.collection('userProfiles').doc(user.uid)
                .onSnapshot(async (doc) => {
                    if (doc.exists) { 
                        userProfile = doc.data(); 
                    } else { 
                        // Perfil não existe, cria um perfil padrão gratuito
                        userProfile = { isPremium: false, theme: 'light' };
                        try { 
                            await db.collection('userProfiles').doc(user.uid).set(userProfile);
                            // console.log("Perfil de usuário gratuito padrão criado no Firestore.");
                        } catch (e) { 
                            console.error("Erro ao criar perfil default no Firestore:", e); 
                        }
                    }
                    // Determina o modo de operação com base no status premium
                    modoOperacao = userProfile.isPremium ? 'firebase' : 'localStorage';
                    activeDataManager = userProfile.isPremium ? fbDataManager : lsDataManager;
                    
                    applyTheme(userProfile.theme || 'light'); // Aplica tema do perfil ou padrão
                    updateUIVisibility(true);   // Mostra o conteúdo do app
                    updateUserSpecificUI();     // Atualiza UI específica do usuário
                    await loadAndRenderData();  // Carrega e renderiza os dados do modo correto
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
            
            items = []; // Limpa array de itens na memória
            renderAppUI(); // Limpa a tabela e abas na UI
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
    // Listener para o botão de Logout
    if (logoutButton) {
        logoutButton.addEventListener('click', () => { 
            auth.signOut().catch(error => console.error("Erro no logout:", error.message));
        });
    }
    // Listener para o botão de Upgrade (apenas redireciona)
    if (upgradeToPremiumButton) {
        upgradeToPremiumButton.onclick = () => { window.location.href = 'planos.html'; };
    }

    // ---------------------------------------------------------------------------
    // FUNÇÕES DE CARREGAMENTO E RENDERIZAÇÃO DE DADOS E UI PRINCIPAL
    // ---------------------------------------------------------------------------

    /**
     * Carrega os itens (do Firebase ou LocalStorage) e chama a renderização da UI.
     */
    async function loadAndRenderData() {
        unsubscribeItemsListener(); // Limpa listener de itens anterior sempre

        if (modoOperacao === 'firebase' && currentUser) {
            // Configura o listener em tempo real para itens do Firebase
            unsubscribeItemsListener = db.collection('items')
                .where('userId', '==', currentUser.uid)
                .orderBy('createdAt', 'desc')
                .onSnapshot(snapshot => {
                    items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    renderAppUI(); // Re-renderiza a UI com os novos dados
                }, error => {
                    console.error("Erro no listener de itens do Firebase:", error);
                    items = []; // Limpa itens em caso de erro
                    renderAppUI();
                });
        } else { // Modo LocalStorage (ou deslogado, mas o app não deveria estar visível)
            items = activeDataManager.loadItems(); // Carrega do localStorage
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
                createdAt: new Date()
            };

            if (!newItemData.name || !newItemData.category || !newItemData.brand) {
                alert('Por favor, preencha Categoria, Marca/Modelo e Nome do Produto.'); 
                return; 
            }
            
            try {
                if (modoOperacao === 'firebase' && currentUser) {
                    const dataForFirebase = {
                    ...newItemData,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp() // O timestamp do servidor prevalecerá
                    };
                    await activeDataManager.addItem(currentUser.uid, dataForFirebase); 
                    // O listener onSnapshot do Firebase atualizará a UI automaticamente
                } else { // Modo LocalStorage
                    activeDataManager.addItem(newItemData, items); // 'items' é modificado por referência
                    items = activeDataManager.loadItems(); // Recarrega 'items' para garantir consistência com IDs
                    renderAppUI(); // Re-renderiza manualmente para LocalStorage
                }
                // Limpa o formulário e reseta as estrelas
                itemForm.reset(); 
                hiddenRatingInput.value = '0'; 
                if(currentRatingDisplay) currentRatingDisplay.textContent = '0.0';
                if(formStarRatingContainer) createStars(formStarRatingContainer, 0, true, hiddenRatingInput, currentRatingDisplay);
                if(categoryInput) categoryInput.focus();
            } catch (error) { 
                console.error("Erro ao adicionar item:", error); 
                alert("Erro ao adicionar item. Tente novamente."); 
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
            brand: row.querySelector('input[data-field="brand"]').value.trim(), 
            name: row.querySelector('input[data-field="name"]').value.trim(),
            notes: row.querySelector('textarea[data-field="notes"]').value.trim(), 
            rating: parseFloat(row.querySelector('input[type="hidden"][data-field="rating"]').value) || 0,
        };
        if (!updatedData.name || !updatedData.brand ) { 
            alert('Marca/Modelo e Nome do Produto não podem ficar vazios.'); return; 
        }

        try {
            if (modoOperacao === 'firebase' && currentUser) { 
                await activeDataManager.updateItem(itemId, updatedData); // onSnapshot do Firebase cuida da UI
            } else { // Modo LocalStorage
                activeDataManager.updateItem(itemId, updatedData, items); 
                items = activeDataManager.loadItems(); // Recarrega 'items'
                renderAppUI(); // Re-renderiza para LocalStorage
            }
            editingItemId = null; 
            // renderItems(); // Não é estritamente necessário se renderAppUI é chamado ou onSnapshot está ativo
        } catch (error) { 
            console.error("Erro ao atualizar item:", error); 
            alert("Erro ao atualizar item."); 
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
        } catch (error) { 
            console.error("Erro ao excluir item:", error); 
            alert("Erro ao excluir item."); 
        }
    }

    // Funções para iniciar e cancelar a edição inline de um item
    function startEditItem(itemId) { editingItemId = itemId; renderItems(); }
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
            itemsTableBody.innerHTML = `<tr><td colspan="5" class="empty-message">Nenhum item para exibir nesta categoria.</td></tr>`; 
            return; 
        }
        itemsToRender.forEach(item => {
            const row = itemsTableBody.insertRow(); 
            row.dataset.id = item.id; 
            if (editingItemId === item.id) { 
                // Modo de Edição
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
                actionsCell.innerHTML = `<button class="edit-btn" title="Editar"><i class="fas fa-edit"></i></button> <button class="delete-btn" title="Excluir"><i class="fas fa-trash-alt"></i></button>`;
                actionsCell.querySelector('.edit-btn').addEventListener('click', () => startEditItem(item.id));
                actionsCell.querySelector('.delete-btn').addEventListener('click', () => {
                    showConfirmationModal(`Tem certeza que deseja excluir o item "${item.name || 'sem nome'}"?`, () => deleteItemAction(item.id)); 
                });
            }
        });
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
        actionToConfirm = onConfirm;
        modalConfirmBtn.classList.toggle('positive-action', isPositiveAction);
        confirmationModal.classList.add('show'); // Adiciona classe para mostrar com transição
    }

    if (modalConfirmBtn) {
        modalConfirmBtn.addEventListener('click', () => {
            if (typeof actionToConfirm === 'function') actionToConfirm();
            if (confirmationModal) confirmationModal.classList.remove('show');
            actionToConfirm = null;
        });
    }
    if (modalCancelBtn) {
        modalCancelBtn.addEventListener('click', () => {
            if (confirmationModal) confirmationModal.classList.remove('show');
            actionToConfirm = null;
        });
    }
    if (confirmationModal) { // Fechar ao clicar fora
        confirmationModal.addEventListener('click', (e) => {
            if (e.target === confirmationModal) {
                confirmationModal.classList.remove('show');
                actionToConfirm = null;
            }
        });
    }

    // ---------------------------------------------------------------------------
    // FUNCIONALIDADE DE IMPORTAR/EXPORTAR DADOS
    // ---------------------------------------------------------------------------
    if (exportButton) {
        exportButton.addEventListener('click', () => { 
            if (items.length === 0) { alert('Não há dados para exportar.'); return; }
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
        });
    }

    if (importFileInput) {
        importFileInput.addEventListener('change', async (event) => {
            const file = event.target.files[0]; 
            if (!file) return;
            if (file.type !== "application/json") { alert("Arquivo JSON inválido."); importFileInput.value = ""; return; }
            
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
                        alert('Formato do arquivo JSON inválido.'); importFileInput.value = ""; return; 
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
                            alert('Dados importados e adicionados com sucesso!'); 
                            activeCategory = 'all'; // Volta para a aba "Todos"
                            // renderAppUI(); // Já chamado ou será pelo onSnapshot
                        }, true); // true para isPositiveAction (botão verde no modal)
                    } else { 
                        alert('Os itens no arquivo JSON não estão no formato esperado ou contêm dados inválidos.');
                    }
                } catch (error) { 
                    alert('Erro ao processar o arquivo JSON: ' + error.message); 
                } finally { 
                    importFileInput.value = ""; // Limpa o input de arquivo
                }
            };
            reader.readAsText(file);
         });
    }

    // ---------------------------------------------------------------------------
    // INICIALIZAÇÃO DA UI (CHAMADA PELO LISTENER onAuthStateChanged ou botão de convidado)
    // ---------------------------------------------------------------------------
    // Nenhuma chamada explícita a loadAndRenderData() aqui no final, pois
    // o onAuthStateChanged ou o clique no botão de convidado cuidarão da configuração inicial da UI e dos dados.
    // A primeira aplicação do tema (padrão ou do localStorage) é feita no onAuthStateChanged se não houver usuário,
    // ou após carregar o perfil do usuário.
});