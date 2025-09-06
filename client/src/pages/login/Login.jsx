import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../Authentication/UseAuth";

export default function Login() {
  const [email, setEmail] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  function handleLogin() {
    login(email);
    navigate("/home"); // redireciona para Home após login
  }

  return (
    <div>
      <h1>Login</h1>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
      <button onClick={handleLogin}>Entrar</button>
    </div>
  );
}
