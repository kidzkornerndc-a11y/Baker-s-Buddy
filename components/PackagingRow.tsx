import React from 'react';
import { Packaging } from '../types';
import { Trash2 } from 'lucide-react';
import { parseFraction } from '../constants';

interface Props {
  item: Packaging;
  onChange: (id: string, field: keyof Packaging, value: any) => void;
  onRemove: (id: string) => void;
  currencySymbol?: string;
  isEditing?: boolean;
}

export const PackagingRow: React.FC<Props> = ({ 
  item, 
  onChange, 
  onRemove, 
  currencySymbol = '$',
  isEditing = true
}) => {
  const pQty = parseFraction(item.purchaseQuantity);
  const uQty = parseFraction(item.quantityUsed);
  const costPerUnit = pQty > 0 ? item.purchasePrice / pQty : 0;
  const total = costPerUnit * uQty;

  if (!isEditing) {
    return (
      <div className="flex justify-between items-center p-3 bg-white border-b border-gray-50 last:border-0">
        <div>
          <span className="font-medium text-gray-800">{item.name || 'Unnamed Item'}</span>
          <span className="text-sm text-gray-500 ml-2">({item.quantityUsed} used)</span>
        </div>
        <div className="font-bold text-gray-700">
           {currencySymbol}{total.toFixed(2)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-4 items-center p-3 bg-white border border-gray-100 rounded-lg shadow-sm mb-2">
      <div className="flex-grow w-full md:w-auto">
        <label className="block text-[10px] text-gray-400 mb-1 md:hidden">Item Name</label>
        <input
          type="text"
          value={item.name}
          onChange={(e) => onChange(item.id, 'name', e.target.value)}
          placeholder="e.g. Box, Label, Sticker"
          className="w-full rounded-md border-gray-200 bg-white px-3 py-2 text-sm focus:border-orange-500 focus:ring-orange-500"
        />
      </div>
      
      <div className="flex gap-2 w-full md:w-auto">
         <div className="relative w-28">
            <span className="absolute left-3 top-2 text-gray-400 text-xs">Pack Price</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={item.purchasePrice || ''}
              onChange={(e) => onChange(item.id, 'purchasePrice', parseFloat(e.target.value) || 0)}
              className="w-full rounded-md border-gray-200 bg-white pl-3 pt-6 pb-2 text-sm focus:border-orange-500 focus:ring-orange-500"
            />
          </div>
          <div className="relative w-24">
            <span className="absolute left-3 top-2 text-gray-400 text-xs">Pack Qty</span>
            <input
              type="text"
              value={item.purchaseQuantity}
              onChange={(e) => onChange(item.id, 'purchaseQuantity', e.target.value)}
              placeholder="100"
              className="w-full rounded-md border-gray-200 bg-white pl-3 pt-6 pb-2 text-sm focus:border-orange-500 focus:ring-orange-500"
            />
          </div>
          <div className="relative w-24">
            <span className="absolute left-3 top-2 text-gray-400 text-xs">Used Qty</span>
            <input
              type="text"
              value={item.quantityUsed}
              onChange={(e) => onChange(item.id, 'quantityUsed', e.target.value)}
              placeholder="1"
              className="w-full rounded-md border-gray-200 bg-white pl-3 pt-6 pb-2 text-sm focus:border-orange-500 focus:ring-orange-500"
            />
          </div>
      </div>

      <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end min-w-[120px]">
        <div className="text-right">
            <div className="font-semibold text-gray-700">{currencySymbol}{total.toFixed(2)}</div>
            <div className="text-[10px] text-gray-400">({currencySymbol}{costPerUnit.toFixed(2)}/ea)</div>
        </div>
        <button 
          onClick={() => onRemove(item.id)}
          className="text-red-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};