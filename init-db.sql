-- Script d'initialisation pour CalTracker
-- À exécuter dans Supabase SQL Editor

-- 1. Créer l'enregistrement initial dans global_goals
INSERT INTO public.global_goals (
  id,
  calories_goal,
  proteins_goal,
  calories_consumed,
  proteins_consumed,
  progress_date
) VALUES (
  gen_random_uuid(),
  3000,  -- Objectif calories
  150,   -- Objectif protéines
  0,     -- Calories consommées (début de journée)
  0,     -- Protéines consommées (début de journée)
  CURRENT_DATE
);

-- 2. Vérifier que l'enregistrement a été créé
SELECT * FROM public.global_goals;
