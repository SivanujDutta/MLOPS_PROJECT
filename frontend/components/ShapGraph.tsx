"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ShapGraph({ data }: { data: [string, number][] }) {
  // Map the array of tuples to an array of objects for Recharts
  const chartData = data.map(([feature, importance]) => ({
    name: feature,
    Importance: importance,
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-black/50 font-bold uppercase border-2 border-black">
        No feature importance data available.
      </div>
    );
  }

  return (
    <div className="w-full h-full border-2 border-black bg-slate-50 p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
          <XAxis type="number" hide />
          <YAxis 
            dataKey="name" 
            type="category" 
            width={150} 
            tick={{ fontSize: 10, fill: 'black', fontWeight: 900 }} 
          />
          <Tooltip 
            contentStyle={{ border: '3px solid black', borderRadius: 0, fontWeight: 900, color: 'black', textTransform: 'uppercase' }}
            cursor={{ fill: 'rgba(0,0,0,0.05)' }}
            formatter={(value: any) => [`${Number(value).toFixed(2)}%`, 'Importance']}
          />
          <Bar dataKey="Importance" fill="#0070F2" stroke="black" strokeWidth={3} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
