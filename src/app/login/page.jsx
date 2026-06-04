"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Mail, CheckCircle2, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });

  const handleLogin = async (e) => {
    e.preventDefault();
    setMensaje({ tipo: "", texto: "" });
    setCargando(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (data?.user) {
        // Verificar si es admin
        const isAdmin = data.user.user_metadata?.role === "admin";
        
        // También verificar tabla admins
        const { data: adminRow } = await supabase
          .from("admins")
          .select("email")
          .eq("email", email)
          .maybeSingle();

        if (isAdmin || (adminRow && adminRow.email)) {
          setMensaje({
            tipo: "exito",
            texto: "Inicio de sesión exitoso. Redirigiendo..."
          });
          setTimeout(() => {
            router.push("/dashboard/productos");
          }, 1000);
        } else {
          // Si no es admin en metadata ni en la tabla admins, mostrar error
          await supabase.auth.signOut();
          setMensaje({
            tipo: "error",
            texto: "Acceso denegado. Tu usuario no tiene rango de Administrador."
          });
        }
      }
    } catch (error) {
      console.error(error);
      setMensaje({ tipo: "error", texto: error.message || "Credenciales incorrectas." });
    } finally {
      setCargando(false);
    }
  };

  return (
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-950/20 via-gray-950 to-black flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
      
      {/* Elemento de diseño de fondo luminoso */}
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-red-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-red-600 to-red-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-red-600/20 transform hover:scale-105 transition-transform">
          <Lock className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white uppercase bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
          Administración
        </h2>
        <p className="mt-2.5 text-xs font-semibold tracking-wider text-red-500/80 uppercase">
          Bendita Burger
        </p>
        <p className="mt-2 text-sm text-neutral-400 max-w-xs mx-auto">
          Gestiona el catálogo, horarios de atención y pedidos por WhatsApp.
        </p>
      </div>
  
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-neutral-900/60 backdrop-blur-xl py-8 px-6 border border-neutral-800/80 shadow-2xl rounded-3xl sm:px-10">
          {mensaje.texto && (
            <div className={`mb-6 p-4 rounded-xl text-xs font-bold flex items-center gap-2.5 animate-fade-in ${mensaje.tipo === "exito" ? "bg-green-950/30 text-green-400 border border-green-900/50" : "bg-red-950/30 text-red-400 border border-red-900/50"}`}>
              {mensaje.tipo === "exito" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              {mensaje.texto}
            </div>
          )}
  
          <form className="space-y-5" onSubmit={handleLogin}>
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-[10px] font-black uppercase tracking-widest text-neutral-400">
                Correo Electrónico
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4.5 w-4.5 text-neutral-500" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-3 py-3 bg-neutral-950/70 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-transparent transition-all shadow-inner"
                  placeholder="admin@benditaburger.com"
                />
              </div>
            </div>
  
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-[10px] font-black uppercase tracking-widest text-neutral-400">
                Contraseña
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4.5 w-4.5 text-neutral-500" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-3 py-3 bg-neutral-950/70 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-transparent transition-all shadow-inner"
                  placeholder="••••••••"
                />
              </div>
            </div>
  
            <div className="pt-2">
              <button
                type="submit"
                disabled={cargando}
                className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-red-600/10 text-xs font-black uppercase tracking-widest text-white bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
              >
                {cargando ? "Iniciando sesión..." : "Iniciar Sesión"}
              </button>
            </div>
          </form>
  
          <div className="mt-6 text-center">
            <p className="text-xs text-neutral-400 font-medium">
              ¿No tienes cuenta?{" "}
              <Link href="/register" className="font-bold text-red-500 hover:text-red-400 hover:underline transition-all">
                Regístrate aquí
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
