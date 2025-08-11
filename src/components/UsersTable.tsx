import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { MoreHorizontal, Edit, Trash2, Eye } from 'lucide-react'

// Datos de ejemplo para la tabla de usuarios
const usersData = [
  {
    id: 1,
    name: 'María García',
    email: 'maria@ejemplo.com',
    role: 'Admin',
    status: 'Activo',
    lastLogin: '2024-01-15',
    avatar: 'MG'
  },
  {
    id: 2,
    name: 'Carlos López',
    email: 'carlos@ejemplo.com',
    role: 'Usuario',
    status: 'Activo',
    lastLogin: '2024-01-14',
    avatar: 'CL'
  },
  {
    id: 3,
    name: 'Ana Martínez',
    email: 'ana@ejemplo.com',
    role: 'Editor',
    status: 'Inactivo',
    lastLogin: '2024-01-10',
    avatar: 'AM'
  },
  {
    id: 4,
    name: 'Luis Rodríguez',
    email: 'luis@ejemplo.com',
    role: 'Usuario',
    status: 'Activo',
    lastLogin: '2024-01-13',
    avatar: 'LR'
  },
  {
    id: 5,
    name: 'Elena Fernández',
    email: 'elena@ejemplo.com',
    role: 'Admin',
    status: 'Activo',
    lastLogin: '2024-01-15',
    avatar: 'EF'
  },
  {
    id: 6,
    name: 'Jorge Sánchez',
    email: 'jorge@ejemplo.com',
    role: 'Usuario',
    status: 'Pendiente',
    lastLogin: 'Nunca',
    avatar: 'JS'
  }
]

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'Activo':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Activo</Badge>
    case 'Inactivo':
      return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Inactivo</Badge>
    case 'Pendiente':
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pendiente</Badge>
    default:
      return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">{status}</Badge>
  }
}

const getRoleBadge = (role: string) => {
  switch (role) {
    case 'Admin':
      return <Badge className="bg-[#A1A3A5] text-[#999996] hover:bg-[#A1A3A5]">Admin</Badge>
    case 'Editor':
      return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Editor</Badge>
    case 'Usuario':
      return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Usuario</Badge>
    default:
      return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">{role}</Badge>
  }
}

export const UsersTable: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">
          Últimos Documentos
        </CardTitle>
        <p className="text-sm text-gray-600">
          Gestiona los usuarios del sistema
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">Usuario</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Rol</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Estado</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Último acceso</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usersData.map((user) => (
                <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {user.avatar}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    {getRoleBadge(user.role)}
                  </td>
                  <td className="py-4 px-4">
                    {getStatusBadge(user.status)}
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-600">
                    {user.lastLogin}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-600 hover:text-[#999996] hover:bg-[#A1A3A5]"
                        title="Ver detalles"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-600 hover:text-green-600 hover:bg-green-50"
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-600 hover:text-red-600 hover:bg-red-50"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                        title="Más opciones"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Mostrando 1 a 6 de 247 usuarios
          </p>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" disabled>
              Anterior
            </Button>
            <Button variant="outline" size="sm" className="bg-[#999996] text-white hover:bg-[#A1A3A5]">
              1
            </Button>
            <Button variant="outline" size="sm">
              2
            </Button>
            <Button variant="outline" size="sm">
              3
            </Button>
            <Button variant="outline" size="sm">
              Siguiente
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 