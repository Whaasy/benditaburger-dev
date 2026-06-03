import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
});

export const metadata = {
  title: "Bendita Burger - Catálogo Oficial",
  description: "Las mejores hamburguesas artesanales. Pedí online y recibilo por delivery o retiralo en el local.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="es"
      className={`${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
