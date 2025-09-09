import { useEffect, useState } from "react";
import "./Sidebar.css";
import { Link } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  ChevronDown,
  CircleUser,
  GroupIcon,
  Home,
  Plus,
  Scale,
  User,
  Users,
} from "lucide-react";
export default function Sidebar() {
  const [urlAvatar, setUrlAvatar] = useState(null);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser?.avatar) {
      setUrlAvatar(storedUser.avatar);
    }
  }, []);

  return (
    <div className="sidbar">
      {/* Box Profil User */}
      <div className="box-perfil">
        <div className="svg-notification">
          <Bell />
        </div>

        <div className="img-user">
          {urlAvatar ? (
            <img src={urlAvatar} alt="Foto do usuário" />
          ) : (
            <CircleUser size={80} />
          )}
        </div>

        <div className="fullNameUser">
          <span className="nameUser">Wilhem Wundt Maxime</span>
          <ChevronDown />
        </div>

        <div className="roleUser">
          <span>Menbership: 4588s84f4se8</span>
        </div>
      </div>

      {/* Links */}
      <div className="box-links">
        <ul>
          <li>
            <Link className="btn-home active">
              <Home />
              <span>Home</span>
            </Link>
          </li>
          <li>
            <Link>
              <Scale />
              <span>Balances</span>
              <ChevronDown className="btn-chevron" />
            </Link>
          </li>
          <li>
            <Link>
              <Plus />
              <span>Add Money</span>
              <ChevronDown className="btn-chevron" />
            </Link>
          </li>
          <li>
            <Link>
              <ArrowUpRight />
              <span>Send</span>
              <ChevronDown className="btn-chevron" />
            </Link>
          </li>
          <li>
            <Link>
              <ArrowDownLeft />
              <span>Request</span>
              <ChevronDown className="btn-chevron" />
            </Link>
          </li>
        </ul>

        <ul>
          <li>
            <Link>
              <Users />
              <span>Recipients</span>
            </Link>
          </li>
          <li>
            <Link>
              <CircleUser />
              <span>Gael Charles</span>
            </Link>
          </li>
          <li>
            <Link>
              <CircleUser />
              <span>Wilhem Wundt Maxime</span>
            </Link>
          </li>
          <li>
            <Link>
              <CircleUser />
              <span>Bernard Pelegrine</span>
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
