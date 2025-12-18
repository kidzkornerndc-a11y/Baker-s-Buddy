import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Plus, ChefHat, Sparkles, AlertTriangle, Info, Save, Edit2, Lock, Droplets, Wheat, Cookie } from 'lucide-react';
import { 
  BakeryState, 
  Category, 
  CATEGORIES, 
  Ingredient, 
  Packaging 
} from './types';
import { IngredientRow } from './components/IngredientRow';
import { PackagingRow } from './components/PackagingRow';
import { SummaryCard } from './components/SummaryCard';
import { parseRecipeText } from './services/gemini';
import { UNIT_CONVERSION, parseFraction } from './constants';

const DEFAULT_STATE: BakeryState = {
  ingredients: [],
  packaging: [],
  batchYield: 12,
  profitMargin: 50,
  hourlyRate: 15,
  hoursSpent: 1
};

const INITIAL_DATA: Record<Category, BakeryState> = {
  'Cinnamon Rolls': { ...DEFAULT_STATE, ingredients: [] },
  'Cupcakes': { ...DEFAULT_STATE, ingredients: [] },
  'Breads': { ...DEFAULT_STATE, ingredients: [] },
  'Pastries': { ...DEFAULT_STATE, ingredients: [] },
  'Banana Bread': { ...DEFAULT_STATE, ingredients: [] },
};

export default function App() {
  const [activeTab, setActiveTab] = useState<Category>('Cinnamon Rolls');
  const [data, setData] = useState<Record<Category, BakeryState>>(INITIAL_DATA);
  const [isEditing, setIsEditing] = useState(true);
  const [lastAddedIngredientId, setLastAddedIngredientId] = useState<string | null>(null);
  
  // AI Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [recipeText, setRecipeText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Load from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('bakeryPriceData');
    if (saved) {
      try {
        const parsedData = JSON.parse(saved);
        if (parsedData && typeof parsedData === 'object') {
          // Migration: Ensure all ingredients have a category
          const migratedData = { ...parsedData };
          (Object.keys(migratedData) as Category[]).forEach(key => {
            if (migratedData[key].ingredients) {
              migratedData[key].ingredients = migratedData[key].ingredients.map((ing: any) => ({
                ...ing,
                category: ing.category || 'dry' // Default to dry if missing
              }));
            }
          });
          setData(migratedData);
          setIsEditing(false); 
        }
      } catch (e) {
        console.error("Failed to load saved data", e);
      }
    }
  }, []);

  const saveData = () => {
    localStorage.setItem('bakeryPriceData', JSON.stringify(data));
    setIsEditing(false);
  };

  const currentState = data[activeTab];

  // Derived filtered lists
  const dryIngredients = currentState.ingredients.filter(i => i.category === 'dry');
  const wetIngredients = currentState.ingredients.filter(i => i.category === 'wet');
  const additiveIngredients = currentState.ingredients.filter(i => i.category === 'additive');

  // Calculations
  const ingredientCost = currentState.ingredients.reduce((sum, ing) => {
    const pQty = parseFraction(ing.purchaseQuantity);
    const rQty = parseFraction(ing.recipeQuantity);

    const pFactor = UNIT_CONVERSION[ing.purchaseUnit];
    const rFactor = UNIT_CONVERSION[ing.recipeUnit];
    
    if (pQty === 0) return sum;
    
    // Pieces handling
    if(ing.purchaseUnit === 'pcs' || ing.recipeUnit === 'pcs') {
        if(ing.purchaseUnit === ing.recipeUnit) {
            return sum + (ing.purchasePrice / pQty) * rQty;
        }
        return sum;
    }
    
    if (!pFactor || !rFactor) return sum;
    const pricePerBase = ing.purchasePrice / (pQty * pFactor);
    const usageInBase = rQty * rFactor;
    return sum + (pricePerBase * usageInBase);
  }, 0);

  const packagingCost = currentState.packaging.reduce((sum, p) => {
      const pQty = parseFraction(p.purchaseQuantity);
      const uQty = parseFraction(p.quantityUsed);
      const costPerUnit = pQty > 0 ? p.purchasePrice / pQty : 0;
      return sum + (costPerUnit * uQty);
  }, 0);

  const laborCost = currentState.hourlyRate * currentState.hoursSpent;

  // Handlers
  const updateState = (updates: Partial<BakeryState>) => {
    setData(prev => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], ...updates }
    }));
  };

  const updateIngredient = (id: string, field: keyof Ingredient, value: any) => {
    const newIngredients = currentState.ingredients.map(ing => 
      ing.id === id ? { ...ing, [field]: value } : ing
    );
    updateState({ ingredients: newIngredients });
  };

  const removeIngredient = (id: string) => {
    updateState({ ingredients: currentState.ingredients.filter(i => i.id !== id) });
  };

  const addIngredient = (category: 'dry' | 'wet' | 'additive') => {
    const newIng: Ingredient = {
      id: uuidv4(),
      name: '',
      category: category,
      purchasePrice: 0,
      purchaseQuantity: "1",
      purchaseUnit: 'kg',
      recipeQuantity: "0",
      recipeUnit: 'g'
    };
    updateState({ ingredients: [...currentState.ingredients, newIng] });
    setLastAddedIngredientId(newIng.id);
  };

  const updatePackaging = (id: string, field: keyof Packaging, value: any) => {
    const newPackaging = currentState.packaging.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    );
    updateState({ packaging: newPackaging });
  };

  const removePackaging = (id: string) => {
    updateState({ packaging: currentState.packaging.filter(p => p.id !== id) });
  };

  const addPackaging = () => {
    const newPack: Packaging = {
      id: uuidv4(),
      name: '',
      purchasePrice: 0,
      purchaseQuantity: "1", 
      quantityUsed: currentState.batchYield.toString()
    };
    updateState({ packaging: [...currentState.packaging, newPack] });
  };

  const handleAiParse = async () => {
    if (!recipeText.trim()) return;
    setIsParsing(true);
    setParseError(null);
    try {
      const extractedIngredients = await parseRecipeText(recipeText);
      const fullIngredients = extractedIngredients.map(partial => ({
        id: uuidv4(),
        name: 'Unknown',
        purchasePrice: 0,
        purchaseQuantity: "1",
        purchaseUnit: 'kg' as const,
        recipeQuantity: "0",
        recipeUnit: 'g' as const,
        ...partial,
        category: partial.category || 'dry' // fallback
      } as Ingredient));

      updateState({ ingredients: [...currentState.ingredients, ...fullIngredients] });
      setIsAiModalOpen(false);
      setRecipeText('');
    } catch (err) {
      setParseError("Could not parse recipe. Please try again or enter manually.");
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-white border-b border-violet-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-violet-500 p-2 rounded-lg text-white shadow-md">
                <ChefHat size={24} />
            </div>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight hidden md:block">Baker's <span className="text-violet-500">Price</span></h1>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <button 
                onClick={saveData}
                className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-all shadow-sm"
              >
                <Save size={16} /> Save Changes
              </button>
            ) : (
              <button 
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all"
              >
                <Edit2 size={16} /> Edit Recipe
              </button>
            )}

            {isEditing && (
              <button 
                  onClick={() => setIsAiModalOpen(true)}
                  className="hidden md:flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-indigo-200 transition-all ml-2"
              >
                  <Sparkles size={16} /> AI Import
              </button>
            )}
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-auto no-scrollbar">
          <div className="flex gap-6 border-b border-transparent">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`pb-3 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
                  activeTab === cat 
                    ? 'border-violet-500 text-violet-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {!isEditing && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-xl mb-6 flex items-center gap-2 text-sm">
                <Lock size={16} />
                You are in view mode. Click "Edit Recipe" to make changes.
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Inputs */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Batch Info */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-violet-50/50">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 text-sm">1</span>
                    Batch Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Items Per Batch (Yield)</label>
                        <input 
                            type="number"
                            min="1"
                            disabled={!isEditing}
                            value={currentState.batchYield}
                            onChange={(e) => updateState({ batchYield: Math.max(1, parseInt(e.target.value) || 0) })}
                            className="w-full rounded-lg border-gray-300 bg-white disabled:bg-gray-50 disabled:text-gray-500 shadow-sm focus:border-violet-500 focus:ring-violet-500 py-2.5 px-3"
                        />
                        <p className="text-xs text-gray-400 mt-1">Total count of items produced</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Labor Rate ($/hr)</label>
                        <input 
                            type="number"
                            min="0"
                            disabled={!isEditing}
                            value={currentState.hourlyRate}
                            onChange={(e) => updateState({ hourlyRate: parseFloat(e.target.value) || 0 })}
                            className="w-full rounded-lg border-gray-300 bg-white disabled:bg-gray-50 disabled:text-gray-500 shadow-sm focus:border-violet-500 focus:ring-violet-500 py-2.5 px-3"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hours Spent</label>
                        <input 
                            type="number"
                            min="0"
                            step="0.25"
                            disabled={!isEditing}
                            value={currentState.hoursSpent}
                            onChange={(e) => updateState({ hoursSpent: parseFloat(e.target.value) || 0 })}
                            className="w-full rounded-lg border-gray-300 bg-white disabled:bg-gray-50 disabled:text-gray-500 shadow-sm focus:border-violet-500 focus:ring-violet-500 py-2.5 px-3"
                        />
                    </div>
                </div>
            </section>

            {/* Dry Ingredients */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 text-sm">2a</span>
                        Dry Ingredients
                        <Wheat size={16} className="text-violet-400 ml-1" />
                    </h2>
                    {isEditing && (
                        <button onClick={() => addIngredient('dry')} className="text-sm text-violet-600 font-medium hover:text-violet-700 flex items-center gap-1">
                            <Plus size={16} /> Add Dry
                        </button>
                    )}
                </div>
                
                {dryIngredients.length === 0 ? (
                     <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-6 text-center mb-6">
                        <p className="text-gray-400 text-sm">No dry ingredients (flour, sugar, salt...).</p>
                        {isEditing && <button onClick={() => addIngredient('dry')} className="mt-2 text-sm text-violet-600 font-medium">Add Dry Item</button>}
                    </div>
                ) : (
                    <div className={`${isEditing ? "space-y-3" : "bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"} mb-8`}>
                        {dryIngredients.map((ing, idx) => (
                            <IngredientRow 
                                key={ing.id} 
                                ingredient={ing} 
                                onChange={updateIngredient} 
                                onRemove={removeIngredient}
                                onEnter={() => {
                                  // Add new dry ingredient if specific to this list
                                  if (idx === dryIngredients.length - 1) addIngredient('dry');
                                }}
                                autoFocus={ing.id === lastAddedIngredientId}
                                isEditing={isEditing}
                            />
                        ))}
                    </div>
                )}
            </section>

             {/* Wet Ingredients */}
             <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm">2b</span>
                        Wet Ingredients
                        <Droplets size={16} className="text-blue-400 ml-1" />
                    </h2>
                    {isEditing && (
                        <button onClick={() => addIngredient('wet')} className="text-sm text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1">
                            <Plus size={16} /> Add Wet
                        </button>
                    )}
                </div>
                
                {wetIngredients.length === 0 ? (
                     <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-6 text-center mb-6">
                        <p className="text-gray-400 text-sm">No wet ingredients (milk, eggs, butter...).</p>
                         {isEditing && <button onClick={() => addIngredient('wet')} className="mt-2 text-blue-600 font-medium">Add Wet Item</button>}
                    </div>
                ) : (
                    <div className={`${isEditing ? "space-y-3" : "bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"} mb-8`}>
                        {wetIngredients.map((ing, idx) => (
                            <IngredientRow 
                                key={ing.id} 
                                ingredient={ing} 
                                onChange={updateIngredient} 
                                onRemove={removeIngredient}
                                onEnter={() => {
                                  if (idx === wetIngredients.length - 1) addIngredient('wet');
                                }}
                                autoFocus={ing.id === lastAddedIngredientId}
                                isEditing={isEditing}
                            />
                        ))}
                    </div>
                )}
            </section>

             {/* Additives / Mix-ins */}
             <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 text-sm">2c</span>
                        Additives & Mix-ins
                        <Cookie size={16} className="text-pink-400 ml-1" />
                    </h2>
                    {isEditing && (
                        <button onClick={() => addIngredient('additive')} className="text-sm text-pink-600 font-medium hover:text-pink-700 flex items-center gap-1">
                            <Plus size={16} /> Add Mix-in
                        </button>
                    )}
                </div>
                
                {additiveIngredients.length === 0 ? (
                     <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-6 text-center mb-6">
                        <p className="text-gray-400 text-sm">No add-ins (chocolate chips, nuts, sprinkles...).</p>
                         {isEditing && <button onClick={() => addIngredient('additive')} className="mt-2 text-pink-600 font-medium">Add Mix-in</button>}
                    </div>
                ) : (
                    <div className={isEditing ? "space-y-3" : "bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"}>
                        {additiveIngredients.map((ing, idx) => (
                            <IngredientRow 
                                key={ing.id} 
                                ingredient={ing} 
                                onChange={updateIngredient} 
                                onRemove={removeIngredient}
                                onEnter={() => {
                                  if (idx === additiveIngredients.length - 1) addIngredient('additive');
                                }}
                                autoFocus={ing.id === lastAddedIngredientId}
                                isEditing={isEditing}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* Packaging */}
            <section className="mt-8">
                 <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 text-sm">3</span>
                        Packaging, Labels, Stickers
                    </h2>
                    {isEditing && (
                        <button onClick={addPackaging} className="text-sm text-violet-600 font-medium hover:text-violet-700 flex items-center gap-1">
                            <Plus size={16} /> Add Packaging
                        </button>
                    )}
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    {currentState.packaging.length === 0 ? (
                        <p className="text-center text-gray-400 py-4 text-sm">No packaging costs added.</p>
                    ) : (
                         currentState.packaging.map(p => (
                            <PackagingRow 
                                key={p.id} 
                                item={p} 
                                onChange={updatePackaging} 
                                onRemove={removePackaging} 
                                isEditing={isEditing}
                            />
                        ))
                    )}
                </div>
            </section>

            {/* AI Import (Hidden if not empty or can be triggered via header) */}
            {isEditing && currentState.ingredients.length === 0 && (
                <div className="mt-4 flex justify-center">
                    <button onClick={() => setIsAiModalOpen(true)} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors font-medium text-sm flex items-center gap-2">
                         <Sparkles size={16} /> Or Use AI Import for Everything
                    </button>
                </div>
            )}

          </div>

          {/* Right Column: Summary */}
          <div className="lg:col-span-1">
            <SummaryCard 
                ingredientCost={ingredientCost}
                packagingCost={packagingCost}
                laborCost={laborCost}
                yieldCount={currentState.batchYield}
                profitMargin={currentState.profitMargin}
                onProfitMarginChange={(val) => updateState({ profitMargin: val })}
            />
            
            <div className="mt-6 bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                <Info className="text-blue-500 shrink-0 mt-0.5" size={18} />
                <div className="text-xs text-blue-800">
                    <p className="font-semibold mb-1">Tip:</p>
                    Don't forget to include overheads like electricity, gas, and rent in your hourly rate or as a fixed packaging cost if you want to be ultra-precise!
                </div>
            </div>
          </div>

        </div>
      </main>

      {/* AI Modal */}
      {isAiModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-6">
                    <h3 className="text-white text-xl font-bold flex items-center gap-2">
                        <Sparkles className="text-yellow-300" /> AI Recipe Importer
                    </h3>
                    <p className="text-indigo-100 text-sm mt-1">Paste your full recipe below. We'll identify ingredients and sort them into Dry/Wet/Mix-ins for you.</p>
                </div>
                <div className="p-6">
                    <textarea 
                        value={recipeText}
                        onChange={(e) => setRecipeText(e.target.value)}
                        placeholder={`Example:\n2 cups Flour\n1 cup Sugar\n3 Eggs\n1/2 cup Butter\n1 cup Chopped Walnuts...`}
                        className="w-full h-64 p-4 rounded-xl border-gray-200 bg-white focus:bg-white focus:border-indigo-500 focus:ring-indigo-500 transition-all text-sm font-mono"
                    />
                    
                    {parseError && (
                        <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2">
                            <AlertTriangle size={16} /> {parseError}
                        </div>
                    )}

                    <div className="mt-6 flex justify-end gap-3">
                        <button 
                            onClick={() => setIsAiModalOpen(false)}
                            className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleAiParse}
                            disabled={isParsing || !recipeText.trim()}
                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            {isParsing ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                'Parse Recipe'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Mobile FAB for AI */}
      {isEditing && (
        <button 
            onClick={() => setIsAiModalOpen(true)}
            className="md:hidden fixed bottom-6 right-6 bg-indigo-600 text-white p-4 rounded-full shadow-xl hover:bg-indigo-700 transition-transform active:scale-95 z-40"
        >
            <Sparkles size={24} />
        </button>
      )}

    </div>
  );
}