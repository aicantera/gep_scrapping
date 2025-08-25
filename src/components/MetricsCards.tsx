import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { 
  Users, 
  FileText, 
  TrendingUp, 
  DollarSign,
  Activity,
  ShoppingCart 
} from 'lucide-react'

const metricsData = [
  {
    title: 'Total Usuarios',
    value: '2,847',
    change: '+12%',
    changeType: 'positive' as const,
    icon: Users,
    color: 'blue'
  },
  {
    title: 'Documentos',
    value: '1,234',
    change: '+8%',
    changeType: 'positive' as const,
    icon: FileText,
    color: 'green'
  },
  {
    title: 'Ventas',
    value: '$45,780',
    change: '+15%',
    changeType: 'positive' as const,
    icon: DollarSign,
    color: 'purple'
  },
  {
    title: 'Actividad',
    value: '89.3%',
    change: '-2%',
    changeType: 'negative' as const,
    icon: Activity,
    color: 'orange'
  },
  {
    title: 'Pedidos',
    value: '567',
    change: '+22%',
    changeType: 'positive' as const,
    icon: ShoppingCart,
    color: 'red'
  },
  {
    title: 'Conversiones',
    value: '92.5%',
    change: '+5%',
    changeType: 'positive' as const,
    icon: TrendingUp,
    color: 'cyan'
  }
]

const getIconColorClass = (color: string) => {
  switch (color) {
    case 'blue': return 'text-blue-600 bg-blue-100'
    case 'green': return 'text-green-600 bg-green-100'
    case 'purple': return 'text-purple-600 bg-purple-100'
    case 'orange': return 'text-orange-600 bg-orange-100'
    case 'red': return 'text-red-600 bg-red-100'
    case 'cyan': return 'text-cyan-600 bg-cyan-100'
    default: return 'text-gray-600 bg-gray-100'
  }
}

export const MetricsCards: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {metricsData.map((metric) => (
        <Card key={metric.title} className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {metric.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${getIconColorClass(metric.color)}`}>
              <metric.icon className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {metric.value}
            </div>
            <div className="flex items-center">
              <span
                className={`text-sm font-medium ${
                  metric.changeType === 'positive'
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {metric.change}
              </span>
              <span className="text-sm text-gray-500 ml-1">
                vs mes anterior
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
} 