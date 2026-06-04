import { Link } from "react-router-dom";
import { GraduationCap, Stethoscope, Users, ArrowRight } from "lucide-react";

const PortalSelectionPage = () => (
  <div className="auth-bg flex items-center justify-center p-4">
    {/* Dot grid texture */}
    <div className="absolute inset-0 dot-grid opacity-100 pointer-events-none" />

    <div className="relative z-10 w-full max-w-lg">
      {/* Brand header */}
      <div className="text-center mb-10">
        <div className="inline-flex h-16 w-16 rounded-2xl bg-primary items-center justify-center shadow-lg shadow-primary/25 mb-5">
          <GraduationCap className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Training Portal</h1>
        <p className="text-muted-foreground text-sm mt-2">Select your portal to continue</p>
      </div>

      {/* Portal cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Healthcare Provider */}
        <Link
          to="/login/provider"
          id="portal-provider"
          className="group relative flex flex-col items-center gap-5 p-7 rounded-2xl bg-white border border-border hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/8 hover:-translate-y-0.5 transition-all duration-250 cursor-pointer"
        >
          <div className="h-14 w-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center group-hover:bg-blue-100 group-hover:border-blue-200 transition-colors duration-200">
            <Stethoscope className="h-7 w-7 text-blue-600" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground text-base leading-snug">Healthcare Provider</p>
            <p className="text-xs text-muted-foreground mt-1">Login with National ID</p>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-blue-600 opacity-0 group-hover:opacity-100 -translate-y-1 group-hover:translate-y-0 transition-all duration-200">
            Continue <ArrowRight className="h-3.5 w-3.5" />
          </div>
          {/* Active ring */}
          <span className="absolute inset-0 rounded-2xl ring-2 ring-transparent group-hover:ring-blue-200/60 transition-all" />
        </Link>

        {/* Internal Staff */}
        <Link
          to="/login/staff"
          id="portal-staff"
          className="group relative flex flex-col items-center gap-5 p-7 rounded-2xl bg-white border border-border hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-500/8 hover:-translate-y-0.5 transition-all duration-250 cursor-pointer"
        >
          <div className="h-14 w-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center group-hover:bg-emerald-100 group-hover:border-emerald-200 transition-colors duration-200">
            <Users className="h-7 w-7 text-emerald-600" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground text-base leading-snug">Internal Staff</p>
            <p className="text-xs text-muted-foreground mt-1">Login with Email</p>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 opacity-0 group-hover:opacity-100 -translate-y-1 group-hover:translate-y-0 transition-all duration-200">
            Continue <ArrowRight className="h-3.5 w-3.5" />
          </div>
          <span className="absolute inset-0 rounded-2xl ring-2 ring-transparent group-hover:ring-emerald-200/60 transition-all" />
        </Link>
      </div>

      <p className="text-center text-xs text-muted-foreground/50 mt-8">
        © {new Date().getFullYear()} Training Management System
      </p>
    </div>
  </div>
);

export default PortalSelectionPage;
