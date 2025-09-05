export default function Page({ title, children, actions = null, max = "max-w-4xl" }) {
    return (
      <div className={`${max} mx-auto px-4 py-6`}>
        <div className="flex items-center justify-between mb-5">
          {title ? <h1 className="text-3xl font-semibold text-gray-100">{title}</h1> : <div />}
          {actions}
        </div>
        <div className="text-gray-200">{children}</div>
      </div>
    );
  }