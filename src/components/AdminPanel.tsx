import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { 
  Settings, 
  Users, 
  FileText, 
  BarChart3, 
  Plus,
  Activity
} from 'lucide-react'

const adminActions = [
  {
    id: 1,
    title: 'Gestionar Usuarios',
    description: 'Agregar, editar y eliminar usuarios',
    icon: Users,
    color: 'blue',
    action: 'Ver todos'
  },
  {
    id: 2,
    title: 'Reportes',
    description: 'Generar reportes del sistema',
    icon: BarChart3,
    color: 'green',
    action: 'Crear reporte'
  },
  {
    id: 3,
    title: 'Configuración',
    description: 'Ajustes del sistema',
    icon: Settings,
    color: 'purple',
    action: 'Configurar'
  },
  {
    id: 4,
    title: 'Documentos',
    description: 'Gestionar documentos',
    icon: FileText,
    color: 'orange',
    action: 'Ver archivos'
  }
]

const recentActivities = [
  {
    id: 1,
    user: 'María García',
    action: 'Subió documento',
    time: 'hace 5 min',
    type: 'upload'
  },
  {
    id: 2,
    user: 'Carlos López',
    action: 'Actualizó perfil',
    time: 'hace 10 min',
    type: 'edit'
  },
  {
    id: 3,
    user: 'Ana Martínez',
    action: 'Nuevo registro',
    time: 'hace 15 min',
    type: 'create'
  },
  {
    id: 4,
    user: 'Luis Rodríguez',
    action: 'Login exitoso',
    time: 'hace 20 min',
    type: 'login'
  }
]

const getIconColor = (color: string) => {
  switch (color) {
    case 'blue': return 'text-blue-600 bg-blue-100'
    case 'green': return 'text-green-600 bg-green-100'
    case 'purple': return 'text-purple-600 bg-purple-100'
    case 'orange': return 'text-orange-600 bg-orange-100'
    default: return 'text-gray-600 bg-gray-100'
  }
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'upload': return '📄'
    case 'edit': return '✏️'
    case 'create': return '➕'
    case 'login': return '🔐'
    default: return '📝'
  }
}

export const AdminPanel: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Admin Dashboard Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Admin Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {adminActions.map((action) => (
            <div key={action.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${getIconColor(action.color)}`}>
                  <action.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">{action.title}</p>
                  <p className="text-xs text-gray-600">{action.description}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                {action.action}
              </Button>
            </div>
          ))}
          
          <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Acción
          </Button>
        </CardContent>
      </Card>

      {/* Recent Activity Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Actividad Reciente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="text-lg">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.user}
                  </p>
                  <p className="text-xs text-gray-600">
                    {activity.action}
                  </p>
                </div>
                <Badge className="bg-gray-100 text-gray-600 text-xs hover:bg-gray-100">
                  {activity.time}
                </Badge>
              </div>
            ))}
          </div>
          
          <Button variant="outline" className="w-full mt-4" size="sm">
            Ver toda la actividad
          </Button>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Estadísticas Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Usuarios online</span>
            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">24</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Tareas pendientes</span>
            <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">12</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Nuevos registros</span>
            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">8</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Sistema</span>
            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Online</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 