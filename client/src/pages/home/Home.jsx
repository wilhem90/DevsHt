import { Search, SlidersHorizontal } from "lucide-react";
import Navbar from "../../components/navBar/Navbar";
import Sidebar from "../../components/sideBar/Sidebar";
import Transactions from "../../components/transactions/Transactions";
import "./Home.css";
export default function Home() {
  return (
    <div className="container-home">
      <Sidebar />
      <div className="box-central">
        <Navbar />
        <div className="box-filter">
            <h2>Transactions</h2>
          <div className="box-search">
            <div className="box-input-svg">
              <input
                type="text"
                name="input-search"
                id="input-search"
                placeholder="Search"
              />
              <Search className="icon-search" />
            </div>

            <div className="filter">
              <SlidersHorizontal />
              <span>Filter</span>
            </div>
          </div>
        </div>
          <Transactions />
      </div>
    </div>
  );
}
