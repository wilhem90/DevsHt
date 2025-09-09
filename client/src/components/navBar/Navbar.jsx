import {
  ArrowDownLeft,
  ArrowUpRight,
  CircleDollarSign,
  Dices,
  EyeIcon,
  EyeOff,
} from "lucide-react";
import "./Navbar.css";
import useAuth from "../../Authentication/UseAuth.js";
import { useEffect, useState } from "react";
export default function Navbar() {
  const [showSoldeAccount, setShowSoldeAccount] = useState(false);
  const [soldeAccount, setSoldeAccount] = useState(0);
  const { user } = useAuth();
  useEffect(() => {
    setSoldeAccount(user?.soldeAccount || 0);
  }, [user?.soldeAccount]);

  function handleShowSolde() {
    setShowSoldeAccount((prev) => !prev);
  }
  return (
    <header>
      <div className="box-left" onClick={handleShowSolde}>
        <div className="amount-solde" >
          <strong>{showSoldeAccount ? `${soldeAccount.toFixed(2)} BRL` : "****"}</strong>
          {showSoldeAccount? <EyeOff />: <EyeIcon />}
        </div>
        <span>Total balance</span>
      </div>
      <div className="box-right">
        <button>
          <ArrowUpRight />
          <span>Send</span>
        </button>
        <button>
          <Dices />
          <span>Bet</span>
        </button>
        <button>
          <CircleDollarSign />
          <span>Add</span>
        </button>
        <button>
          <ArrowDownLeft />
          <span>Request</span>
        </button>
      </div>
    </header>
  );
}
