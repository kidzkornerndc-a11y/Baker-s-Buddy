export type Unit = 'g' | 'kg' | 'oz' | 'lb' | 'ml' | 'l' | 'cup' | 'tbsp' | 'tsp' | 'pcs';

export interface Ingredient {
  id: string;
  name: string;
  category: 'dry' | 'wet' | 'additive'; // Added additive for mix-ins
  purchasePrice: number;
  purchaseQuantity: string; 
  purchaseUnit: Unit;
  recipeQuantity: string;   
  recipeUnit: Unit;
}

export interface Packaging {
  id: string;
  name: string;
  purchasePrice: number;    
  purchaseQuantity: string; 
  quantityUsed: string;     
}

export interface BakeryState {
  ingredients: Ingredient[];
  packaging: Packaging[];
  batchYield: number; 
  profitMargin: number; 
  hourlyRate: number; 
  hoursSpent: number; 
}

export type Category = 'Cinnamon Rolls' | 'Cupcakes' | 'Breads' | 'Pastries' | 'Banana Bread';

export const CATEGORIES: Category[] = [
  'Cinnamon Rolls',
  'Cupcakes',
  'Breads',
  'Pastries',
  'Banana Bread'
];