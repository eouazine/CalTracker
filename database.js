// Interface Supabase pour CalTracker
class CalTrackerDB {
  constructor() {
    this.supabase = null;
    this.isInitialized = false;
    this.init();
  }

  async init() {
    try {
      // Vérifier que Supabase est chargé
      if (typeof supabase === 'undefined') {
        console.error('❌ Supabase non chargé');
        return;
      }

      // Initialiser Supabase
      this.supabase = supabase.createClient(
        SUPABASE_CONFIG.url,
        SUPABASE_CONFIG.anonKey
      );

      this.isInitialized = true;
      console.log('✅ Base de données initialisée');
    } catch (error) {
      console.error('❌ Erreur initialisation BDD:', error);
    }
  }

  // Récupérer les objectifs et valeurs consommées
  async getGoalsAndConsumed() {
    if (!this.isInitialized) {
      throw new Error('Base de données non initialisée');
    }

    try {
      const { data, error } = await this.supabase
        .from('global_goals')
        .select('calories_goal, proteins_goal, calories_consumed, proteins_consumed')
        .single();

      if (error) throw error;

      return {
        caloriesGoal: data.calories_goal || 0,
        proteinsGoal: data.proteins_goal || 0,
        caloriesConsumed: data.calories_consumed || 0,
        proteinsConsumed: data.proteins_consumed || 0
      };
    } catch (error) {
      console.error('❌ Erreur récupération données:', error);
      throw error;
    }
  }

  // Récupérer tous les aliments
  async getAllFoods() {
    if (!this.isInitialized) {
      throw new Error('Base de données non initialisée');
    }

    try {
      const { data, error } = await this.supabase
        .from('foods')
        .select('id, name, category, calories, proteins')
        .order('name');

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('❌ Erreur récupération aliments:', error);
      throw error;
    }
  }

  // Récupérer un aliment par son ID
  async getFoodById(foodId) {
    if (!this.isInitialized) {
      throw new Error('Base de données non initialisée');
    }

    try {
      const { data, error } = await this.supabase
        .from('foods')
        .select('id, name, category, calories, proteins')
        .eq('id', foodId)
        .single();

      if (error) throw error;
      console.log('✅ Aliment récupéré par ID:', data);
      return data;
    } catch (error) {
      console.error('❌ Erreur récupération aliment par ID:', error);
      throw error;
    }
  }

  // Supprimer un aliment
  async deleteFood(foodId) {
    if (!this.isInitialized) {
      throw new Error('Base de données non initialisée');
    }

    try {
      const { error } = await this.supabase
        .from('foods')
        .delete()
        .eq('id', foodId);

      if (error) throw error;
      console.log('✅ Aliment supprimé');
      return true;
    } catch (error) {
      console.error('❌ Erreur suppression aliment:', error);
      throw error;
    }
  }

  // Ajouter un nouvel aliment
  async addFood(name, category, calories, proteins) {
    if (!this.isInitialized) {
      throw new Error('Base de données non initialisée');
    }

    try {
      const { data, error } = await this.supabase
        .from('foods')
        .insert({
          name: name,
          category: category,
          calories: parseInt(calories),
          proteins: parseFloat(proteins)
        })
        .select();

      if (error) throw error;
      console.log('✅ Aliment ajouté:', data[0]);
      return data[0];
    } catch (error) {
      console.error('❌ Erreur ajout aliment:', error);
      throw error;
    }
  }

  // Mettre à jour un aliment
  async updateFood(foodId, name, category, calories, proteins) {
    if (!this.isInitialized) {
      throw new Error('Base de données non initialisée');
    }

    try {
      const { error } = await this.supabase
        .from('foods')
        .update({
          name: name,
          category: category,
          calories: parseInt(calories),
          proteins: parseFloat(proteins)
        })
        .eq('id', foodId);

      if (error) throw error;
      console.log('✅ Aliment mis à jour');
      return true;
    } catch (error) {
      console.error('❌ Erreur mise à jour aliment:', error);
      throw error;
    }
  }

  // Mettre à jour les valeurs consommées
  async updateConsumed(calories, proteins) {
    if (!this.isInitialized) {
      throw new Error('Base de données non initialisée');
    }

    try {
      // D'abord, récupérer l'ID de l'enregistrement existant
      const { data: existingData, error: fetchError } = await this.supabase
        .from('global_goals')
        .select('id')
        .limit(1)
        .single();

      if (fetchError) throw fetchError;

      // Mettre à jour avec l'ID récupéré
      const { error } = await this.supabase
        .from('global_goals')
        .update({
          calories_consumed: calories,
          proteins_consumed: proteins
        })
        .eq('id', existingData.id);

      if (error) throw error;
      console.log('✅ Valeurs consommées mises à jour');
      return true;
    } catch (error) {
      console.error('❌ Erreur mise à jour:', error);
      throw error;
    }
  }

  // Mettre à jour les objectifs
  async updateGoals(caloriesGoal, proteinsGoal) {
    if (!this.isInitialized) {
      throw new Error('Base de données non initialisée');
    }

    try {
      // D'abord, récupérer l'ID de l'enregistrement existant
      const { data: existingData, error: fetchError } = await this.supabase
        .from('global_goals')
        .select('id')
        .limit(1)
        .single();

      if (fetchError) throw fetchError;

      // Mettre à jour avec l'ID récupéré
      const { error } = await this.supabase
        .from('global_goals')
        .update({
          calories_goal: caloriesGoal,
          proteins_goal: proteinsGoal
        })
        .eq('id', existingData.id);

      if (error) throw error;
      console.log('✅ Objectifs mis à jour');
      return true;
    } catch (error) {
      console.error('❌ Erreur mise à jour objectifs:', error);
      throw error;
    }
  }

  // Ajouter un aliment au planning journalier
  async addToPlanning(foodId, mealType, quantity) {
    if (!this.isInitialized) {
      throw new Error('Base de données non initialisée');
    }

    try {
      const today = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD
      
      const { data, error } = await this.supabase
        .from('daily_planning')
        .insert({
          food_id: foodId,
          date: today,
          meal_type: mealType,
          quantity: quantity
        })
        .select();

      if (error) throw error;
      console.log('✅ Aliment ajouté au planning:', data[0]);
      return data[0];
    } catch (error) {
      console.error('❌ Erreur ajout planning:', error);
      throw error;
    }
  }

  // Récupérer le planning du jour
  async getTodayPlanning() {
    if (!this.isInitialized) {
      throw new Error('Base de données non initialisée');
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await this.supabase
        .from('daily_planning')
        .select(`
          *,
          foods (
            name,
            calories,
            proteins
          )
        `)
        .eq('date', today)
        .order('meal_type', { ascending: true });

      if (error) throw error;
      console.log('✅ Planning du jour récupéré:', data.length, 'aliments');
      return data;
    } catch (error) {
      console.error('❌ Erreur récupération planning:', error);
      throw error;
    }
  }

  // Calculer les calories et protéines consommées aujourd'hui
  async calculateTodayConsumed() {
    if (!this.isInitialized) {
      throw new Error('Base de données non initialisée');
    }

    try {
      const planning = await this.getTodayPlanning();
      
      let totalCalories = 0;
      let totalProteins = 0;

      planning.forEach(item => {
        if (item.foods) {
          // Calculer pour la quantité consommée
          const caloriesForQuantity = (item.foods.calories * item.quantity) / 100;
          const proteinsForQuantity = (item.foods.proteins * item.quantity) / 100;
          
          totalCalories += caloriesForQuantity;
          totalProteins += proteinsForQuantity;
        }
      });

      console.log('🧮 Calculs nutritionnels:', {
        totalCalories: Math.round(totalCalories),
        totalProteins: Math.round(totalProteins * 100) / 100
      });

      return {
        calories: Math.round(totalCalories),
        proteins: Math.round(totalProteins * 100) / 100
      };
    } catch (error) {
      console.error('❌ Erreur calcul consommé:', error);
      throw error;
    }
  }

  // Supprimer un aliment du planning et recalculer les totaux
  async deletePlanningItem(planningId) {
    if (!this.isInitialized) {
      throw new Error('Base de données non initialisée');
    }

    try {
      // 1. Récupérer les détails de l'aliment à supprimer
      const { data: planningData, error: fetchError } = await this.supabase
        .from('daily_planning')
        .select(`
          quantity,
          foods!inner(calories, proteins)
        `)
        .eq('id', planningId)
        .single();

      if (fetchError) throw fetchError;

      // 2. Calculer les calories et protéines de cet aliment
      const caloriesToSubtract = Math.round((planningData.foods.calories * planningData.quantity) / 100);
      const proteinsToSubtract = Math.round((planningData.foods.proteins * planningData.quantity) / 100 * 100) / 100;

      // 3. Récupérer les totaux actuels
      const { data: currentGoals, error: goalsError } = await this.supabase
        .from('global_goals')
        .select('calories_consumed, proteins_consumed, id')
        .single();

      if (goalsError) throw goalsError;

      // 4. Soustraire les calories et protéines de cet aliment
      const newCaloriesConsumed = Math.max(0, currentGoals.calories_consumed - caloriesToSubtract);
      const newProteinsConsumed = Math.max(0, currentGoals.proteins_consumed - proteinsToSubtract);

      // 5. Mettre à jour les totaux dans global_goals
      const { error: updateError } = await this.supabase
        .from('global_goals')
        .update({
          calories_consumed: newCaloriesConsumed,
          proteins_consumed: newProteinsConsumed
        })
        .eq('id', currentGoals.id);

      if (updateError) throw updateError;

      // 6. Supprimer l'enregistrement du planning
      const { error: deleteError } = await this.supabase
        .from('daily_planning')
        .delete()
        .eq('id', planningId);

      if (deleteError) throw deleteError;

      console.log('✅ Aliment supprimé du planning:', {
        caloriesSoustraites: caloriesToSubtract,
        proteinsSoustraites: proteinsToSubtract,
        nouveauxTotaux: { calories: newCaloriesConsumed, proteins: newProteinsConsumed }
      });

      return true;
    } catch (error) {
      console.error('❌ Erreur suppression planning:', error);
      throw error;
    }
  }

  // Modifier la quantité d'un aliment du planning et recalculer les totaux
  async updatePlanningItemQuantity(planningId, newQuantity) {
    if (!this.isInitialized) {
      throw new Error('Base de données non initialisée');
    }

    try {
      // 1. Récupérer les détails de l'aliment avec l'ancienne quantité
      const { data: planningData, error: fetchError } = await this.supabase
        .from('daily_planning')
        .select(`
          quantity,
          foods!inner(calories, proteins)
        `)
        .eq('id', planningId)
        .single();

      if (fetchError) throw fetchError;

      const oldQuantity = planningData.quantity;
      const foodCalories = planningData.foods.calories;
      const foodProteins = planningData.foods.proteins;

      // 2. Calculer les calories et protéines avec l'ANCIENNE quantité
      const oldCalories = Math.round((foodCalories * oldQuantity) / 100);
      const oldProteins = Math.round((foodProteins * oldQuantity) / 100 * 100) / 100;

      // 3. Calculer les calories et protéines avec la NOUVELLE quantité
      const newCalories = Math.round((foodCalories * newQuantity) / 100);
      const newProteins = Math.round((foodProteins * newQuantity) / 100 * 100) / 100;

      // 4. Récupérer les totaux actuels
      const { data: currentGoals, error: goalsError } = await this.supabase
        .from('global_goals')
        .select('calories_consumed, proteins_consumed, id')
        .single();

      if (goalsError) throw goalsError;

      // 5. Soustraire l'ancienne quantité et ajouter la nouvelle
      const updatedCaloriesConsumed = currentGoals.calories_consumed - oldCalories + newCalories;
      const updatedProteinsConsumed = currentGoals.proteins_consumed - oldProteins + newProteins;

      // 6. Mettre à jour les totaux dans global_goals
      const { error: updateGoalsError } = await this.supabase
        .from('global_goals')
        .update({
          calories_consumed: Math.max(0, updatedCaloriesConsumed),
          proteins_consumed: Math.max(0, updatedProteinsConsumed)
        })
        .eq('id', currentGoals.id);

      if (updateGoalsError) throw updateGoalsError;

      // 7. Mettre à jour la quantité dans daily_planning
      const { error: updatePlanningError } = await this.supabase
        .from('daily_planning')
        .update({ quantity: newQuantity })
        .eq('id', planningId);

      if (updatePlanningError) throw updatePlanningError;

      console.log('✅ Quantité modifiée:', {
        planningId,
        ancienneQuantite: oldQuantity,
        nouvelleQuantite: newQuantity,
        anciennesCalories: oldCalories,
        nouvellesCalories: newCalories,
        anciennesProteines: oldProteins,
        nouvellesProteines: newProteins,
        nouveauxTotaux: { 
          calories: Math.max(0, updatedCaloriesConsumed), 
          proteins: Math.max(0, updatedProteinsConsumed) 
        }
      });

      return true;
    } catch (error) {
      console.error('❌ Erreur modification quantité planning:', error);
      throw error;
    }
  }
}

// Créer l'instance globale
window.calTrackerDB = new CalTrackerDB();
