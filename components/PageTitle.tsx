export default function PageTitle({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) {
  return <div className="page-title"><div><h2>{title}</h2><p>{subtitle}</p></div>{action}</div>;
}
