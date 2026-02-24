type ProConListProps = {
  pros: string[];
  cons: string[];
  name: string;
};

const ProConList = ({ pros, cons, name }: ProConListProps) => (
  <div className="grid gap-6 md:grid-cols-2">
    {/* Pros */}
    <div className="rounded-xl border border-border p-6">
      <h3 className="font-bold text-dark">{name} Pros</h3>
      <ul className="mt-4 space-y-3">
        {pros.map((pro) => (
          <li key={pro} className="flex items-start gap-2 text-sm text-gray">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
            <span>{pro}</span>
          </li>
        ))}
      </ul>
    </div>

    {/* Cons */}
    <div className="rounded-xl border border-border p-6">
      <h3 className="font-bold text-dark">{name} Cons</h3>
      <ul className="mt-4 space-y-3">
        {cons.map((con) => (
          <li key={con} className="flex items-start gap-2 text-sm text-gray">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-coral" />
            <span>{con}</span>
          </li>
        ))}
      </ul>
    </div>
  </div>
);

export default ProConList;
