import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/utils";
import { PricePoint } from "@shared/schema";

type PriceHistoryChartProps = {
  history: PricePoint[];
  productId: number;
};

export default function PriceHistoryChart({ history, productId }: PriceHistoryChartProps) {
  // If history is passed as props, use it directly
  // Otherwise, fetch from the API
  const { data: priceHistory = history } = useQuery<PricePoint[]>({
    queryKey: ["/api/products", productId, "history"],
    enabled: !history || history.length === 0,
  });

  // Format the data for the chart
  const chartData = priceHistory.map((point) => ({
    date: new Date(point.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
    price: point.price,
  }));

  // If there's only one price point, duplicate it to show a line
  if (chartData.length === 1) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    chartData.unshift({
      date: yesterday.toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
      price: chartData[0].price,
    });
  }

  const formatDateTick = (tickItem: string) => {
    return tickItem;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-2 bg-white border border-gray-200 rounded shadow-md text-xs">
          <p className="font-semibold">{label}</p>
          <p className="text-primary-500">
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="border border-gray-200 rounded-md overflow-hidden">
      <div className="text-xs font-medium text-gray-700 bg-gray-50 px-3 py-2 border-b border-gray-200">
        Price History (Last 30 days)
      </div>
      <div className="p-3 h-32 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
          >
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0F766E" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#0F766E" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 10 }}
              tickFormatter={formatDateTick} 
              interval="preserveStartEnd"
            />
            <YAxis 
              domain={['dataMin', 'dataMax']} 
              tick={{ fontSize: 10 }}
              tickFormatter={(value) => `₹${value}`}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="price"
              stroke="#0F766E" 
              fillOpacity={1}
              fill="url(#priceGradient)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
