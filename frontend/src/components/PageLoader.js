import { Icons } from "./Icons";

export default function PageLoader() {
  return (
    <div className="page-loader">
      <div className="loader-logo">
        <img
          src="/logo512.png"
          alt="IFMG Logo"
          className="loader-logo-img"
        />
      </div>
      <div className="loader-bar-wrap">
        <div className="loader-bar" />
      </div>
      <div className="loader-text">Loading</div>
    </div>
  );
}