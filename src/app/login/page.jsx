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
    <div className="min-h-screen bg-gray-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <img
          src="/logo.webp"
          alt="Bendita Burger Logo"
          className="mx-auto h-16 w-auto object-contain dark:invert-0"
        />
        <h2 className="mt-6 text-3xl font-black tracking-tight text-white uppercase">
          Administración
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          Inicia sesión para gestionar el catálogo y WhatsApp
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-neutral-900 py-8 px-4 border border-neutral-800 shadow sm:rounded-2xl sm:px-10">
          {mensaje.texto && (
            <div className={`mb-6 p-4 rounded-xl text-sm font-bold flex items-center gap-2 ${mensaje.tipo === "exito" ? "bg-green-950 text-green-400 border border-green-900" : "bg-red-950 text-red-400 border border-red-900"}`}>
              {mensaje.tipo === "exito" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              {mensaje.texto}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-xs font-black uppercase tracking-wider text-gray-400">
                Correo Electrónico
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                  placeholder="admin@benditaburger.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-black uppercase tracking-wider text-gray-400">
                Contraseña
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={cargando}
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-xs font-black uppercase tracking-wider text-black bg-yellow-500 hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cargando ? "Iniciando sesión..." : "Iniciar Sesión"}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              ¿No tienes cuenta?{" "}
              <Link href="/register" className="font-bold text-yellow-500 hover:text-yellow-400 transition-colors">
                Regístrate aquí
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
