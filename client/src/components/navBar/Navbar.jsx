import { ArrowUpRight, MoveDownLeft, Plus } from "lucide-react";
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
          <Plus />
          <span>Add money</span>
        </button>
        <button>
          <MoveDownLeft />
          <span>Request</span>
        </button>
      </div>
    </header>
  );
}
