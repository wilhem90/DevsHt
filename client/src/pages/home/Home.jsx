import ContainerHome from "../../components/container/ContainerHome.jsx";
import Navbar from "../../components/navBar/Navbar.jsx";
import Sidebar from "../../components/sideBar/Sidebar.jsx";
import "./Home.css"

export default function Home() {
  document.title = "Home"
  return (
    <div className="body-home-page">
      {/* header */}
      <Navbar />

      {/* Container home page */}
      <div className="container-home-page">
        <Sidebar />
        <ContainerHome />
      </div>
    </div>
  );
}
