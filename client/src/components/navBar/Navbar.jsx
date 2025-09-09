import {
  ArrowDownLeft,
  ArrowUpRight,
  CircleDollarSign,
  Dices,
} from "lucide-react";
import "./Navbar.css";
export default function Navbar() {
  return (
    <header>
      <div className="box-left">
        <strong>4,502.00 BRL</strong>
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
