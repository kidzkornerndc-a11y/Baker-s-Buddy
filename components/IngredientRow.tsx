import React, { useMemo, useRef, useEffect } from 'react';
import { Ingredient, Unit } from '../types';
import { UNIT_CONVERSION, UNIT_LABELS, parseFraction } from '../constants';
import { Trash2 } from 'lucide-react';

interface Props {
  ingredient: Ingredient;
  onChange: (id: string, field: keyof Ingredient, value: any) => void;
  onRemove: (id: string) => void;
  onEnter: () => void;
  autoFocus?: boolean;
  currencySymbol?: string;
  isEditing?: boolean;
}

export const IngredientRow: React.FC<Props> = ({ 
  ingredient, 
  onChange, 
  onRemove, 
  onEnter,
  autoFocus = false,
  currencySymbol = '$',
  isEditing = true
}) => {
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && isEditing && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [autoFocus, isEditing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onEnter();
    }
  };
  
  const cost = useMemo(() => {
    const { purchasePrice, purchaseQuantity, purchaseUnit, recipeQuantity, recipeUnit } = ingredient;
    
    const pQty = parseFraction(purchaseQuantity);
    const rQty = parseFraction(recipeQuantity);

    if (pQty === 0) return 0;
    
    // Special handling for pieces
    if (purchaseUnit === 'pcs' || recipeUnit === 'pcs') {
      if (purchaseUnit !== recipeUnit) return 0; 
      return (purchasePrice / pQty) * rQty;
    }

    const pFactor = UNIT_CONVERSION[purchaseUnit];
    const rFactor = UNIT_CONVERSION[recipeUnit];

    if (!pFactor || !rFactor) return 0;

    const pricePerBase = purchasePrice / (pQty * pFactor);
    const usageInBase = rQty * rFactor;
    
    return pricePerBase * usageInBase;
  }, [ingredient]);

  const unitOptions = Object.keys(UNIT_LABELS).map((u) => (
    <option key={u} value={u}>{UNIT_LABELS[u as Unit]}</option>
  ));

  if (!isEditing) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center p-3 bg-white border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
        <div className="md:col-span-4 font-medium text-gray-800">
           {ingredient.recipeQuantity} {ingredient.recipeUnit} {ingredient.name}
        </div>
        <div className="md:col-span-6 text-sm text-gray-500">
           Bought: {currencySymbol}{ingredient.purchasePrice.toFixed(2)} for {ingredient.purchaseQuantity} {ingredient.purchaseUnit}
        </div>
        <div className="md:col-span-2 text-right font-bold text-gray-700">
           {currencySymbol}{cost.toFixed(2)}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start p-4 bg-white rounded-xl shadow-sm border border-orange-100 hover:border-orange-200 transition-colors mb-3">
      
      {/* Name */}
      <div className="md:col-span-3">
        <label className="block text-xs font-medium text-gray-500 mb-1">Ingredient</label>
        <input
          ref={nameInputRef}
          type="text"
          value={ingredient.name}
          onChange={(e) => onChange(ingredient.id, 'name', e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full rounded-md border-gray-200 bg-white px-3 py-2 text-sm focus:border-orange-500 focus:ring-orange-500"
          placeholder="e.g. Flour"
        />
      </div>

      {/* Purchase Info */}
      <div className="md:col-span-4 grid grid-cols-3 gap-2 bg-orange-50/50 p-2 rounded-lg">
        <div className="col-span-3 text-xs font-semibold text-orange-800 mb-1 flex items-center">
          Purchased As
        </div>
        <div>
           <label className="block text-[10px] text-gray-400">Price</label>
          <div className="relative">
            <span className="absolute left-2 top-1.5 text-gray-500 text-xs">{currencySymbol}</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={ingredient.purchasePrice || ''}
              onChange={(e) => onChange(ingredient.id, 'purchasePrice', parseFloat(e.target.value) || 0)}
              onKeyDown={handleKeyDown}
              className="w-full rounded-md border-gray-200 bg-white pl-6 px-2 py-1.5 text-sm focus:border-orange-500 focus:ring-orange-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] text-gray-400">Qty</label>
          <input
            type="text"
            value={ingredient.purchaseQuantity}
            onChange={(e) => onChange(ingredient.id, 'purchaseQuantity', e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. 1"
            className="w-full rounded-md border-gray-200 bg-white px-2 py-1.5 text-sm focus:border-orange-500 focus:ring-orange-500"
          />
        </div>
        <div>
          <label className="block text-[10px] text-gray-400">Unit</label>
          <select
            value={ingredient.purchaseUnit}
            onChange={(e) => onChange(ingredient.id, 'purchaseUnit', e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full rounded-md border-gray-200 bg-white px-1 py-1.5 text-sm focus:border-orange-500 focus:ring-orange-500"
          >
            {unitOptions}
          </select>
        </div>
      </div>

      {/* Recipe Usage */}
      <div className="md:col-span-3 grid grid-cols-2 gap-2 bg-blue-50/30 p-2 rounded-lg">
        <div className="col-span-2 text-xs font-semibold text-blue-800 mb-1">
          Recipe Uses
        </div>
        <div>
          <label className="block text-[10px] text-gray-400">Qty</label>
          <input
            type="text"
            value={ingredient.recipeQuantity}
            onChange={(e) => onChange(ingredient.id, 'recipeQuantity', e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. 1/4"
            className="w-full rounded-md border-gray-200 bg-white px-2 py-1.5 text-sm focus:border-orange-500 focus:ring-orange-500"
          />
        </div>
        <div>
          <label className="block text-[10px] text-gray-400">Unit</label>
          <select
            value={ingredient.recipeUnit}
            onChange={(e) => onChange(ingredient.id, 'recipeUnit', e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full rounded-md border-gray-200 bg-white px-1 py-1.5 text-sm focus:border-orange-500 focus:ring-orange-500"
          >
            {unitOptions}
          </select>
        </div>
      </div>

      {/* Cost Calculation */}
      <div className="md:col-span-2 flex flex-col justify-center h-full pt-4 md:pt-0">
        <div className="flex items-center justify-between md:flex-col md:items-end md:justify-center h-full">
            <span className="text-xs text-gray-500 md:mb-1">Cost</span>
            <span className="text-lg font-bold text-gray-800">{currencySymbol}{cost.toFixed(2)}</span>
            <button 
                onClick={() => onRemove(ingredient.id)}
                className="ml-4 md:ml-0 md:mt-2 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                title="Remove Ingredient"
            >
                <Trash2 size={16} />
            </button>
        </div>
      </div>
    </div>
  );
};