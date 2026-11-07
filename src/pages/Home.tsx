import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { Hero } from "../components/Hero";
import { About } from "../components/About";
import { Departments } from "../components/Departments";
import { Works } from "../components/Works";
import { Stats } from "../components/Stats";
import { Recruit } from "../components/Recruit";
import { Footer } from "../components/Footer";

export default function Home() {
  const { hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash);
      if (el) window.setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 60);
    }
  }, [hash]);

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <About />
        <Departments />
        <Works />
        <Stats />
        <Recruit />
      </main>
      <Footer />
    </>
  );
}
