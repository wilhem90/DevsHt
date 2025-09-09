import { useEffect, useState } from "react";
import "./Sidebar.css";
import { Link } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  BadgeDollarSignIcon,
  Bell,
  ChevronDown,
  CircleUser,
  Dices,
  Home,
  Users,
} from "lucide-react";
export default function Sidebar() {
  const [urlAvatar, setUrlAvatar] = useState(null);
  const [emailUser, setEmailUser] = useState(null)

  useEffect(() => {
    function loadUser() {
      const user = JSON.parse(localStorage.getItem("user"));
      if (user?.avatar) {
        setUrlAvatar(user.avatar);
        setEmailUser(user.emailUser)
      }
    }

    loadUser();

    window.addEventListener("storage", loadUser);
    return () => window.removeEventListener("storage", loadUser);
  }, []);

  console.log(urlAvatar);

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
          <span>Email: {emailUser}</span>
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
              <ArrowRightLeft />
              <span>Transactions</span>
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
              <Dices />
              <span>Bet</span>
              <ChevronDown className="btn-chevron" />
            </Link>
          </li>
          <li>
            <Link>
              <BadgeDollarSignIcon />
              <span>Add Money</span>
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
            <Link className="active">
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
