import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Función para manejar errores de Supabase
export function getSupabaseErrorMessage(error: any): string {
  if (!error) return 'Error desconocido'
  
  // Errores comunes de autenticación
  switch (error.message) {
    case 'Invalid login credentials':
      return 'Credenciales de acceso incorrectas'
    case 'Email not confirmed':
      return 'Email no confirmado. Revisa tu bandeja de entrada'
    case 'User not found':
      return 'Usuario no encontrado'
    case 'Password should be at least 6 characters':
      return 'La contraseña debe tener al menos 6 caracteres'
    case 'Unable to validate email address: invalid format':
      return 'Formato de email inválido'
    case 'Email rate limit exceeded':
      return 'Límite de emails excedido. Intenta más tarde'
    default:
      return error.message || 'Error en el servidor'
  }
}

// Función para validar email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
} 