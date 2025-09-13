import Navbar from "../../components/navBar/Navbar";
import Sidebar from "../../components/sideBar/Sidebar";
import "./Money.css";
export default function Money() {
  return (
    <div className="container-home">
      <Sidebar />
      <div className="box-central">
        <Navbar />
        <div className="box-send-money">
            <h1>Hola tudo bem!</h1>
        </div>
      </div>
    </div>
  );
}
