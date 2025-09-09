import { createContext, useState, useEffect } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  
  // 🔹 Carregar usuário salvo no localStorage ao iniciar
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  // 🔹 Função de login
  const login = async (credentials) => {
    try {
      const deviceId =
        user?.deviceId || Math.floor(Math.random() * 100_999_999_999);

      const response = await fetch(
        "https://server-98434363848.us-central1.run.app/api/users/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            deviceId,
          },
          body: JSON.stringify({
            emailUser: credentials.emailUser,
            passwordUser: credentials.passwordUser,
            expireAt: credentials.expireAt,
          }),
        }
      );
      
      if (!response.ok) {
        throw new Error("Login failed. Check your credentials.");
      }

      const data = await response.json();
      
      const loggedUser = {
        token: data.token,
        deviceId,
        ...data.userData,
        soldeAccount: 5000
      };
      
      localStorage.setItem("user", JSON.stringify(loggedUser));
      setUser(loggedUser);
    } catch (error) {
      console.error("Login error:", error.message);
      throw error;
    }
  };

  // 🔹 Função de logout
  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
