import { IoClose } from "react-icons/io5";
import { FaSignOutAlt } from "react-icons/fa";
import useAuth from "../../Authentication/UseAuth";
import { useNavigate } from "react-router-dom";

export default function Logout({ openLogoutModal }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="modal-overlay" onClick={openLogoutModal}>
      <div className="logout-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Confirmação de Saída</h2>
          <button className="close-btn" onClick={openLogoutModal}>
            <IoClose />
          </button>
        </div>

        <div className="modal-content">
          <div className="warning-icon">
            <FaSignOutAlt />
          </div>
          <p>Tem certeza que deseja sair do sistema?</p>
        </div>

        <div className="modal-actions">
          <button className="cancel-btn" onClick={openLogoutModal}>
            Cancelar
          </button>
          <button className="confirm-btn" onClick={handleLogout}>
            Sim, Sair
          </button>
        </div>
      </div>
    </div>
  );
}
