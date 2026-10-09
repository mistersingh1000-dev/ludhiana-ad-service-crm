import AppChrome from "@/components/AppChrome";
import DemoCRMProvider from "@/components/DemoCRMProvider";
import { BRAND } from "@/lib/brand";

export default function DashboardLayout({children}:{children:React.ReactNode}){
  return <DemoCRMProvider><AppChrome title={BRAND.name}>{children}</AppChrome></DemoCRMProvider>;
}
