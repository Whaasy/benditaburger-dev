"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, Store, Settings, LogOut, ExternalLink,
  Menu, Bell, X, AlertCircle, Info, Palette, User, Megaphone, Clock
} from "lucide-react";

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  const [negocio, setNegocio] = useState(null);
  const [userAuth, setUserAuth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [configGlobal, setConfigGlobal] = useState(null);

  const [notificacionesAbiertas, setNotificacionesAbiertas] = useState(false);
  const [notificaciones, setNotificaciones] = useState([]);
  const dropdownNotiRef = useRef(null);

  const [perfilAbierto, setPerfilAbierto] = useState(false);
  const dropdownPerfilRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownNotiRef.current && !dropdownNotiRef.current.contains(event.target)) {
        setNotificacionesAbiertas(false);
      }
      if (dropdownPerfilRef.current && !dropdownPerfilRef.current.contains(event.target)) {
        setPerfilAbierto(false);
      }
    };

    const handleNegocioUpdated = (e) => {
      if (e.detail) {
        setNegocio(prev => prev ? { ...prev, ...e.detail } : prev);
        if (e.detail.estado_pago === "activo") {
          setNotificaciones(prevNoti => prevNoti.filter(n => n.id !== "prueba_activa" && n.id !== "vencido" && n.id !== "gracia_activa"));
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("negocio-actualizado", handleNegocioUpdated);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("negocio-actualizado", handleNegocioUpdated);
    };
  }, []);

  useEffect(() => {
    const cargarDatos = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUserAuth(user);

      const isAdmin = user.user_metadata?.role === "admin";

      const [adminRes, negocioRes] = await Promise.all([
        supabase.from("admins").select("email").eq("email", user.email).maybeSingle(),
        supabase.from("negocios").select("*").eq("user_id", user.id).maybeSingle()
      ]);

      const hasAdminTableAccess = !!(adminRes.data && adminRes.data.email);

      if (!isAdmin && !hasAdminTableAccess) {
        await supabase.auth.signOut();
        router.push("/login");
        return;
      }

      let negocioData = negocioRes.data;

      if (!negocioData) {
        // Pre-create standard negocio record for admin if missing
        const { data: newNeg, error: createError } = await supabase
          .from("negocios")
          .insert([{
            user_id: user.id,
            nombre: "Bendita Burger",
            slug: "bendita",
            whatsapp: "5491133334444",
            color_principal: "#f5290f",
            tema_tienda: "light"
          }])
          .select()
          .maybeSingle();

        if (createError || !newNeg) {
          console.error("Error creating business setup:", createError);
          await supabase.auth.signOut();
          router.push("/login");
          return;
        }
        negocioData = newNeg;
      }

      setNotificaciones([]);
      setNegocio(negocioData);
      setLoading(false);
    };

    cargarDatos();
  }, [router]);

  const handleCerrarSesion = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50 dark:bg-[#0a0a0a]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent"></div>
      </div>
    );
  }

  const navLinks = [
    { nombre: "Catálogo", ruta: "/dashboard/productos", icono: Store },
    { nombre: "Diseño", ruta: "/dashboard/portada", icono: Palette },
    { nombre: "Configuración", ruta: "/dashboard/configuracion", icono: Settings },
  ];



  return (
    <div className="fixed inset-0 flex flex-row overflow-hidden bg-gray-50 dark:bg-[#0a0a0a]">
      <aside className="hidden md:flex w-[260px] shrink-0 flex-col border-r border-gray-200 bg-white dark:border-neutral-900 dark:bg-[#0a0a0a] relative z-20">

        <div className="flex h-16 shrink-0 items-center px-6 border-b border-gray-100 dark:border-neutral-800">
          <Link href="/dashboard" className="flex items-center transition-opacity hover:opacity-80">
            <span className="font-black text-xl tracking-tighter uppercase text-gray-900 dark:text-white">
              Bendita Burger
            </span>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4">
          <h3 className="mb-3 px-3 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-neutral-500">Principal</h3>
          <nav className="flex flex-col gap-1.5 text-sm font-medium">
            {navLinks.map((link) => {
              const Icon = link.icono;
              const activo = pathname === link.ruta;
              return (
                <Link
                  key={link.ruta}
                  href={link.ruta}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all ${activo
                    ? "bg-gray-900 text-white shadow-md dark:bg-white dark:text-black"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
                    }`}
                >
                  <Icon className={`h-5 w-5 ${activo ? "text-white dark:text-black" : "text-gray-400 dark:text-neutral-500"}`} />
                  {link.nombre}
                </Link>
              );
            })}
          </nav>

          <h3 className="mt-8 mb-3 px-3 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-neutral-500">Accesos</h3>
          <Link href="/" target="_blank" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white">
            <ExternalLink className="h-5 w-5 text-gray-400 dark:text-neutral-500" />
            Ver catálogo online
          </Link>
        </div>

        <div className="shrink-0 border-t border-gray-100 p-4 dark:border-neutral-800">
          <div className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-neutral-800 dark:bg-neutral-900/50">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 shrink-0 rounded-lg bg-gradient-to-tr from-red-500 to-red-600 flex items-center justify-center text-white font-bold text-sm">
                {userAuth?.email ? userAuth.email.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-gray-900 dark:text-white">{negocio?.nombre || "Mi Tienda"}</p>
                <p className="truncate text-[10px] text-gray-500 dark:text-neutral-400">{userAuth?.email}</p>
              </div>
            </div>
            
            <button
              onClick={handleCerrarSesion}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 px-3 py-2.5 text-xs font-semibold text-red-600 dark:text-red-400 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      {menuAbierto && (
        <div className="fixed inset-0 z-50 flex bg-black/60 backdrop-blur-sm md:hidden">
          <aside className="relative flex h-full w-[280px] max-w-[80%] flex-col bg-white shadow-2xl dark:bg-[#0a0a0a]">

            <div className="flex h-16 items-center justify-between border-b border-gray-100 px-6 dark:border-neutral-800">
              <span className="font-black text-xl tracking-tighter uppercase text-gray-900 dark:text-white">
                Bendita Burger
              </span>
              <button onClick={() => setMenuAbierto(false)} className="rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-neutral-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex flex-col gap-1.5 overflow-y-auto p-4 text-sm font-medium">
              {navLinks.map((link) => {
                const Icon = link.icono;
                const activo = pathname === link.ruta;
                return (
                  <Link
                    key={link.ruta}
                    href={link.ruta}
                    onClick={() => setMenuAbierto(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-3 transition-all ${activo ? "bg-gray-900 text-white shadow-md dark:bg-white dark:text-black" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"}`}
                  >
                    <Icon className="h-5 w-5" />
                    {link.nombre}
                  </Link>
                );
              })}
              <div className="my-2 border-t border-gray-100 dark:border-neutral-800"></div>
              <Link href="/" target="_blank" className="flex items-center gap-3 rounded-lg px-3 py-3 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white">
                <ExternalLink className="h-5 w-5" /> Ver catálogo online
              </Link>
            </nav>
          </aside>
          <div className="flex-1" onClick={() => setMenuAbierto(false)}></div>
        </div>
      )}

      <div className="flex flex-1 flex-col h-full min-w-0 overflow-hidden relative">
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-gray-200 bg-white/80 backdrop-blur-md px-4 sm:px-8 dark:border-neutral-800 dark:bg-[#0a0a0a]/80 z-10">
          <div className="flex items-center gap-4 flex-1">
            <button onClick={() => setMenuAbierto(true)} className="shrink-0 rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-neutral-800 dark:hover:text-white md:hidden">
              <Menu className="h-6 w-6" />
            </button>
          </div>

          <div className="flex items-center gap-3 shrink-0"></div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8 custom-scrollbar">
          <div className="mx-auto w-full max-w-7xl pb-20">

            {children}
          </div>
        </main>
      </div>
    </div>
  );
}