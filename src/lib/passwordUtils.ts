// /src/lib/passwordUtils.ts (¡Nuevo Archivo!)

import * as bcrypt from "bcrypt";

/**
 * Verifica una contraseña plana con un hash almacenado en la base de datos.
 *
 * Esta función DEBE coincidir con el algoritmo que Blitz.js usó para crear los hashes originales.
 * Por defecto, Blitz usa bcrypt.
 *
 * @param password La contraseña ingresada por el usuario (texto plano).
 * @param hash El hash almacenado en la base de datos (user.hashedPassword).
 * @returns true si la contraseña coincide con el hash, false en caso contrario.
 */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  if (!hash || hash.length === 0) {
    // Manejar casos donde el hash no existe (ej. usuario sin contraseña)
    return false;
  }

  // bcrypt.compare() maneja la complejidad de la verificación
  return bcrypt.compare(password, hash);
}

// Opcional: Función para crear nuevos hashes (útil para el registro de usuarios)
export async function hashPassword(
  password: string,
  saltRounds: number = 10,
): Promise<string> {
  return bcrypt.hash(password, saltRounds);
}
