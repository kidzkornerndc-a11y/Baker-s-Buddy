import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, Share2 } from 'lucide-react';

interface Props {
  ingredientCost: number;
  packagingCost: number;
  laborCost: number;
  yieldCount: number;
  profitMargin: number;
  onProfitMarginChange: (val: number) => void;
  currencySymbol?: string;
}

export const SummaryCard: React.FC<Props> = ({
  ingredientCost,
  packagingCost,
  laborCost,
  yieldCount,
  profitMargin,
  onProfitMarginChange,
  currencySymbol = '$'
}) => {
  const totalBatchCost = ingredientCost + packagingCost + laborCost;
  const costPerItem = yieldCount > 0 ? totalBatchCost / yieldCount : 0;
  
  const profitAmount = totalBatchCost * (profitMargin / 100);
  const totalBatchPrice = totalBatchCost + profitAmount;
  const pricePerItem = yieldCount > 0 ? totalBatchPrice / yieldCount : 0;

  const data = [
    { name: 'Ingredients', value: ingredientCost, color: '#8b5cf6' }, // Violet-500 (Lilac)
    { name: 'Packaging', value: packagingCost, color: '#3b82f6' },   // Blue-500
    { name: 'Labor', value: laborCost, color: '#10b981' },           // Emerald-500
    { name: 'Profit', value: profitAmount, color: '#d946ef' },       // Fuchsia-500
  ].filter(d => d.value > 0);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-violet-100 p-6 sticky top-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        Pricing Breakdown
      </h3>

      <div className="h-48 w-full mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
                formatter={(value: number) => `${currencySymbol}${value.toFixed(2)}`}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex justify-between text-sm">
            <span className="flex items-center gap-2 text-gray-600"><div className="w-2 h-2 rounded-full bg-violet-500"></div> Ingredients</span>
            <span className="font-medium">{currencySymbol}{ingredientCost.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
            <span className="flex items-center gap-2 text-gray-600"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Packaging</span>
            <span className="font-medium">{currencySymbol}{packagingCost.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
            <span className="flex items-center gap-2 text-gray-600"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Labor</span>
            <span className="font-medium">{currencySymbol}{laborCost.toFixed(2)}</span>
        </div>
        <div className="border-t border-dashed border-gray-200 my-2"></div>
        <div className="flex justify-between font-bold text-gray-700">
            <span>Total Cost</span>
            <span>{currencySymbol}{totalBatchCost.toFixed(2)}</span>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 space-y-4">
        <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Profit Margin (%)
            </label>
            <div className="flex items-center gap-3">
                <input 
                    type="range" 
                    min="0" 
                    max="200" 
                    value={profitMargin} 
                    onChange={(e) => onProfitMarginChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-500"
                />
                <span className="text-violet-600 font-bold w-12 text-right">{profitMargin}%</span>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-3 rounded-lg border border-violet-100 text-center">
                <div className="text-xs text-gray-500 mb-1">Cost Per Item</div>
                <div className="text-xl font-bold text-gray-700">
                    {currencySymbol}{costPerItem.toFixed(2)}
                </div>
            </div>
            <div className="bg-gradient-to-br from-violet-500 to-violet-600 p-3 rounded-lg text-center text-white shadow-md">
                <div className="text-xs text-violet-100 mb-1">Sale Price</div>
                <div className="text-2xl font-bold">
                    {currencySymbol}{pricePerItem.toFixed(2)}
                </div>
            </div>
        </div>
        
        <div className="text-center">
             <span className="text-xs text-gray-400">Total Batch Revenue: {currencySymbol}{totalBatchPrice.toFixed(2)}</span>
        </div>
      </div>
      
      <button className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all text-sm font-medium">
        <Download size={16} /> Export Report
      </button>

    </div>
  );
};