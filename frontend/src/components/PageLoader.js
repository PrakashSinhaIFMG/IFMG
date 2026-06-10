import { Icons } from "./Icons";

export default function PageLoader() {
  return (
    <div className="page-loader">
      <div className="loader-logo">
        <div className="loader-icon">{Icons.truck}</div>
        <div className="loader-wordmark">IF<span>MG</span></div>
      </div>
      <div className="loader-bar-wrap">
        <div className="loader-bar" />
      </div>
      <div className="loader-text">Loading</div>
    </div>
  );
}