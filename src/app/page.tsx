import { loadSiteData } from "@/lib/axp-server";
import { AxpSite } from "@/components/axp/axp-site";

export default function Home() {
  const data = loadSiteData();
  return <AxpSite data={data} />;
}
