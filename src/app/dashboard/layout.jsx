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
            plan: "pro",
            estado_pago: "activo",
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
    { nombre: "Burgers y Bebidas", ruta: "/dashboard/productos", icono: Store },
    { nombre: "Configuración de WhatsApp", ruta: "/dashboard/configuracion", icono: Settings },
  ];

  // Cálculo para los carteles grandes del Dashboard
  const ahoraGlobal = new Date();
  const renovacionGlobal = negocio?.is_trial ? new Date(negocio.trial_ends_at) : (negocio?.proxima_renovacion ? new Date(negocio.proxima_renovacion) : new Date());
  const suspensionGlobal = negocio?.is_trial ? renovacionGlobal : (negocio?.fecha_suspension ? new Date(negocio.fecha_suspension) : renovacionGlobal);
  const enGraciaActiva = !negocio?.is_trial && negocio?.estado_pago === 'activo' && ahoraGlobal > renovacionGlobal && ahoraGlobal < suspensionGlobal;

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
          <div className="mb-3 rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-neutral-800 dark:bg-neutral-900/50 relative overflow-hidden">
            {negocio.is_trial && (
              <div className="absolute top-0 right-0 bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg">PRUEBA</div>
            )}
            {enGraciaActiva && (
              <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg">ATRASADO</div>
            )}
            <div className="mb-1 flex items-center justify-between mt-1">
              <p className="text-xs font-medium text-gray-500 dark:text-neutral-400">Plan actual</p>
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${negocio.estado_pago === 'vencido' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                {negocio.plan === 'free' ? 'Prueba' : negocio.plan}
              </span>
            </div>
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{negocio.nombre}</p>
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

          <div className="flex items-center gap-3 shrink-0">
            <div className="relative" ref={dropdownNotiRef}>
              <button
                onClick={() => setNotificacionesAbiertas(!notificacionesAbiertas)}
                className="relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-neutral-800 dark:hover:text-white border border-transparent dark:hover:border-neutral-700"
              >
                <Bell className="h-5 w-5" />
                {notificaciones.length > 0 && (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-red-500 dark:border-[#0a0a0a]"></span>
                )}
              </button>

              {notificacionesAbiertas && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-gray-100 dark:border-neutral-800 overflow-hidden z-50 animate-fade-in">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-neutral-800 flex justify-between items-center">
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white">Notificaciones</h3>
                    <span className="text-xs bg-gray-100 dark:bg-neutral-800 text-gray-500 px-2 py-0.5 rounded-full">{notificaciones.length}</span>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {notificaciones.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-neutral-400">
                        Todo al día. No hay alertas.
                      </div>
                    ) : (
                      notificaciones.map((noti) => (
                        <div key={noti.id} className={`px-4 py-3 border-b last:border-0 border-gray-50 dark:border-neutral-800/50 hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors ${(noti.tipo === 'peligro' || noti.tipo === 'alerta') ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                          <div className="flex gap-3">
                            <div className="shrink-0 mt-0.5">
                              {noti.tipo === 'peligro' || noti.tipo === 'alerta' ? <AlertCircle className="w-5 h-5 text-red-500" /> : <Info className="w-5 h-5 text-blue-500" />}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900 dark:text-white">{noti.titulo}</p>
                              <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1 leading-relaxed">{noti.texto}</p>
                              {noti.accion && (
                                <Link
                                  href={noti.link}
                                  onClick={() => setNotificacionesAbiertas(false)}
                                  className={`inline-block mt-2 text-xs font-bold ${noti.tipo === 'peligro' || noti.tipo === 'alerta' ? 'text-red-600 hover:text-red-700 dark:text-red-500' : 'text-green-600 hover:text-green-700 dark:text-green-500'}`}
                                >
                                  {noti.accion} &rarr;
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={dropdownPerfilRef}>
              <div
                onClick={() => setPerfilAbierto(!perfilAbierto)}
                className="h-9 w-9 cursor-pointer rounded-lg border border-gray-200 bg-gradient-to-tr from-green-500 to-emerald-600 shadow-sm dark:border-neutral-700 ml-1 flex items-center justify-center text-white font-bold text-sm hover:opacity-90 transition-opacity"
              >
                {userAuth?.email ? userAuth.email.charAt(0).toUpperCase() : 'U'}
              </div>

              {perfilAbierto && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-gray-100 dark:border-neutral-800 overflow-hidden z-50 animate-fade-in">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-neutral-800">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">Mi Cuenta</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{userAuth?.email}</p>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={handleCerrarSesion}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-500 dark:hover:bg-red-900/20 transition-colors mt-1"
                    >
                      <LogOut className="w-4 h-4" /> Cerrar sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8 custom-scrollbar">
          <div className="mx-auto w-full max-w-7xl pb-20">

            {/* ALERTA DE GRACIA ACTIVA (TIENDA ON PERO DEBE PAGAR) */}
            {enGraciaActiva && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 dark:bg-red-900/20 dark:border-red-800/50 shadow-sm animate-fade-in">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-red-800 dark:text-red-300">
                      Pago atrasado.
                    </h3>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 font-medium">Tu tienda sigue activa, pero se desactivará en {Math.ceil((suspensionGlobal.getTime() - ahoraGlobal.getTime()) / (1000 * 60 * 60 * 24))} día(s) si no abonás la mensualidad.</p>
                  </div>
                </div>
                <Link
                  href={`/checkout?plan=${negocio.plan}`}
                  className="shrink-0 w-full sm:w-auto text-center bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-colors shadow-sm"
                >
                  Pagar ahora
                </Link>
              </div>
            )}

            {/* ALERTA DE SUSPENSIÓN (TIENDA APAGADA) */}
            {negocio?.estado_pago === "vencido" && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 dark:bg-red-900/20 dark:border-red-800/50 shadow-sm animate-fade-in">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-red-800 dark:text-red-300">
                      Tienda Desactivada.
                    </h3>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 font-medium">Tus clientes ya no pueden pedir. Tu tienda será eliminada definitivamente pronto.</p>
                  </div>
                </div>
                <Link
                  href={`/checkout?plan=${negocio.plan === 'free' ? 'basic' : negocio.plan}`}
                  className="shrink-0 w-full sm:w-auto text-center bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-colors shadow-sm"
                >
                  Reactivar Tienda
                </Link>
              </div>
            )}

            {/* ALERTA DE PRUEBA ACTIVA (AMARILLA) */}
            {(negocio?.is_trial || negocio?.plan === 'prueba') && negocio?.estado_pago !== "vencido" && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 dark:bg-amber-900/20 dark:border-amber-800/50 shadow-sm animate-fade-in">
                <div className="flex items-center gap-3">
                  <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300">Estás en tu Período de Prueba Gratis</h3>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                      {negocio.trial_ends_at
                        ? `Te quedan ${Math.max(0, Math.ceil((new Date(negocio.trial_ends_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} día(s) gratis de Plan PRO. Elegí un plan para no perder tus datos.`
                        : "Aprovechá todas las herramientas del Plan PRO."}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/planes`}
                  className="shrink-0 w-full sm:w-auto text-center bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-6 rounded-lg text-sm transition-colors shadow-sm"
                >
                  Elegir Plan
                </Link>
              </div>
            )}

            {children}
          </div>
        </main>
      </div>
    </div>
  );
}