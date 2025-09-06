import { Navigate } from "react-router-dom";
import useAuth from "../Authentication/UseAuth.js";

export default function PrivateRoute({ children }) {
  const { user } = useAuth();
  console.log(user);
  return user ? children : <Navigate to="/login" />;
}
