import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { BarChart3 } from 'lucide-react'

// Datos simulados para los gráficos
const chartData = [
  { month: 'Ene', value: 65, color: 'bg-[#999996]' },
  { month: 'Feb', value: 45, color: 'bg-gray-400' },
  { month: 'Mar', value: 80, color: 'bg-[#999996]' },
  { month: 'Abr', value: 30, color: 'bg-gray-400' },
  { month: 'May', value: 70, color: 'bg-[#999996]' },
  { month: 'Jun', value: 55, color: 'bg-gray-400' },
  { month: 'Jul', value: 90, color: 'bg-[#999996]' },
  { month: 'Ago', value: 40, color: 'bg-gray-400' },
  { month: 'Sep', value: 85, color: 'bg-[#999996]' },
  { month: 'Oct', value: 60, color: 'bg-gray-400' },
  { month: 'Nov', value: 95, color: 'bg-[#999996]' },
  { month: 'Dic', value: 75, color: 'bg-gray-400' }
]

export const ChartsSection: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
          <BarChart3 className="h-5 w-5 mr-2" />
          Documento por Fuente (Últimos Servicios)
        </CardTitle>
        <p className="text-sm text-gray-600">
          Estadísticas de documentos generados por mes
        </p>
      </CardHeader>
      <CardContent>
        {/* Chart Container */}
        <div className="h-64 flex items-end justify-between px-4 py-4 bg-gray-50 rounded-lg">
          {chartData.map((item, index) => (
            <div key={index} className="flex flex-col items-center space-y-2">
              {/* Bar */}
              <div
                className={`w-8 ${item.color} rounded-t transition-all duration-300 hover:opacity-80`}
                style={{ height: `${(item.value / 100) * 160}px` }}
                title={`${item.month}: ${item.value}%`}
              />
              {/* Month Label */}
              <span className="text-xs text-gray-600 font-medium">
                {item.month}
              </span>
            </div>
          ))}
        </div>
        
        {/* Chart Legend */}
        <div className="flex items-center justify-center mt-6 space-x-6">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-[#999996] rounded"></div>
            <span className="text-sm text-gray-600">Documentos procesados</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-400 rounded"></div>
            <span className="text-sm text-gray-600">Período anterior</span>
          </div>
        </div>
        
        {/* Chart Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">847</p>
            <p className="text-sm text-gray-600">Total documentos</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">+12.5%</p>
            <p className="text-sm text-gray-600">Crecimiento mensual</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#999996]">95%</p>
            <p className="text-sm text-gray-600">Tasa de éxito</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 