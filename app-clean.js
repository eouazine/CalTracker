// ===== CALTRACKER - VERSION ULTRA SIMPLE =====
// Récupération BDD -> Calcul (goal - consumed) -> Affichage

(function () {
  // ===== VARIABLES GLOBALES =====
  let caloriesRemaining = 0;
  let proteinsRemaining = 0;

  // ===== VARIABLES POUR LE SCANNER =====
  let codeReader = null;
  let isScanning = false;
  let currentStream = null;

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
      
      // Récupérer les données des objectifs
      const data = await window.calTrackerDB.getGoalsAndConsumed();
      console.log('📊 Données récupérées:', data);
      
      // Stocker les données pour l'aperçu
      window.calTrackerDB.currentData = data;
      
      // Calculer les valeurs restantes
      caloriesRemaining = data.caloriesGoal - data.caloriesConsumed;
      proteinsRemaining = data.proteinsGoal - data.proteinsConsumed;
      
      console.log('🧮 Calculs:', {
        calories: `${data.caloriesGoal} - ${data.caloriesConsumed} = ${caloriesRemaining}`,
        proteins: `${data.proteinsGoal} - ${data.proteinsConsumed} = ${proteinsRemaining}`
      });
      
      // Mettre à jour l'affichage des compteurs
      updateCounters(caloriesRemaining, proteinsRemaining);
      
       // Charger les aliments
       await loadFoodsFromDB();
       
       // Charger le planning du jour
       await loadTodayPlanning();
       
       console.log('✅ Données chargées et affichées');
    } catch (error) {
      console.error('❌ Erreur chargement BDD:', error);
      throw error;
    }
  }

   // Charger les aliments depuis la BDD
   async function loadFoodsFromDB() {
     try {
       console.log('🔄 Chargement des aliments depuis la BDD...');
       
       // Récupérer tous les aliments
       const foods = await window.calTrackerDB.getAllFoods();
       console.log('🍎 Aliments récupérés:', foods.length, 'aliments');
       
       // Afficher les aliments dans la 3ème section
       renderFoodsList(foods);
       
       console.log('✅ Aliments chargés et affichés');
     } catch (error) {
       console.error('❌ Erreur chargement aliments:', error);
       // Ne pas faire échouer l'initialisation si les aliments ne se chargent pas
     }
   }

   // Charger le planning du jour
   async function loadTodayPlanning() {
     try {
       console.log('🔄 Chargement du planning du jour...');
       
       // Récupérer le planning du jour
       const planning = await window.calTrackerDB.getTodayPlanning();
       console.log('📅 Planning récupéré:', planning.length, 'aliments');
       
       // Afficher le planning dans les zones de repas
       renderTodayPlanning(planning);
       
       console.log('✅ Planning chargé et affiché');
     } catch (error) {
       console.error('❌ Erreur chargement planning:', error);
       // Ne pas faire échouer l'initialisation si le planning ne se charge pas
     }
   }

   // Variables globales pour la recherche
   let allFoods = [];
   let filteredFoods = [];
   
   // Variables globales pour le drag & drop
   let draggedFood = null;
   let targetMealType = null;
  const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  let touchDragState = { active: false, startX: 0, startY: 0, food: null, currentCell: null, started: false };

   // Afficher la liste des aliments
   function renderFoodsList(foods) {
     const foodList = document.getElementById('foodList');
     if (!foodList) return;

     // Stocker tous les aliments pour la recherche
     allFoods = foods;
     filteredFoods = foods;

     console.log('📦 Aliments chargés pour la recherche:', foods.length, 'aliments');

     if (foods.length === 0) {
       foodList.innerHTML = `
         <div style="text-align: center; padding: 20px; color: #6fd6ff;">
           <p>📝 Aucun aliment dans la base de données</p>
           <p>Utilisez le bouton + pour ajouter des aliments</p>
         </div>
       `;
       return;
     }

     // Appliquer les filtres actuels
     applyFilters();
   }

   // Afficher les aliments filtrés
   function displayFilteredFoods() {
     const foodList = document.getElementById('foodList');
     if (!foodList) return;

     if (filteredFoods.length === 0) {
       foodList.innerHTML = `
         <div style="text-align: center; padding: 20px; color: #6fd6ff;">
           <p>🔍 Aucun aliment trouvé</p>
           <p>Essayez de modifier votre recherche</p>
         </div>
       `;
       return;
     }

     // Créer le HTML avec les classes CSS existantes
     let html = '';
     filteredFoods.forEach(food => {
       html += `
         <div class="search-item" data-food-id="${food.id}" draggable="true">
           <div class="search-item-name">${food.name}</div>
           <div class="search-item-right">
             <div class="search-item-kcal">${food.calories} kcal</div>
             <div class="sep"></div>
             <div class="search-item-prot">${food.proteins}g prot</div>
             <div class="search-item-actions">
               <button class="search-edit" onclick="editFood('${food.id}')" title="Modifier">✏️</button>
               <button class="search-remove" onclick="deleteFood('${food.id}')" title="Supprimer">❌</button>
             </div>
           </div>
         </div>
       `;
     });

     foodList.innerHTML = html;
     
     // Attacher les événements de drag & drop aux aliments
     attachDragEvents();
   }

   // Appliquer les filtres de recherche
   function applyFilters() {
     const searchQuery = document.getElementById('foodQuery')?.value?.toLowerCase() || '';
     const categoryFilter = document.getElementById('foodCatFilter')?.value || '';

     console.log('🔍 Filtres appliqués:', { 
       searchQuery, 
       categoryFilter, 
       totalFoods: allFoods.length,
       allFoods: allFoods.map(f => f.name)
     });

     filteredFoods = allFoods.filter(food => {
       // Filtre par nom (recherche textuelle)
       const matchesSearch = !searchQuery || food.name.toLowerCase().includes(searchQuery);
       
       // Filtre par catégorie
       const matchesCategory = !categoryFilter || food.category === categoryFilter;
       
       console.log(`🔍 Aliment "${food.name}" (catégorie: ${food.category}):`, {
         searchQuery,
         categoryFilter,
         matchesSearch,
         matchesCategory,
         finalMatch: matchesSearch && matchesCategory
       });
       
       return matchesSearch && matchesCategory;
     });

     console.log('📊 Résultats filtrés:', filteredFoods.length, 'sur', allFoods.length);
     console.log('📊 Aliments filtrés:', filteredFoods.map(f => f.name));
     displayFilteredFoods();
   }

   // Afficher le planning du jour dans les zones de repas
   function renderTodayPlanning(planning) {
     // Grouper les aliments par type de repas
     const planningByMeal = {
       morning: [],
       noon: [],
       snack: [],
       evening: []
     };

     planning.forEach(item => {
       if (planningByMeal[item.meal_type]) {
         planningByMeal[item.meal_type].push(item);
       }
     });

     // Afficher dans chaque zone de repas
     Object.keys(planningByMeal).forEach(mealType => {
       const cell = document.querySelector(`[data-slot="${mealType}"]`);
       if (cell) {
         const cellChips = cell.querySelector('.cell-chips');
         if (cellChips) {
           if (planningByMeal[mealType].length === 0) {
             cellChips.innerHTML = '<div style="color: #6fd6ff; font-style: italic;">Aucun aliment</div>';
           } else {
             let html = '';
             planningByMeal[mealType].forEach(item => {
               if (item.foods) {
                 // Calculer les calories et protéines pour la quantité
                 const caloriesForQuantity = Math.round((item.foods.calories * item.quantity) / 100);
                 const proteinsForQuantity = Math.round((item.foods.proteins * item.quantity) / 100 * 100) / 100;
                 
                 html += `
                   <div class="chip" data-planning-id="${item.id}">
                     <div class="chip-content">
                       <div class="chip-name">${item.foods.name}</div>
                       <div class="chip-quantity">${item.quantity}g</div>
                       <div class="chip-nutrition">
                         <span class="chip-calories">${caloriesForQuantity} kcal</span>
                         <span class="chip-proteins">${proteinsForQuantity}g prot</span>
                       </div>
                       <div class="chip-actions">
                         <button class="chip-edit" onclick="editPlanningItem('${item.id}')" title="Modifier">✏️</button>
                         <button class="chip-delete" onclick="deletePlanningItem('${item.id}')" title="Supprimer">❌</button>
                       </div>
                     </div>
                   </div>
                 `;
               }
             });
             cellChips.innerHTML = html;
           }
         }
       }
     });

     console.log('📅 Planning affiché:', {
       morning: planningByMeal.morning.length,
       noon: planningByMeal.noon.length,
       snack: planningByMeal.snack.length,
       evening: planningByMeal.evening.length
     });
   }

   // Attacher les événements de drag & drop
   function attachDragEvents() {
     // Événements pour les aliments (drag)
     const foodItems = document.querySelectorAll('.search-item[draggable="true"]');
     foodItems.forEach(item => {
      item.addEventListener('dragstart', handleDragStart);
      item.addEventListener('dragend', handleDragEnd);
      // Fallback tactile (iOS ne supporte pas le DnD HTML5)
      if (isTouchDevice) {
        item.addEventListener('touchstart', handleTouchStart, { passive: true });
        item.addEventListener('touchmove', handleTouchMove, { passive: false });
        item.addEventListener('touchend', handleTouchEnd);
        item.addEventListener('touchcancel', handleTouchCancel);
      }
     });

    // Empêcher le drag via les boutons d'action
    document.querySelectorAll('.search-edit, .search-remove').forEach(btn => {
      btn.setAttribute('draggable', 'false');
      btn.addEventListener('dragstart', (e) => e.preventDefault());
      btn.addEventListener('mousedown', (e) => e.stopPropagation());
      btn.addEventListener('touchstart', (e) => { e.stopPropagation(); }, { passive: true });
    });

     // Événements pour les zones de planning (drop)
     const planningCells = document.querySelectorAll('.planning-cell');
     planningCells.forEach(cell => {
       cell.addEventListener('dragover', handleDragOver);
       cell.addEventListener('drop', handleDrop);
       cell.addEventListener('dragenter', handleDragEnter);
       cell.addEventListener('dragleave', handleDragLeave);
     });
   }

   // Gestion du début du drag
  function handleDragStart(e) {
    const item = e.currentTarget;
    draggedFood = allFoods.find(food => food.id === item.dataset.foodId);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'copy';
      try { e.dataTransfer.setData('text/plain', item.dataset.foodId || ''); } catch {}
    }
    item.style.opacity = '0.5';
    console.log('🔄 Début du drag:', draggedFood?.name);
  }

   // Gestion de la fin du drag
  function handleDragEnd(e) {
    e.currentTarget.style.opacity = '1';
     draggedFood = null;
     targetMealType = null;
     
     // Retirer les classes de drop de toutes les cellules
     document.querySelectorAll('.planning-cell').forEach(cell => {
       cell.classList.remove('drop-target');
     });
   }

   // Gestion du survol pendant le drag
   function handleDragOver(e) {
     e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
   }

   // Gestion de l'entrée dans une zone de drop
  function handleDragEnter(e) {
    e.preventDefault();
    const cell = e.currentTarget;
    if (draggedFood && cell && cell.classList.contains('planning-cell')) {
      cell.classList.add('drop-target');
      targetMealType = cell.dataset.slot;
      console.log('🎯 Zone de drop:', targetMealType);
    }
  }

   // Gestion de la sortie d'une zone de drop
  function handleDragLeave(e) {
    const cell = e.currentTarget;
    if (cell && cell.classList.contains('planning-cell')) {
      cell.classList.remove('drop-target');
    }
  }

   // Gestion du drop
  function handleDrop(e) {
    e.preventDefault();
    const cell = e.currentTarget;
    if (cell) cell.classList.remove('drop-target');
    const mealType = cell?.dataset?.slot || targetMealType;
    
    if (draggedFood && mealType) {
      console.log('🎯 Drop effectué:', draggedFood.name, 'dans', mealType);
      openQuantityModal(draggedFood, mealType);
    }
  }

  // ===== Fallback tactile (iOS) =====
  function handleTouchStart(e) {
    const item = e.currentTarget;
    const touch = e.touches[0];
    touchDragState.active = true;
    touchDragState.started = false;
    touchDragState.startX = touch.clientX;
    touchDragState.startY = touch.clientY;
    touchDragState.food = allFoods.find(f => f.id === item.dataset.foodId);
    touchDragState.currentCell = null;
  }

  function handleTouchMove(e) {
    if (!touchDragState.active) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchDragState.startX);
    const dy = Math.abs(touch.clientY - touchDragState.startY);
    const moved = dx + dy;
    if (moved > 8) {
      // Empêcher le scroll une fois le drag commencé
      e.preventDefault();
      touchDragState.started = true;
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      const cell = el ? el.closest('.planning-cell') : null;
      if (cell !== touchDragState.currentCell) {
        if (touchDragState.currentCell) {
          touchDragState.currentCell.classList.remove('drop-target');
        }
        if (cell) {
          cell.classList.add('drop-target');
        }
        touchDragState.currentCell = cell;
      }
    }
  }

  function handleTouchEnd() {
    if (!touchDragState.active) return;
    const cell = touchDragState.currentCell;
    const food = touchDragState.food;
    if (cell) cell.classList.remove('drop-target');
    const mealType = cell ? cell.dataset.slot : null;
    touchDragState.active = false;
    touchDragState.currentCell = null;
    touchDragState.food = null;
    if (food && mealType) {
      openQuantityModal(food, mealType);
    }
  }

  function handleTouchCancel() {
    if (touchDragState.currentCell) {
      touchDragState.currentCell.classList.remove('drop-target');
    }
    touchDragState.active = false;
    touchDragState.currentCell = null;
    touchDragState.food = null;
  }

   // Ouvrir la popup de quantité (version directe sans appel BDD)
   function openQuantityModalDirect(food, mealType, planningId = null, currentQuantity = null) {
     const quantityModal = document.getElementById('quantityModal');
     const quantityFoodName = document.getElementById('quantityFoodName');
     const quantityFoodNutrition = document.getElementById('quantityFoodNutrition');
     const quantityInput = document.getElementById('quantityInput');
     
     if (quantityModal && quantityFoodName && quantityInput) {
       // Utiliser directement les données de l'aliment
       quantityFoodName.textContent = food.name;
       quantityFoodNutrition.textContent = `${food.calories} kcal • ${food.proteins}g prot / 100g`;
       quantityModal.dataset.foodId = food.id;
       quantityModal.dataset.mealType = mealType;
       quantityModal.dataset.foodCalories = food.calories;
       quantityModal.dataset.foodProteins = food.proteins;
       
       // Si c'est une modification, stocker l'ID du planning et pré-remplir la quantité
       if (planningId) {
         quantityModal.dataset.planningId = planningId;
         quantityInput.value = currentQuantity || '';
         
         // Changer le titre de la popup
         const modalTitle = document.querySelector('#quantityModal .modal-title');
         if (modalTitle) modalTitle.textContent = 'Modifier la quantité';
         
         // Changer le texte du bouton
         const saveButton = document.getElementById('quantitySave');
         if (saveButton) saveButton.textContent = 'Modifier la quantité';
         
         // Calculer et afficher les valeurs pour la quantité actuelle
         if (currentQuantity) {
           const calculatedCalories = Math.round((food.calories * currentQuantity) / 100);
           const calculatedProteins = Math.round((food.proteins * currentQuantity) / 100 * 100) / 100;
           
           const previewKcal = document.getElementById('previewKcal');
           const previewProt = document.getElementById('previewProt');
           if (previewKcal) previewKcal.textContent = calculatedCalories;
           if (previewProt) previewProt.textContent = calculatedProteins + ' g';
         }
       } else {
         // Nouvel ajout - vider le champ
         quantityInput.value = '';
         
         // Nettoyer le planningId pour les nouveaux ajouts
         delete quantityModal.dataset.planningId;
         
         // Changer le titre de la popup
         const modalTitle = document.querySelector('#quantityModal .modal-title');
         if (modalTitle) modalTitle.textContent = 'Quantité consommée';
         
         // Changer le texte du bouton
         const saveButton = document.getElementById('quantitySave');
         if (saveButton) saveButton.textContent = 'Ajouter au planning';
         
         const previewKcal = document.getElementById('previewKcal');
         const previewProt = document.getElementById('previewProt');
         if (previewKcal) previewKcal.textContent = '0';
         if (previewProt) previewProt.textContent = '0 g';
       }
       
       // Ouvrir la modal
       quantityModal.showModal();
       
       console.log('📝 Modal quantité ouverte (direct):', { 
         mode: planningId ? 'modification' : 'ajout',
         planningId,
         currentQuantity,
         food 
       });
     }
   }

   // Ouvrir la popup de quantité
   async function openQuantityModal(food, mealType, planningId = null, currentQuantity = null) {
     const quantityModal = document.getElementById('quantityModal');
     const quantityFoodName = document.getElementById('quantityFoodName');
     const quantityFoodNutrition = document.getElementById('quantityFoodNutrition');
     const quantityInput = document.getElementById('quantityInput');
     const quantityCalories = document.getElementById('quantityCalories');
     const quantityProteins = document.getElementById('quantityProteins');
     
     if (quantityModal && quantityFoodName && quantityInput) {
       try {
         // Récupérer les données fraîches de l'aliment depuis la BDD
         const freshFoodData = await window.calTrackerDB.getFoodById(food.id);
         
         if (freshFoodData) {
           // Utiliser les données fraîches
           quantityFoodName.textContent = freshFoodData.name;
           quantityFoodNutrition.textContent = `${freshFoodData.calories} kcal • ${freshFoodData.proteins}g prot / 100g`;
           quantityModal.dataset.foodId = freshFoodData.id;
           quantityModal.dataset.mealType = mealType;
           quantityModal.dataset.foodCalories = freshFoodData.calories;
           quantityModal.dataset.foodProteins = freshFoodData.proteins;
           
           // Si c'est une modification, stocker l'ID du planning et pré-remplir la quantité
           if (planningId) {
             quantityModal.dataset.planningId = planningId;
             quantityInput.value = currentQuantity || '';
             
             // Changer le titre de la popup
             const modalTitle = document.querySelector('#quantityModal .modal-title');
             if (modalTitle) modalTitle.textContent = 'Modifier la quantité';
             
             // Changer le texte du bouton
             const saveButton = document.getElementById('quantitySave');
             if (saveButton) saveButton.textContent = 'Modifier la quantité';
             
             // Calculer et afficher les valeurs pour la quantité actuelle
             if (currentQuantity) {
               const calculatedCalories = Math.round((freshFoodData.calories * currentQuantity) / 100);
               const calculatedProteins = Math.round((freshFoodData.proteins * currentQuantity) / 100 * 100) / 100;
               
               const previewKcal = document.getElementById('previewKcal');
               const previewProt = document.getElementById('previewProt');
               if (previewKcal) previewKcal.textContent = calculatedCalories;
               if (previewProt) previewProt.textContent = calculatedProteins + ' g';
             }
           } else {
             // Nouvel ajout - vider le champ
             quantityInput.value = '';
             
             // Nettoyer le planningId pour les nouveaux ajouts
             delete quantityModal.dataset.planningId;
             
             // Changer le titre de la popup
             const modalTitle = document.querySelector('#quantityModal .modal-title');
             if (modalTitle) modalTitle.textContent = 'Quantité consommée';
             
             // Changer le texte du bouton
             const saveButton = document.getElementById('quantitySave');
             if (saveButton) saveButton.textContent = 'Ajouter au planning';
             
             const previewKcal = document.getElementById('previewKcal');
             const previewProt = document.getElementById('previewProt');
             if (previewKcal) previewKcal.textContent = '0';
             if (previewProt) previewProt.textContent = '0 g';
           }
           
           console.log('📝 Modal quantité ouverte:', { 
             mode: planningId ? 'modification' : 'ajout',
             planningId,
             currentQuantity,
             freshFoodData 
           });
         } else {
           // Fallback sur les données passées en paramètre
           quantityFoodName.textContent = food.name;
           quantityFoodNutrition.textContent = `${food.calories} kcal • ${food.proteins}g prot / 100g`;
           quantityModal.dataset.foodId = food.id;
           quantityModal.dataset.mealType = mealType;
           quantityModal.dataset.foodCalories = food.calories;
           quantityModal.dataset.foodProteins = food.proteins;
           
           if (planningId) {
             quantityModal.dataset.planningId = planningId;
             quantityInput.value = currentQuantity || '';
           } else {
             quantityInput.value = '';
           }
           
           const previewKcal = document.getElementById('previewKcal');
           const previewProt = document.getElementById('previewProt');
           if (previewKcal) previewKcal.textContent = '0';
           if (previewProt) previewProt.textContent = '0 g';
         }
         
         // Ouvrir la modal
         quantityModal.showModal();
         
       } catch (error) {
         console.error('❌ Erreur récupération données aliment:', error);
         showError('Erreur lors de l\'ouverture de la popup');
       }
     }
   }

   // Mettre à jour le calcul de quantité en temps réel
   function updateQuantityCalculation(quantity) {
     const quantityModal = document.getElementById('quantityModal');
     const previewKcal = document.getElementById('previewKcal');
     const previewProt = document.getElementById('previewProt');
     
     if (!quantityModal || !previewKcal || !previewProt) return;
     
     const foodCalories = parseFloat(quantityModal.dataset.foodCalories) || 0;
     const foodProteins = parseFloat(quantityModal.dataset.foodProteins) || 0;
     const quantityNum = parseFloat(quantity) || 0;
     
     if (quantityNum > 0) {
       // Calculer pour la quantité donnée (valeurs pour 100g)
       const calculatedCalories = Math.round((foodCalories * quantityNum) / 100);
       const calculatedProteins = Math.round((foodProteins * quantityNum) / 100 * 100) / 100;
       
       previewKcal.textContent = calculatedCalories;
       previewProt.textContent = calculatedProteins + ' g';
       
       // Ne pas mettre à jour les compteurs principaux en temps réel
       // updateCountersWithPreview(calculatedCalories, calculatedProteins);
       
       console.log('🧮 Calcul quantité:', {
         quantity: quantityNum,
         calories: calculatedCalories,
         proteins: calculatedProteins
       });
     } else {
       previewKcal.textContent = '0';
       previewProt.textContent = '0 g';
       
       // Ne pas remettre les compteurs normaux en temps réel
       // updateCountersWithPreview(0, 0);
     }
   }

   // Mettre à jour les compteurs avec l'aperçu de la quantité
   function updateCountersWithPreview(previewCalories, previewProteins) {
     // Récupérer les valeurs actuelles de la BDD
     const currentCalories = window.calTrackerDB ? window.calTrackerDB.currentData?.caloriesGoal || 0 : 0;
     const currentProteins = window.calTrackerDB ? window.calTrackerDB.currentData?.proteinsGoal || 0 : 0;
     const currentConsumedCalories = window.calTrackerDB ? window.calTrackerDB.currentData?.caloriesConsumed || 0 : 0;
     const currentConsumedProteins = window.calTrackerDB ? window.calTrackerDB.currentData?.proteinsConsumed || 0 : 0;
     
     // Calculer les totaux avec l'aperçu
     const totalConsumedCalories = currentConsumedCalories + previewCalories;
     const totalConsumedProteins = currentConsumedProteins + previewProteins;
     
     // Calculer les restants
     const remainingCalories = currentCalories - totalConsumedCalories;
     const remainingProteins = currentProteins - totalConsumedProteins;
     
     // Mettre à jour l'affichage
     updateCounters(remainingCalories, remainingProteins);
   }

   // Sauvegarder la quantité dans le planning
   async function saveQuantityToPlanning() {
     const quantityModal = document.getElementById('quantityModal');
     const quantityInput = document.getElementById('quantityInput');
     
     if (!quantityModal || !quantityInput) return;
     
     const foodId = quantityModal.dataset.foodId;
     const mealType = quantityModal.dataset.mealType;
     const planningId = quantityModal.dataset.planningId; // Pour la modification
     const quantity = parseInt(quantityInput.value);
     
     if (!foodId || !mealType || !quantity || quantity <= 0) {
       showError('Veuillez entrer une quantité valide');
       return;
     }
     
     try {
       if (planningId) {
         // MODIFICATION - Mettre à jour la quantité existante
         console.log('✏️ Modification planning:', { planningId, quantity });
         
         await window.calTrackerDB.updatePlanningItemQuantity(planningId, quantity);
         
         // Recharger les données pour mettre à jour l'affichage
         await loadDataFromDB();
         
         // Recharger le planning du jour
         await loadTodayPlanning();
         
         // Fermer la modal
         quantityModal.close();
         
         console.log('✅ Quantité modifiée avec succès');
       } else {
         // AJOUT - Nouvel aliment au planning
         console.log('💾 Ajout planning:', { foodId, mealType, quantity });
         
         // Ajouter au planning journalier
         await window.calTrackerDB.addToPlanning(foodId, mealType, quantity);
         
         // Recalculer les calories/protéines consommées
         const consumed = await window.calTrackerDB.calculateTodayConsumed();
         
         // Mettre à jour les valeurs consommées dans global_goals
         await window.calTrackerDB.updateConsumed(consumed.calories, consumed.proteins);
         
         // Recharger les données pour mettre à jour l'affichage
         await loadDataFromDB();
         
         // Recharger le planning du jour
         await loadTodayPlanning();
         
         // Fermer la modal
         quantityModal.close();
         
         console.log('✅ Aliment ajouté au planning avec succès');
       }
     } catch (error) {
       console.error('❌ Erreur sauvegarde planning:', error);
       showError('Erreur lors de la sauvegarde');
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
      adjustBtn.addEventListener('click', async () => {
        try {
          // Récupérer les valeurs actuelles depuis la BDD
          const data = await window.calTrackerDB.getGoalsAndConsumed();
          
          // Pré-remplir les champs avec les valeurs actuelles
          if (counterInputEl) counterInputEl.value = data.caloriesGoal;
          if (proteinInputEl) proteinInputEl.value = data.proteinsGoal;
          
          // Ouvrir la modal
          if (adjustModal) adjustModal.showModal();
          
          console.log('📝 Modal ouverte avec les valeurs actuelles:', data.caloriesGoal, 'kcal,', data.proteinsGoal, 'g prot');
        } catch (error) {
          console.error('❌ Erreur chargement valeurs:', error);
          showError('Erreur lors du chargement des objectifs actuels');
        }
      });
    }

    // Bouton appliquer les objectifs
    if (adjustApplyBtn) {
      adjustApplyBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const cal = parseInt(counterInputEl?.value || '3000');
        const prot = parseInt(proteinInputEl?.value || '150');
        
        try {
          console.log('🔄 Mise à jour des objectifs:', cal, 'kcal,', prot, 'g prot');
          
          // Mettre à jour les objectifs dans la BDD
          await window.calTrackerDB.updateGoals(cal, prot);
          
          // Recharger les données depuis la BDD
          await loadDataFromDB();
          
          if (adjustModal) adjustModal.close();
          console.log('✅ Objectifs mis à jour avec succès');
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

    // Modal édition - Sauvegarder
    const editFoodSave = document.getElementById('editFoodSave');
    if (editFoodSave) {
      editFoodSave.addEventListener('click', async (e) => {
        e.preventDefault();
        
        try {
          const editModal = document.getElementById('editModal');
          const foodId = editModal?.dataset.foodId;
          const editFoodName = document.getElementById('editFoodName');
          const editFoodCat = document.getElementById('editFoodCat');
          const editFoodKcal = document.getElementById('editFoodKcal');
          const editFoodProt = document.getElementById('editFoodProt');
          
          const name = editFoodName?.value;
          const category = editFoodCat?.value;
          const calories = editFoodKcal?.value;
          const proteins = editFoodProt?.value;
          
          if (!foodId || !name || !category || !calories || !proteins) {
            showError('Tous les champs sont obligatoires');
            return;
          }
          
          // Validation des valeurs numériques
          const caloriesNum = parseInt(calories);
          const proteinsNum = parseFloat(proteins);
          
          if (isNaN(caloriesNum) || caloriesNum < 0) {
            showError('Les calories doivent être un nombre positif');
            return;
          }
          
          if (isNaN(proteinsNum) || proteinsNum < 0) {
            showError('Les protéines doivent être un nombre positif');
            return;
          }
          
          // Validation des limites de la base de données
          if (proteinsNum > 10000) {
            showError('Les protéines ne peuvent pas dépasser 10000g');
            return;
          }
          
          if (caloriesNum > 10000) {
            showError('Les calories ne peuvent pas dépasser 10000');
            return;
          }
          
          console.log('🔄 Mise à jour aliment:', { foodId, name, category, calories: caloriesNum, proteins: proteinsNum });
          
          // Mettre à jour dans la BDD
          await window.calTrackerDB.updateFood(foodId, name, category, calories, proteins);
          
          // Recharger la liste des aliments
          await loadFoodsFromDB();
          
          // Fermer la modal
          if (editModal) editModal.close();
          
          console.log('✅ Aliment mis à jour avec succès');
        } catch (error) {
          console.error('❌ Erreur mise à jour aliment:', error);
          showError('Erreur lors de la mise à jour de l\'aliment');
        }
      });
    }

     // Modal édition - Annuler
     const editFoodCancel = document.getElementById('editFoodCancel');
     if (editFoodCancel) {
       editFoodCancel.addEventListener('click', (e) => {
         e.preventDefault();
         const editModal = document.getElementById('editModal');
         if (editModal) editModal.close();
       });
     }

     // Modal ajout - Sauvegarder
     const modalFoodSave = document.getElementById('modalFoodSave');
     if (modalFoodSave) {
       modalFoodSave.addEventListener('click', async (e) => {
         e.preventDefault();
         
         try {
           const modalFoodName = document.getElementById('modalFoodName');
           const modalFoodCat = document.getElementById('modalFoodCat');
           const modalFoodKcal = document.getElementById('modalFoodKcal');
           const modalFoodProt = document.getElementById('modalFoodProt');
           
           const name = modalFoodName?.value?.trim();
           const category = modalFoodCat?.value;
           const calories = modalFoodKcal?.value;
           const proteins = modalFoodProt?.value;
           
           if (!name || !category || !calories || !proteins) {
             showError('Veuillez remplir tous les champs');
             return;
           }
           
           // Validation que seuls des chiffres sont acceptés
           if (!/^\d+$/.test(calories)) {
             showError('Les calories ne peuvent contenir que des chiffres');
             return;
           }
           
           if (!/^\d*\.?\d+$/.test(proteins)) {
             showError('Les protéines ne peuvent contenir que des chiffres (ex: 15.5)');
             return;
           }
           
           // Validation des valeurs numériques
           const caloriesNum = parseInt(calories);
           const proteinsNum = parseFloat(proteins);
           
           if (isNaN(caloriesNum) || caloriesNum < 0) {
             showError('Les calories doivent être un nombre positif');
             return;
           }
           
           if (isNaN(proteinsNum) || proteinsNum < 0) {
             showError('Les protéines doivent être un nombre positif');
             return;
           }
           
           // Validation des limites de la base de données
           if (proteinsNum > 10000) {
             showError('Les protéines ne peuvent pas dépasser 10000g');
             return;
           }
           
           if (caloriesNum > 10000) {
             showError('Les calories ne peuvent pas dépasser 10000');
             return;
           }
           
           console.log('🔄 Ajout aliment:', { name, category, calories: caloriesNum, proteins: proteinsNum });
           
           // Ajouter dans la BDD
           await window.calTrackerDB.addFood(name, category, caloriesNum, proteinsNum);
           
           // Recharger la liste des aliments
           await loadFoodsFromDB();
           
           // Fermer la modal
           const foodModal = document.getElementById('foodModal');
           if (foodModal) foodModal.close();
           
           // Vider les champs
           if (modalFoodName) modalFoodName.value = '';
           if (modalFoodKcal) modalFoodKcal.value = '';
           if (modalFoodProt) modalFoodProt.value = '';
           if (modalFoodCat) modalFoodCat.value = 'autre';
           
           // Message de succès supprimé
           
           console.log('✅ Aliment ajouté avec succès');
         } catch (error) {
           console.error('❌ Erreur ajout aliment:', error);
           showError('Erreur lors de l\'ajout de l\'aliment');
         }
       });
     }

     // Modal ajout - Annuler
     const modalFoodCancel = document.getElementById('modalFoodCancel');
     if (modalFoodCancel) {
       modalFoodCancel.addEventListener('click', (e) => {
         e.preventDefault();
         const foodModal = document.getElementById('foodModal');
         if (foodModal) foodModal.close();
       });
     }

     // Bouton + pour ajouter un aliment
     const fabAdd = document.getElementById('fabAdd');
     if (fabAdd) {
       fabAdd.addEventListener('click', (e) => {
         e.preventDefault();
         console.log('➕ Bouton + cliqué');
         window.addNewFood();
       });
       console.log('✅ Événement bouton + attaché');
     } else {
       console.error('❌ Bouton fabAdd non trouvé');
     }

     // Bouton OK de la popup d'erreur
     const errorClose = document.getElementById('errorClose');
     if (errorClose) {
       errorClose.addEventListener('click', (e) => {
         e.preventDefault();
         const errorModal = document.getElementById('errorModal');
         if (errorModal) errorModal.close();
       });
       console.log('✅ Événement bouton OK erreur attaché');
     } else {
       console.error('❌ Bouton errorClose non trouvé');
     }

     // Barre de recherche d'aliments
     const foodQuery = document.getElementById('foodQuery');
     if (foodQuery) {
       foodQuery.addEventListener('input', (e) => {
         console.log('🔍 Recherche input:', e.target.value);
         applyFilters();
       });
       foodQuery.addEventListener('keyup', (e) => {
         console.log('🔍 Recherche keyup:', e.target.value);
         applyFilters();
       });
       console.log('✅ Événements recherche attachés');
     } else {
       console.error('❌ Champ foodQuery non trouvé');
     }

     // Filtre par catégorie
     const foodCatFilter = document.getElementById('foodCatFilter');
     if (foodCatFilter) {
       foodCatFilter.addEventListener('change', (e) => {
         console.log('🏷️ Filtre catégorie changé:', e.target.value);
         applyFilters();
       });
       foodCatFilter.addEventListener('input', (e) => {
         console.log('🏷️ Filtre catégorie input:', e.target.value);
         applyFilters();
       });
       console.log('✅ Événements filtre catégorie attachés');
     } else {
       console.error('❌ Champ foodCatFilter non trouvé');
     }

     // Calcul en temps réel de la quantité
     const quantityInput = document.getElementById('quantityInput');
     if (quantityInput) {
       quantityInput.addEventListener('input', (e) => {
         updateQuantityCalculation(e.target.value);
       });
       console.log('✅ Événement calcul quantité attaché');
     } else {
       console.error('❌ Champ quantityInput non trouvé');
     }

     // Sauvegarder la quantité
     const quantitySave = document.getElementById('quantitySave');
     if (quantitySave) {
       quantitySave.addEventListener('click', async (e) => {
         e.preventDefault();
         await saveQuantityToPlanning();
       });
       console.log('✅ Événement sauvegarde quantité attaché');
     } else {
       console.error('❌ Bouton quantitySave non trouvé');
     }

     // Annuler la quantité
     const quantityCancel = document.getElementById('quantityCancel');
     if (quantityCancel) {
       quantityCancel.addEventListener('click', (e) => {
         e.preventDefault();
         const quantityModal = document.getElementById('quantityModal');
         if (quantityModal) quantityModal.close();
       });
       console.log('✅ Événement annulation quantité attaché');
     } else {
       console.error('❌ Bouton quantityCancel non trouvé');
     }
  }

  // ===== GESTION DES ONGLETS =====
  function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    const tabPanels = document.querySelectorAll('.tab-panel');
    const modalFoodSave = document.getElementById('modalFoodSave');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tabTarget;
        
        // Retirer la classe active de tous les onglets et panneaux
        tabs.forEach(t => t.classList.remove('active'));
        tabPanels.forEach(p => p.classList.remove('active'));
        
        // Ajouter la classe active à l'onglet et au panneau sélectionnés
        tab.classList.add('active');
        const targetPanel = document.querySelector(targetTab);
        if (targetPanel) {
          targetPanel.classList.add('active');
        }
        
        console.log('📑 Onglet changé:', targetTab);
        
        // Masquer/afficher les boutons selon l'onglet actif
        if (targetTab === '#tabScan') {
          modalFoodSave.style.display = 'none';
          // Masquer aussi le bouton Annuler des modal-actions
          const modalActions = document.querySelector('.modal-actions');
          if (modalActions) {
            modalActions.style.display = 'none';
          }
          console.log('📷 Lancement automatique du scan...');
          setTimeout(() => {
            startScanning();
          }, 500); // Petit délai pour laisser l'interface se charger
        } else {
          modalFoodSave.style.display = 'block';
          // Afficher les modal-actions pour l'onglet Manuel
          const modalActions = document.querySelector('.modal-actions');
          if (modalActions) {
            modalActions.style.display = 'flex';
          }
          // Si on quitte l'onglet Scan, arrêter le scan
          if (isScanning) {
            stopScanning();
          }
        }
      });
    });
  }

  // ===== GESTION DU SCANNER =====
  function initScanner() {
    try {
      // Vérifier si ZXing est disponible
      if (typeof ZXing === 'undefined') {
        console.error('❌ ZXing non disponible');
        return;
      }

      // Initialiser le lecteur de codes-barres
      codeReader = new ZXing.BrowserBarcodeReader();
      console.log('✅ Scanner ZXing initialisé');

      // Configurer les événements du scanner
      setupScannerEvents();
      
      // Configurer les onglets
      setupTabs();
      
    } catch (error) {
      console.error('❌ Erreur initialisation scanner:', error);
    }
  }

  function setupScannerEvents() {
    const scanToggleBtn = document.getElementById('scan-toggle');
    const scanCancelBtn = document.getElementById('scan-cancel');

    if (scanToggleBtn) {
      scanToggleBtn.addEventListener('click', () => {
        if (isScanning) {
          stopScanning();
        } else {
          startScanning();
        }
      });
    }

    if (scanCancelBtn) {
      scanCancelBtn.addEventListener('click', () => {
        const foodModal = document.getElementById('foodModal');
        if (foodModal) {
          foodModal.close();
        }
      });
    }
  }

  async function startScanning() {
    if (isScanning) return;

    try {
      console.log('📷 Démarrage du scan...');
      
      // Afficher un message de chargement
      showScannerResults('Demande d\'accès à la caméra...');
      
      // Demander l'accès à la caméra
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment' // Caméra arrière
        } 
      });

      currentStream = stream;
      isScanning = true;

      // Afficher le flux vidéo
      const scannerArea = document.getElementById('scanner-area');
      if (scannerArea) {
        scannerArea.innerHTML = `<video id="scanner-video" autoplay playsinline style="width: 100%; height: 100%; object-fit: cover;"></video>`;
        const video = document.getElementById('scanner-video');
        video.srcObject = stream;

        // Démarrer la détection de codes-barres
        startBarcodeDetection(video);
      }

      // Masquer le bouton de démarrage et afficher le bouton d'arrêt
      // Mettre à jour le bouton toggle
      const scanToggleBtn = document.getElementById('scan-toggle');
      if (scanToggleBtn) {
        scanToggleBtn.textContent = 'Arrêter le scan';
        scanToggleBtn.classList.remove('btn-adjust');
        scanToggleBtn.classList.add('btn-ghost');
      }

      // Masquer les résultats de chargement
      const results = document.getElementById('scanner-results');
      if (results) results.style.display = 'none';

      console.log('✅ Scan démarré');
    } catch (error) {
      console.error('❌ Erreur démarrage scan:', error);
      
      let errorMessage = 'Erreur d\'accès à la caméra.';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Accès à la caméra refusé. Veuillez autoriser l\'accès à la caméra dans les paramètres du navigateur.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'Aucune caméra trouvée sur cet appareil.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'L\'accès à la caméra n\'est pas supporté sur ce navigateur.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'La caméra est déjà utilisée par une autre application.';
      }
      
      showScannerResults(errorMessage);
      showError(errorMessage);
    }
  }

  function startBarcodeDetection(video) {
    if (!codeReader) return;

    const detectBarcode = () => {
      if (!isScanning) return;

      codeReader.decodeFromVideoElement(video)
        .then(result => {
          console.log('📱 Code-barres détecté:', result.text);
          handleBarcodeDetected(result.text);
        })
        .catch(error => {
          // Pas d'erreur, juste pas de code détecté
          if (isScanning) {
            requestAnimationFrame(detectBarcode);
          }
        });
    };

    detectBarcode();
  }

  function stopScanning() {
    if (!isScanning) return;

    console.log('🛑 Arrêt du scan...');
    
    isScanning = false;

    // Arrêter le flux vidéo
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
      currentStream = null;
    }

    // Réinitialiser l'affichage
    const scannerArea = document.getElementById('scanner-area');
    if (scannerArea) {
      scannerArea.innerHTML = '';
    }

    // Masquer le bouton d'arrêt et afficher le bouton de démarrage
    // Remettre le bouton en mode "Démarrer"
    const scanToggleBtn = document.getElementById('scan-toggle');
    if (scanToggleBtn) {
      scanToggleBtn.textContent = 'Démarrer le scan';
      scanToggleBtn.classList.remove('btn-ghost');
      scanToggleBtn.classList.add('btn-adjust');
    }

    // Masquer les résultats
    const results = document.getElementById('scanner-results');
    if (results) results.style.display = 'none';

    console.log('✅ Scan arrêté');
  }

  async function handleBarcodeDetected(barcode) {
    console.log('🔍 Traitement du code-barres:', barcode);
    
    try {
      // Arrêter le scan
      stopScanning();
      
      // Afficher un message de chargement
      showScannerResults('Recherche des informations nutritionnelles...');
      
      // Appeler l'API Open Food Facts
      const foodData = await fetchFoodDataFromAPI(barcode);
      
      if (foodData) {
        // Afficher les résultats
        displayFoodData(foodData);
        
        // Pré-remplir le formulaire manuel
        prefillManualForm(foodData);
        
        // Basculer vers l'onglet manuel
        switchToManualTab();
      } else {
        showScannerResults('Aucune information trouvée pour ce code-barres');
      }
      
    } catch (error) {
      console.error('❌ Erreur traitement code-barres:', error);
      showScannerResults('Erreur lors de la recherche des informations');
    }
  }

  async function fetchFoodDataFromAPI(barcode) {
    try {
      console.log('🌐 Appel API Open Food Facts pour:', barcode);
      
      const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      const data = await response.json();
      
      if (data.status === 1 && data.product) {
        const product = data.product;
        
        // Extraire les informations nutritionnelles
        const foodData = {
          name: product.product_name || 'Produit inconnu',
          category: mapCategory(product.categories_tags),
          calories: extractCalories(product.nutriments),
          proteins: extractProteins(product.nutriments)
        };
        
        console.log('✅ Données récupérées:', foodData);
        return foodData;
      } else {
        console.log('❌ Produit non trouvé dans Open Food Facts');
        return null;
      }
    } catch (error) {
      console.error('❌ Erreur API Open Food Facts:', error);
      return null;
    }
  }

  function mapCategory(categories) {
    if (!categories || !Array.isArray(categories)) return 'autre';
    
    const categoryMap = {
      'fruits': 'fruit',
      'vegetables': 'legume',
      'meat': 'viande',
      'cereals': 'cereale',
      'dairy': 'laitier',
      'beverages': 'boisson'
    };
    
    for (const category of categories) {
      for (const [key, value] of Object.entries(categoryMap)) {
        if (category.toLowerCase().includes(key)) {
          return value;
        }
      }
    }
    
    return 'autre';
  }

  function extractCalories(nutriments) {
    if (!nutriments) return 0;
    
    // Essayer différentes clés pour les calories
    const calorieKeys = ['energy-kcal_100g', 'energy_100g', 'calories_100g'];
    
    for (const key of calorieKeys) {
      if (nutriments[key]) {
        return Math.round(nutriments[key]);
      }
    }
    
    return 0;
  }

  function extractProteins(nutriments) {
    if (!nutriments) return 0;
    
    // Essayer différentes clés pour les protéines
    const proteinKeys = ['proteins_100g', 'protein_100g'];
    
    for (const key of proteinKeys) {
      if (nutriments[key]) {
        return Math.round(nutriments[key] * 100) / 100; // Arrondir à 2 décimales
      }
    }
    
    return 0;
  }

  function showScannerResults(message) {
    const results = document.getElementById('scanner-results');
    const info = document.getElementById('scanned-food-info');
    
    if (results && info) {
      results.style.display = 'block';
      info.innerHTML = `<div style="text-align: center; padding: 20px; color: #6fd6ff;">${message}</div>`;
    }
  }

  function displayFoodData(foodData) {
    const results = document.getElementById('scanner-results');
    const info = document.getElementById('scanned-food-info');
    
    if (results && info) {
      results.style.display = 'block';
      info.innerHTML = `
        <div class="scanned-food-item">
          <strong>Nom</strong>
          <span>${foodData.name}</span>
        </div>
        <div class="scanned-food-item">
          <strong>Calories</strong>
          <span>${foodData.calories} kcal/100g</span>
        </div>
        <div class="scanned-food-item">
          <strong>Protéines</strong>
          <span>${foodData.proteins}g/100g</span>
        </div>
        <div class="scanned-food-item">
          <strong>Catégorie</strong>
          <span>${foodData.category}</span>
        </div>
      `;
    }
  }

  function prefillManualForm(foodData) {
    // Pré-remplir le formulaire manuel avec les données scannées
    const nameInput = document.getElementById('modalFoodName');
    const catInput = document.getElementById('modalFoodCat');
    const kcalInput = document.getElementById('modalFoodKcal');
    const protInput = document.getElementById('modalFoodProt');
    
    if (nameInput) nameInput.value = foodData.name;
    if (catInput) catInput.value = foodData.category;
    if (kcalInput) kcalInput.value = foodData.calories;
    if (protInput) protInput.value = foodData.proteins;
    
    console.log('📝 Formulaire pré-rempli avec les données scannées');
  }

  function switchToManualTab() {
    // Basculer vers l'onglet manuel
    const manualTab = document.querySelector('[data-tab-target="#tabManual"]');
    if (manualTab) {
      manualTab.click();
    }
  }


  // ===== FONCTIONS UTILITAIRES =====
  function formatInt(n) {
    return new Intl.NumberFormat('fr-FR').format(n);
  }

   function showError(message) {
     const errorModal = document.getElementById('errorModal');
     const errorMessage = document.getElementById('errorMessage');
     const errorTitle = document.getElementById('errorTitle');
     if (errorModal && errorMessage && errorTitle) {
       errorTitle.textContent = '⚠️ Erreur';
       errorMessage.innerHTML = message;
       errorModal.showModal();
     }
   }

  // ===== FONCTIONS GLOBALES =====
  // Fonction pour ajouter un aliment au compteur
  window.addFoodToCounter = function(foodId, foodName, calories, proteins) {
    console.log('🍎 Ajout aliment:', foodName, calories, 'kcal,', proteins, 'g prot');
    
    // Utiliser la fonction decrement pour ajouter les calories/protéines
    window.calTracker.decrement(calories, proteins);
    
    // Afficher un message de confirmation
    showSuccess(`${foodName} ajouté ! (+${calories} kcal, +${proteins}g prot)`);
  };

  // Fonction pour éditer un aliment
  window.editFood = async function(foodId) {
    console.log('✏️ Édition aliment:', foodId);
    
    try {
      // Récupérer les données de l'aliment
      const foods = await window.calTrackerDB.getAllFoods();
      const food = foods.find(f => f.id === foodId);
      
      if (!food) {
        showError('Aliment non trouvé');
        return;
      }
      
      // Pré-remplir les champs de la modal d'édition
      const editModal = document.getElementById('editModal');
      const editFoodName = document.getElementById('editFoodName');
      const editFoodKcal = document.getElementById('editFoodKcal');
      const editFoodProt = document.getElementById('editFoodProt');
      const editFoodCat = document.getElementById('editFoodCat');
      
      if (editFoodName) editFoodName.value = food.name;
      if (editFoodKcal) editFoodKcal.value = food.calories;
      if (editFoodProt) editFoodProt.value = food.proteins;
       if (editFoodCat) {
         // Normaliser la catégorie pour correspondre aux options du select
         const category = food.category || 'Autre';
         const normalizedCategory = category.toLowerCase();
         
         // Vérifier si la catégorie existe dans les options
         const optionExists = Array.from(editFoodCat.options).some(option => 
           option.value === normalizedCategory
         );
         
         if (optionExists) {
           editFoodCat.value = normalizedCategory;
         } else {
           editFoodCat.value = 'autre'; // Valeur par défaut
         }
         
         // Déclencher l'événement change pour mettre à jour l'affichage
         editFoodCat.dispatchEvent(new Event('change'));
       }
      
      // Stocker l'ID de l'aliment pour la sauvegarde
      if (editModal) editModal.dataset.foodId = foodId;
      
      // Ouvrir la modal
      if (editModal) editModal.showModal();
      
      console.log('📝 Modal d\'édition ouverte pour:', food.name);
    } catch (error) {
      console.error('❌ Erreur chargement aliment:', error);
      showError('Erreur lors du chargement de l\'aliment');
    }
  };

   // Fonction pour supprimer un aliment
   window.deleteFood = async function(foodId) {
     console.log('❌ Suppression aliment:', foodId);
     
     try {
       // Supprimer de la BDD
       await window.calTrackerDB.deleteFood(foodId);
       
       // Recharger la liste des aliments
       await loadFoodsFromDB();
       
       console.log('✅ Aliment supprimé');
     } catch (error) {
       console.error('❌ Erreur suppression:', error);
       showError('Erreur lors de la suppression de l\'aliment');
     }
   };

   // Fonction pour ouvrir la popup d'ajout d'aliment
   window.addNewFood = function() {
     console.log('➕ Ouverture popup ajout aliment');
     
     const foodModal = document.getElementById('foodModal');
     console.log('🔍 Modal trouvée:', !!foodModal);
     
     if (foodModal) {
       // Vider les champs
       const modalFoodName = document.getElementById('modalFoodName');
       const modalFoodCat = document.getElementById('modalFoodCat');
       const modalFoodKcal = document.getElementById('modalFoodKcal');
       const modalFoodProt = document.getElementById('modalFoodProt');
       
       console.log('🔍 Champs trouvés:', {
         name: !!modalFoodName,
         cat: !!modalFoodCat,
         kcal: !!modalFoodKcal,
         prot: !!modalFoodProt
       });
       
       if (modalFoodName) modalFoodName.value = '';
       if (modalFoodKcal) modalFoodKcal.value = '';
       if (modalFoodProt) modalFoodProt.value = '';
       if (modalFoodCat) modalFoodCat.value = 'autre';
       
       // Basculer vers l'onglet manuel
       const manualTab = document.querySelector('[data-tab-target="#tabManual"]');
       if (manualTab) {
         manualTab.click();
       }
       
       // Ouvrir la modal
       foodModal.showModal();
       
       console.log('📝 Modal d\'ajout ouverte');
     } else {
       console.error('❌ Modal foodModal non trouvée');
     }
   };

   // Fonction pour afficher un message de succès
   function showSuccess(message) {
     // Créer un toast de succès
     const toast = document.createElement('div');
     toast.style.cssText = `
       position: fixed;
       top: 20px;
       right: 20px;
       background: #49b36b;
       color: white;
       padding: 12px 20px;
       border-radius: 8px;
       z-index: 10000;
       font-weight: 500;
       box-shadow: 0 4px 12px rgba(0,0,0,0.3);
     `;
     toast.textContent = message;
     
     document.body.appendChild(toast);
     
     // Supprimer après 3 secondes
     setTimeout(() => {
       if (toast.parentNode) {
         toast.parentNode.removeChild(toast);
       }
     }, 3000);
   }

   // Fonction pour modifier un aliment du planning
   window.editPlanningItem = async function(planningId) {
     try {
       console.log('✏️ Modification planning item:', planningId);
       
       // Récupérer les données de l'aliment du planning
       const planning = await window.calTrackerDB.getTodayPlanning();
       const planningItem = planning.find(item => item.id === planningId);
       
       if (!planningItem || !planningItem.foods) {
         showError('Aliment du planning non trouvé');
         return;
       }
       
       // Ouvrir la popup de quantité avec les données de l'aliment (sans appel BDD supplémentaire)
       openQuantityModalDirect(planningItem.foods, planningItem.meal_type, planningId, planningItem.quantity);
       
     } catch (error) {
       console.error('❌ Erreur ouverture modification planning:', error);
       showError('Erreur lors de l\'ouverture de la modification');
     }
   };

   // Fonction pour supprimer un aliment du planning
   window.deletePlanningItem = async function(planningId) {
     try {
       console.log('❌ Suppression planning item:', planningId);
       
       // Supprimer l'aliment du planning et recalculer les totaux
       await window.calTrackerDB.deletePlanningItem(planningId);
       
       // Recharger les données pour mettre à jour l'affichage
       await loadDataFromDB();
       
       console.log('✅ Aliment supprimé du planning avec succès');
     } catch (error) {
       console.error('❌ Erreur suppression planning:', error);
       showError('Erreur lors de la suppression de l\'aliment du planning');
     }
   };

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
