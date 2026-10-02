import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import authService, { decodeJwtPayload } from '../services/authService';
import { getStoredToken, registerUnauthorizedHandler } from '../services/apiClient';
import { setErrorContextUser } from '../services/errorService';
import { setAuditContextUser, clearAuditContext } from '../services/auditService';

const AuthContext = createContext(null);

/**
 * Reconstruye el usuario a partir del token guardado, para que un
 * refresh de pagina no tire la sesion aunque el token siga vigente.
 */
function restoreUserFromToken() {
  const token = getStoredToken();
  if (!token) return null;

  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  if (payload.exp && Date.now() >= payload.exp * 1000) {
    return null; // token vencido
  }

  return {
    id: payload.id ?? payload.idUsuario ?? null,
    nombre: payload.nombre ?? payload.usuario ?? '',
    idEmpresa: payload.idEmpresa ?? null,
    rol: payload.rol ?? null,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => restoreUserFromToken());
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    if (user) {
      setErrorContextUser(user);
      setAuditContextUser(user);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Si el backend responde 401 en cualquier momento (token vencido,
  // revocado, etc.) se cierra la sesion desde un solo lugar. A
  // diferencia de signOut() (logout manual, el usuario dio clic), aqui
  // si se marca la sesion como "expirada" para que el login pueda
  // avisarle que no fue su decision.
  useEffect(() => {
    registerUnauthorizedHandler(() => {
      authService.markSessionExpired();
      authService.logout();
      setUser(null);
    });
  }, []);

  const signIn = useCallback(async (credentials) => {
    setLoading(true);
    setAuthError(null);
    try {
      const loggedUser = await authService.login(credentials);
      setUser(loggedUser);
      return loggedUser;
    } catch (err) {
      const message =
        err.response?.data?.mensaje || err.response?.data?.message || 'No se pudo iniciar sesion. Verifica tus credenciales.';
      setAuthError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(() => {
    authService.logout();
    clearAuditContext();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      loading,
      authError,
      signIn,
      signOut,
    }),
    [user, loading, authError, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return ctx;
}

export default AuthContext;
