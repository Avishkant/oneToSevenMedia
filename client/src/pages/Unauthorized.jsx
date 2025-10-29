export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
      <div className="max-w-xl mx-auto p-6 text-center">
        <h1 className="text-3xl font-bold mb-4">Not authorized</h1>
        <p className="text-slate-300 mb-6">
          You don't have permission to view this page.
        </p>
        <p className="text-slate-400">
          If you believe this is an error, contact your superadmin.
        </p>
      </div>
    </div>
  );
}
