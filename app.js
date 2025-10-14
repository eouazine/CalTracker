// ===== CALTRACKER - LOGIQUE SIMPLE =====
// Récupération BDD -> Calcul (goal - consumed) -> Affichage

(function () {
  // ===== VARIABLES GLOBALES =====
  let caloriesRemaining = 0;
  let proteinsRemaining = 0;

  // ===== ÉLÉMENTS DU DOM =====
  const appDate = document.getElementById('appDate');
  const counterValueEl = document.getElementById('counterValue');
  const proteinValueEl = document.getElementById('proteinValue');
  const adjustBtn = document.getElementById('adjustBtn');
  const adjustModal = document.getElementById('adjustModal');
  const counterInputEl = document.getElementById('counterInput');
  const proteinInputEl = document.getElementById('proteinInput');
  const adjustApplyBtn = document.getElementById('adjustApply');
  const adjustCancel = document.getElementById('adjustCancel');

  // ===== ÉLÉMENTS RECHERCHE/ALIMENTS =====
  const foodQuery = document.getElementById('foodQuery');
  const foodList = document.getElementById('foodList');
  const fabAdd = document.getElementById('fabAdd');
  const foodCatFilter = document.getElementById('foodCatFilter');
  const foodModal = document.getElementById('foodModal');
  const modalFoodName = document.getElementById('modalFoodName');
  const modalFoodKcal = document.getElementById('modalFoodKcal');
  const modalFoodProt = document.getElementById('modalFoodProt');
  const modalFoodSave = document.getElementById('modalFoodSave');
  const modalFoodCancel = document.getElementById('modalFoodCancel');
  const modalFoodCat = document.getElementById('modalFoodCat');
  const tabButtons = document.querySelectorAll('.tab');
  const tabPanels = document.querySelectorAll('.tab-panel');

  // ===== ÉLÉMENTS MODALS =====
  const quantityModal = document.getElementById('quantityModal');
  const quantityFoodName = document.getElementById('quantityFoodName');
  const quantityFoodNutrition = document.getElementById('quantityFoodNutrition');
  const quantityInput = document.getElementById('quantityInput');
  const quantitySave = document.getElementById('quantitySave');
  const quantityCancel = document.getElementById('quantityCancel');
  const previewKcal = document.getElementById('previewKcal');
  const previewProt = document.getElementById('previewProt');

  const editModal = document.getElementById('editModal');
  const editFoodName = document.getElementById('editFoodName');
  const editFoodKcal = document.getElementById('editFoodKcal');
  const editFoodProt = document.getElementById('editFoodProt');
  const editFoodCat = document.getElementById('editFoodCat');
  const editFoodSave = document.getElementById('editFoodSave');
  const editFoodCancel = document.getElementById('editFoodCancel');

  const errorModal = document.getElementById('errorModal');
  const errorMessage = document.getElementById('errorMessage');
  const errorClose = document.getElementById('errorClose');

  // ===== ÉLÉMENTS SCANNER =====
  const startScanBtn = document.getElementById('start-scan');
  const stopScanBtn = document.getElementById('stop-scan');
  const testScanBtn = document.getElementById('test-scan');
  const scannerArea = document.getElementById('scanner-area');
  const scannerResults = document.getElementById('scanner-results');
  const scannedFoodInfo = document.getElementById('scanned-food-info');

  // ===== INITIALISATION =====
  document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 CalTracker - Démarrage');
    await initializeApp();
  });

  async function initializeApp() {
    try {
      // Afficher la date
      updateDate();
      
      // Attendre que la BDD soit prête
      await waitForDatabase();
      
      // Charger les données depuis la BDD
      await loadDataFromDB();
      
      // Initialiser les événements
      setupEvents();
      
      // Initialiser le scanner
      initScanner();
      
      console.log('✅ Application initialisée');
    } catch (error) {
      console.error('❌ Erreur initialisation:', error);
      showError('Erreur de connexion à la base de données');
    }
  }

  // Attendre que la base de données soit prête
  async function waitForDatabase() {
    let attempts = 0;
    while (typeof window.calTrackerDB === 'undefined' && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (typeof window.calTrackerDB === 'undefined') {
      throw new Error('Base de données non disponible');
    }
    
    if (!window.calTrackerDB.isInitialized) {
      throw new Error('Base de données non initialisée');
    }
  }

  // Charger les données depuis la BDD et calculer
  async function loadDataFromDB() {
    try {
      console.log('🔄 Chargement des données depuis la BDD...');
      
      // Récupérer les données
      const data = await window.calTrackerDB.getGoalsAndConsumed();
      console.log('📊 Données récupérées:', data);
      
      // Calculer les valeurs restantes
      caloriesRemaining = data.caloriesGoal - data.caloriesConsumed;
      proteinsRemaining = data.proteinsGoal - data.proteinsConsumed;
      
      console.log('🧮 Calculs:', {
        calories: `${data.caloriesGoal} - ${data.caloriesConsumed} = ${caloriesRemaining}`,
        proteins: `${data.proteinsGoal} - ${data.proteinsConsumed} = ${proteinsRemaining}`
      });
      
      // Mettre à jour l'affichage
      updateCounters(caloriesRemaining, proteinsRemaining);
      
      console.log('✅ Données chargées et affichées');
    } catch (error) {
      console.error('❌ Erreur chargement BDD:', error);
      throw error;
    }
  }

  function updateDate() {
    if (appDate) {
      try {
        const now = new Date();
        const fmt = new Intl.DateTimeFormat('fr-FR', { 
          weekday: 'long', 
          day: '2-digit', 
          month: 'long', 
          year: 'numeric' 
        });
        appDate.textContent = fmt.format(now);
      } catch {
        appDate.textContent = new Date().toLocaleDateString('fr-FR');
      }
    }
  }

  function updateCounters(calories, proteins) {
    // Gérer l'affichage des calories (négatives ou positives)
    if (counterValueEl) {
      if (calories < 0) {
      counterValueEl.innerHTML = `
        <span class="warning-icon">🚫</span>
          <span class="excess-value">${formatInt(Math.abs(calories))}</span>
      `;
      counterValueEl.className = 'single-value accent-cal warning';
        // Changer le label en "calories en trop"
      const labelEl = document.querySelector('.chip-cal');
      if (labelEl) {
        labelEl.textContent = 'Calories en trop';
        labelEl.classList.add('warning');
      }
    } else {
      counterValueEl.innerHTML = `
        <span class="success-icon">✅</span>
          <span class="normal-value">${formatInt(calories)}</span>
      `;
      counterValueEl.className = 'single-value accent-cal success';
      // Remettre le label normal
      const labelEl = document.querySelector('.chip-cal');
      if (labelEl) {
        labelEl.textContent = 'Calories restantes';
        labelEl.classList.remove('warning');
        }
      }
    }
    
    // Gérer l'affichage des protéines (négatives ou positives)
    if (proteinValueEl) {
      if (proteins > 0) {
      // Protéines positives = excès = ROUGE
      proteinValueEl.innerHTML = `
        <span class="warning-icon">🚫</span>
          <span class="excess-value">${formatInt(proteins)}g</span>
      `;
      proteinValueEl.className = 'single-value small warning';
      const proteinLabelEl = document.querySelector('.single-label:not(.chip-cal)');
      if (proteinLabelEl) {
        proteinLabelEl.textContent = 'Protéines restantes';
        proteinLabelEl.classList.add('chip-prot', 'warning');
        proteinLabelEl.classList.remove('success');
      }
    } else {
      // Protéines négatives = dans les objectifs = VERT
      proteinValueEl.innerHTML = `
        <span class="success-icon">✅</span>
          <span class="excess-value">${formatInt(Math.abs(proteins))}g</span>
      `;
      proteinValueEl.className = 'single-value small success';
      const proteinLabelEl = document.querySelector('.single-label:not(.chip-cal)');
      if (proteinLabelEl) {
        proteinLabelEl.textContent = 'Protéines en excès';
        proteinLabelEl.classList.add('chip-prot', 'success');
        proteinLabelEl.classList.remove('warning');
      }
    }
    }
  }

  // ===== ÉVÉNEMENTS =====
  function setupEvents() {
    // Bouton modifier les objectifs
    if (adjustBtn) {
      adjustBtn.addEventListener('click', () => {
        if (adjustModal) adjustModal.showModal();
      });
    }

    // Bouton appliquer les objectifs
    if (adjustApplyBtn) {
      adjustApplyBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const cal = parseInt(counterInputEl?.value || '3000');
        const prot = parseInt(proteinInputEl?.value || '150');
        
        try {
          // Mettre à jour les objectifs dans la BDD
          await window.calTrackerDB.updateGoals(cal, prot);
          
          // Recharger les données depuis la BDD
        await loadDataFromDB();
          
          if (adjustModal) adjustModal.close();
          console.log('✅ Objectifs mis à jour');
      } catch (error) {
          console.error('❌ Erreur mise à jour objectifs:', error);
          showError('Erreur lors de la mise à jour des objectifs');
        }
      });
    }

    // Bouton annuler objectifs
    if (adjustCancel) {
      adjustCancel.addEventListener('click', (e) => {
        e.preventDefault();
        if (adjustModal) adjustModal.close();
      });
    }

    // Bouton ajouter aliment
    if (fabAdd) {
      fabAdd.addEventListener('click', () => {
        if (foodModal) foodModal.showModal();
      });
    }

    // Recherche d'aliments
    if (foodQuery) {
      foodQuery.addEventListener('input', () => {
        console.log('Recherche:', foodQuery.value);
      });
    }

    // Filtre par catégorie
    if (foodCatFilter) {
      foodCatFilter.addEventListener('change', () => {
        console.log('Catégorie:', foodCatFilter.value);
      });
    }

    // Tabs dans la modal
    if (tabButtons.length > 0) {
      tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.getAttribute('data-tab-target');
      if (target) {
        const panel = document.querySelector(target);
            if (panel) panel.classList.add('active');
          }
        });
      });
    }

    // Modal aliment - Sauvegarder
    if (modalFoodSave) {
      modalFoodSave.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Création aliment:', {
          name: modalFoodName?.value,
          kcal: modalFoodKcal?.value,
          prot: modalFoodProt?.value,
          cat: modalFoodCat?.value
        });
        if (foodModal) foodModal.close();
      });
    }

    // Modal aliment - Annuler
    if (modalFoodCancel) {
      modalFoodCancel.addEventListener('click', (e) => {
        e.preventDefault();
        if (foodModal) foodModal.close();
      });
    }

    // Modal quantité - Sauvegarder
    if (quantitySave) {
    quantitySave.addEventListener('click', (e) => {
      e.preventDefault();
        console.log('Quantité:', quantityInput?.value);
        if (quantityModal) quantityModal.close();
      });
    }

    // Modal quantité - Annuler
    if (quantityCancel) {
      quantityCancel.addEventListener('click', (e) => {
        e.preventDefault();
        if (quantityModal) quantityModal.close();
      });
    }

    // Modal édition - Sauvegarder
    if (editFoodSave) {
      editFoodSave.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Modification aliment:', {
          name: editFoodName?.value,
          kcal: editFoodKcal?.value,
          prot: editFoodProt?.value,
          cat: editFoodCat?.value
        });
        if (editModal) editModal.close();
      });
    }

    // Modal édition - Annuler
    if (editFoodCancel) {
      editFoodCancel.addEventListener('click', (e) => {
        e.preventDefault();
        if (editModal) editModal.close();
      });
    }

    // Modal erreur - Fermer
    if (errorClose) {
      errorClose.addEventListener('click', () => {
        if (errorModal) errorModal.close();
      });
    }

    // Drag & Drop pour le planning
    setupPlanningDropzones();
  }

  function setupPlanningDropzones() {
    document.querySelectorAll('.planning-cell').forEach(cell => {
      cell.addEventListener('dragover', (e) => {
        e.preventDefault();
        cell.classList.add('drop-target');
      });
      
      cell.addEventListener('dragleave', () => {
        cell.classList.remove('drop-target');
      });
      
      cell.addEventListener('drop', (e) => {
        e.preventDefault();
        cell.classList.remove('drop-target');
        console.log('Drop sur:', cell.getAttribute('data-slot'));
      });
    });
  }

  // ===== SCANNER =====
  function initScanner() {
    console.log('📷 Initialisation du scanner...');
    
    if (startScanBtn) {
      startScanBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Démarrage du scan');
        showScannerMessage('Scanner non implémenté - Mode interface uniquement');
      });
    }
    
    if (stopScanBtn) {
      stopScanBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Arrêt du scan');
        if (scannerResults) scannerResults.style.display = 'none';
      });
    }
    
    if (testScanBtn) {
      testScanBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Test scan');
        showScannerMessage('Test scan - Mode interface uniquement');
      });
    }

    // Détecter clic sur onglet Scan
    const scanTab = document.querySelector('[data-tab-target="#tabScan"]');
    if (scanTab) {
      scanTab.addEventListener('click', () => {
        console.log('Onglet Scan cliqué');
        showScannerMessage('Scanner non implémenté - Mode interface uniquement');
      });
    }
  }

  function showScannerMessage(message) {
    if (scannerResults) {
    scannerResults.innerHTML = `
        <div style="text-align: center; padding: 20px; color: #6fd6ff;">
          <p>${message}</p>
      </div>
    `;
    scannerResults.style.display = 'block';
    }
  }

  // ===== FONCTIONS UTILITAIRES =====
  function formatInt(n) {
    return new Intl.NumberFormat('fr-FR').format(n);
  }

  function showError(message) {
    if (errorModal && errorMessage) {
      errorMessage.innerHTML = message;
      errorModal.showModal();
    }
  }

  // ===== FONCTIONS GLOBALES =====
  window.calTracker = {
    // Décrémenter les compteurs (ajouter des calories/protéines consommées)
    decrement: async (cal, prot) => {
      try {
        console.log('🔄 Décrémenter:', cal, 'kcal,', prot, 'g prot');
        
        // Récupérer les données actuelles
        const data = await window.calTrackerDB.getGoalsAndConsumed();
        
        // Calculer les nouvelles valeurs consommées
        const newCaloriesConsumed = data.caloriesConsumed + cal;
        const newProteinsConsumed = data.proteinsConsumed + prot;
        
        // Mettre à jour dans la BDD
        await window.calTrackerDB.updateConsumed(newCaloriesConsumed, newProteinsConsumed);
        
        // Recharger et afficher
        await loadDataFromDB();
        
        console.log('✅ Décrémenté avec succès');
      } catch (error) {
        console.error('❌ Erreur décrément:', error);
        showError('Erreur lors de l\'ajout de l\'aliment');
      }
    },
    
    // Incrémenter les compteurs (retirer des calories/protéines consommées)
    increment: async (cal, prot) => {
      try {
        console.log('🔄 Incrémenter:', cal, 'kcal,', prot, 'g prot');
        
        // Récupérer les données actuelles
        const data = await window.calTrackerDB.getGoalsAndConsumed();
        
        // Calculer les nouvelles valeurs consommées
        const newCaloriesConsumed = Math.max(0, data.caloriesConsumed - cal);
        const newProteinsConsumed = Math.max(0, data.proteinsConsumed - prot);
        
        // Mettre à jour dans la BDD
        await window.calTrackerDB.updateConsumed(newCaloriesConsumed, newProteinsConsumed);
        
        // Recharger et afficher
        await loadDataFromDB();
        
        console.log('✅ Incrémenté avec succès');
    } catch (error) {
        console.error('❌ Erreur incrément:', error);
        showError('Erreur lors de la suppression de l\'aliment');
      }
    },
    
    showError: showError,
    
    // Recharger les données depuis la BDD
    refresh: async () => {
      try {
        await loadDataFromDB();
        console.log('✅ Données rechargées');
      } catch (error) {
        console.error('❌ Erreur rechargement:', error);
        showError('Erreur lors du rechargement des données');
      }
    }
  };

})();