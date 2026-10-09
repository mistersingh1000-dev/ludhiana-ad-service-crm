import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import UserActions from "./UserActions";

export default function AppChrome({ children, title = "CRM" }: { children: React.ReactNode; title?: string }) {
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";
  return <div className="app-shell"><Sidebar/><main className="app-main"><header className="topbar"><div className="top-title"><h1>{title}</h1>{demoMode&&<span className="demo-badge">DEMO</span>}</div><UserActions/></header><div className="content">{children}</div><MobileNav/></main></div>;
}
