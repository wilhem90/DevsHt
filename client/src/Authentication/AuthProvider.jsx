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
        soldeAccount: 5000,
        avatar:
          "https://scontent.fxap2-1.fna.fbcdn.net/v/t39.30808-6/435317298_966828771734083_5242560328266022498_n.jpg?_nc_cat=107&ccb=1-7&_nc_sid=6ee11a&_nc_eui2=AeE4WYWEyxpV9u34zhINSBMllPM8lol0NW2U8zyWiXQ1bRl1CeAwz333EYqHrUSgXn2MLkQxilIVLyS1hzb11VNT&_nc_ohc=1KyMo4lwUrwQ7kNvwEnA6nY&_nc_oc=AdlTrcKUzNH4CW6frJLwJCYk3vjP-RXwYfiN7R-ML8aswBBYgzHrbOyoXk7Aea4wRRI&_nc_zt=23&_nc_ht=scontent.fxap2-1.fna&_nc_gid=Cgnq9AJrZiioojJVmcrmzw&oh=00_AfYZAPUE7cm_yJPBDU5f2ZzjEvz3ko-xFWcng-txw7SGXQ&oe=68C640E0",
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
