"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Mail, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });

  const handleRegister = async (e) => {
    e.preventDefault();
    setMensaje({ tipo: "", texto: "" });

    if (password !== confirmPassword) {
      setMensaje({ tipo: "error", texto: "Las contraseñas no coinciden." });
      return;
    }

    if (password.length < 6) {
      setMensaje({ tipo: "error", texto: "La contraseña debe tener al menos 6 caracteres." });
      return;
    }

    setCargando(true);

    try {
      // 1. Registrar usuario en Supabase Auth con rol admin
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: "admin"
          }
        }
      });

      if (error) throw error;

      if (data?.user) {
        // 2. Intentar registrar en la tabla admins (por si existe y layout lo requiere)
        try {
          await supabase.from("admins").insert([{ email }]);
        } catch (dbErr) {
          console.warn("No se pudo insertar en la tabla de admins, probablemente RLS o estructura diferente. Se usará rol de metadata:", dbErr);
        }

        // 3. Crear negocio inicial por defecto para este admin si no existe
        try {
          const { data: negocioExistente } = await supabase
            .from("negocios")
            .select("id")
            .eq("user_id", data.user.id)
            .maybeSingle();

          if (!negocioExistente) {
            await supabase.from("negocios").insert([{
              user_id: data.user.id,
              nombre: "Bendita Burger",
              slug: "benditaburger-" + Math.floor(1000 + Math.random() * 9000),
              whatsapp: "5491133334444",
              color_principal: "#EAB308",
              tema_tienda: "dark"
            }]);
          }
        } catch (negocioErr) {
          console.warn("No se pudo pre-crear el negocio por defecto:", negocioErr);
        }

        setMensaje({
          tipo: "exito",
          texto: "¡Registro exitoso! Ya puedes iniciar sesión."
        });

        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
    } catch (error) {
      console.error(error);
      setMensaje({ tipo: "error", texto: error.message || "Error al registrarse." });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-950/20 via-gray-950 to-black flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
      
      {/* Elemento de diseño de fondo luminoso */}
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-red-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-red-600 to-red-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-red-600/20 transform hover:scale-105 transition-transform">
          <Mail className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white uppercase bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
          Registrar Admin
        </h2>
        <p className="mt-2.5 text-xs font-semibold tracking-wider text-red-500/80 uppercase">
          Bendita Burger
        </p>
        <p className="mt-2 text-sm text-neutral-400 max-w-xs mx-auto">
          Crea una nueva cuenta de administrador para gestionar tu catálogo.
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

          <form className="space-y-5" onSubmit={handleRegister}>
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

            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="block text-[10px] font-black uppercase tracking-widest text-neutral-400">
                Confirmar Contraseña
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4.5 w-4.5 text-neutral-500" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                {cargando ? "Registrando..." : "Crear Cuenta Admin"}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-neutral-400 font-medium">
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" className="font-bold text-red-500 hover:text-red-400 hover:underline transition-all">
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
